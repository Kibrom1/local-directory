import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, buildReport } from '../src/lib/gate.mjs';
import quality from '../src/lib/quality.json' with { type: 'json' };
import { baseData, clone, TODAY } from './helpers.mjs';

const ev = (d, q = quality, o = {}) => evaluate(d, q, { today: TODAY, ...o });
const gate = (s, type, ft) => s.planned.find((p) => p.type === type && (!ft || p.fee_type === ft));
const guide = (slug, status = 'published') => ({ slug, title: slug, description: 'd', type: 'guide', keywords: [], last_verified: '2026-11-11', sources: [{ title: 't', url: 'https://x.example.com/', captured: '2026-11-11' }], status, html: '', toc: [], body: 'x' });

// Three of six companies publish fees but state no service area (2 rows each keep counts clear).
function noAreaData() {
  const d = baseData();
  d['service-areas'] = d['service-areas'].filter((a) => !['co_t1', 'co_t2', 'co_t3'].includes(a.company_id));
  return d;
}

test('fee rule: conservative (default) excludes fee rows from companies with no stated service area', () => {
  assert.equal(quality.feeComparison.requireStatedServiceArea, true);
  const s = ev(noAreaData());
  assert.equal(s.feeRule, 'conservative');
  assert.equal(s.companiesWithFees.size, 3);
  assert.equal(s.perFeeType.management_pct, 3);
  assert.equal(gate(s, 'fee-comparison').eligible, false);
  assert.deepEqual(s.excludedByAreaRule.sort(), ['co_t1', 'co_t2', 'co_t3']);
  assert.equal(s.feeRows.length, 3);
});

test('fee rule: the one-line switch counts them again, and the report shows counts both ways', () => {
  const q = clone(quality); q.feeComparison.requireStatedServiceArea = false;
  const s = ev(noAreaData(), q);
  assert.equal(s.feeRule, 'liberal');
  assert.equal(s.companiesWithFees.size, 6);
  assert.equal(gate(s, 'fee-comparison').eligible, true);
  assert.equal(gate(s, 'fee-guide', 'management_pct').eligible, true);
  for (const cfg of [quality, q]) {
    const r = buildReport(ev(noAreaData(), cfg));
    assert.equal(r.fee_type_counts_by_rule.conservative.per_fee_type.management_pct, 3);
    assert.equal(r.fee_type_counts_by_rule.liberal.per_fee_type.management_pct, 6);
    assert.equal(r.fee_type_counts_by_rule.conservative.companies_with_fees, 3);
    assert.equal(r.fee_type_counts_by_rule.liberal.companies_with_fees, 6);
  }
});

test('fee rule: a stale or disallowed-source area row is not a stated service area', () => {
  const d = baseData();
  d['service-areas'].find((a) => a.company_id === 'co_t1').last_verified_date = '2025-01-01';
  assert.equal(ev(d).companiesWithFees.has('co_t1'), false);
});

test('eligible fee comparison, fee guides, hub and property-type pages are listed as indexable with their paths', () => {
  const s = ev(baseData());
  const paths = s.indexable.map((p) => p.path);
  assert.ok(paths.includes('/fees/'));
  assert.ok(paths.includes('/fee-guide/management-fee/'));
  assert.ok(paths.includes('/fee-guide/'));
  assert.ok(paths.includes('/property-types/single-family/'));
  assert.ok(paths.includes('/corrections/') && paths.includes('/methodology/'));
  assert.ok(!paths.includes('/fee-guide/flat-fee/'), 'flat-fee guide stays off below 5 companies');
  assert.equal(gate(s, 'fee-guide', 'flat_fee').eligible, false);
  assert.ok(s.planned.every((p) => p.template_built === true));
  assert.ok(!paths.includes('/search/') && s.utilityPages.includes('/search/'));
});

test('fee guide hub needs at least one eligible guide', () => {
  const d = baseData();
  d.companies = d.companies.slice(0, 2); d['fee-schedules'] = d['fee-schedules'].slice(0, 2); d['service-areas'] = d['service-areas'].slice(0, 2);
  const s = ev(d);
  assert.equal(gate(s, 'fee-guide-hub').eligible, false);
  assert.ok(!s.indexable.some((p) => p.path === '/fee-guide/'));
});

test('guides: published are indexable; drafts are withheld in production and render noindex in dev', () => {
  const d = { ...baseData(), guides: [guide('a-guide'), guide('b-draft', 'draft')] };
  const prod = ev(d, quality, { prod: true });
  assert.ok(prod.indexable.some((p) => p.path === '/guides/a-guide/'));
  assert.ok(!prod.guidePages.some((g) => g.guide.slug === 'b-draft'));
  assert.ok(prod.skipped.some((x) => x.path === '/guides/b-draft/' && /draft/.test(x.reasons[0])));
  assert.equal(gate(prod, 'guide-hub').eligible, true);
  const dev = ev(d, quality, { prod: false });
  const draft = dev.guidePages.find((g) => g.guide.slug === 'b-draft');
  assert.equal(draft.tier, 'draft');
  assert.equal(draft.robots, 'noindex, nofollow');
  assert.ok(!dev.indexable.some((p) => p.path === '/guides/b-draft/'));
});

test('guides: no guides means no hub; duplicate slugs are skipped', () => {
  assert.equal(gate(ev(baseData()), 'guide-hub').eligible, false);
  const s = ev({ ...baseData(), guides: [guide('x'), guide('x')] });
  assert.equal(s.guidePages.length, 1);
  assert.ok(s.skipped.some((p) => /duplicate/.test(p.reasons[0])));
});

test('report carries fee rule, guides and utility pages', () => {
  const r = buildReport(ev({ ...baseData(), guides: [guide('g1'), guide('g2', 'draft')] }, quality, { prod: true }));
  assert.equal(r.fee_rule.active, 'conservative');
  assert.equal(r.guides.published, 1);
  assert.equal(r.guides.drafts_not_published_in_production, 1);
  assert.deepEqual(r.utility_noindex_pages, ['/search/', '/404.html']);
  assert.ok(r.indexable_by_type['fee-comparison'] === 1);
});
