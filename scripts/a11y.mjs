// Automated accessibility check of the built pages with axe-core.
//   node scripts/a11y.mjs [--dist=dist] [--engine=chrome|jsdom] [--chrome=/path/to/chrome]
// Engine "chrome" (preferred): headless Chrome via puppeteer-core at 320px and 1280px wide. Real layout, so colour
// contrast and target-size rules run. Also exercises states: mobile menu open, correction form with errors shown.
// Engine "jsdom" (fallback when no Chrome is found): axe-core in jsdom. No layout engine, so colour contrast and
// layout rules cannot run; the run says so. Exit 1 on any serious or critical violation (or any violation with --strict-all).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadPages, walk, urlPath, parseArgs } from './lib/dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { flags, kv } = parseArgs(process.argv.slice(2));
const dist = path.resolve(root, kv.dist || 'dist');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const axeVersion = require('axe-core/package.json').version;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
if (!fs.existsSync(dist)) { console.error(`a11y FAILED: ${dist} does not exist. Run npm run build first.`); process.exit(1); }

const CHROME = [kv.chrome, process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => fs.existsSync(p));
const engine = kv.engine || (CHROME ? 'chrome' : 'jsdom');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.wasm': 'application/wasm' };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(dist, p);
    if (!f.startsWith(dist)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

const results = []; // { page, state, viewport, violations: [{id, impact, help, nodes:[target]}] }
const pageList = loadPages(dist).filter((p) => !p.redirect);
const slim = (vs) => vs.map((v) => ({ id: v.id, impact: v.impact, help: v.help, tags: v.tags.filter((t) => t.startsWith('wcag') || t === 'best-practice'), nodes: v.nodes.slice(0, 5).map((n) => `${n.target.join(' ')} :: ${(n.failureSummary || '').split('\n').slice(1, 3).join(' ').trim()}`), count: v.nodes.length }));

async function runChrome() {
  const puppeteer = (await import('puppeteer-core')).default;
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const version = await browser.version();
  const scan = async (page, label, state, viewport) => {
    await page.evaluate(axeSource);
    const r = await page.evaluate(async (tags) => {
      const all = await axe.run(document, { runOnly: { type: 'tag', values: tags.concat(['best-practice']) }, resultTypes: ['violations'] });
      return all.violations;
    }, TAGS);
    const v = slim(r);
    // WCAG 1.4.10 Reflow: at 320 CSS px nothing may force sideways scrolling of the page (data tables scroll inside a labelled region).
    if (viewport === 320) {
      const over = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest('[role=region][tabindex]') && getComputedStyle(e).position !== 'absolute').slice(0, 3).map((e) => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '')) }));
      if (over.sw > over.iw) v.push({ id: 'reflow-320', impact: 'serious', help: 'Page scrolls sideways at 320px (WCAG 1.4.10)', tags: ['wcag143-reflow', 'wcag21aa'], nodes: [`document width ${over.sw}px > ${over.iw}px; wide elements: ${over.wide.join(', ') || 'none found'}`], count: 1 });
    }
    results.push({ page: label, state, viewport, violations: v });
  };
  for (const [vw, vh] of [[320, 800], [1280, 900]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    for (const p of pageList) {
      await page.goto(base + p.path, { waitUntil: 'networkidle0' });
      if (p.path === '/search/') { await page.waitForSelector('.pagefind-ui__search-input', { timeout: 5000 }).catch(() => {}); }
      await scan(page, p.path, 'default', vw);
      if (vw === 320) {
        const toggle = await page.$('.nav-toggle');
        if (toggle && p.path === '/') { await toggle.click(); await scan(page, p.path, 'mobile menu open', vw); }
      }
      if (p.path === '/corrections/' && (await page.$('#correct-form'))) {
        await page.click('#correct-form button[type=submit]');
        await scan(page, p.path, 'form errors shown', vw);
        await page.goto(base + '/corrections/?type=remove&company=Example', { waitUntil: 'networkidle0' });
        await scan(page, p.path, 'removal selected, fact fields hidden', vw);
      }
      if (p.path === '/fees/') {
        const boxes = await page.$$('#fee-table input[type=checkbox]');
        if (boxes.length >= 2) { await boxes[0].evaluate((b) => b.click()); await boxes[1].evaluate((b) => b.click()); await page.click('#show-selected'); await scan(page, p.path, 'compare mode, 2 selected', vw); }
      }
      if (p.path === '/search/') {
        const input = await page.$('.pagefind-ui__search-input');
        if (input) { await input.type('mynd'); await new Promise((r) => setTimeout(r, 1500)); await scan(page, p.path, 'search with results', vw); }
      }
    }
    await page.close();
  }
  await browser.close();
  server.close();
  return `headless ${version} via puppeteer-core ${require('puppeteer-core/package.json').version}, viewports 320px and 1280px, real layout (colour contrast and target size evaluated)`;
}

async function runJsdom() {
  const { JSDOM } = await import('jsdom');
  for (const p of pageList) {
    const dom = new JSDOM(p.html, { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval(axeSource);
    const r = await dom.window.axe.run(dom.window.document, { runOnly: { type: 'tag', values: TAGS.concat(['best-practice']) }, resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false }, 'scrollable-region-focusable': { enabled: false } } });
    results.push({ page: p.path, state: 'default', viewport: 'none', violations: slim(r.violations) });
    dom.window.close();
  }
  return 'axe-core in jsdom (no layout engine: colour contrast, target size and scrollable-region rules could not run; interactive states not exercised)';
}

const how = engine === 'chrome' ? await runChrome() : await runJsdom();
const bad = (v) => v.impact === 'serious' || v.impact === 'critical' || flags.has('--strict-all');
let failures = 0;
const seen = new Map();
for (const r of results) for (const v of r.violations) {
  const key = `${v.id}|${r.page}|${r.state}`;
  const e = seen.get(key) || { ...v, page: r.page, state: r.state, viewports: [] };
  e.viewports.push(r.viewport); seen.set(key, e);
}
const items = [...seen.values()];
console.log(`axe-core ${axeVersion}: ${how}`);
console.log(`Scanned ${pageList.length} pages, ${results.length} scans (rule tags: ${TAGS.join(', ')}, plus best-practice).`);
const wcag = items.filter((v) => v.tags.some((t) => t.startsWith('wcag')));
const advisory = items.filter((v) => !v.tags.some((t) => t.startsWith('wcag')));
for (const [title, list] of [['WCAG violations', wcag], ['Best-practice advisories (not WCAG failures)', advisory]]) {
  if (!list.length) { console.log(`\n${title}: none`); continue; }
  console.log(`\n${title}: ${list.length}`);
  for (const v of list) { console.log(`  [${v.impact}] ${v.id} on ${v.page} (${v.state}, ${[...new Set(v.viewports)].join('/')}px): ${v.help}`); for (const n of v.nodes.slice(0, 3)) console.log(`      ${n}`); }
}
for (const v of wcag) if (bad(v)) failures += 1;
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'a11y-report.json'), JSON.stringify({ generated_at: new Date().toISOString(), engine, how, axe: axeVersion, pages: pageList.map((p) => p.path), results }, null, 2) + '\n');
console.log('\nNot covered by this check: keyboard-only walkthrough, screen reader testing (NVDA/VoiceOver), 200% zoom and text-spacing overrides, forced-colors mode, and WCAG criteria axe cannot test automatically. Automated checks find only part of the issues; do not claim conformance from this run alone.');
if (failures) { console.error(`\na11y FAILED: ${failures} serious/critical WCAG violation group(s).`); process.exit(1); }
console.log('\na11y passed (no serious or critical WCAG violations found by axe).');
