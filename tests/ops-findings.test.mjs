// Tests for the operational findings: aging of the real data set, analysis, guide checker, queue, scraper review, launch check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluate } from '../src/lib/gate.mjs';
import { loadData, evaluateSite } from '../src/lib/site.mjs';
import { analyze } from '../src/lib/analysis.mjs';
import quality from '../src/lib/quality.json' with { type: 'json' };
import { businessDaysBetween, parseCsv, correctionsQueue, staleQueue, sourceChecksDue } from '../src/lib/ops.mjs';
import { guideReadiness } from '../src/lib/guide-readiness.mjs';
import { recordReview, pendingReviews } from '../scripts/scraper/review.mjs';
import { reviewChecklist } from '../scripts/scraper/normalize.mjs';
import { root } from './helpers.mjs';

const REAL_DAY = '2026-11-14';
const plus = (n) => new Date(Date.parse(REAL_DAY) + n * 86400000).toISOString().slice(0, 10);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'of-'));

// ---- finding 14: the real data set ages out on schedule
const realData = loadData(path.join(root, 'data'));
const open = { ...quality, requireReviewedTermsForIndex: false, publishListedTier: true };
const at = (n, q = open) => evaluate(realData, q, { today: plus(n), prod: true });
const count = (s, t) => s.indexable.filter((p) => p.type === t).length;

test('aging: today the real data builds 18 pages with the terms gate off, 5 with it on', () => {
  assert.equal(at(0).indexable.length, 18);
  assert.equal(evaluate(realData, quality, { today: REAL_DAY, prod: true }).indexable.length, 5);
});
test('aging +120 days: the fee-row warning window opens but no page drops yet', () => {
  assert.equal(at(120).indexable.length, 18);
  assert.equal(staleQueue(realData, plus(120), quality.freshness).fee_rows_over_warn.length, 10);
});
test('aging +181 days: facts are flagged as old on pages (display flag), still no page drops', () => {
  assert.equal(at(181).indexable.length, 18);
  assert.ok(staleQueue(realData, plus(181), quality.freshness).past_display_flag > 0);
  assert.equal(staleQueue(realData, plus(181), quality.freshness).past_drop, 0);
});
test('aging +366 days: every data-backed page drops and only the static pages remain', () => {
  const s = at(366);
  assert.equal(s.indexable.length, 5);
  assert.equal(count(s, 'company') + count(s, 'city') + count(s, 'fee-comparison') + count(s, 'property-type'), 0);
  assert.equal(s.feeRows.length, 0);
});

// ---- findings 2, 8, 9, 10, 11, 12: the analysis
test('analysis: terms gate, listed tier, scope, license route and resilience are reported for the real data', () => {
  const A = analyze(evaluateSite({ today: REAL_DAY, prod: true }));
  assert.equal(A.terms_gate.removed_pages.length, 13);
  assert.equal(A.license_route.status, 'none available');
  assert.ok(A.listed_tier.would_be_listed > 0);
  assert.ok(A.scope_effect.rows_shown_but_not_counted.some((x) => x.scope === 'network_wide'));
  assert.ok(Array.isArray(A.unlocks) && A.unlocks.every((u) => u.smallest_change));
  assert.ok(A.resilience.pages.every((p) => Array.isArray(p.single_points_of_failure)));
  assert.ok(A.fee_exclusions.excluded.some((e) => e.blockers.includes('area')), 'service-area exclusions are listed');
});
test('analysis: the gates are not relaxed (same site, no mutation)', () => {
  const s = evaluateSite({ today: REAL_DAY, prod: true });
  const before = s.indexable.length;
  analyze(s);
  assert.equal(s.indexable.length, before);
});

// ---- finding 3: guide readiness
const ctx = { today: REAL_DAY, builtPaths: new Set(['/fees/']), guideSlugs: new Set(['a', 'b']), publishedGuideSlugs: new Set() };
test('guide readiness: flags a link to an unbuilt page and advice wording; never publishes', () => {
  const g = { slug: 'a', title: 'T', status: 'draft', updated: REAL_DAY, sources: [], body: 'You should always sign. See [fees](/fees-missing/).' };
  const r = guideReadiness(g, ctx);
  assert.ok(r.blockers.length + r.review.length > 0);
  assert.ok(JSON.stringify(r).match(/fees-missing|should/i));
  assert.equal(g.status, 'draft');
});

// ---- finding 5: queue logic
test('queue: business days skip weekends; parseCsv handles quotes', () => {
  assert.equal(businessDaysBetween('2026-11-13', '2026-11-16'), 1); // Fri -> Mon
  assert.equal(businessDaysBetween('2026-11-09', '2026-11-16'), 5);
  const rows = parseCsv('id,company,type\n1,"A, Inc",correct\n2,"B ""x""",remove\n');
  assert.equal(rows[0].company, 'A, Inc');
  assert.equal(rows[1].company, 'B "x"');
});
test('queue: overdue acknowledgement and removal SLA', () => {
  const q = correctionsQueue([
    { id: '1', received_date: '2026-11-02', type: 'correct', company: 'A', status: 'open' },
    { id: '2', received_date: '2026-11-02', type: 'remove', company: 'B', status: 'open', acknowledged_date: '2026-11-03' },
    { id: '3', received_date: '2026-11-02', type: 'correct', company: 'C', status: 'closed' }
  ], REAL_DAY);
  assert.equal(q.length, 2);
  assert.match(JSON.stringify(q[0]), /acknowledge/);
  assert.match(JSON.stringify(q[1]), /appl|remov/i);
});
test('queue: source checks older than 90 days or never done are listed', () => {
  const src = [
    { id: 's1', name: 'S1', use_allowed: true, source_kind: 'company_site', robots_decision: 'allowed', robots_txt_checked_date: '2026-01-01', tos_decision: 'not_checked', tos_checked_date: null },
    { id: 's2', name: 'S2', use_allowed: true, source_kind: 'company_site', robots_decision: 'allowed', robots_txt_checked_date: REAL_DAY, tos_decision: 'allowed', tos_checked_date: REAL_DAY }
  ];
  const due = sourceChecksDue(src, REAL_DAY);
  assert.deepEqual(due.map((d) => `${d.source_id}:${d.what}`).sort(), ['s1:robots.txt', 's1:terms of service']);
});

// ---- finding 13: scraper review checklist and reviewed_by step
test('review checklist: blockers first, flagged before routine, with minute estimates', () => {
  const lines = reviewChecklist({
    validation: { errors: ['bad row'] },
    anomalies: [{ kind: 'drop', company_id: 'co_1', detail: 'rows vanished' }],
    changes: [
      { op: 'modify', label: 'fee', field: 'x', company_id: 'co_1', flagged: false },
      { op: 'add_fee_row', label: 'fee', company_id: 'co_2', flagged: true, flag_reason: 'new' },
      { op: 'reverify', company_id: 'co_3' }
    ]
  }).join('\n');
  const order = ['Validation error', 'Anomaly', 'Flagged', 'modify', 're-verify'].map((k) => lines.indexOf(k));
  assert.ok(order.every((n) => n >= 0), lines);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(lines, /~\d+ min/);
  assert.match(lines, /Estimated review time/);
});
test('review recording: needs a handle, writes review.json, refuses accepting a run with validation errors', () => {
  const root2 = tmp(); const run = path.join(root2, '2026-11-14_src_x'); fs.mkdirSync(run, { recursive: true });
  fs.writeFileSync(path.join(run, 'diff-report.md'), '# d');
  assert.equal(pendingReviews(root2).length, 1);
  assert.throws(() => recordReview(run, { by: '', decision: 'accepted' }), /--by/);
  assert.throws(() => recordReview(run, { by: 'rev-1', decision: 'maybe' }), /--decision/);
  fs.writeFileSync(path.join(run, 'run-report.json'), JSON.stringify({ validation_errors: ['e'] }));
  assert.throws(() => recordReview(run, { by: 'rev-1', decision: 'accepted' }), /validation error/);
  assert.equal(recordReview(run, { by: 'rev-1', decision: 'rejected' }).reviewed_by, 'rev-1');
  assert.equal(pendingReviews(root2).length, 0);
});

// ---- finding 4: launch check
test('launch check: exits nonzero while blockers remain and prints an owner for each', () => {
  const r = spawnSync('node', ['scripts/launch-check.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, SITE_URL: '', PUBLIC_OPERATOR_NAME: '', PUBLIC_DISCLOSURE: '' } });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /BLOCKERS/);
  assert.match(r.stdout, /owner:/);
  const j = spawnSync('node', ['scripts/launch-check.mjs', '--json'], { cwd: root, encoding: 'utf8' });
  assert.ok(JSON.parse(j.stdout).blockers > 0);
});
