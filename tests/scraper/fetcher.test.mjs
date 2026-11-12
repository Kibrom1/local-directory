import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PoliteFetcher, ConfigError, RobotsDisallowedError, RobotsUnavailableError, SuppressedError, OffSourceError, FetchError } from '../../scripts/scraper/fetcher.mjs';
import { SourceNotAllowedError } from '../../scripts/scraper/allowlist.mjs';
import { siteSource, root } from '../helpers.mjs';

const TODAY = '2026-11-12';
const source = siteSource('pm', 'example-pm.test');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fetch-'));

// Fake network: routes map url -> response spec or function. Records every request.
function harness(routes, opts = {}) {
  const log = []; let t = 1_000_000;
  const fetchImpl = async (url, init) => {
    log.push({ url, ua: init.headers['User-Agent'], t });
    const r = routes[url];
    const spec = typeof r === 'function' ? r(log.filter((x) => x.url === url).length) : r;
    if (!spec) return new Response('not found', { status: 404 });
    return new Response(spec.body ?? '', { status: spec.status ?? 200, headers: spec.headers ?? { 'content-type': 'text/html' } });
  };
  const sleeps = [];
  const f = new PoliteFetcher({ contactUrl: 'https://operator.example.org/contact', fetchImpl, cacheDir: tmp(), now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; }, today: TODAY, ...opts });
  return { f, log, sleeps, advance: (ms) => { t += ms; } };
}
const ROBOTS = 'https://example-pm.test/robots.txt';

test('requires SCRAPER_CONTACT_URL and builds an identifying user agent', () => {
  const prev = process.env.SCRAPER_CONTACT_URL; delete process.env.SCRAPER_CONTACT_URL;
  assert.throws(() => new PoliteFetcher({ fetchImpl: async () => {} }), ConfigError);
  assert.throws(() => new PoliteFetcher({ contactUrl: 'not a url', fetchImpl: async () => {} }), ConfigError);
  process.env.SCRAPER_CONTACT_URL = 'https://operator.example.org/contact';
  const f = new PoliteFetcher({ fetchImpl: async () => {}, cacheDir: tmp() });
  assert.match(f.userAgent, /^ColumbusPMDirectoryBot\/\d.* \(\+https:\/\/operator\.example\.org\/contact\)$/);
  if (prev === undefined) delete process.env.SCRAPER_CONTACT_URL; else process.env.SCRAPER_CONTACT_URL = prev;
});

test('fetches robots.txt first, then the page, both with the identifying user agent', async () => {
  const { f, log } = harness({ [ROBOTS]: { body: 'User-agent: *\nDisallow: /private\n', headers: { 'content-type': 'text/plain' } }, 'https://example-pm.test/a': { body: 'A' } });
  const r = await f.fetch('https://example-pm.test/a', { source });
  assert.equal(r.body, 'A');
  assert.deepEqual(log.map((x) => x.url), [ROBOTS, 'https://example-pm.test/a']);
  assert.ok(log.every((x) => /operator\.example\.org\/contact/.test(x.ua)));
});

test('robots-disallowed path makes no page request', async () => {
  const { f, log } = harness({ [ROBOTS]: { body: 'User-agent: *\nDisallow: /private\n' }, 'https://example-pm.test/private/x': { body: 'secret' } });
  await assert.rejects(f.fetch('https://example-pm.test/private/x', { source }), RobotsDisallowedError);
  assert.deepEqual(log.map((x) => x.url), [ROBOTS]);
});

test('robots.txt status handling: 404 allows, 403 and 5xx refuse', async () => {
  let h = harness({ 'https://example-pm.test/a': { body: 'A' } }); // robots 404 by default
  assert.equal((await h.f.fetch('https://example-pm.test/a', { source })).status, 200);
  h = harness({ [ROBOTS]: { status: 403 }, 'https://example-pm.test/a': { body: 'A' } });
  await assert.rejects(h.f.fetch('https://example-pm.test/a', { source }), RobotsDisallowedError);
  h = harness({ [ROBOTS]: { status: 500 }, 'https://example-pm.test/a': { body: 'A' } }, { maxRetries: 0 });
  await assert.rejects(h.f.fetch('https://example-pm.test/a', { source }), RobotsUnavailableError);
  assert.equal(h.log.filter((x) => x.url !== ROBOTS).length, 0);
});

test('per-domain rate limit: at least minIntervalMs between requests to one host', async () => {
  const { f, log } = harness({ [ROBOTS]: { body: '' }, 'https://example-pm.test/a': { body: 'A' }, 'https://example-pm.test/b': { body: 'B' }, 'https://sub.example-pm.test/c': { body: 'C' } }, { minIntervalMs: 5000 });
  await f.fetch('https://example-pm.test/a', { source });
  await f.fetch('https://example-pm.test/b', { source });
  const gaps = log.slice(1).map((x, i) => x.t - log[i].t);
  assert.ok(gaps.every((g) => g >= 5000), gaps.join(','));
  const before = log.length; const t0 = log[log.length - 1].t;
  await f.fetch('https://sub.example-pm.test/c', { source }); // other host: its own robots + no wait for first request
  assert.equal(log.length - before, 2);
  assert.ok(log[before].t - t0 < 5000);
});

test('Crawl-delay larger than the default interval is honored', async () => {
  const { f, log } = harness({ [ROBOTS]: { body: 'User-agent: *\nCrawl-delay: 12\n' }, 'https://example-pm.test/a': { body: 'A' } });
  await f.fetch('https://example-pm.test/a', { source });
  assert.ok(log[1].t - log[0].t >= 5000);
  await f.fetch('https://example-pm.test/a?x=1', { source }).catch(() => {});
  assert.ok(log[log.length - 1].t - log[1].t >= 12000);
});

test('caches responses: a second fetch makes no network request', async () => {
  const { f, log } = harness({ [ROBOTS]: { body: '' }, 'https://example-pm.test/a': { body: 'A' } });
  await f.fetch('https://example-pm.test/a', { source });
  const n = log.length;
  const r = await f.fetch('https://example-pm.test/a', { source });
  assert.equal(r.fromCache, true);
  assert.equal(log.length, n);
  assert.equal(f.stats.cacheHits, 1);
});

test('cache expires after the TTL', async () => {
  const h = harness({ [ROBOTS]: { body: '' }, 'https://example-pm.test/a': { body: 'A' } }, { cacheTtlMs: 1000 });
  await h.f.fetch('https://example-pm.test/a', { source });
  h.advance(5000);
  const r = await h.f.fetch('https://example-pm.test/a', { source });
  assert.equal(r.fromCache, false);
});

test('back-off: 429 with Retry-After waits that long, then succeeds', async () => {
  const { f, log, sleeps } = harness({ [ROBOTS]: { body: '' }, 'https://example-pm.test/a': (n) => (n === 1 ? { status: 429, headers: { 'retry-after': '30' } } : { body: 'ok' }) });
  const r = await f.fetch('https://example-pm.test/a', { source });
  assert.equal(r.body, 'ok');
  assert.ok(sleeps.includes(30000));
  assert.equal(f.stats.retries, 1);
  assert.equal(log.filter((x) => x.url.endsWith('/a')).length, 2);
});

test('back-off: exponential on 503 and gives up after maxRetries', async () => {
  const { f, sleeps, log } = harness({ [ROBOTS]: { body: '' }, 'https://example-pm.test/a': { status: 503 } }, { maxRetries: 2, backoffBaseMs: 1000, minIntervalMs: 0 });
  await assert.rejects(f.fetch('https://example-pm.test/a', { source }), FetchError);
  assert.deepEqual(sleeps.filter((s) => s >= 1000), [1000, 2000]);
  assert.equal(log.filter((x) => x.url.endsWith('/a')).length, 3);
});

test('redirects are followed manually: robots re-checked on the target, off-source targets refused', async () => {
  let h = harness({ [ROBOTS]: { body: 'User-agent: *\nDisallow: /blocked\n' }, 'https://example-pm.test/old': { status: 301, headers: { location: '/blocked/new' } }, 'https://example-pm.test/blocked/new': { body: 'x' } });
  await assert.rejects(h.f.fetch('https://example-pm.test/old', { source }), RobotsDisallowedError);
  assert.ok(!h.log.some((x) => x.url.endsWith('/blocked/new')));
  h = harness({ [ROBOTS]: { body: '' }, 'https://example-pm.test/old': { status: 302, headers: { location: 'https://evil.example.net/x' } } });
  await assert.rejects(h.f.fetch('https://example-pm.test/old', { source }), OffSourceError);
  h = harness({ [ROBOTS]: { body: '' }, 'https://example-pm.test/old': { status: 301, headers: { location: '/new' } }, 'https://example-pm.test/new': { body: 'N' } });
  assert.equal((await h.f.fetch('https://example-pm.test/old', { source })).finalUrl, 'https://example-pm.test/new');
});

test('suppressed domains are never fetched (no robots request either)', async () => {
  const h = harness({}, { suppression: [{ id: 'sup_1', company_id: null, domain: 'example-pm.test', name: null }] });
  await assert.rejects(h.f.fetch('https://example-pm.test/a', { source }), SuppressedError);
  assert.equal(h.log.length, 0);
});

test('a source that is not approved is refused before any request; URLs outside the source are refused', async () => {
  let h = harness({});
  await assert.rejects(h.f.fetch('https://example-pm.test/a', { source: { ...source, tos_decision: 'not_checked' } }), SourceNotAllowedError);
  assert.equal(h.log.length, 0);
  h = harness({});
  await assert.rejects(h.f.fetch('https://other.example.net/a', { source }), OffSourceError);
  assert.equal(h.log.length, 0);
});

test('network errors retry then fail; oversize responses are refused', async () => {
  const f = new PoliteFetcher({ contactUrl: 'https://operator.example.org/c', fetchImpl: async () => { throw new Error('boom'); }, cacheDir: tmp(), sleep: async () => {}, minIntervalMs: 0, maxRetries: 1, today: TODAY });
  await assert.rejects(f.fetch('https://example-pm.test/a', { source }), RobotsUnavailableError);
  const h = harness({ [ROBOTS]: { body: '' }, 'https://example-pm.test/big': { body: 'x'.repeat(100) } }, { maxBytes: 50 });
  await assert.rejects(h.f.fetch('https://example-pm.test/big', { source }), /exceeds/);
});

test('TLS verification is never disabled in the scraper code', () => {
  const dir = path.join(root, 'scripts', 'scraper');
  for (const file of fs.readdirSync(dir, { recursive: true }).filter((x) => x.endsWith('.mjs'))) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.ok(!/NODE_TLS_REJECT_UNAUTHORIZED|rejectUnauthorized|setGlobalDispatcher|insecure/i.test(src), file);
  }
});
