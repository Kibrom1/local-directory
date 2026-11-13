// Post-build site checks. Run after `npm run build`; exits non-zero on problems.
//   node scripts/check-site.mjs [--strict] [--dist=dist] [--report=reports/build-report.json]
// Checks: canonical, title, description, JSON-LD, robots/noindex vs sitemap, internal links and fragments, orphan pages,
// redirect map and vanished published paths, no SAMPLE/placeholder/TODO text in dist, form destination, Pagefind index.
// --strict (launch check) also fails on unset launch configuration (form destination, operator, disclosure, SITE_URL)
// and on any page built from test data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { loadPages, walk, urlPath, parseArgs } from './lib/dist.mjs';
import { vercelText } from './redirects.mjs';
import { loadGuides } from '../src/lib/guides.mjs';
import { readLaunchEnv, PLACEHOLDER_SITE } from '../src/lib/env.mjs';
import { todayIso } from '../src/lib/freshness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { flags, kv } = parseArgs(process.argv.slice(2));
const strict = flags.has('--strict') || process.env.STRICT_BUILD === '1';
const dist = path.resolve(root, kv.dist || 'dist');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

if (!fs.existsSync(dist)) { console.error(`check:site FAILED: ${dist} does not exist. Run npm run build first.`); process.exit(1); }
const env = { ...loadEnv('production', root, ''), ...process.env };
const pages = loadPages(dist);
const byPath = new Map(pages.map((p) => [p.path, p]));
const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(path.resolve(root, f), 'utf8')); } catch { return fallback; } };
const redirectsFile = readJson('config/redirects.json', { redirects: [], removed: [] });
const published = readJson('config/published-paths.json', { paths: [] });
const report = readJson(kv.report || 'reports/build-report.json', null);

// Origin used in canonicals, taken from the build itself (SITE_URL at build time).
const home = byPath.get('/');
const origin = home ? new URL(home.doc.querySelector('link[rel="canonical"]')?.href || 'http://missing.invalid/').origin : null;

// ---- per-page checks -------------------------------------------------------------------------------------------
const real = pages.filter((p) => !p.redirect);
const indexable = real.filter((p) => !p.noindex);
const titles = new Map();
const descs = new Map();
const ldTypes = (p) => {
  const out = [];
  for (const s of p.doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { const j = JSON.parse(s.textContent); for (const x of Array.isArray(j) ? j : [j]) out.push(x['@type']); }
    catch (e) { err(`${p.path}: JSON-LD is not valid JSON (${e.message})`); }
  }
  return out;
};
for (const p of real) {
  const d = p.doc;
  if (d.documentElement.getAttribute('lang') !== 'en') err(`${p.path}: <html lang="en"> missing`);
  const title = d.querySelector('title')?.textContent.trim();
  if (!title) err(`${p.path}: missing <title>`);
  const h1 = d.querySelectorAll('h1').length;
  if (h1 !== 1) err(`${p.path}: ${h1} <h1> elements (need exactly 1)`);
  const canon = d.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!canon) err(`${p.path}: missing canonical link`);
  else {
    const u = new URL(canon);
    const expect = p.path === '/404.html' ? null : p.path;
    if (expect && u.pathname !== expect) err(`${p.path}: canonical points to ${u.pathname}, expected ${expect}`);
    if (origin && u.origin !== origin) err(`${p.path}: canonical origin ${u.origin} differs from the home page's ${origin}`);
    if (u.search || u.hash) err(`${p.path}: canonical must not carry a query or fragment`);
  }
  if (!p.noindex) {
    const desc = d.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
    if (!desc) err(`${p.path}: indexable page has no meta description`);
    else { if (desc.length < 50 || desc.length > 175) warn(`${p.path}: description is ${desc.length} characters (aim for 50 to 160)`); descs.set(desc, [...(descs.get(desc) || []), p.path]); }
    if (title && title.length > 70) warn(`${p.path}: title is ${title.length} characters (aim for 60 or fewer)`);
    if (title) titles.set(title, [...(titles.get(title) || []), p.path]);
    const types = ldTypes(p);
    const need = [];
    if (p.path === '/') need.push('WebSite');
    else need.push('BreadcrumbList');
    if (/^\/company\//.test(p.path)) need.push('LocalBusiness');
    if (/^\/guides\/.+/.test(p.path) || /^\/fee-guide\/.+/.test(p.path)) need.push('Article');
    if (/^\/city\//.test(p.path)) need.push('ItemList');
    for (const t of need) if (!types.includes(t)) err(`${p.path}: indexable page is missing ${t} JSON-LD`);
  } else {
    if (!/noindex/.test(p.robots)) err(`${p.path}: robots meta unexpected`);
    ldTypes(p);
  }
  // Pagefind must not index noindex pages: main has data-pagefind-body only on indexable pages.
  const body = !!d.querySelector('[data-pagefind-body]');
  if (p.noindex && body) err(`${p.path}: noindex page is in the search index (data-pagefind-body present)`);
  if (!p.noindex && !body) err(`${p.path}: indexable page is missing data-pagefind-body`);
  // Duplicate ids
  const ids = [...d.querySelectorAll('[id]')].map((e) => e.id);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) err(`${p.path}: duplicate id "${id}"`);
  for (const img of d.querySelectorAll('img:not([alt])')) err(`${p.path}: <img> without alt (${img.getAttribute('src')})`);
}
for (const [t, ps] of titles) if (ps.length > 1) err(`duplicate <title> "${t}" on ${ps.join(', ')}`);
for (const [t, ps] of descs) if (ps.length > 1) err(`duplicate meta description on ${ps.join(', ')}`);

// ---- sitemap and robots.txt ------------------------------------------------------------------------------------
const sitemapFiles = walk(dist).filter((f) => /sitemap-.*\.xml$/.test(f) && !/index/.test(path.basename(f)));
const sitemapPaths = new Set();
if (!fs.existsSync(path.join(dist, 'sitemap-index.xml')) || !sitemapFiles.length) err('sitemap-index.xml / sitemap-0.xml missing from dist');
for (const f of sitemapFiles) for (const m of fs.readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const u = new URL(m[1]);
  if (origin && u.origin !== origin) err(`sitemap: ${m[1]} has a different origin than the canonical URLs (${origin})`);
  sitemapPaths.add(u.pathname);
}
for (const sp of sitemapPaths) {
  const p = byPath.get(sp);
  if (!p) err(`sitemap lists ${sp}, which is not built`);
  else if (p.noindex) err(`sitemap lists ${sp}, which is noindex`);
  else if (p.redirect) err(`sitemap lists ${sp}, which is a redirect`);
}
for (const p of indexable) if (!sitemapPaths.has(p.path) && p.path !== '/404.html') err(`indexable page ${p.path} is not in the sitemap`);
const robots = fs.existsSync(path.join(dist, 'robots.txt')) ? fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8') : '';
if (!robots) err('robots.txt missing');
else {
  if (!/^Sitemap:\s*\S+sitemap-index\.xml\s*$/m.test(robots)) err('robots.txt does not point at sitemap-index.xml');
  if (/^Disallow:\s*\/\s*$/m.test(robots)) err('robots.txt blocks the whole site');
  const sm = robots.match(/^Sitemap:\s*(\S+)/m);
  if (sm && origin && new URL(sm[1]).origin !== origin) err(`robots.txt sitemap origin ${new URL(sm[1]).origin} differs from canonical origin ${origin}`);
}
// The build report and the built pages must agree on what is indexable.
if (report) {
  const want = new Set(report.indexable.map((x) => x.path));
  const have = new Set(indexable.filter((p) => p.path !== '/404.html' && p.path !== '/search/').map((p) => p.path));
  for (const x of want) if (!have.has(x)) err(`build report says ${x} is indexable but dist has no indexable page there`);
  for (const x of have) if (!want.has(x)) err(`${x} is indexable in dist but not in the build report`);
} else warn('reports/build-report.json not found; skipped report-vs-dist comparison');

// ---- Pagefind --------------------------------------------------------------------------------------------------
const pf = path.join(dist, 'pagefind', 'pagefind-entry.json');
if (!fs.existsSync(pf)) err('Pagefind index missing (dist/pagefind). The build script runs `pagefind --site dist`.');
else {
  const entry = JSON.parse(fs.readFileSync(pf, 'utf8'));
  const n = Object.values(entry.languages || {}).reduce((a, l) => a + (l.page_count || 0), 0);
  if (n !== indexable.filter((p) => p.path !== '/404.html').length) warn(`Pagefind indexed ${n} pages; ${indexable.length} indexable pages in dist`);
}

// ---- forbidden text in dist ------------------------------------------------------------------------------------
const textFiles = walk(dist).filter((f) => /\.(html|xml|txt|css|js|json|mjs)$/.test(f) && !f.includes(`${path.sep}pagefind${path.sep}`));
const FORBID = [[/\bSAMPLE\b/, 'SAMPLE'], [/\bTODO\b|\bFIXME\b|\bTBD\b/, 'TODO/FIXME/TBD'], [/lorem ipsum/i, 'lorem ipsum']];
for (const f of textFiles) {
  const rel = '/' + path.relative(dist, f).split(path.sep).join('/');
  let txt = fs.readFileSync(f, 'utf8');
  const isHtml = f.endsWith('.html');
  if (isHtml) txt = txt.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, (m) => (/ld\+json/.test(m) ? m : ''));
  for (const [re, name] of FORBID) if (re.test(txt)) err(`${rel}: contains ${name}`);
  if (isHtml && /placeholder/i.test(txt)) err(`${rel}: contains the word "placeholder" (test data or unfinished text)`);
}

// ---- internal links, fragments, orphans ------------------------------------------------------------------------
const exists = (p) => byPath.has(p) || fs.existsSync(path.join(dist, p.replace(/^\//, ''))) && fs.statSync(path.join(dist, p.replace(/^\//, ''))).isFile();
const inbound = new Map();
const anchorIds = new Map(real.map((p) => [p.path, new Set([...p.doc.querySelectorAll('[id]')].map((e) => e.id))]));
for (const p of pages) {
  for (const el of p.doc.querySelectorAll('a[href], link[href], script[src], form[action], img[src]')) {
    const attr = el.hasAttribute('href') ? 'href' : el.hasAttribute('src') ? 'src' : 'action';
    const raw = el.getAttribute(attr);
    if (!raw || raw.startsWith('#') && raw.length === 1) continue;
    if (/^(mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    let u;
    try { u = new URL(raw, `${origin || 'https://x.invalid'}${p.path}`); } catch { err(`${p.path}: unparseable URL "${raw}"`); continue; }
    const external = u.origin !== (origin || 'https://x.invalid');
    if (external) {
      if (el.tagName === 'A') {
        const rel = (el.getAttribute('rel') || '').split(/\s+/);
        if (!rel.includes('noopener')) err(`${p.path}: external link ${raw} lacks rel="noopener"`);
        if (p.path !== '/privacy/' && !rel.includes('nofollow')) err(`${p.path}: external link ${raw} lacks rel="nofollow"`);
      }
      continue;
    }
    if (el.tagName === 'LINK' && el.getAttribute('rel') === 'canonical') continue;
    if (el.tagName === 'FORM') continue;
    const target = u.pathname;
    if (!exists(target)) { err(`${p.path}: broken internal link ${raw} (no ${target} in dist)`); continue; }
    if (u.hash && u.hash.length > 1 && byPath.has(target) && !byPath.get(target).redirect) {
      const id = decodeURIComponent(u.hash.slice(1));
      if (!anchorIds.get(target)?.has(id)) err(`${p.path}: link ${raw} points to #${id}, which does not exist on ${target}`);
    }
    if (el.tagName === 'A' && target !== p.path) { const s = inbound.get(target) || new Set(); s.add(p.path); inbound.set(target, s); }
  }
}
for (const p of real) {
  if (p.path === '/' || p.path === '/404.html') continue;
  if (!inbound.has(p.path)) {
    if (p.noindex) warn(`orphan (noindex): nothing links to ${p.path}`);
    else err(`orphan page: nothing links to indexable page ${p.path}`);
  }
}

// ---- redirects and vanished published paths ----------------------------------------------------------------------
const rmap = new Map();
for (const r of redirectsFile.redirects) {
  if (!/^\/.*\/$/.test(r.from) || !/^\/.*\/$/.test(r.to)) err(`redirects: ${r.from} -> ${r.to}: both paths must start and end with /`);
  if (rmap.has(r.from)) err(`redirects: duplicate source ${r.from}`);
  rmap.set(r.from, r.to);
}
for (const [from, to] of rmap) {
  const live = byPath.get(from);
  if (live && !live.redirect) err(`redirects: ${from} is a live page; remove the redirect or change the page path`);
  if (!live) err(`redirects: ${from} was not generated as a redirect page`);
  const t = byPath.get(to);
  if (!t) err(`redirects: ${from} -> ${to}: target is not built`);
  else if (t.redirect || rmap.has(to)) err(`redirects: ${from} -> ${to}: target is itself a redirect (chain)`);
  else if (t.noindex) warn(`redirects: ${from} -> ${to}: target is noindex`);
}
for (const x of redirectsFile.removed || []) if (byPath.has(x) && !byPath.get(x).redirect) err(`redirects: ${x} is listed as removed but still built`);
for (const x of published.paths || []) {
  const p = byPath.get(x);
  if (p && !p.redirect && !p.noindex) continue;
  if (rmap.has(x) || (redirectsFile.removed || []).includes(x)) continue;
  err(`published path ${x} is no longer an indexable page and has no redirect or removal entry in config/redirects.json (a changed slug must be redirected)`);
}
{
  const file = path.join(root, 'vercel.json');
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== vercelText(redirectsFile)) err('vercel.json is missing or out of sync with config/redirects.json (run npm run redirects:sync)');
}

// ---- guides: drafts must not ship; links inside guide sources must resolve ------------------------------------
const g = loadGuides(path.join(root, 'content', 'guides'), { today: todayIso() });
for (const e of g.errors) err(`guides: ${e}`);
const known = (p) => byPath.has(p) || rmap.has(p);
const draftSlugs = new Set(g.guides.filter((x) => x.status === 'draft').map((x) => x.slug));
let draftSiblingLinks = 0;
for (const gd of g.guides) {
  const shipped = byPath.has(`/guides/${gd.slug}/`);
  if (gd.status === 'draft' && shipped && !env.ALLOW_DRAFTS) err(`guides: draft ${gd.slug} is present in dist`);
  for (const m of gd.body.matchAll(/\]\((\/[^)\s#]*)(#[^)\s]*)?\)/g)) {
    if (known(m[1])) continue;
    const toDraft = m[1].startsWith('/guides/') && draftSlugs.has(m[1].split('/')[2]);
    const msg = `content/guides/${gd.file.split('/').pop()}: link ${m[1]} does not resolve to a built page`;
    if (gd.status === 'draft') { if (toDraft) draftSiblingLinks += 1; else warn(`${msg} [in a draft: becomes an error when published]`); }
    else err(`${msg}${toDraft ? ' (that guide is a draft and is not published)' : ''}`);
  }
}
if (draftSiblingLinks) warn(`${draftSiblingLinks} link(s) between draft guides will resolve only when those guides are published together`);

// ---- correction form must never ship dead ---------------------------------------------------------------------
const corr = byPath.get('/corrections/');
if (!corr) err('/corrections/ is missing');
else {
  const form = corr.doc.querySelector('form#correct-form');
  const mail = [...corr.doc.querySelectorAll('a[href^="mailto:"]')].length > 0;
  if (form) { if (!/^https:\/\//.test(form.getAttribute('action') || '')) err('/corrections/: form has no https action'); }
  else if (!mail) {
    const msg = '/corrections/ has no form and no mailto fallback: requests cannot reach anyone (set PUBLIC_FORM_ACTION and PUBLIC_CONTACT_EMAIL)';
    if (strict) err(msg); else warn(msg);
  }
  if (!form && !mail && !/cannot receive requests/.test(corr.html)) err('/corrections/: unconfigured page does not say it cannot receive requests');
}
for (const p of real) if (!p.doc.querySelector('footer a[href="/corrections/"]') && p.path !== '/404.html') err(`${p.path}: footer lacks the /corrections/ link`);

// ---- strict (launch) checks ---------------------------------------------------------------------------------------
if (strict) {
  const launch = readLaunchEnv({ ...env });
  for (const pr of launch.problems.filter((x) => x.level === 'error')) err(`(strict) ${pr.key}: ${pr.message}`);
  if (origin && PLACEHOLDER_SITE.test(origin)) err(`(strict) canonical origin ${origin} is the placeholder domain`);
  if (report && report.placeholder_pages_noindexed.length) err(`(strict) pages built from test data: ${report.placeholder_pages_noindexed.join(', ')}`);
}

// ---- output -----------------------------------------------------------------------------------------------------------
const byType = (list) => list.reduce((a, p) => { const k = p.path === '/' ? 'home' : p.path.split('/')[1] || 'other'; a[k] = (a[k] || 0) + 1; return a; }, {});
const summary = { pages: pages.length, indexable: indexable.length, noindex: real.length - indexable.length, redirects: pages.length - real.length, sitemap_urls: sitemapPaths.size, indexable_by_section: byType(indexable), noindex_by_section: byType(real.filter((p) => p.noindex)) };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'site-check.json'), JSON.stringify({ generated_at: new Date().toISOString(), strict, origin, summary, errors, warnings }, null, 2) + '\n');
console.log(`check:site${strict ? ' (strict)' : ''}: ${summary.pages} pages (${summary.indexable} indexable, ${summary.noindex} noindex, ${summary.redirects} redirects), ${summary.sitemap_urls} sitemap URLs`);
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); for (const w of warnings) console.log(`  - ${w}`); }
if (errors.length) { console.error(`\ncheck:site FAILED with ${errors.length} problem(s):`); for (const e of errors) console.error(`  - ${e}`); process.exit(1); }
console.log('\ncheck:site passed.');
