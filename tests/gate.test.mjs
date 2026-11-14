import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, buildReport, rankPages } from '../src/lib/gate.mjs';
import baseQuality from '../src/lib/quality.json' with { type: 'json' };
import { baseData, clone, TODAY, D, fee, company, area, ptFact, siteSource } from './helpers.mjs';

// Tier logic is tested with the listed tier published and terms reviews not required; the production switches have their own tests (tests/pm-findings.test.mjs).
const quality = { ...baseQuality, publishListedTier: true, requireReviewedTermsForIndex: false };
const ev = (d, q = quality, today = TODAY) => evaluate(d, q, { today });
const page = (site, id) => site.companyPages.find((p) => p.id === id);
const license = (n, status = 'active', sid = `src_c${n}`) => ({ status, number: '123', issuing_body: 'Ohio Division of Real Estate', claim_text: null, source_id: sid, source_url: `https://c${n}.example.com/`, captured_date: D, last_verified_date: D });

test('company with verified fees, 3+ groups is indexable', () => {
  const s = ev(baseData());
  assert.equal(page(s, 'co_t1').tier, 'indexable');
  assert.equal(page(s, 'co_t1').robots, 'index, follow');
});

test('areas, services and contact alone are NOT enough to be indexable (listed noindex,follow instead)', () => {
  const d = baseData();
  d['fee-schedules'] = []; // no fees at all
  d.companies[0].services = [{ service: 'full-service-management', source_id: 'src_c1', source_url: null, captured_date: D, last_verified_date: D }];
  const s = ev(d);
  const p = page(s, 'co_t1');
  assert.equal(p.tier, 'listed');
  assert.equal(p.robots, 'noindex, follow');
  assert.ok(p.completeness >= 3);
  assert.ok(s.noindexListed.find((x) => x.id === 'co_t1').reasons.some((r) => /no verified fees or license/.test(r)));
  assert.ok(!s.indexable.some((x) => x.id === 'co_t1'));
});

test('a verified license alone makes a profile indexable; a self-stated license does not', () => {
  let d = baseData();
  d['fee-schedules'] = [];
  d.companies[0].license = license(1, 'self_stated'); d.companies[0].license.claim_text = 'Licensed brokerage';
  assert.equal(page(ev(d), 'co_t1').tier, 'listed');
  d = baseData();
  d['fee-schedules'] = [];
  d.companies[0].license = license(1, 'active');
  d.sources.push({ ...siteSource('ohio', 'com.ohio.gov'), source_kind: 'official_record' });
  d.companies[0].license.source_id = 'src_ohio';
  const p = page(ev(d), 'co_t1');
  assert.equal(p.verifiedLicense, true);
  assert.equal(p.tier, 'indexable');
});

test('unverified fee rows do not count as verified fees', () => {
  const d = baseData();
  d['fee-schedules'][0].verification_status = 'unverified';
  assert.equal(page(ev(d), 'co_t1').tier, 'listed');
});

test('third-party-directory-only and lead companies are never generated or counted', () => {
  const d = baseData();
  d.sources.push({ ...siteSource('dir', 'dir.example.net'), source_kind: 'third_party_directory', use_allowed: false });
  d.companies.push(company(7, { website: null, evidence_level: 'third_party_directory_only', tier: 'unconfirmed', source_id: 'src_dir' }));
  d.companies.push(company(8, { website: null, evidence_level: 'unverified_lead', tier: 'unconfirmed', source_id: 'src_dir' }));
  const s = ev(d);
  assert.equal(s.companyPages.find((p) => p.id === 'co_t7'), undefined);
  assert.equal(s.skipped.filter((x) => /evidence level/.test(x.reasons[0])).length, 2);
  const r = buildReport(s);
  assert.equal(r.companies.tier_a_count, 6);
  assert.deepEqual(r.companies.by_evidence_level, { own_site_confirmed: 6, third_party_directory_only: 1, unverified_lead: 1 });
});

test('thin company below the listed bar is skipped with reasons; 2 fact groups is listed', () => {
  const d = baseData();
  d['service-areas'] = []; d.companies.forEach((c) => (c.property_types_served = []));
  d['fee-schedules'] = [];
  d.companies[0].address = null; d.companies[0].website = null; // 0 groups
  const s = ev(d);
  assert.ok(s.skipped.find((x) => x.id === 'co_t1' && x.reasons.some((r) => /below listed bar/.test(r))));
  assert.equal(page(s, 'co_t2'), undefined); // contact only = 1 group -> skipped too
  // two groups (contact + areas) is listed
  const d2 = baseData();
  d2['fee-schedules'] = []; d2.companies.forEach((c) => (c.property_types_served = []));
  assert.equal(page(ev(d2), 'co_t1').tier, 'listed');
});

test('city page: indexable only with 3+ indexable companies and 1 with fees; 2 is noindex; fewer is skipped', () => {
  const mk = (n) => {
    const d = baseData();
    d.companies = d.companies.slice(0, n); d['fee-schedules'] = d['fee-schedules'].slice(0, n); d['service-areas'] = d['service-areas'].slice(0, n);
    return d;
  };
  const city = (s) => s.cityPages.find((c) => c.geo.slug === 'columbus');
  assert.equal(city(ev(mk(3))).tier, 'indexable');
  const two = ev(mk(2));
  assert.equal(city(two).tier, 'listed');
  assert.equal(city(two).robots, 'noindex, follow');
  const one = ev(mk(1));
  assert.equal(city(one), undefined);
  assert.ok(one.skipped.find((x) => x.type === 'city' && x.id === 'geo_columbus'));
  // dublin has no companies at all
  assert.ok(ev(mk(3)).skipped.find((x) => x.id === 'geo_dublin'));
});

test('city page needs at least one company with verified fees', () => {
  const d = baseData();
  d['fee-schedules'] = [];
  for (const c of d.companies) c.license = license(+c.id.slice(4), 'active');
  d.sources.push({ ...siteSource('ohio', 'com.ohio.gov'), source_kind: 'official_record' });
  for (const c of d.companies) c.license.source_id = 'src_ohio';
  const s = ev(d);
  assert.equal(s.cityPages.find((c) => c.geo.slug === 'columbus').tier, 'listed');
  assert.ok(s.noindexListed.find((x) => x.id === 'geo_columbus').reasons.some((r) => /verified fees/.test(r)));
});

test('freshness: facts past 365 days are dropped from verified fees and completeness', () => {
  const d = baseData();
  d['fee-schedules'][0].captured_date = '2025-01-01'; d['fee-schedules'][0].last_verified_date = '2025-01-01';
  const p = page(ev(d), 'co_t1');
  assert.equal(p.verifiedFees, false);
  assert.equal(p.tier, 'listed');
  assert.equal(ev(d).perFeeType.management_pct, 5);
});

test('fee comparison and fee guides gate on 5 companies per fee type', () => {
  const d = baseData();
  d['fee-schedules'][5].management_pct = null; // 5 mgmt rows left
  d['fee-schedules'][5].leasing_fee = { type: 'pct_of_monthly_rent', value: 50 };
  for (const f of d['fee-schedules']) f.flat_fee = null;
  d['fee-schedules'][0].flat_fee = { type: 'flat_usd', value: 100 };
  let s = ev(d);
  const by = (t, ft) => s.planned.find((p) => p.type === t && (!ft || p.fee_type === ft));
  assert.equal(by('fee-guide', 'management_pct').count, 5);
  assert.equal(by('fee-guide', 'management_pct').eligible, true);
  assert.equal(by('fee-guide', 'flat_fee').eligible, false);
  assert.equal(by('fee-guide', 'leasing_fee').eligible, false);
  assert.equal(by('fee-comparison').eligible, true);
  d['fee-schedules'][4].management_pct = null; // now 4
  s = ev(d);
  assert.equal(by('fee-guide', 'management_pct').eligible, false);
  // a range or plan-based value counts as a published value
  d['fee-schedules'][4].management_pct = { type: 'pct_of_rent', min: 7, max: 10 };
  assert.equal(ev(d).perFeeType.management_pct, 5);
});

test('fee comparison needs 5 companies; 4 is below the bar', () => {
  const d = baseData();
  d.companies = d.companies.slice(0, 4); d['fee-schedules'] = d['fee-schedules'].slice(0, 4); d['service-areas'] = d['service-areas'].slice(0, 4);
  assert.equal(ev(d).planned.find((p) => p.type === 'fee-comparison').eligible, false);
});

test('property-type gate: 3+ indexable companies with the sourced type', () => {
  const d = baseData();
  const s = ev(d);
  assert.equal(s.planned.find((p) => p.type === 'property-type').eligible, true);
  d.companies[0].property_types_served = []; d.companies[1].property_types_served = []; d.companies[2].property_types_served = []; d.companies[3].property_types_served = [];
  assert.equal(ev(d).planned.find((p) => p.type === 'property-type').eligible, false);
});

test('placeholder pages are noindex,nofollow, excluded from indexable count', () => {
  const d = baseData();
  d.companies[0].placeholder = true;
  const s = ev(d);
  assert.equal(page(s, 'co_t1').robots, 'noindex, nofollow');
  assert.ok(s.placeholderPaths.has('/company/company-1/'));
  assert.ok(!s.indexable.some((x) => x.id === 'co_t1'));
});

test('build report: counts the metrics need', () => {
  const d = baseData();
  d.companies[0].last_verified_date = '2026-01-01'; d.companies[0].captured_date = '2026-01-01';
  d.companies[1].last_verified_date = '2025-06-01'; d.companies[1].captured_date = '2025-06-01';
  const r = buildReport(ev(d));
  for (const k of ['indexable_count', 'indexable_by_type', 'noindex_listed_count', 'skipped_count', 'skipped', 'stage_budget', 'companies', 'fee_type_counts', 'freshness', 'planned_pages']) assert.ok(k in r, k);
  assert.equal(r.companies.tier_a_count, 6);
  assert.equal(r.companies.in_phase1_with_allowed_source, 6);
  assert.deepEqual(Object.keys(r.fee_type_counts).sort(), ['flat_fee', 'leasing_fee', 'management_pct', 'minimums', 'renewal_fee']);
  assert.equal(r.freshness.stale_180_count, 2); // co_t1 (315 days) and co_t2 (529 days) identity facts
  assert.equal(r.freshness.stale_365_count, 1);
  assert.ok(r.freshness.stale_180_count >= r.freshness.stale_365_count);
});

test('stage budget: over budget, below minimum and within budget', () => {
  const q = clone(quality);
  q.stages = [{ stage: 1, minIndexable: 30, maxIndexable: 45 }]; q.currentStage = 1;
  assert.equal(buildReport(ev(baseData(), q)).stage_budget.status, 'below_stage_minimum');
  q.stages = [{ stage: 1, minIndexable: 1, maxIndexable: 5 }];
  assert.equal(buildReport(ev(baseData(), q)).stage_budget.status, 'over_budget');
  q.stages = [{ stage: 1, minIndexable: 5, maxIndexable: 40 }];
  assert.equal(buildReport(ev(baseData(), q)).stage_budget.status, 'within_budget');
});

test('ranking: completeness then name; payment, claim status or other fields cannot change order', () => {
  const d = baseData();
  d.companies[2].property_types_served = []; // C: fewer groups
  const base = ev(d);
  const order = rankPages(base.companyPages).map((p) => p.id);
  assert.equal(order[order.length - 1], 'co_t3');
  assert.deepEqual(order.slice(0, 2), ['co_t1', 'co_t2']);
  // adding fields outside the six groups changes nothing
  const d2 = clone(d);
  for (const c of d2.companies) { c.paid = true; c.claimed = true; c.featured = true; }
  const order2 = rankPages(ev(d2).companyPages).map((p) => p.id);
  assert.deepEqual(order2, order);
  // input order does not matter (deterministic ties)
  assert.deepEqual(rankPages([...base.companyPages].reverse()).map((p) => p.id), order);
});
