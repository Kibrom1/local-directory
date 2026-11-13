// Page weight and JavaScript size per built page (raw and gzip), from the files each page references.
//   node scripts/weights.mjs [--dist=dist]
// Budgets (UX spec section 12): own JS under 10 KB, CSS under 15 KB, total transfer under 150 KB per page excluding GA4.
// /search/ also loads Pagefind (reported separately: loaded only there). Exit 1 if a budget is exceeded.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadPages, parseArgs, kb } from './lib/dist.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { kv } = parseArgs(process.argv.slice(2));
const dist = path.resolve(root, kv.dist || 'dist');
const gz = (b) => zlib.gzipSync(b, { level: 9 }).length;
const read = (u) => { const f = path.join(dist, u.split('?')[0]); return fs.existsSync(f) ? fs.readFileSync(f) : null; };
const rows = []; let fail = 0;
for (const p of loadPages(dist).filter((x) => !x.redirect)) {
  const d = p.doc; const html = Buffer.from(p.html);
  const refs = [...d.querySelectorAll('link[rel=stylesheet][href], script[src]')].map((e) => e.getAttribute('href') || e.getAttribute('src')).filter((u) => u.startsWith('/'));
  const inlineCss = [...d.querySelectorAll('style')].reduce((a, e) => a + Buffer.byteLength(e.textContent), 0);
  const inlineJs = [...d.querySelectorAll('script:not([src]):not([type="application/ld+json"])')].reduce((a, e) => a + Buffer.byteLength(e.textContent), 0);
  let css = inlineCss, js = inlineJs, cssGz = 0, jsGz = 0, pf = 0, pfGz = 0;
  for (const u of refs) { const b = read(u); if (!b) continue; const pagefind = u.startsWith('/pagefind/');
    if (pagefind) { pf += b.length; pfGz += gz(b); } else if (u.endsWith('.css')) { css += b.length; cssGz += gz(b); } else { js += b.length; jsGz += gz(b); } }
  const own = html.length + css + js;
  const ownGz = gz(html) + cssGz + jsGz + (inlineCss ? gz(Buffer.from('x'.repeat(inlineCss))) * 0 : 0);
  rows.push({ page: p.path, html: html.length, htmlGz: gz(html), css, js, jsGz, inlineJs, total: own, totalGz: ownGz, pagefind: pf, pagefindGz: pfGz });
}
console.log(`${'page'.padEnd(52)} ${'HTML'.padStart(8)} ${'CSS'.padStart(8)} ${'JS'.padStart(8)} ${'JS gz'.padStart(7)} ${'total gz*'.padStart(9)}`);
for (const r of rows) {
  console.log(`${r.page.padEnd(52)} ${kb(r.html).padStart(8)} ${kb(r.css).padStart(8)} ${kb(r.js).padStart(8)} ${kb(r.jsGz).padStart(7)} ${kb(r.totalGz).padStart(9)}${r.pagefind ? `  + Pagefind ${kb(r.pagefind)} raw / ${kb(r.pagefindGz)} gz (search page only, index and wasm load on query)` : ''}`);
  if (r.js > 10 * 1024) { fail++; console.log(`   OVER BUDGET: own JS ${kb(r.js)} > 10 KB`); }
  if (r.css > 15 * 1024) { fail++; console.log(`   OVER BUDGET: CSS ${kb(r.css)} > 15 KB`); }
  if (r.totalGz > 150 * 1024) { fail++; console.log(`   OVER BUDGET: transfer ${kb(r.totalGz)} > 150 KB`); }
}
const max = (k) => rows.reduce((a, r) => (r[k] > a.v ? { v: r[k], p: r.page } : a), { v: 0 });
console.log(`\nLargest HTML ${kb(max('html').v)} (${max('html').p}); largest own JS ${kb(max('js').v)} (${max('js').p}); largest gz total ${kb(max('totalGz').v)} (${max('totalGz').p}).`);
console.log('* total gz = gzip of HTML + linked CSS/JS (inline CSS is inside the HTML). GA4 (loaded only if PUBLIC_GA_ID is set) and fonts (system fonts, none) are excluded. Not measured: real network transfer, Core Web Vitals (no Lighthouse run here).');
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'page-weights.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(fail ? `\nweights FAILED (${fail})` : '\nweights passed');
process.exit(fail ? 1 : 0);
