import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRobots, isAllowed, crawlDelay } from '../../scripts/scraper/robots.mjs';
import { evaluateSource, buildAllowlist, assertAllowed, SourceNotAllowedError } from '../../scripts/scraper/allowlist.mjs';
import { matchSuppression, urlSuppressed } from '../../scripts/scraper/suppression.mjs';
import { readData } from '../../scripts/lib/validate-data.mjs';
import { root, siteSource } from '../helpers.mjs';

const BOT = 'ColumbusPMDirectoryBot';

test('robots: wildcard group, longest match, Allow beats Disallow on ties', () => {
  const p = parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/ok\nDisallow: /*.pdf$\nCrawl-delay: 10\n');
  assert.equal(isAllowed(p, BOT, '/public'), true);
  assert.equal(isAllowed(p, BOT, '/private/x'), false);
  assert.equal(isAllowed(p, BOT, '/private/ok/page'), true);
  assert.equal(isAllowed(p, BOT, '/files/a.pdf'), false);
  assert.equal(isAllowed(p, BOT, '/files/a.pdf?x=1'), true);
  assert.equal(crawlDelay(p, BOT), 10);
});

test('robots: specific agent group overrides *, empty Disallow allows everything, comments ignored', () => {
  const p = parseRobots('# hi\nUser-agent: *\nDisallow: / # all\n\nUser-agent: columbuspmdirectorybot\nDisallow:\n');
  assert.equal(isAllowed(p, BOT, '/anything'), true);
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow:\n'), BOT, '/x'), true);
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow: /\n'), BOT, '/x'), false);
  assert.equal(isAllowed(parseRobots(''), BOT, '/x'), true);
});

test('robots: query strings are matched (BBB-style blocks)', () => {
  const p = parseRobots('User-agent: *\nDisallow: /*?\n');
  assert.equal(isAllowed(p, BOT, '/us/biz'), true);
  assert.equal(isAllowed(p, BOT, '/search?q=a'), false);
});

test('allowlist: approves a fully recorded, recent, automatable source', () => {
  const s = siteSource('x', 'x.example.com');
  assert.deepEqual(evaluateSource(s, { today: '2026-11-12' }), { allowed: true, reasons: [] });
});

test('allowlist refuses each missing condition with a reason', () => {
  const t = (mut, re) => { const r = evaluateSource({ ...siteSource('x', 'x.example.com'), ...mut }, { today: '2026-11-12' }); assert.equal(r.allowed, false); assert.ok(r.reasons.some((x) => re.test(x)), r.reasons.join('|')); };
  t({ use_allowed: false }, /use_allowed is false/);
  t({ robots_decision: 'not_checked' }, /robots_decision is not_checked/);
  t({ robots_decision: 'disallowed' }, /robots_decision is disallowed/);
  t({ tos_decision: 'not_checked' }, /tos_decision/);
  t({ tos_decision: 'prohibits_automated_access' }, /tos_decision/);
  t({ access_method: 'manual_public_lookup' }, /not automated/);
  t({ access_method: 'company_submission' }, /not automated/);
  t({ robots_txt_checked_date: null }, /robots_txt_checked_date not recorded/);
  t({ tos_checked_date: '2026-01-01' }, /days old/);
  t({ url: null }, /no url/);
  assert.equal(evaluateSource(undefined).allowed, false);
  assert.throws(() => assertAllowed({ ...siteSource('x', 'x.example.com'), use_allowed: false }), SourceNotAllowedError);
});

test('allowlist accepts no_robots_txt and silent ToS', () => {
  assert.equal(evaluateSource({ ...siteSource('x', 'x.example.com'), robots_decision: 'no_robots_txt', tos_decision: 'silent' }, { today: '2026-11-12' }).allowed, true);
});

test('real registry: no source is approved for automated access yet (ToS unread, manual lookups only)', () => {
  const { sources } = readData(`${root}/data`);
  const { approved } = buildAllowlist(sources, { today: '2026-11-12' });
  assert.equal(approved.length, 0);
});

test('suppression matches by company id, domain (and subdomain) and normalized name', () => {
  const sup = [
    { id: 'sup_1', company_id: 'co_9', domain: null, name: null },
    { id: 'sup_2', company_id: null, domain: 'removed.example.com', name: null },
    { id: 'sup_3', company_id: null, domain: null, name: 'Gone Property Management, LLC' }
  ];
  assert.equal(matchSuppression({ id: 'co_9' }, sup).by, 'company_id');
  assert.equal(matchSuppression({ website: 'https://www.removed.example.com/about' }, sup).by, 'domain');
  assert.equal(matchSuppression({ website: 'https://blog.removed.example.com' }, sup).by, 'domain');
  assert.equal(matchSuppression({ name: 'GONE property management LLC' }, sup).by, 'name');
  assert.equal(matchSuppression({ id: 'co_1', website: 'https://ok.example.com', name: 'Fine Co' }, sup), null);
  assert.equal(urlSuppressed('https://removed.example.com/x', sup).record.id, 'sup_2');
  assert.equal(urlSuppressed('https://ok.example.com/x', sup), null);
});
