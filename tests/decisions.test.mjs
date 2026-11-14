// Tests for the PM decisions: site name, badge wording, Not recorded vs Not published, first-year cost range, corrections.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, baseData, TODAY, D, schemaDir } from './helpers.mjs';
import { validateData } from '../scripts/lib/validate-data.mjs';
import { unknownKind, UNKNOWN } from '../src/lib/fees.mjs';
import { SITE_NAME } from '../src/lib/brand.mjs';

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const errs = (d) => validateData(d, { schemaDir, today: TODAY }).errors;

// ---- 1. name
test('site name: default is Central Ohio Property Management Guide and nothing in src or docs of the live site keeps the old one', () => {
  assert.equal(SITE_NAME, 'Central Ohio Property Management Guide');
  for (const f of ['src/layouts/Base.astro', 'src/pages/index.astro', 'src/lib/export.mjs', 'src/lib/brand.mjs', 'README.md', '.env.example', 'src/styles/site.css']) {
    assert.ok(!/Columbus PM Guide/.test(read(f)), `${f} still has the old name`);
  }
  assert.ok(!/^[^\n]*PUBLIC_SITE_NAME[^\n]*Columbus/.test(read('.env.example')));
});

// ---- 3. Not recorded vs Not published
test('unknown text: Not published only where a check is recorded, otherwise Not recorded', () => {
  assert.equal(UNKNOWN.not_recorded, 'Not recorded');
  assert.equal(unknownKind({}, 'phone'), 'not_recorded');
  assert.equal(unknownKind({ fields_checked: {} }, 'phone'), 'not_recorded');
  assert.equal(unknownKind({ fields_checked: { phone: { source_id: 'src_c1', checked_date: D } } }, 'phone'), 'not_published');
  assert.equal(unknownKind({ fields_checked: { phone: { source_id: 'src_c1', checked_date: D } } }, 'address'), 'not_recorded');
});
test('validator: fields_checked needs a real source, a past date, and an empty field', () => {
  let d = baseData(); d.companies[0].fields_checked = { phone: { source_id: 'src_c1', checked_date: D } };
  assert.deepEqual(errs(d), [], 'phone is null in the fixture, so recording it as not stated is fine');
  d = baseData(); d.companies[0].fields_checked = { website: { source_id: 'src_c1', checked_date: D } };
  assert.ok(errs(d).some((e) => /has a value/.test(e)));
  d = baseData(); d.companies[0].fields_checked = { phone: { source_id: 'src_nope', checked_date: D } };
  assert.ok(errs(d).some((e) => /unknown source_id/.test(e)));
  d = baseData(); d.companies[0].fields_checked = { phone: { source_id: 'src_c1', checked_date: '2099-01-01' } };
  assert.ok(errs(d).some((e) => /in the future/.test(e)));
  d = baseData(); d.companies[0].fields_checked = { colour: { source_id: 'src_c1', checked_date: D } };
  assert.ok(errs(d).length > 0, 'unknown field names are rejected by the schema');
});
test('company page uses the per-field state for contact, areas, services and property types', () => {
  const src = read('src/pages/company/[slug].astro');
  for (const f of ['website', 'phone', 'address', 'services', 'property_types', 'service_areas']) assert.match(src, new RegExp(`unknownKind\\(c, '${f}'\\)`));
});

// ---- 4. first-year cost range
import { yearDescriptor, yearRange, yearText, yearNotes } from '../src/lib/firstyear.mjs';
const mgmt = (v) => ({ type: 'pct_of_rent', ...v });
test('first year: published parts only, hand-checked arithmetic at $1,500 rent', () => {
  const row = { management_pct: mgmt({ value: 6 }), leasing_fee: { type: 'pct_of_monthly_rent', value: 50, minimum_usd: 500 }, renewal_fee: { type: 'flat_usd', period: 'one_time', value: 250 } };
  const d = yearDescriptor(row);
  assert.deepEqual(yearRange(d, 1500), { low: 2080, high: 2080 }); // 6% x 1500 x 12 = 1080; leasing max(750, 500); renewal 250
  assert.equal(yearText(d, 1500), '$2,080 in year one');
  assert.equal(yearNotes(d), 'Includes: management fee, leasing fee, one renewal fee.');
  assert.deepEqual(yearRange(d, 600), { low: 432 + 500 + 250, high: 432 + 500 + 250 }, 'the $500 leasing floor applies at low rents');
});
test('first year: a range is lowest to highest published combination, never a midpoint', () => {
  const d = yearDescriptor({ management_pct: mgmt({ min: 7, max: 10 }), leasing_fee: { type: 'pct_of_monthly_rent', value: 50 } });
  assert.deepEqual(yearRange(d, 1500), { low: 1260 + 750, high: 1800 + 750 });
  assert.equal(yearText(d, 1500), '$2,010 to $2,550 in year one');
});
test('first year: a fee that is not published is named, never counted as zero', () => {
  const d = yearDescriptor({ management_pct: mgmt({ value: 8.5 }) });
  assert.deepEqual(d.miss, ['leasing fee', 'renewal fee']);
  assert.match(yearNotes(d), /Not published, so not included: leasing fee, renewal fee\./);
  assert.equal(yearRange(d, 1500).low, 1530);
});
test('first year: open-ended or revenue-based fees are not turned into numbers; no ongoing fee means no figure', () => {
  const open = yearDescriptor({ management_pct: mgmt({ value: 8 }), leasing_fee: { type: 'pct_of_monthly_rent', min: 50 } });
  assert.deepEqual(open.miss, ['leasing fee', 'renewal fee']);
  assert.equal(yearDescriptor({ management_pct: mgmt({ min: 7 }) }), null, 'only a minimum percent: no range possible');
  assert.equal(yearDescriptor({ leasing_fee: { type: 'pct_of_monthly_rent', value: 50 } }), null, 'no ongoing fee');
  assert.equal(yearDescriptor({ management_pct: mgmt({ value: 20 }) }, { revenueBasis: true }), null);
  assert.equal(yearText(null, 1500), 'Not enough published data');
  assert.equal(yearText(yearDescriptor({ management_pct: mgmt({ value: 8 }) }), 0), 'Enter an example rent');
});
test('first year: plans give a range, monthly flat fees are x12, annual flat fees are not multiplied', () => {
  const plans = yearDescriptor({ flat_fee: { type: 'flat_usd', period: 'monthly', plans: [{ value: 85 }, { value: 145 }] } });
  assert.deepEqual(yearRange(plans, 1500), { low: 1020, high: 1740 });
  const annual = yearDescriptor({ flat_fee: { type: 'flat_usd', period: 'annual', value: 1200 } });
  assert.deepEqual(yearRange(annual, 1500), { low: 1200, high: 1200 });
});
test('fee table labels the column as an illustration and says what it assumes', () => {
  assert.match(read('src/components/FeeTable.astro'), /First-year cost, an illustration/);
  const page = read('src/pages/fees/[...slug].astro');
  assert.match(page, /never an average/);
  assert.match(page, /not counted as zero/);
});

// ---- 5. corrections: documents by email and a public log
const logEntry = (o = {}) => ({ id: 'cl_001', date: D, type: 'corrected', company_id: 'co_t1', company_name: 'Company A', what_changed: 'Renewal fee changed from $150 to $200.', ...o });
test('corrections log: valid entry passes; requester data, links and unknown companies fail', () => {
  let d = baseData(); d['corrections-log'] = [logEntry()];
  assert.deepEqual(errs(d), []);
  d = baseData(); d['corrections-log'] = [logEntry({ what_changed: 'Requested by jane@example.com: fee fixed' })];
  assert.ok(errs(d).some((e) => /no requester data/.test(e)));
  d = baseData(); d['corrections-log'] = [logEntry({ what_changed: 'See https://example.com/x for the new fee' })];
  assert.ok(errs(d).some((e) => /no requester data/.test(e)));
  d = baseData(); d['corrections-log'] = [logEntry({ company_id: 'co_missing' })];
  assert.ok(errs(d).some((e) => /unknown company_id/.test(e)));
  d = baseData(); d['corrections-log'] = [logEntry({ date: '2099-01-01' })];
  assert.ok(errs(d).some((e) => /in the future/.test(e)));
  d = baseData(); d['corrections-log'] = [logEntry(), logEntry()];
  assert.ok(errs(d).some((e) => /duplicate id/.test(e)));
  d = baseData(); d['corrections-log'] = [{ ...logEntry(), requester_email: 'a@b.co' }];
  assert.ok(errs(d).length > 0, 'extra fields (requester details) are rejected by the schema');
});
test('corrections log: a removal is logged without naming the company', () => {
  let d = baseData(); d['corrections-log'] = [logEntry({ type: 'removed' })];
  assert.ok(errs(d).some((e) => /removal is logged without the company/.test(e)));
  d = baseData(); d['corrections-log'] = [logEntry({ type: 'removed', company_id: null, company_name: null, what_changed: 'Listing removed at the request of the company.' })];
  assert.deepEqual(errs(d), []);
});
test('corrections log: the real log validates, the page is a noindex utility page linked from corrections, footer and site map', async () => {
  const { evaluateSite } = await import('../src/lib/site.mjs');
  const s = evaluateSite({ today: '2026-11-14', prod: true });
  assert.ok(s.utilityPages.includes('/corrections-log/'));
  assert.ok(!s.indexable.some((p) => p.path === '/corrections-log/'));
  assert.match(read('src/pages/corrections-log.astro'), /noindex/);
  for (const f of ['src/pages/corrections.astro', 'src/layouts/Base.astro', 'src/pages/site-map.astro']) assert.match(read(f), /corrections-log/);
  assert.ok(Array.isArray(JSON.parse(read('data/corrections-log.json'))));
});
test('corrections form: a company with no public link can say it will email documents', () => {
  assert.match(read('src/pages/corrections.astro'), /name="will_email_documents"/);
  assert.match(read('src/scripts/corrections.js'), /will_email_documents\.checked/);
});
