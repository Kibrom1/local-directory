import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import adapter from '../../scripts/scraper/adapters/example-fixture.mjs';
import { sanitizeCandidate } from '../../scripts/scraper/sanitize.mjs';
import { saveSnapshot, latestSnapshot, readSnapshotBody, readIndex } from '../../scripts/scraper/snapshots.mjs';
import { proposeChanges } from '../../scripts/scraper/normalize.mjs';
import { runScrape } from '../../scripts/scraper/runner.mjs';
import { recordRun, healthRow, loadHistory, isStale } from '../../scripts/scraper/health.mjs';
import { detectPageChanges, checkWatch } from '../../scripts/scraper/changes.mjs';
import { validateData } from '../../scripts/lib/validate-data.mjs';
import { baseData, clone, siteSource, schemaDir, root, company, fee, area, D } from '../helpers.mjs';

const TODAY = '2026-11-12';
const html = fs.readFileSync(path.join(root, 'tests/fixtures/example-company.html'), 'utf8');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pipe-'));
const URL1 = 'https://example-pm.test/pricing';

function dataWithSource() {
  const d = baseData();
  d.sources.push(siteSource('pm', 'example-pm.test'));
  d.geography.push({ id: 'geo_columbus_x', type: 'city', name: 'Atlantis', slug: 'atlantis', state: 'OH', parent_id: 'geo_franklin_county' });
  return d;
}
const source = (d) => d.sources.find((s) => s.id === 'src_pm');
const parse = (h = html, url = URL1) => sanitizeCandidate(adapter.parse({ html: h, url }));

test('example adapter extracts facts from the fixture and drops prose, images and unknown fields', () => {
  const { candidate, dropped } = parse();
  assert.equal(candidate.company.name, 'Example Property Management');
  assert.equal(candidate.company.website, 'https://example-pm.test');
  assert.deepEqual(candidate.company.address, { street: '1 Main St', city: 'Columbus', state: 'OH', zip: '43215' });
  assert.equal(candidate.company.phone, '(614) 555-0100');
  assert.deepEqual(candidate.service_areas, ['Columbus', 'Dublin', 'Atlantis']);
  assert.deepEqual(candidate.fees[0].management_pct, { type: 'pct_of_rent', value: 8 });
  assert.deepEqual(candidate.fees[0].leasing_fee, { type: 'pct_of_monthly_rent', period: 'one_time', value: 50, basis: "first month's rent" });
  assert.deepEqual(candidate.fees[0].renewal_fee, { type: 'flat_usd', period: 'one_time', value: 250 });
  // facts only: the "about" paragraph is not stored anywhere
  assert.ok(dropped.some((d) => /company\.bio/.test(d)));
  assert.ok(!JSON.stringify(candidate).includes('friendliest'));
  assert.ok(!JSON.stringify(candidate).includes('logo'));
});

test('sanitize: long strings, markup, negative numbers and unknown fee types are rejected', () => {
  const { candidate, dropped } = sanitizeCandidate({
    company: { name: 'X'.repeat(300), website: '<script>', phone: '(614) 555-0100', owner_name: 'Jane Doe', address: {} },
    service_areas: ['Columbus', 'y'.repeat(200)],
    fees: [{ management_pct: { type: 'pct_of_rent', value: -1 }, leasing_fee: { type: 'bogus', value: 5 }, renewal_fee: { type: 'flat_usd', value: 100 }, review: 'great' }],
    reviews: ['x']
  });
  assert.equal(candidate.company.name, null);
  assert.equal(candidate.company.website, null);
  assert.equal(candidate.fees[0].management_pct, null);
  assert.equal(candidate.fees[0].leasing_fee, null);
  assert.equal(candidate.fees[0].renewal_fee.value, 100);
  assert.deepEqual(candidate.service_areas, ['Columbus']);
  assert.ok(dropped.some((d) => /owner_name/.test(d)) && dropped.some((d) => /reviews/.test(d)) && dropped.some((d) => /fees\[0\]\.review/.test(d)));
});

test('snapshots: stored with URL and timestamp, indexed, and ignored by git', () => {
  const root1 = tmp();
  const m1 = saveSnapshot(root1, { sourceId: 'src_pm', url: URL1, status: 200, contentType: 'text/html', body: html, fetchedAt: '2026-11-12T10:00:00.000Z', userAgent: 'ua' });
  assert.equal(m1.url, URL1);
  assert.equal(m1.fetched_at, '2026-11-12T10:00:00.000Z');
  assert.equal(readSnapshotBody(root1, m1), html);
  const meta = JSON.parse(fs.readFileSync(path.join(root1, `${m1.file}.meta.json`), 'utf8'));
  assert.equal(meta.sha256, crypto.createHash('sha256').update(html).digest('hex'));
  saveSnapshot(root1, { sourceId: 'src_pm', url: URL1, status: 200, contentType: 'text/html', body: html + ' ', fetchedAt: '2026-11-13T10:00:00.000Z', userAgent: 'ua' });
  assert.equal(readIndex(root1, 'src_pm').length, 2);
  assert.equal(latestSnapshot(root1, 'src_pm', URL1).fetched_at, '2026-11-13T10:00:00.000Z');
  assert.equal(latestSnapshot(root1, 'src_pm', URL1, { before: '2026-11-13T00:00:00.000Z' }).fetched_at, '2026-11-12T10:00:00.000Z');
  const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8').split('\n');
  assert.ok(gi.includes('snapshots/') && gi.includes('.cache/') && gi.includes('reports/'));
});

test('change detection: new, unchanged, changed; robots change is detected', () => {
  const r = tmp();
  const m1 = saveSnapshot(r, { sourceId: 's', url: URL1, status: 200, contentType: 'text/html', body: 'a', fetchedAt: '2026-11-01T00:00:00.000Z', userAgent: 'u' });
  assert.equal(detectPageChanges(r, 's', [{ url: URL1, meta: m1 }], '2026-11-01T00:00:00.000Z')[0].status, 'new');
  const m2 = saveSnapshot(r, { sourceId: 's', url: URL1, status: 200, contentType: 'text/html', body: 'a', fetchedAt: '2026-11-02T00:00:00.000Z', userAgent: 'u' });
  assert.equal(detectPageChanges(r, 's', [{ url: URL1, meta: m2 }], '2026-11-02T00:00:00.000Z')[0].status, 'unchanged');
  const m3 = saveSnapshot(r, { sourceId: 's', url: URL1, status: 200, contentType: 'text/html', body: 'b', fetchedAt: '2026-11-03T00:00:00.000Z', userAgent: 'u' });
  assert.equal(detectPageChanges(r, 's', [{ url: URL1, meta: m3 }], '2026-11-03T00:00:00.000Z')[0].status, 'changed');
  assert.equal(checkWatch(r, 's', 'robots:https://x', 'h1').first_seen, true);
  assert.equal(checkWatch(r, 's', 'robots:https://x', 'h1').changed, false);
  assert.equal(checkWatch(r, 's', 'robots:https://x', 'h2').changed, true);
});

const cand = (h = html) => ({ candidate: parse(h).candidate, url: URL1, capturedDate: TODAY });
const propose = (d, candidates, extra = {}) => proposeChanges({ candidates, data: d, source: source(d), today: TODAY, schemaDir, ...extra });

test('normalize: a new company becomes a flagged proposal with provenance, unverified fees, and a valid dataset', () => {
  const d = dataWithSource();
  const before = clone(d);
  const r = propose(d, [cand()]);
  assert.deepEqual(d, before, 'input data must not be mutated');
  const add = r.changes.find((c) => c.op === 'add_company');
  assert.ok(add.flagged);
  assert.equal(add.source_id, 'src_pm'); assert.equal(add.source_url, URL1); assert.equal(add.captured_date, TODAY);
  const newFee = r.proposed['fee-schedules'].find((f) => f.company_id === add.company_id);
  assert.equal(newFee.verification_status, 'unverified');
  assert.deepEqual(newFee.source_urls, [URL1]);
  assert.deepEqual(r.validation.errors, []);
  assert.ok(r.anomalies.some((a) => a.kind === 'unknown_area' && /Atlantis/.test(a.detail)) === false, 'Atlantis is in the test geography');
  assert.ok(r.changes.some((c) => c.op === 'add_service_area'));
  for (const c of r.changes) assert.ok(c.source_id && c.source_url && c.captured_date, `${c.op} lacks provenance`);
});

test('normalize: a changed fee is proposed, never auto-verified; every change carries provenance', () => {
  const d = dataWithSource();
  const first = propose(d, [cand()]);
  const d2 = first.proposed; // pretend it was merged
  const co = d2.companies.find((c) => c.name === 'Example Property Management');
  d2['fee-schedules'].find((f) => f.company_id === co.id).verification_status = 'verified_own_site';
  const r = propose(d2, [cand(html.replace('8%', '9%'))]);
  const mod = r.changes.find((c) => c.op === 'modify' && /management_pct/.test(c.field));
  assert.deepEqual(mod.before, { type: 'pct_of_rent', value: 8 });
  assert.deepEqual(mod.after, { type: 'pct_of_rent', value: 9 });
  assert.ok(!mod.flagged); // 12.5% < 25%
  assert.ok(r.changes.some((c) => c.op === 'unverify'));
  assert.equal(r.proposed['fee-schedules'].find((f) => f.company_id === co.id).verification_status, 'unverified');
  assert.equal(d2['fee-schedules'].find((f) => f.company_id === co.id).verification_status, 'verified_own_site');
  assert.deepEqual(r.validation.errors, []);
});

test('normalize: anomaly flags for >25% change, value to null, and a disappeared company', () => {
  const d = dataWithSource();
  const first = propose(d, [cand()]);
  const d2 = first.proposed;
  const big = propose(d2, [cand(html.replace('8%', '12%'))]);
  assert.ok(big.anomalies.some((a) => a.kind === 'fee_change_over_limit'));
  assert.ok(big.changes.find((c) => /management_pct/.test(c.field || '') && c.op === 'modify').flagged);
  const gone = propose(d2, [cand(html.replace(/<td class="fee-management">8%<\/td>/, '<td class="fee-management">call us</td>'))]);
  assert.ok(gone.anomalies.some((a) => a.kind === 'value_to_null'));
  const co = gone.proposed.companies.find((c) => c.name === 'Example Property Management');
  assert.equal(gone.proposed['fee-schedules'].find((f) => f.company_id === co.id).management_pct.value, 8, 'value_to_null is flagged, not applied');
  const missing = propose(d2, [], { expectFullSource: true });
  assert.ok(missing.anomalies.some((a) => a.kind === 'company_disappeared'));
});

test('normalize: suppressed companies are rejected by domain, name and id, with a logged reason', () => {
  for (const rec of [{ company_id: null, domain: 'example-pm.test', name: null }, { company_id: null, domain: null, name: 'example property management' }]) {
    const d = dataWithSource();
    d.suppression.push({ id: 'sup_9', reason: 'owner_request', requested_date: D, ...rec });
    const r = propose(d, [cand()]);
    assert.equal(r.changes.length, 0);
    assert.match(r.rejected[0].reason, /suppressed \(sup_9/);
    assert.equal(r.proposed.companies.length, d.companies.length);
  }
});

test('runner: end to end with a fake network. Writes a proposal and snapshots, never touches data/', async () => {
  const d = dataWithSource();
  const dataDir = tmp(); for (const n of Object.keys(d)) fs.writeFileSync(path.join(dataDir, `${n}.json`), JSON.stringify(d[n], null, 2));
  const hashDir = () => crypto.createHash('sha256').update(fs.readdirSync(dataDir).sort().map((f) => fs.readFileSync(path.join(dataDir, f), 'utf8')).join('')).digest('hex');
  const h0 = hashDir();
  const base = tmp();
  const fetchImpl = async (url) => (url.endsWith('/robots.txt') ? new Response('User-agent: *\nDisallow: /private\n') : url.endsWith('/private/x') ? new Response('no') : new Response(html, { headers: { 'content-type': 'text/html' } }));
  const out = path.join(base, 'reports', 'scraper', 'run1');
  const r = await runScrape({ data: d, sourceId: 'src_pm', adapter, urls: [URL1, 'https://example-pm.test/private/x'], snapshotRoot: path.join(base, 'snapshots'), outDir: out, cacheDir: path.join(base, 'cache'), schemaDir, today: TODAY,
    fetcherOptions: { contactUrl: 'https://operator.example.org/contact', fetchImpl, sleep: async () => {}, minIntervalMs: 0 } });
  assert.equal(r.refused, false);
  assert.equal(r.run.urls_attempted, 2); assert.equal(r.run.urls_ok, 1); assert.equal(r.run.robots_blocked, 1);
  for (const f of ['diff-report.md', 'changes.json', 'run-report.json', 'proposed/companies.json', 'proposed/fee-schedules.json']) assert.ok(fs.existsSync(path.join(out, f)), f);
  assert.match(fs.readFileSync(path.join(out, 'diff-report.md'), 'utf8'), /Proposal only: nothing in data\/ was changed/);
  assert.equal(readIndex(path.join(base, 'snapshots'), 'src_pm').filter((x) => x.kind === 'page').length, 1);
  assert.equal(hashDir(), h0, 'data directory unchanged');
  const proposedFiles = Object.fromEntries(['companies', 'fee-schedules', 'service-areas'].map((n) => [n, JSON.parse(fs.readFileSync(path.join(out, 'proposed', `${n}.json`), 'utf8'))]));
  assert.deepEqual(validateData({ ...d, ...proposedFiles }, { schemaDir, today: TODAY }).errors, []);
});

test('runner: refuses a source that is not approved', async () => {
  const d = dataWithSource(); d.sources.find((s) => s.id === 'src_pm').tos_decision = 'not_checked';
  const r = await runScrape({ data: d, sourceId: 'src_pm', adapter, urls: [URL1], snapshotRoot: tmp(), outDir: tmp(), cacheDir: tmp(), schemaDir, today: TODAY, fetcherOptions: { contactUrl: 'https://o.example.org/c', fetchImpl: async () => { throw new Error('must not fetch'); } } });
  assert.equal(r.refused, true);
  assert.ok(r.reasons.some((x) => /tos_decision/.test(x)));
});

test('runner: suppressed domain is never fetched', async () => {
  const d = dataWithSource(); d.suppression.push({ id: 'sup_1', company_id: null, domain: 'example-pm.test', name: null, reason: 'owner_request', requested_date: D });
  let calls = 0;
  const r = await runScrape({ data: d, sourceId: 'src_pm', adapter, urls: [URL1], snapshotRoot: tmp(), outDir: tmp(), cacheDir: tmp(), schemaDir, today: TODAY, fetcherOptions: { contactUrl: 'https://o.example.org/c', fetchImpl: async () => { calls++; return new Response(''); }, sleep: async () => {}, minIntervalMs: 0 } });
  assert.equal(calls, 0);
  assert.equal(r.run.suppression_rejections, 1);
});

test('runner: a changed robots.txt pauses the source; health marks a source stale after two failed runs', async () => {
  const d = dataWithSource(); const base = tmp();
  let robots = 'User-agent: *\nDisallow: /private\n';
  const fetchImpl = async (url) => (url.endsWith('/robots.txt') ? new Response(robots) : new Response(html, { headers: { 'content-type': 'text/html' } }));
  const go = (n, cacheName) => runScrape({ data: d, sourceId: 'src_pm', adapter, urls: [URL1], snapshotRoot: path.join(base, 'snap'), outDir: path.join(base, 'reports', 'scraper', `r${n}`), cacheDir: path.join(base, cacheName), schemaDir, today: TODAY, fetcherOptions: { contactUrl: 'https://o.example.org/c', fetchImpl, sleep: async () => {}, minIntervalMs: 0 } });
  const a = await go(1, 'c1');
  assert.equal(a.run.paused, false);
  robots = 'User-agent: *\nDisallow: /pricing\n'; // now blocks the page and the file changed
  const b = await go(2, 'c2');
  assert.equal(b.run.robots_changed, true); assert.equal(b.run.paused, true);
  assert.match(b.run.pause_reason, /robots\.txt changed/);
  assert.equal(b.health.failed, true); assert.equal(b.health.stale, false);
  const c = await go(3, 'c3');
  assert.equal(c.health.stale, true, 'two failed runs in a row');
  assert.match(fs.readFileSync(path.join(base, 'reports', 'scraper', 'r3', 'run-report.json'), 'utf8'), /robots_disallowed/);
});

test('health: success rate, parse-failure increase, stale rule', () => {
  const f = path.join(tmp(), 'history.json');
  const run = (o) => ({ source_id: 's', run_at: 'x', urls_attempted: 10, urls_ok: 10, parse_failures: 0, schema_failures: 0, facts_changed: 0, suppression_rejections: 0, robots_blocked: 0, ...o });
  recordRun(f, run({}));
  recordRun(f, run({ urls_ok: 8, parse_failures: 2 }));
  let h = healthRow(loadHistory(f).s);
  assert.equal(h.success_rate, 0.8); assert.equal(h.parse_failures_increased, true); assert.equal(h.failed, true); assert.equal(h.stale, false);
  recordRun(f, run({ urls_ok: 5 }));
  assert.equal(isStale(loadHistory(f).s), true);
  recordRun(f, run({}));
  assert.equal(isStale(loadHistory(f).s), false);
});
