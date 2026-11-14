// Tests for the designer findings built so far: dark theme tokens, no-JS home, site map.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './helpers.mjs';
import { evaluateSite } from '../src/lib/site.mjs';

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('contrast: light and dark pairs all pass and the CSS holds no untokenised colours', () => {
  const r = spawnSync('node', ['scripts/contrast.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Dark theme/);
});
test('dark theme follows the system setting and declares colour-scheme', () => {
  assert.match(read('src/styles/site.css'), /@media \(prefers-color-scheme:dark\)/);
  assert.match(read('src/layouts/Base.astro'), /name="color-scheme" content="light dark"/);
});
test('home: the city picker needs 2+ cities and never hides the only way in', () => {
  const src = read('src/pages/index.astro');
  assert.match(src, /cities\.length > 1 && \(/);
  assert.match(src, /href="\/site-map\/"/, 'a plain link to every page exists without JavaScript');
  assert.match(src, /What this site covers today/);
});
test('site map: a noindex utility page, not in the sitemap or the indexable count', () => {
  const s = evaluateSite({ today: '2026-11-14', prod: true });
  assert.ok(s.utilityPages.includes('/site-map/'));
  assert.ok(!s.indexable.some((p) => p.path === '/site-map/'));
  assert.match(read('src/pages/site-map.astro'), /noindex/);
});

// ---- readable dates, link names, compact card
import { fmtDate } from '../src/lib/fees.mjs';
test('fmtDate: fixed English format, no locale or time zone, unknown input passes through', () => {
  assert.equal(fmtDate('2026-11-11'), 'Nov 11, 2026');
  assert.equal(fmtDate('2027-01-05'), 'Jan 5, 2027');
  assert.equal(fmtDate(null), '');
  assert.equal(fmtDate('soon'), 'soon');
});
test('source links name the company, the fee region label is true, the website link says what it is', () => {
  assert.match(read('src/components/SourceNote.astro'), /for \{who\}/);
  assert.ok(!/Scrolls sideways/.test(read('src/components/FeeTable.astro') + read('src/pages/fee-guide/[...slug].astro')));
  assert.match(read('src/pages/company/[slug].astro'), /Visit company website/);
  assert.ok(!/<SourceNote(?![^>]*who=)[^>]*\/>/.test(read('src/pages/company/[slug].astro')), 'every source note on the profile names the company');
});
test('result card: a company with no fee row gets one compact line, not four empty facts', () => {
  const src = read('src/components/ResultCard.astro');
  assert.match(src, /rows\.length === 0/);
  assert.match(src, /No fee data recorded yet/);
});

// ---- property-type filter groups instead of hiding
import { JSDOM } from 'jsdom';
const cityDom = (types) => {
  const cards = types.map((t, i) => `<li class="card result" data-types="${t}" data-fees="${i % 2 ? 'no' : 'yes'}"><h3>C${i}</h3></li>`).join('');
  return new JSDOM(`<!doctype html><form id="filters"><select id="type" name="type"><option value="">Any</option><option value="single-family">Single-family</option></select><input type="checkbox" name="fees"></form>
    <p id="count"></p><div id="empty-state" hidden></div><ul id="results">${cards}</ul>
    <div id="groups" hidden><h3 id="match-head"><span id="match-head-t"></span> <span id="match-head-n"></span></h3><ul id="g-match"></ul><h3 id="unstated-head"><span id="unstated-head-n"></span></h3><ul id="g-unstated"></ul><h3 id="other-head"><span id="other-head-n"></span></h3><ul id="g-other"></ul></div>`, { url: 'http://localhost/city/columbus/' });
};
test('filter: choosing a type groups companies and hides nobody; "only fee publishers" is the one real hide', async () => {
  const dom = cityDom(['single-family', '', 'multifamily', 'single-family multifamily', '']);
  Object.assign(globalThis, { document: dom.window.document, location: dom.window.location });
  await import(`../src/scripts/filters.js?run=${Math.random()}`);
  const doc = dom.window.document;
  const sel = doc.getElementById('type');
  sel.value = 'single-family';
  sel.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  const ids = (id) => [...doc.querySelectorAll(`#${id} h3`)].map((h) => h.textContent);
  assert.deepEqual(ids('g-match'), ['C0', 'C3']);
  assert.deepEqual(ids('g-unstated'), ['C1', 'C4']);
  assert.deepEqual(ids('g-other'), ['C2']);
  assert.equal(doc.querySelectorAll('li[hidden]').length, 0, 'nothing is hidden');
  assert.match(doc.getElementById('count').textContent, /5 companies shown in groups: 2 say they serve Single-family, 2 have no property type stated, 1 state other types/);
  const fee = doc.querySelector('input[name=fees]');
  fee.checked = true; fee.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(doc.querySelectorAll('li[hidden]').length, 2, 'two cards have no fee data and are hidden by the explicit fee filter');
  sel.value = ''; fee.checked = false;
  sel.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.deepEqual([...doc.querySelectorAll('#results h3')].map((h) => h.textContent), ['C0', 'C1', 'C2', 'C3', 'C4'], 'clearing the filter restores the original order');
});

test('brand: the site name lives in one module and no template hard-codes it', () => {
  const hits = ['src/layouts/Base.astro', 'src/pages/index.astro', 'src/pages/search.astro', 'src/pages/site-map.astro', 'src/pages/methodology.astro', 'src/pages/fees/[...slug].astro', 'src/lib/export.mjs']
    .filter((f) => read(f).includes('Columbus PM Guide'));
  assert.deepEqual(hits, []);
  assert.match(read('src/lib/brand.mjs'), /PUBLIC_SITE_NAME/);
});
