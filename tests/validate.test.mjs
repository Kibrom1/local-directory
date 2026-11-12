import test from 'node:test';
import assert from 'node:assert/strict';
import { validateData } from '../scripts/lib/validate-data.mjs';
import { baseData, clone, schemaDir, TODAY, D, fee, siteSource, company } from './helpers.mjs';

const run = (d, o = {}) => validateData(d, { schemaDir, today: TODAY, ...o });
const has = (r, re) => r.errors.some((e) => re.test(e));

test('base dataset is valid', () => {
  const r = run(baseData());
  assert.deepEqual(r.errors, []);
});

test('fee values accept single numbers, ranges and plans; nothing collapsed', () => {
  const d = baseData();
  d['fee-schedules'][0].management_pct = { type: 'pct_of_rent', min: 7, max: 10, basis: 'rate basis not stated' };
  d['fee-schedules'][1].flat_fee = { type: 'flat_usd', period: 'monthly', plans: [{ name: 'Passive', value: 85, label_confirmed: false }, { name: 'Premium', value: 145 }] };
  d['fee-schedules'][2].leasing_fee = { type: 'pct_of_monthly_rent', period: 'one_time', plans: [{ name: 'Core', value: 75, minimum_usd: 800 }] };
  assert.deepEqual(run(d).errors, []);
});

test('fee values stay nullable', () => {
  const d = baseData();
  const f = d['fee-schedules'][0];
  f.management_pct = null; f.minimums = null;
  assert.deepEqual(run(d).errors, []);
});

test('rejects a fee value with no number, range or plan', () => {
  const d = baseData();
  d['fee-schedules'][0].management_pct = { type: 'pct_of_rent' };
  assert.ok(run(d).errors.length > 0);
});

test('rejects value together with min/max, min greater than max, and plans plus top-level value', () => {
  let d = baseData();
  d['fee-schedules'][0].management_pct = { type: 'pct_of_rent', value: 8, min: 7, max: 10 };
  assert.ok(has(run(d), /both value and min\/max/));
  d = baseData();
  d['fee-schedules'][0].management_pct = { type: 'pct_of_rent', min: 10, max: 7 };
  assert.ok(has(run(d), /min is greater than max/));
  d = baseData();
  d['fee-schedules'][0].management_pct = { type: 'pct_of_rent', value: 8, plans: [{ name: 'A', value: 8 }] };
  assert.ok(has(run(d), /plans and a top-level value/));
});

test('rejects a management percent over 100 and negative money', () => {
  let d = baseData();
  d['fee-schedules'][0].management_pct = { type: 'pct_of_rent', value: 150 };
  assert.ok(has(run(d), /exceeds 100/));
  d = baseData();
  d['fee-schedules'][0].flat_fee = { type: 'flat_usd', value: -5 };
  assert.ok(run(d).errors.length > 0);
});

test('every fact needs provenance; unknown source_id and use_allowed=false fail', () => {
  let d = baseData();
  delete d['fee-schedules'][0].captured_date;
  assert.ok(run(d).errors.length > 0);
  d = baseData();
  d['fee-schedules'][0].source_id = 'src_nope';
  assert.ok(has(run(d), /unknown source_id/));
  d = baseData();
  d.sources[0].use_allowed = false;
  assert.ok(has(run(d), /use_allowed=false/));
});

test('source_url host must match the cited source', () => {
  const d = baseData();
  d['fee-schedules'][0].source_urls = ['https://other.example.org/pricing'];
  assert.ok(has(run(d), /host does not match/));
});

test('last_verified before captured, and future dates, fail', () => {
  let d = baseData();
  d['fee-schedules'][0].last_verified_date = '2026-11-01';
  assert.ok(has(run(d), /before captured_date/));
  d = baseData();
  d['fee-schedules'][0].captured_date = '2027-01-01'; d['fee-schedules'][0].last_verified_date = '2027-01-02';
  assert.ok(has(run(d), /in the future/));
});

test('sources: company submissions and official reference pages are allowed', () => {
  const d = baseData();
  d.sources.push({ id: 'src_submission', name: 'Company submission', url: 'https://c1.example.com/', source_kind: 'company_submission', access_method: 'company_submission', robots_txt_checked_date: null, robots_decision: 'not_applicable', tos_checked_date: null, tos_decision: 'not_applicable', use_allowed: true, decision_notes: null });
  d.sources.push({ id: 'src_ohio_ref', name: 'Ohio Division of Real Estate guidance', url: 'https://com.ohio.gov/guidance', source_kind: 'official_reference', access_method: 'official_reference', robots_txt_checked_date: null, robots_decision: 'not_applicable', tos_checked_date: null, tos_decision: 'not_applicable', use_allowed: true, decision_notes: null });
  d['fee-schedules'][0] = fee(1, { verification_status: 'company_submitted', source_id: 'src_submission', source_urls: ['https://c1.example.com/'] });
  assert.deepEqual(run(d).errors, []);
});

test('sources: not_applicable is refused for scraped sources; mismatched kind and method fail', () => {
  let d = baseData();
  d.sources[0].robots_decision = 'not_applicable';
  assert.ok(has(run(d), /not_applicable/));
  d = baseData();
  d.sources[0].access_method = 'company_submission';
  assert.ok(has(run(d), /needs source_kind company_submission/));
});

test('sources: a third-party directory can never be use_allowed or a fee source', () => {
  const d = baseData();
  d.sources.push({ ...siteSource('dir', 'dir.example.net'), source_kind: 'third_party_directory' });
  assert.ok(has(run(d), /third-party directory is never a value source/));
  const d2 = baseData();
  d2.sources.push({ ...siteSource('dir', 'dir.example.net'), source_kind: 'third_party_directory', use_allowed: false });
  d2['fee-schedules'][0].source_id = 'src_dir';
  d2['fee-schedules'][0].source_urls = ['https://dir.example.net/x'];
  const r = run(d2);
  assert.ok(has(r, /use_allowed=false/) && has(r, /not a value source/));
});

test('verified_own_site needs a company_site source', () => {
  const d = baseData();
  d.sources[0].source_kind = 'official_record';
  assert.ok(has(run(d), /verified_own_site needs a company_site source/));
});

test('robots/ToS decisions need check dates; disallowed robots cannot be use_allowed', () => {
  let d = baseData();
  d.sources[0].robots_txt_checked_date = null;
  assert.ok(has(run(d), /without robots_txt_checked_date/));
  d = baseData();
  d.sources[0].robots_decision = 'disallowed';
  assert.ok(has(run(d), /robots_decision is disallowed/));
});

test('evidence levels: directory-only and lead records stay out of the counted tiers', () => {
  const d = baseData();
  d.sources.push({ ...siteSource('dir', 'dir.example.net'), source_kind: 'third_party_directory', use_allowed: false });
  d.companies.push(company(7, { website: null, evidence_level: 'third_party_directory_only', tier: 'unconfirmed', source_id: 'src_dir', source_url: 'https://dir.example.net/c7' }));
  assert.deepEqual(run(d).errors, []);
  // counted as Tier A -> error
  d.companies[6].tier = 'A';
  assert.ok(has(run(d), /must have tier unconfirmed/));
  // directory-only with a fee row -> error
  d.companies[6].tier = 'unconfirmed';
  d['fee-schedules'].push(fee(7, { source_id: 'src_dir', source_urls: ['https://dir.example.net/x'] }));
  const r = run(d);
  assert.ok(has(r, /fee rows need an own-site-confirmed company/));
});

test('own_site_confirmed needs a website on the source host; tier A needs a Phase 1 street address', () => {
  let d = baseData();
  d.companies[0].website = 'https://elsewhere.example.org';
  assert.ok(has(run(d), /website host does not match/));
  d = baseData();
  d.companies[0].address = { street: null, city: 'Austin', county: null, state: 'TX', zip: null };
  assert.ok(has(run(d), /tier A needs a street address in Phase 1/));
});

test('license: self_stated needs the exact claim; verified statuses need an official source', () => {
  let d = baseData();
  d.companies[0].license = { status: 'self_stated', number: null, issuing_body: null, claim_text: null, source_id: 'src_c1', source_url: 'https://c1.example.com/', captured_date: D, last_verified_date: D };
  assert.ok(has(run(d), /self_stated needs claim_text/));
  d = baseData();
  d.companies[0].license = { status: 'active', number: '123', issuing_body: 'Ohio Division of Real Estate', claim_text: null, source_id: 'src_c1', source_url: 'https://c1.example.com/', captured_date: D, last_verified_date: D };
  assert.ok(has(run(d), /must cite an official_record/));
  d = baseData();
  d.companies[0].license = { status: 'unverified', number: null, issuing_body: null, claim_text: null, source_id: 'src_c1', source_url: 'https://c1.example.com/', captured_date: D, last_verified_date: D };
  assert.deepEqual(run(d).errors, []);
});

test('duplicate fee row for the same company and property type fails; null type is its own key', () => {
  const d = baseData();
  d['fee-schedules'].push(fee(1, { id: 'fee_t1_b' }));
  assert.ok(has(run(d), /more than one row/));
});

test('suppression by id, domain and name blocks the company', () => {
  for (const rec of [{ company_id: 'co_t1', domain: null, name: null }, { company_id: null, domain: 'c1.example.com', name: null }, { company_id: null, domain: null, name: 'company a' }]) {
    const d = baseData();
    d.suppression.push({ id: 'sup_1', reason: 'owner_request', requested_date: D, ...rec });
    assert.ok(has(run(d), /suppressed company still present/), JSON.stringify(rec));
  }
});

test('placeholder records and unreviewed ToS are warnings, not errors', () => {
  const d = baseData();
  d.companies[0].placeholder = true;
  d.sources[1].tos_decision = 'not_checked'; d.sources[1].tos_checked_date = null;
  const r = run(d);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => /placeholder record/.test(w)));
  assert.ok(r.warnings.some((w) => /terms of service not reviewed/.test(w)));
});

test('sources used for automation get a stale-check warning after 90 days', () => {
  const d = baseData();
  d.sources[0].tos_checked_date = '2026-06-01'; d.sources[0].robots_txt_checked_date = '2026-06-01';
  assert.ok(run(d).warnings.some((w) => /days old/.test(w)));
});

test('the real data directory validates', async () => {
  const { readData } = await import('../scripts/lib/validate-data.mjs');
  const { root } = await import('./helpers.mjs');
  const r = validateData(readData(`${root}/data`), { schemaDir, today: TODAY });
  assert.deepEqual(r.errors, []);
});
