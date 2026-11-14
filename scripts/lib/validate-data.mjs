// Pure validation of a loaded dataset: JSON Schema, referential integrity,
// provenance, fee-shape rules, evidence-level rules and the suppression list.
// Returns { errors, warnings }. Used by scripts/validate.mjs, tests and the scraper.
import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { daysBetween } from '../../src/lib/freshness.mjs';
import { feeValuePopulated } from '../../src/lib/gate.mjs';

export { daysBetween, feeValuePopulated };

export const FILES = ['companies', 'fee-schedules', 'service-areas', 'property-types', 'geography', 'sources', 'suppression'];
export const FEE_FIELDS = ['management_pct', 'flat_fee', 'leasing_fee', 'renewal_fee'];
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

export function readData(dataDir) {
  const data = {};
  for (const n of FILES) data[n] = readJson(path.join(dataDir, `${n}.json`));
  return data;
}

export const normName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; } };
// Same rule the scraper uses: the suppressed domain or any subdomain of it.
export const domainMatches = (dom, suppressed) => { const d = (suppressed || '').toLowerCase().replace(/^www\./, ''); return !!dom && !!d && (dom === d || dom.endsWith(`.${d}`)); };

let ajvCache = new Map();
function getAjv(schemaDir) {
  if (!ajvCache.has(schemaDir)) {
    const ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);
    ajv.addSchema(readJson(path.join(schemaDir, 'common.schema.json')));
    const validators = {};
    for (const n of FILES) validators[n] = ajv.compile(readJson(path.join(schemaDir, `${n}.schema.json`)));
    ajvCache.set(schemaDir, validators);
  }
  return ajvCache.get(schemaDir);
}

function checkFeeValue(where, v, fail) {
  if (!v) return;
  const num = (x) => typeof x === 'number';
  const shape = (o, w) => {
    if (num(o.value) && (num(o.min) || num(o.max))) fail(`${w}: has both value and min/max; use one`);
    if (num(o.min) && num(o.max) && o.min > o.max) fail(`${w}: min is greater than max`);
  };
  shape(v, where);
  const pctCap = v.type === 'pct_of_rent' ? 100 : v.type === 'pct_of_monthly_rent' ? 300 : Infinity;
  const caps = [v, ...(v.plans || [])];
  for (const o of caps) for (const k of ['value', 'min', 'max']) if (num(o[k]) && o[k] > pctCap) fail(`${where}: ${k} ${o[k]} exceeds ${pctCap} for ${v.type}`);
  for (const [i, p] of (v.plans || []).entries()) shape(p, `${where} plan ${i}`);
  if (v.plans && v.plans.length && (num(v.value) || num(v.min) || num(v.max))) fail(`${where}: has plans and a top-level value/range; put each number inside a plan`);
}

export function validateData(data, { schemaDir, today = new Date().toISOString().slice(0, 10), staleSourceCheckDays = 90 } = {}) {
  const errors = [];
  const warnings = [];
  const fail = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const validators = getAjv(schemaDir);

  for (const name of FILES) {
    const v = validators[name];
    if (!Array.isArray(data[name])) { fail(`${name}.json: missing or not an array`); continue; }
    if (!v(data[name])) {
      for (const e of v.errors) fail(`${name}.json${e.instancePath} ${e.message}${e.params && e.params.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`);
    }
  }
  if (errors.length) return { errors, warnings };

  for (const name of FILES) {
    const seen = new Set();
    for (const r of data[name]) { if (seen.has(r.id)) fail(`${name}.json: duplicate id ${r.id}`); seen.add(r.id); }
  }
  for (const name of ['companies', 'geography', 'property-types']) {
    const seen = new Set();
    for (const r of data[name]) { if (seen.has(r.slug)) fail(`${name}.json: duplicate slug ${r.slug}`); seen.add(r.slug); }
  }

  const ids = (n) => new Set(data[n].map((r) => r.id));
  const companyIds = ids('companies');
  const companyById = new Map(data.companies.map((c) => [c.id, c]));
  const sourceById = new Map(data.sources.map((s) => [s.id, s]));
  const geoById = new Map(data.geography.map((g) => [g.id, g]));
  const ptIds = ids('property-types');

  // ---- sources
  for (const s of data.sources) {
    const w = `sources ${s.id}`;
    if (s.use_allowed && !s.url) fail(`${w}: use_allowed requires a url`);
    const manualKind = s.source_kind === 'company_submission' || s.source_kind === 'official_reference';
    if (s.source_kind === 'company_submission' && s.access_method !== 'company_submission') fail(`${w}: source_kind company_submission needs access_method company_submission`);
    if (s.source_kind === 'official_reference' && s.access_method !== 'official_reference') fail(`${w}: source_kind official_reference needs access_method official_reference`);
    if (s.access_method === 'company_submission' && s.source_kind !== 'company_submission') fail(`${w}: access_method company_submission needs source_kind company_submission`);
    if (s.access_method === 'official_reference' && s.source_kind !== 'official_reference') fail(`${w}: access_method official_reference needs source_kind official_reference`);
    if (!manualKind && (s.robots_decision === 'not_applicable' || s.tos_decision === 'not_applicable')) fail(`${w}: not_applicable robots/ToS decisions are only for company_submission and official_reference sources`);
    if (s.robots_decision !== 'not_checked' && s.robots_decision !== 'not_applicable' && !s.robots_txt_checked_date) fail(`${w}: robots_decision recorded without robots_txt_checked_date`);
    if (!['not_checked', 'not_applicable'].includes(s.tos_decision) && !s.tos_checked_date) fail(`${w}: tos_decision recorded without tos_checked_date`);
    if (s.use_allowed && s.robots_decision === 'disallowed') fail(`${w}: use_allowed is true but robots_decision is disallowed`);
    if (s.use_allowed && s.tos_decision === 'prohibits_automated_access') fail(`${w}: use_allowed is true but ToS prohibits automated access`);
    if (s.use_allowed && s.source_kind === 'third_party_directory') fail(`${w}: a third-party directory is never a value source (use_allowed must be false)`);
    if (s.use_allowed && s.source_kind === 'lead_unverified') fail(`${w}: an unverified lead marker cannot be use_allowed`);
    if (s.use_allowed && !manualKind) {
      if (s.robots_decision === 'not_checked') warn(`${w}: use_allowed with robots.txt not checked`);
      if (s.tos_decision === 'not_checked') warn(`${w}: use_allowed with terms of service not reviewed`);
    }
    for (const [k, d] of [['robots_txt_checked_date', s.robots_txt_checked_date], ['tos_checked_date', s.tos_checked_date]]) {
      if (d && d > today) fail(`${w}: ${k} ${d} is in the future`);
      else if (d && s.use_allowed && !manualKind && daysBetween(d, today) > staleSourceCheckDays) warn(`${w}: ${k} is ${daysBetween(d, today)} days old (re-check every ${staleSourceCheckDays})`);
    }
    if (s.placeholder) warn(`${w}: placeholder source`);
  }

  // ---- provenance helpers
  const hostMatches = (source, url) => {
    if (!source.url || !url) return true;
    const a = domainOf(source.url); const b = domainOf(url);
    return a === b || (b && a && b.endsWith(`.${a}`));
  };
  const checkSource = (where, sid, { allowRefused = false } = {}) => {
    const s = sourceById.get(sid);
    if (!s) { fail(`${where}: unknown source_id ${sid}`); return null; }
    if (!s.use_allowed && !allowRefused) fail(`${where}: source ${sid} has use_allowed=false`);
    return s;
  };
  const checkDates = (where, o) => {
    if (o.last_verified_date < o.captured_date) fail(`${where}: last_verified_date is before captured_date`);
    if (o.captured_date > today) fail(`${where}: captured_date ${o.captured_date} is in the future`);
    if (o.last_verified_date > today) fail(`${where}: last_verified_date ${o.last_verified_date} is in the future`);
  };
  // Verification method: a person's check needs a handle and a date; an agent read must not claim one.
  const checkVerification = (where, o) => {
    if (o.verification_method === 'human_compared') {
      if (!o.verified_by) fail(`${where}: human_compared needs verified_by (a role or handle)`);
      if (!o.human_verified_date) fail(`${where}: human_compared needs human_verified_date`);
    }
    if (o.verification_method === 'agent_read' && (o.human_verified_date || o.verified_by)) fail(`${where}: agent_read must not carry verified_by or human_verified_date`);
    if (!o.verification_method && (o.human_verified_date || o.verified_by)) fail(`${where}: verified_by/human_verified_date need verification_method human_compared`);
    if (o.human_verified_date) {
      if (o.human_verified_date > today) fail(`${where}: human_verified_date ${o.human_verified_date} is in the future`);
      if (o.captured_date && o.human_verified_date < o.captured_date) fail(`${where}: human_verified_date is before captured_date`);
    }
  };
  const checkProv = (where, o, opts) => {
    const s = checkSource(where, o.source_id, opts);
    checkDates(where, o);
    if (s && o.source_url && !hostMatches(s, o.source_url)) fail(`${where}: source_url host does not match source ${o.source_id}`);
    return s;
  };

  // ---- geography
  const countyIds = new Set(data.geography.filter((g) => g.type === 'county').map((g) => g.id));
  for (const g of data.geography) {
    if (g.parent_id && !geoById.has(g.parent_id)) fail(`geography ${g.id}: unknown parent_id ${g.parent_id}`);
    for (const k of g.also_in_county_ids || []) if (!countyIds.has(k)) fail(`geography ${g.id}: also_in_county_ids ${k} is not a county`);
  }
  const phase1Counties = new Set(data.geography.filter((g) => g.type === 'county').map((g) => g.name.replace(/ County$/, '').toLowerCase()));
  const phase1Cities = new Set(data.geography.filter((g) => g.type === 'city').map((g) => g.name.toLowerCase()));

  // ---- companies
  for (const c of data.companies) {
    const w = `companies ${c.id}`;
    const confirmed = c.evidence_level === 'own_site_confirmed';
    const s = checkProv(w, c, { allowRefused: !confirmed });
    checkVerification(w, c);
    if (c.placeholder) warn(`${w}: placeholder record`);
    if (confirmed) {
      if (s && s.source_kind !== 'company_site') fail(`${w}: own_site_confirmed needs a company_site source (got ${s.source_kind})`);
      if (!c.website) fail(`${w}: own_site_confirmed needs a website`);
      else if (s && !hostMatches(s, c.website)) fail(`${w}: website host does not match its own-site source ${c.source_id}`);
      if (c.tier === 'unconfirmed') fail(`${w}: own_site_confirmed company cannot have tier unconfirmed`);
    } else {
      if (c.tier !== 'unconfirmed') fail(`${w}: evidence_level ${c.evidence_level} must have tier unconfirmed (not counted)`);
      if (c.license || c.services.length || c.property_types_served.length) fail(`${w}: ${c.evidence_level} record may carry identity fields only (no license, services or property types)`);
      if (s && s.use_allowed) fail(`${w}: ${c.evidence_level} record should cite a source with use_allowed=false`);
      if (c.evidence_level === 'third_party_directory_only' && s && s.source_kind !== 'third_party_directory') fail(`${w}: third_party_directory_only needs a third_party_directory source`);
    }
    if (c.tier === 'A') {
      const a = c.address;
      const inP1 = a && a.state === 'OH' && a.street && a.city && (phase1Cities.has(a.city.toLowerCase()) || (a.county && phase1Counties.has(a.county.toLowerCase())));
      if (!inP1) fail(`${w}: tier A needs a street address in Phase 1 geography`);
    }
    if (c.address && c.address.county && c.address.state === 'OH' && !phase1Counties.has(c.address.county.toLowerCase())) warn(`${w}: county ${c.address.county} is outside the Phase 1 counties`);
    if (c.license) {
      const L = c.license;
      checkProv(`${w} license`, L);
      if (L.status === 'self_stated' && !L.claim_text) fail(`${w} license: self_stated needs claim_text (the exact claim)`);
      if (['active', 'inactive', 'none_found'].includes(L.status)) {
        const ls = sourceById.get(L.source_id);
        if (ls && !['official_record', 'official_reference'].includes(ls.source_kind)) fail(`${w} license: status ${L.status} must cite an official_record or official_reference source`);
      }
      if (L.status === 'unverified' && (L.number || L.claim_text)) fail(`${w} license: unverified must not carry a number or claim`);
    }
    for (const x of c.services) checkProv(`${w} service ${x.service}`, x);
    for (const p of c.property_types_served) {
      checkProv(`${w} property_types_served`, p);
      if (!ptIds.has(p.property_type_id)) fail(`${w}: unknown property_type_id ${p.property_type_id}`);
    }
  }

  // ---- fee schedules
  const feeKeys = new Set();
  for (const f of data['fee-schedules']) {
    const w = `fee-schedules ${f.id}`;
    const c = companyById.get(f.company_id);
    if (!c) fail(`${w}: unknown company_id ${f.company_id}`);
    else if (c.evidence_level !== 'own_site_confirmed') fail(`${w}: ${f.company_id} is ${c.evidence_level}; fee rows need an own-site-confirmed company`);
    if (f.property_type && !ptIds.has(f.property_type)) fail(`${w}: unknown property_type ${f.property_type}`);
    const s = checkProv(w, f);
    checkVerification(w, f);
    if (f.verification_status === 'verified_own_site' && !f.verification_method) fail(`${w}: verified_own_site needs verification_method (agent_read or human_compared)`);
    if (['network_wide', 'unconfirmed_mapping'].includes(f.scope) && !f.notes) fail(`${w}: scope ${f.scope} needs notes explaining the caveat shown to visitors`);
    if (s) {
      if (!['company_site', 'company_submission', 'official_reference', 'official_record'].includes(s.source_kind)) fail(`${w}: fee source kind ${s.source_kind} is not a value source`);
      if (f.verification_status === 'verified_own_site' && s.source_kind !== 'company_site') fail(`${w}: verified_own_site needs a company_site source`);
      if (f.verification_status === 'company_submitted' && s.source_kind !== 'company_submission') fail(`${w}: company_submitted needs a company_submission source`);
      for (const u of f.source_urls) if (!hostMatches(s, u)) fail(`${w}: source_url ${u} host does not match source ${f.source_id}`);
    }
    for (const k of FEE_FIELDS) checkFeeValue(`${w} ${k}`, f[k], fail);
    for (const [i, o] of (f.other_fees || []).entries()) checkFeeValue(`${w} other_fees[${i}]`, o.amount, fail);
    const k = `${f.company_id}|${f.property_type}`;
    if (feeKeys.has(k)) fail(`fee-schedules: more than one row for ${k}`);
    feeKeys.add(k);
  }

  // ---- service areas
  for (const a of data['service-areas']) {
    const w = `service-areas ${a.id}`;
    const c = companyById.get(a.company_id);
    if (!c) fail(`${w}: unknown company_id ${a.company_id}`);
    else if (c.evidence_level !== 'own_site_confirmed') fail(`${w}: ${a.company_id} is ${c.evidence_level}; service areas need an own-site-confirmed company`);
    if (!geoById.has(a.geography_id)) fail(`${w}: unknown geography_id ${a.geography_id}`);
    checkProv(w, a);
  }

  // ---- suppression
  for (const s of data.suppression) {
    const w = `suppression ${s.id}`;
    if (!s.company_id && !s.domain && !s.name) fail(`${w}: needs at least one of company_id, domain, name`);
    for (const c of data.companies) {
      const hit = (s.company_id && c.id === s.company_id) || (s.domain && domainMatches(domainOf(c.website), s.domain)) || (s.name && normName(c.name) === normName(s.name));
      if (hit) fail(`${w}: suppressed company still present in companies.json as ${c.id}`);
    }
    if (s.company_id) {
      for (const f of data['fee-schedules']) if (f.company_id === s.company_id) fail(`${w}: ${s.company_id} still has fee row ${f.id}`);
      for (const a of data['service-areas']) if (a.company_id === s.company_id) fail(`${w}: ${s.company_id} still has service area ${a.id}`);
    }
  }
  return { errors, warnings };
}
