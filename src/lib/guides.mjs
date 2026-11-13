// Loads and validates content/guides/*.md (YAML front matter + markdown body) and renders the body to HTML.
// Pure Node (fs, yaml, marked): used by the page templates, the build and the tests.
//
// Front matter: title, slug, description, type, keywords[], last_verified (YYYY-MM-DD), sources[{title,url,captured}], status (published|draft).
// A published guide with any problem is an error (the build fails). A draft with problems only produces warnings.
// A missing or empty content/guides/ directory is fine: zero guides.
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { Marked } from 'marked';

export const STATUSES = ['published', 'draft'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const validDate = (d) => typeof d === 'string' && ISO.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

export function slugify(text) {
  return String(text).toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

export function splitFrontMatter(raw) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: null, body: raw };
  let data;
  try { data = parseYaml(m[1]); } catch (e) { return { data: null, body: m[2], yamlError: e.message }; }
  return { data: data && typeof data === 'object' ? data : null, body: m[2] };
}

// Returns problems for one parsed guide. `today` is used to reject future last_verified dates.
export function checkGuide(g, today) {
  const p = [];
  const str = (k) => typeof g[k] === 'string' && g[k].trim().length > 0;
  for (const k of ['title', 'slug', 'description', 'type']) if (!str(k)) p.push(`${k} is required`);
  if (str('slug') && (!SLUG.test(g.slug) || g.slug.length > 80)) p.push(`slug "${g.slug}" must be lowercase letters, digits and hyphens (max 80)`);
  if (!STATUSES.includes(g.status)) p.push(`status must be one of ${STATUSES.join(', ')} (got ${JSON.stringify(g.status)})`);
  if (!Array.isArray(g.keywords) || g.keywords.some((k) => typeof k !== 'string')) p.push('keywords must be a list of strings');
  if (!validDate(g.last_verified)) p.push('last_verified must be a real date as YYYY-MM-DD');
  else if (today && g.last_verified > today) p.push(`last_verified ${g.last_verified} is in the future`);
  if (!Array.isArray(g.sources) || g.sources.length === 0) p.push('sources must list at least one source (title, url, captured)');
  else g.sources.forEach((s, i) => {
    if (!s || typeof s !== 'object') { p.push(`sources[${i}] must be an object`); return; }
    if (typeof s.title !== 'string' || !s.title.trim()) p.push(`sources[${i}].title is required`);
    if (typeof s.url !== 'string' || !/^https?:\/\/[^\s]+$/.test(s.url)) p.push(`sources[${i}].url must be an http(s) URL`);
    if (!validDate(s.captured)) p.push(`sources[${i}].captured must be a real date as YYYY-MM-DD`);
  });
  if (!g.body || !g.body.trim()) p.push('body is empty');
  return p;
}

export function renderMarkdown(body) {
  const used = new Map();
  const toc = [];
  const md = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const plain = tokens.map((t) => t.raw ?? t.text ?? '').join('');
        let id = slugify(plain);
        const n = used.get(id) || 0; used.set(id, n + 1);
        if (n) id = `${id}-${n + 1}`;
        if (depth === 2) toc.push({ id, text: plain.replace(/[*_`]/g, '') });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:\/\//i.test(href);
        return `<a href="${href}"${title ? ` title="${title}"` : ''}${external ? ' rel="nofollow noopener"' : ''}>${inner}</a>`;
      },
      // Raw HTML in guides is escaped, not passed through.
      html({ text }) { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    }
  });
  const html = md.parse(body);
  return { html, toc };
}

export function loadGuides(dir = path.join(process.cwd(), 'content', 'guides'), { today } = {}) {
  const out = { guides: [], errors: [], warnings: [], dir };
  if (!fs.existsSync(dir)) return out;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && f.toLowerCase() !== 'readme.md').sort();
  const seen = new Map();
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const { data, body, yamlError } = splitFrontMatter(raw);
    const where = `content/guides/${f}`;
    if (!data) { out.errors.push(`${where}: ${yamlError ? `front matter is not valid YAML (${yamlError})` : 'missing YAML front matter'}`); continue; }
    const g = { ...data, body, file: where };
    if (g.last_verified instanceof Date) g.last_verified = g.last_verified.toISOString().slice(0, 10);
    if (Array.isArray(g.sources)) g.sources = g.sources.map((s) => (s && s.captured instanceof Date ? { ...s, captured: s.captured.toISOString().slice(0, 10) } : s));
    const problems = checkGuide(g, today);
    if (/^#\s/m.test(body.replace(/```[\s\S]*?```/g, ''))) problems.push('body must not contain an H1 (the title is the H1; start sections at ##)');
    if (problems.length) {
      const bucket = g.status === 'draft' ? out.warnings : out.errors;
      for (const x of problems) bucket.push(`${where}: ${x}`);
      if (g.status !== 'draft' || !g.slug || !SLUG.test(g.slug) || !g.title) continue;
    }
    if (seen.has(g.slug)) { out.errors.push(`${where}: slug "${g.slug}" is already used by ${seen.get(g.slug)}`); continue; }
    seen.set(g.slug, where);
    const { html, toc } = renderMarkdown(body);
    out.guides.push({ ...g, html, toc, keywords: g.keywords || [], sources: g.sources || [] });
  }
  return out;
}
