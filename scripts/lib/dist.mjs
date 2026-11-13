// Helpers shared by the post-build checks (check-site, a11y, weights): list built pages and parse them.
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

export function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

// /about/index.html -> /about/ ; /404.html -> /404.html
export function urlPath(dist, file) {
  const rel = '/' + path.relative(dist, file).split(path.sep).join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
}

export function loadPages(dist) {
  const files = walk(dist).filter((f) => f.endsWith('.html') && !f.includes(`${path.sep}pagefind${path.sep}`));
  return files.sort().map((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const dom = new JSDOM(html);
    const d = dom.window.document;
    const robots = (d.querySelector('meta[name="robots"]')?.getAttribute('content') || '').toLowerCase();
    const refresh = d.querySelector('meta[http-equiv="refresh"]');
    return { file, path: urlPath(dist, file), html, doc: d, robots, noindex: robots.includes('noindex'), redirect: !!refresh };
  });
}

export function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.includes('=')));
  const kv = Object.fromEntries(argv.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)));
  return { flags, kv };
}

export const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
