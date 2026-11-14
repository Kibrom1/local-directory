import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PoliteFetcher, FetchError, RobotsDisallowedError } from '../scripts/scraper/fetcher.mjs';
import { parseRobots, isAllowed, crawlDelay } from '../scripts/scraper/robots.mjs';
import { sanitizeCandidate } from '../scripts/scraper/sanitize.mjs';
import { proposeChanges } from '../scripts/scraper/normalize.mjs';
import { getPause, setPause, clearPause } from '../scripts/scraper/changes.mjs';
import { renderMarkdown } from '../src/lib/guides.mjs';
import { validateData } from '../scripts/lib/validate-data.mjs';
import { siteSource, schemaDir, TODAY, baseData } from './helpers.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rf-'));
const source = siteSource('pm', 'example-pm.test');
const make = (routes, opts = {}) => {
  const log = [];
  const fetchImpl = async (url) => {
    log.push(url);
    const r = routes[url];
    if (!r) return new Response('nf', { status: 404 });
    return typeof r === 'function' ? r() : new Response(r.body ?? '', { status: r.status ?? 200, headers: r.headers ?? { 'content-type': 'text/html' } });
  };
  return { log, f: new PoliteFetcher({ contactUrl: 'https://o.example.org/c', fetchImpl, cacheDir: tmp(), sleep: async () => {}, minIntervalMs: 0, today: TODAY, ...opts }) };
};

test('fetcher: an oversized response is cut off while streaming, not buffered whole', async () => {
  let pulled = 0;
  const big = () => new Response(new ReadableStream({ pull(c) { pulled += 1024; c.enqueue(new Uint8Array(1024)); } }), { status: 200, headers: { 'content-type': 'text/html' } });
  const { f } = make({ 'https://example-pm.test/robots.txt': { body: '' }, 'https://example-pm.test/big': big }, { maxBytes: 10 * 1024 });
  await assert.rejects(f.fetch('https://example-pm.test/big', { source }), FetchError);
  assert.ok(pulled < 100 * 1024, `stopped reading early (pulled ${pulled} bytes)`);
});

test('fetcher: a declared content-length over the cap is refused', async () => {
  const { f } = make({ 'https://example-pm.test/robots.txt': { body: '' }, 'https://example-pm.test/p': { body: 'x', headers: { 'content-type': 'text/html', 'content-length': '999999' } } }, { maxBytes: 1000 });
  await assert.rejects(f.fetch('https://example-pm.test/p', { source }), /exceeds/);
});

test('fetcher: robots.txt is enforced even when the page is cached', async () => {
  let robots = 'User-agent: *\nDisallow:\n';
  const routes = { 'https://example-pm.test/robots.txt': () => new Response(robots), 'https://example-pm.test/p': { body: '<p>hi</p>' } };
  const cacheDir = tmp();
  const a = make(routes, { cacheDir });
  assert.equal((await a.f.fetch('https://example-pm.test/p', { source })).fromCache, false);
  robots = 'User-agent: *\nDisallow: /p\n';
  const b = make(routes, { cacheDir }); // new fetcher: re-reads robots.txt, page is in the cache
  await assert.rejects(b.f.fetch('https://example-pm.test/p', { source }), RobotsDisallowedError);
});

test('robots: groups for the same agent are merged and percent-escapes compare equal', () => {
  const p = parseRobots('User-agent: bot\nDisallow: /x\n\nUser-agent: *\nDisallow: /star\n\nUser-agent: bot\nDisallow: /y\nCrawl-delay: 7\n');
  assert.equal(isAllowed(p, 'bot/1', '/x'), false);
  assert.equal(isAllowed(p, 'bot/1', '/y'), false);
  assert.equal(isAllowed(p, 'bot/1', '/star'), true, 'a specific group replaces the * group');
  assert.equal(isAllowed(p, 'other', '/star'), false);
  assert.equal(crawlDelay(p, 'bot/1'), 7);
  const q = parseRobots('User-agent: *\nDisallow: /%7Euser\nDisallow: /a%2fb\n');
  assert.equal(isAllowed(q, 'x', '/~user/page'), false);
  assert.equal(isAllowed(q, 'x', '/a%2Fb'), false);
});

test('pause state persists until cleared', () => {
  const r = tmp();
  assert.equal(getPause(r, 's'), null);
  setPause(r, 's', 'robots.txt changed');
  assert.equal(getPause(r, 's').reason, 'robots.txt changed');
  assert.equal(setPause(r, 's', 'later reason').reason, 'robots.txt changed', 'first reason is kept');
  assert.equal(clearPause(r, 's'), true);
  assert.equal(getPause(r, 's'), null);
});

test('sanitize: tolerates null entries and rejects non-http(s) URLs', () => {
  const { candidate } = sanitizeCandidate({ company: { name: 'A', website: 'javascript:alert(1)', address: null }, fees: [null, { source_url: 'ftp://x/y', management_pct: { type: 'pct_of_rent', plans: [null, { value: 8 }] } }], service_areas: [null, 'Columbus'] });
  assert.equal(candidate.company.website, null);
  assert.equal(candidate.fees.length, 1);
  assert.equal(candidate.fees[0].source_url, null);
  assert.deepEqual(candidate.fees[0].management_pct.plans, [{ value: 8 }]);
  assert.deepEqual(candidate.service_areas, ['Columbus']);
  assert.doesNotThrow(() => sanitizeCandidate(null));
});

test('normalize: scraped values never overwrite a reviewed row from another source', () => {
  const d = baseData();
  const co = d.companies[0];
  d['fee-schedules'][0].verification_status = 'company_submitted';
  d['fee-schedules'][0].source_id = 'src_sub';
  const src = siteSource('c1', 'c1.example.com');
  const cand = { company: { name: co.name, website: co.website, phone: null, address: { street: null, city: null, state: null, zip: null } }, service_areas: [], fees: [{ property_type: null, source_url: 'https://c1.example.com/pricing', management_pct: { type: 'pct_of_rent', value: 10 }, flat_fee: null, leasing_fee: null, renewal_fee: null, minimums: null }] };
  const r = proposeChanges({ candidates: [{ candidate: cand, url: 'https://c1.example.com/pricing', capturedDate: TODAY }], data: d, source: src, today: TODAY, schemaDir });
  assert.equal(r.changes.filter((c) => c.field && c.field.includes('management_pct')).length, 0);
  assert.ok(r.anomalies.some((a) => a.kind === 'source_conflict'));
  assert.equal(r.proposed['fee-schedules'][0].management_pct.value, 8);
});

test('normalize: the unverify change records the real previous status', () => {
  const d = baseData();
  const co = d.companies[0];
  d['fee-schedules'][0].verification_status = 'unverified';
  const src = siteSource('c1', 'c1.example.com', {});
  src.id = 'src_c1';
  const cand = { company: { name: co.name, website: co.website, phone: null, address: { street: null, city: null, state: null, zip: null } }, service_areas: [], fees: [{ property_type: null, source_url: 'https://c1.example.com/pricing', management_pct: { type: 'pct_of_rent', value: 9 }, flat_fee: null, leasing_fee: null, renewal_fee: null, minimums: null }] };
  const r = proposeChanges({ candidates: [{ candidate: cand, url: 'https://c1.example.com/pricing', capturedDate: TODAY }], data: d, source: src, today: TODAY, schemaDir });
  assert.ok(r.changes.some((c) => c.op === 'modify' && c.field.endsWith('management_pct')));
  assert.equal(r.changes.some((c) => c.op === 'unverify'), false, 'no unverify entry for a row that was already unverified');
});

test('guides: link attributes are escaped and unsafe schemes are not linked', () => {
  const { html } = renderMarkdown('[ok](https://example.org/a?x=1&y=2 "a \\"q\\" title") [bad](javascript:alert(1)) [rel](/guides/x/) [mail](mailto:a@b.co)');
  assert.match(html, /href="https:\/\/example\.org\/a\?x=1&amp;y=2"/);
  assert.match(html, /title="a &quot;q&quot; title"/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /href="\/guides\/x\/"/);
  assert.match(html, /href="mailto:a@b\.co"/);
});

test('validate: a website must be http(s); suppression matches subdomains like the scraper', () => {
  const d = baseData();
  d.companies[0].website = 'javascript:alert(1)';
  assert.ok(validateData(d, { schemaDir, today: TODAY }).errors.some((e) => /website/.test(e)));
  const e = baseData();
  e.companies[0].website = 'https://www.shop.badco.com';
  e.suppression.push({ id: 'sup_1', company_id: null, domain: 'badco.com', name: null, requested_date: '2026-11-01', reason: 'owner_request' });
  const errs = validateData(e, { schemaDir, today: TODAY }).errors;
  assert.ok(errs.some((x) => /suppressed company still present/.test(x)), errs.join('\n'));
});

test('base layout: JSON-LD output cannot close its script tag', () => {
  const src = fs.readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
  assert.match(src, /replace\(\/<\/g, '\\\\u003c'\)/);
  const esc = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
  assert.doesNotMatch(esc({ name: '</script><script>x' }), /<\/script>/i);
  assert.equal(JSON.parse(esc({ name: '</script>' })).name, '</script>');
});
