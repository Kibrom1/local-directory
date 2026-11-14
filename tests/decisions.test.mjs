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
