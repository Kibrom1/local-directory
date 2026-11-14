// Tests for the product-review findings: terms gate, listed-tier switch, fee scope, verification fields, wording, export.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/lib/gate.mjs';
import baseQuality from '../src/lib/quality.json' with { type: 'json' };
import { validateData } from '../scripts/lib/validate-data.mjs';
import { feeBadge, scopeCaveat } from '../src/lib/fees.mjs';
import { exportRows, toCsv, toJson } from '../src/lib/export.mjs';
import { baseData, clone, TODAY, D, fee, siteSource, schemaDir } from './helpers.mjs';

const Q = { ...baseQuality, publishListedTier: true, requireReviewedTermsForIndex: false };
const ev = (d, q = Q, o = {}) => evaluate(d, q, { today: TODAY, ...o });
const page = (s, id) => s.companyPages.find((p) => p.id === id);

// ---- terms gate (finding 8)
test('terms gate: facts from a source with unreviewed terms do not count toward indexable pages (production)', () => {
  const d = baseData();
  d.sources[0].tos_decision = 'not_checked'; d.sources[0].tos_checked_date = null;
  const gated = { ...Q, requireReviewedTermsForIndex: true };
  const s = ev(d, gated);
  assert.equal(s.termsGateOn, true);
  assert.notEqual(page(s, 'co_t1')?.tier, 'indexable', 'co_t1 depends on the unreviewed source');
  assert.equal(page(s, 'co_t2').tier, 'indexable', 'other companies are unaffected');
  assert.ok(!s.indexable.some((x) => x.id === 'co_t1'));
  assert.ok(!s.feeRows.some((f) => f.company_id === 'co_t1'), 'its fee row does not count toward the fee gates');
});

test('terms gate: off in development and when the switch is false', () => {
  const d = baseData();
  d.sources[0].tos_decision = 'not_checked';
  assert.equal(page(ev(d, { ...Q, requireReviewedTermsForIndex: true }, { prod: false }), 'co_t1').tier, 'indexable');
  assert.equal(page(ev(d, { ...Q, requireReviewedTermsForIndex: false }), 'co_t1').tier, 'indexable');
});

test('terms gate: company submissions and official references (not_applicable) count', () => {
  const d = baseData();
  d.sources[0].tos_decision = 'not_applicable';
  assert.equal(page(ev(d, { ...Q, requireReviewedTermsForIndex: true }), 'co_t1').tier, 'indexable');
});

test('terms gate: the real data set has no terms reviews, so no company page is indexable in production', async () => {
  const { evaluateSite } = await import('../src/lib/site.mjs');
  const real = evaluateSite({ today: '2026-11-14', prod: true });
  assert.equal(real.indexable.filter((p) => p.type === 'company').length, 0);
  assert.ok(real.quality.requireReviewedTermsForIndex === true);
  const open = evaluateSite({ today: '2026-11-14', prod: false });
  assert.ok(open.indexable.filter((p) => p.type === 'company').length > 0, 'development still shows what the gate would remove');
});

// ---- listed tier (finding 12)
const listedData = () => {
  const d = baseData();
  d['fee-schedules'] = [];
  d.companies[0].services = [{ service: 'full-service-management', source_id: 'src_c1', source_url: null, captured_date: D, last_verified_date: D }];
  return d;
};
test('listed tier: not generated in production when publishListedTier is false', () => {
  const s = ev(listedData(), { ...Q, publishListedTier: false });
  assert.equal(s.publishListed, false);
  assert.equal(page(s, 'co_t1'), undefined, 'no company page');
  assert.ok(s.noindexListed.some((x) => x.id === 'co_t1'), 'the report still lists it');
  assert.ok(s.unpublishedListed.some((x) => x.id === 'co_t1'));
  assert.ok(s.cityPages.every((c) => c.tier !== 'listed' && c.listedCompanies.length === 0));
});
test('listed tier: published when the switch is true or in development', () => {
  assert.equal(page(ev(listedData(), { ...Q, publishListedTier: true }), 'co_t1').tier, 'listed');
  assert.equal(page(ev(listedData(), { ...Q, publishListedTier: false }, { prod: false }), 'co_t1').tier, 'listed');
});
test('listed tier: an unpublished company does not count toward the fee comparison', () => {
  const d = baseData();
  d.companies[0].services = []; d.companies[0].property_types_served = []; d['service-areas'] = d['service-areas'].filter((a) => a.company_id !== 'co_t1');
  d.companies[0].phone = null; d.companies[0].website = null; d.companies[0].address = null;
  const s = ev(d, { ...Q, publishListedTier: false });
  assert.ok(!s.feeRows.some((f) => f.company_id === 'co_t1'));
});

// ---- fee scope (finding 10)
test('scope: network_wide and unconfirmed_mapping rows show but do not count toward the gates', () => {
  const d = baseData();
  d['fee-schedules'][0].scope = 'network_wide'; d['fee-schedules'][0].notes = 'network-wide page';
  d['fee-schedules'][1].scope = 'unconfirmed_mapping'; d['fee-schedules'][1].notes = 'plans unconfirmed';
  const s = ev(d);
  assert.equal(s.companiesWithFees.size, 4);
  assert.equal(s.feeRows.length, 4);
  assert.equal(s.feeRowsShown.length, 6, 'all six still display');
  assert.equal(s.scopeExcludedRows.length, 2);
  assert.equal(s.planned.find((p) => p.type === 'fee-comparison').eligible, false, '4 < 5');
});
test('scope: the owner override in quality.json counts them', () => {
  const d = baseData();
  d['fee-schedules'][0].scope = 'network_wide'; d['fee-schedules'][0].notes = 'n';
  const s = ev(d, { ...Q, feeScopesCountingTowardGates: ['columbus_specific', 'network_wide'] });
  assert.equal(s.companiesWithFees.size, 6);
});
test('scope caveat wording', () => {
  assert.match(scopeCaveat({ scope: 'network_wide' }), /many markets/);
  assert.match(scopeCaveat({ scope: 'unconfirmed_mapping' }), /not confirmed/);
  assert.equal(scopeCaveat({ scope: 'columbus_specific' }), null);
  assert.equal(scopeCaveat({}), null);
});

// ---- verification fields (finding 7)
const errs = (d) => validateData(d, { schemaDir, today: TODAY }).errors;
test('validator: verified_own_site needs a verification method', () => {
  const d = baseData(); delete d['fee-schedules'][0].verification_method;
  assert.ok(errs(d).some((e) => /needs verification_method/.test(e)));
});
test('validator: human_compared needs a handle and a date; agent_read cannot claim a person', () => {
  let d = baseData(); d['fee-schedules'][0].verification_method = 'human_compared';
  assert.ok(errs(d).some((e) => /verified_by/.test(e)) && errs(d).some((e) => /human_verified_date/.test(e)));
  d = baseData(); Object.assign(d['fee-schedules'][0], { verification_method: 'human_compared', verified_by: 'reviewer-1', human_verified_date: D });
  assert.deepEqual(errs(d), []);
  d = baseData(); d['fee-schedules'][0].human_verified_date = D;
  assert.ok(errs(d).some((e) => /agent_read must not carry/.test(e)));
  d = baseData(); Object.assign(d['fee-schedules'][0], { verification_method: 'human_compared', verified_by: 'r1', human_verified_date: '2099-01-01' });
  assert.ok(errs(d).some((e) => /in the future/.test(e)));
});
test('validator: a non-default scope needs notes', () => {
  const d = baseData(); d['fee-schedules'][0].scope = 'network_wide';
  assert.ok(errs(d).some((e) => /needs notes/.test(e)));
});
test('badge wording separates an automated read from a person\'s check', () => {
  const agent = feeBadge({ verification_method: 'agent_read', last_verified_date: '2026-11-11' }, '2026-11-14', 180);
  assert.equal(agent.text, "Read on the company's site, Nov 11, 2026. Confirm with the company");
  assert.equal(agent.kind, 'ok');
  const human = feeBadge({ verification_method: 'human_compared', human_verified_date: '2026-11-13', last_verified_date: '2026-11-13' }, '2026-11-14', 180);
  assert.equal(human.text, 'Checked by a person, Nov 13, 2026');
  const old = feeBadge({ verification_method: 'agent_read', last_verified_date: '2026-01-01' }, '2026-11-14', 180);
  assert.equal(old.kind, 'stale');
  assert.match(old.text, /Read on the company's site \d+ months ago/);
  assert.ok(!/person/.test(old.text));
});

// ---- export (finding 6)
test('export: only counted rows, one record per published number, no derived values', () => {
  const d = baseData();
  d['fee-schedules'][0].scope = 'network_wide'; d['fee-schedules'][0].notes = 'n';
  d['fee-schedules'][1].leasing_fee = { type: 'pct_of_monthly_rent', period: 'one_time', plans: [{ name: 'Core', condition: 'greater of $800', value: 75, label_confirmed: false }, { name: 'Pro', condition: null, min: 50, max: 60 }] };
  const s = ev(d);
  const rows = exportRows(s);
  assert.ok(!rows.some((r) => r.company_id === 'co_t1'), 'a row kept out of the gates is not exported');
  const lease = rows.filter((r) => r.company_id === 'co_t2' && r.fee_type === 'leasing_fee');
  assert.equal(lease.length, 2);
  assert.deepEqual(lease.map((r) => r.plan_name).sort(), ['Core', 'Pro']);
  assert.equal(lease.find((r) => r.plan_name === 'Pro').min, 50);
  assert.equal(lease.find((r) => r.plan_name === 'Core').plan_label_confirmed, false);
  assert.ok(rows.every((r) => r.source_urls && r.last_verified_date && r.verification_method));
  const json = JSON.parse(toJson(s, rows));
  assert.equal(json.row_count, rows.length);
  assert.match(json.scope, /not a market average/);
});
test('export: CSV quoting and spreadsheet formula guard', () => {
  const d = baseData();
  d.companies[1].name = '=SUM(A1), "Quoted" Co';
  const s = ev(d);
  const csv = toCsv(exportRows(s));
  assert.match(csv, /^company_id,company,/);
  assert.match(csv, /"'=SUM\(A1\), ""Quoted"" Co"/);
  assert.ok(csv.endsWith('\r\n'));
});
