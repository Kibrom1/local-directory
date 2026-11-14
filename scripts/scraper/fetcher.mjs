// Polite fetcher: identifies itself with a contact URL from an env var, checks
// robots.txt before every network fetch, rate-limits per domain, caches responses,
// and backs off on 429/5xx. It never changes TLS settings (uses the platform fetch as is).
import fs from 'node:fs';
import path from 'node:path';
import { parseRobots, isAllowed, crawlDelay } from './robots.mjs';
import { assertAllowed } from './allowlist.mjs';
import { urlSuppressed } from './suppression.mjs';
import { sha256 } from './snapshots.mjs';

export class ConfigError extends Error { constructor(m) { super(m); this.name = 'ConfigError'; } }
export class RobotsDisallowedError extends Error { constructor(url) { super(`robots.txt disallows ${url}`); this.name = 'RobotsDisallowedError'; this.url = url; } }
export class RobotsUnavailableError extends Error { constructor(origin, why) { super(`robots.txt for ${origin} unavailable (${why}); refusing to fetch`); this.name = 'RobotsUnavailableError'; } }
export class SuppressedError extends Error { constructor(url, rec) { super(`${url} is on the suppression list (${rec.record.id}, matched by ${rec.by})`); this.name = 'SuppressedError'; this.suppression = rec; } }
export class OffSourceError extends Error { constructor(url, source) { super(`${url} is outside source ${source.id}`); this.name = 'OffSourceError'; } }
export class FetchError extends Error { constructor(m, status = null) { super(m); this.name = 'FetchError'; this.status = status; } }

// Reads a response body with a hard byte cap, so an oversized response is never fully buffered.
async function readCapped(res, max, label) {
  const tooBig = () => new FetchError(`response for ${label} exceeds ${max} bytes`);
  const declared = Number(res.headers && res.headers.get && res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) { try { await res.body?.cancel?.(); } catch { /* ignore */ } throw tooBig(); }
  if (res.body && typeof res.body.getReader === 'function') {
    const reader = res.body.getReader(); const chunks = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) { try { await reader.cancel(); } catch { /* ignore */ } throw tooBig(); }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  const text = await res.text();
  if (Buffer.byteLength(text) > max) throw tooBig();
  return text;
}

const hostOf = (u) => new URL(u).hostname.toLowerCase();
const stripWww = (h) => h.replace(/^www\./, '');
const onSource = (url, source) => { const a = stripWww(hostOf(source.url)); const b = stripWww(hostOf(url)); return a === b || b.endsWith(`.${a}`); };

export class PoliteFetcher {
  constructor({
    contactUrl = process.env.SCRAPER_CONTACT_URL, fetchImpl = globalThis.fetch, cacheDir = '.cache/scraper',
    now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    minIntervalMs = 5000, maxRetries = 3, backoffBaseMs = 2000, maxBackoffMs = 60000, cacheTtlMs = 24 * 3600 * 1000, robotsTtlMs = 24 * 3600 * 1000,
    maxRedirects = 5, maxBytes = 2 * 1024 * 1024, timeoutMs = 20000, suppression = [], today = null, onRobots = null, onEvent = null
  } = {}) {
    if (!contactUrl || !/^https?:\/\/[^\s]+$/.test(contactUrl)) throw new ConfigError('SCRAPER_CONTACT_URL must be set to an http(s) URL where site owners can reach the operator');
    Object.assign(this, { contactUrl, fetchImpl, cacheDir, now, sleep, minIntervalMs, maxRetries, backoffBaseMs, maxBackoffMs, cacheTtlMs, robotsTtlMs, maxRedirects, maxBytes, timeoutMs, suppression, today, onRobots, onEvent });
    this.agentToken = 'ColumbusPMDirectoryBot';
    this.userAgent = `${this.agentToken}/0.1 (+${contactUrl})`;
    this.nextAt = new Map(); // host -> earliest next request time (ms)
    this.robots = new Map(); // origin -> { parsed, fetchedAt, hash, status }
    this.stats = { network: 0, cacheHits: 0, robotsFetches: 0, retries: 0 };
  }

  emit(e) { if (this.onEvent) this.onEvent(e); }

  async wait(host, extraDelaySec = null) {
    const interval = Math.max(this.minIntervalMs, (extraDelaySec || 0) * 1000);
    const t = this.nextAt.get(host) || 0;
    const delay = t - this.now();
    if (delay > 0) await this.sleep(delay);
    this.nextAt.set(host, this.now() + interval);
  }

  // One HTTP request with rate limiting and back-off. Does NOT check robots (caller does).
  async request(url, { delaySec = null } = {}) {
    const host = hostOf(url);
    for (let attempt = 0; ; attempt++) {
      await this.wait(host, delaySec);
      this.stats.network++;
      this.emit({ type: 'request', url, attempt });
      let res;
      try {
        res = await this.fetchImpl(url, { redirect: 'manual', headers: { 'User-Agent': this.userAgent, Accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.1' }, signal: AbortSignal.timeout(this.timeoutMs) });
      } catch (e) {
        if (attempt >= this.maxRetries) throw new FetchError(`network error for ${url}: ${e.message}`);
        this.stats.retries++;
        await this.sleep(Math.min(this.maxBackoffMs, this.backoffBaseMs * 2 ** attempt));
        continue;
      }
      if (res.status === 429 || res.status === 503 || res.status === 502 || res.status === 504 || res.status === 500) {
        if (attempt >= this.maxRetries) throw new FetchError(`giving up on ${url} after ${attempt + 1} attempts (HTTP ${res.status})`, res.status);
        this.stats.retries++;
        const ra = res.headers.get('retry-after');
        let ms = this.backoffBaseMs * 2 ** attempt;
        if (ra) { const n = Number(ra); ms = Number.isFinite(n) ? n * 1000 : Math.max(0, Date.parse(ra) - this.now()) || ms; }
        const wait = Math.min(this.maxBackoffMs, ms);
        this.emit({ type: 'backoff', url, status: res.status, waitMs: wait });
        await this.sleep(wait);
        continue;
      }
      return res;
    }
  }

  async robotsFor(url) {
    const origin = new URL(url).origin;
    const cached = this.robots.get(origin);
    if (cached && this.now() - cached.fetchedAt < this.robotsTtlMs) return cached;
    this.stats.robotsFetches++;
    let res;
    try { res = await this.request(`${origin}/robots.txt`); } catch (e) { throw new RobotsUnavailableError(origin, e.message); }
    let entry;
    if (res.status >= 300 && res.status < 400) throw new RobotsUnavailableError(origin, `redirect (HTTP ${res.status})`);
    if (res.status === 200) { let text; try { text = await readCapped(res, 512 * 1024, `${origin}/robots.txt`); } catch (e) { throw new RobotsUnavailableError(origin, e.message); }
       entry = { parsed: parseRobots(text), text, hash: sha256(text), status: 200 }; }
    else if (res.status === 404 || res.status === 410) entry = { parsed: parseRobots(''), text: '', hash: sha256(''), status: res.status };
    else if (res.status === 401 || res.status === 403) entry = { parsed: parseRobots('User-agent: *\nDisallow: /'), text: null, hash: null, status: res.status };
    else throw new RobotsUnavailableError(origin, `HTTP ${res.status}`);
    entry.fetchedAt = this.now();
    entry.origin = origin;
    this.robots.set(origin, entry);
    if (this.onRobots) this.onRobots({ origin, hash: entry.hash, status: entry.status, text: entry.text });
    return entry;
  }

  cachePath(url) { return path.join(this.cacheDir, hostOf(url), `${sha256(url)}.json`); }
  readCache(url) {
    try { const c = JSON.parse(fs.readFileSync(this.cachePath(url), 'utf8')); return this.now() - c.fetchedAtMs < this.cacheTtlMs ? c : null; } catch { return null; }
  }
  writeCache(url, rec) { const f = this.cachePath(url); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(rec)); }

  // Fetch one URL on behalf of an approved source.
  async fetch(url, { source }) {
    assertAllowed(source, { today: this.today || undefined });
    if (!/^https?:$/.test(new URL(url).protocol)) throw new FetchError(`unsupported protocol for ${url}`);
    let current = url;
    for (let hop = 0; hop <= this.maxRedirects; hop++) {
      const sup = urlSuppressed(current, this.suppression);
      if (sup) throw new SuppressedError(current, sup);
      if (!onSource(current, source)) throw new OffSourceError(current, source);
      // robots.txt is checked before the cache is used, so a cached page is never served for a path robots.txt now disallows
      // and robots changes are noticed even on cache hits (robots.txt itself is cached in memory for robotsTtlMs).
      const robots = await this.robotsFor(current);
      const u = new URL(current);
      if (!isAllowed(robots.parsed, this.agentToken, `${u.pathname}${u.search}`)) throw new RobotsDisallowedError(current);
      const cached = this.readCache(current);
      if (cached) { this.stats.cacheHits++; return { url, finalUrl: cached.finalUrl, status: cached.status, contentType: cached.contentType, body: cached.body, fromCache: true, fetchedAt: new Date(cached.fetchedAtMs).toISOString() }; }
      const res = await this.request(current, { delaySec: crawlDelay(robots.parsed, this.agentToken) });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { try { await res.body?.cancel?.(); } catch { /* ignore */ } current = new URL(res.headers.get('location'), current).href; continue; }
      const text = await readCapped(res, this.maxBytes, current);
      const contentType = res.headers.get('content-type') || null;
      const rec = { finalUrl: current, status: res.status, contentType, body: text, fetchedAtMs: this.now() };
      if (res.status === 200) this.writeCache(url === current ? current : url, rec);
      return { url, finalUrl: current, status: res.status, contentType, body: text, fromCache: false, fetchedAt: new Date(rec.fetchedAtMs).toISOString() };
    }
    throw new FetchError(`too many redirects for ${url}`);
  }
}
