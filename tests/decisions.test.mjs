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
