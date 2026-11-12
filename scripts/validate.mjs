// Validates data/*.json against schemas/*.schema.json, checks referential
// integrity and the suppression list. Exits 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const schemaDir = path.join(root, 'schemas');
const FILES = ['companies', 'fee-schedules', 'service-areas', 'property-types', 'geography', 'sources', 'suppression'];

const errors = [];
const fail = (msg) => errors.push(msg);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(readJson(path.join(schemaDir, 'common.schema.json')));

const data = {};
for (const name of FILES) {
  const dataPath = path.join(dataDir, `${name}.json`);
  const schemaPath = path.join(schemaDir, `${name}.schema.json`);
  let rows;
  try {
    rows = readJson(dataPath);
  } catch (e) {
    fail(`${name}.json: cannot read/parse (${e.message})`);
    continue;
  }
  const validate = ajv.compile(readJson(schemaPath));
  if (!validate(rows)) {
    for (const e of validate.errors) fail(`${name}.json${e.instancePath} ${e.message}${e.params && e.params.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`);
    continue;
  }
  data[name] = rows;
}

if (errors.length === 0) {
  // Unique IDs and slugs
  for (const name of FILES) {
    const seen = new Set();
    for (const r of data[name]) {
      if (seen.has(r.id)) fail(`${name}.json: duplicate id ${r.id}`);
      seen.add(r.id);
    }
  }
  for (const name of ['companies', 'geography', 'property-types']) {
    const seen = new Set();
    for (const r of data[name]) {
      if (seen.has(r.slug)) fail(`${name}.json: duplicate slug ${r.slug}`);
      seen.add(r.slug);
    }
  }

  const ids = (name) => new Set(data[name].map((r) => r.id));
  const companyIds = ids('companies');
  const sourceById = new Map(data.sources.map((s) => [s.id, s]));
  const geoIds = ids('geography');
  const ptIds = ids('property-types');

  const checkSource = (where, sid) => {
    const s = sourceById.get(sid);
    if (!s) return fail(`${where}: unknown source_id ${sid}`);
    if (!s.use_allowed) fail(`${where}: source ${sid} has use_allowed=false`);
  };
  const checkDates = (where, o) => {
    if (o.last_verified_date < o.captured_date) fail(`${where}: last_verified_date is before captured_date`);
  };
  const checkProv = (where, o) => { checkSource(where, o.source_id); checkDates(where, o); };

  for (const g of data.geography) {
    if (g.parent_id && !geoIds.has(g.parent_id)) fail(`geography ${g.id}: unknown parent_id ${g.parent_id}`);
  }
  for (const c of data.companies) {
    const w = `companies ${c.id}`;
    checkProv(w, c);
    if (c.license) checkProv(`${w} license`, c.license);
    for (const s of c.services) checkProv(`${w} service ${s.service}`, s);
    for (const p of c.property_types_served) {
      checkProv(`${w} property_types_served`, p);
      if (!ptIds.has(p.property_type_id)) fail(`${w}: unknown property_type_id ${p.property_type_id}`);
    }
  }
  for (const f of data['fee-schedules']) {
    const w = `fee-schedules ${f.id}`;
    if (!companyIds.has(f.company_id)) fail(`${w}: unknown company_id ${f.company_id}`);
    if (!ptIds.has(f.property_type)) fail(`${w}: unknown property_type ${f.property_type}`);
    checkProv(w, f);
  }
  for (const a of data['service-areas']) {
    const w = `service-areas ${a.id}`;
    if (!companyIds.has(a.company_id)) fail(`${w}: unknown company_id ${a.company_id}`);
    if (!geoIds.has(a.geography_id)) fail(`${w}: unknown geography_id ${a.geography_id}`);
    checkProv(w, a);
  }
  const feeKeys = new Set();
  for (const f of data['fee-schedules']) {
    const k = `${f.company_id}|${f.property_type}`;
    if (feeKeys.has(k)) fail(`fee-schedules: more than one row for ${k}`);
    feeKeys.add(k);
  }

  // Suppression: no suppressed company may appear anywhere.
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; } };
  for (const s of data.suppression) {
    const w = `suppression ${s.id}`;
    if (!s.company_id && !s.domain && !s.name) fail(`${w}: needs at least one of company_id, domain, name`);
    for (const c of data.companies) {
      const hit =
        (s.company_id && c.id === s.company_id) ||
        (s.domain && domainOf(c.website) === s.domain.toLowerCase().replace(/^www\./, '')) ||
        (s.name && norm(c.name) === norm(s.name));
      if (hit) fail(`${w}: suppressed company still present in companies.json as ${c.id}`);
    }
    if (s.company_id) {
      for (const f of data['fee-schedules']) if (f.company_id === s.company_id) fail(`${w}: ${s.company_id} still has fee row ${f.id}`);
      for (const a of data['service-areas']) if (a.company_id === s.company_id) fail(`${w}: ${s.company_id} still has service area ${a.id}`);
    }
  }
}

if (errors.length) {
  console.error(`Validation FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Validation passed: ${FILES.map((n) => `${n}=${data[n].length}`).join(', ')}`);
