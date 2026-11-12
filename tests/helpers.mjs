// Builds small valid datasets for tests. Every test clones and mutates.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const schemaDir = path.join(root, 'schemas');
export const TODAY = '2026-11-12';
export const D = '2026-11-11';

export const clone = (x) => JSON.parse(JSON.stringify(x));

export function siteSource(id, host, o = {}) {
  return { id: `src_${id}`, name: `${id} site`, url: `https://${host}/`, source_kind: 'company_site', access_method: 'scrape', robots_txt_checked_date: D, robots_decision: 'allowed', tos_checked_date: D, tos_decision: 'silent', use_allowed: true, decision_notes: null, ...o };
}
export function company(n, o = {}) {
  const id = `co_t${n}`;
  return { id, slug: `company-${n}`, name: `Company ${String.fromCharCode(64 + n)}`, legal_name: null, website: `https://c${n}.example.com`, phone: null,
    address: { street: `${n} Main St`, city: 'Columbus', county: 'Franklin', state: 'OH', zip: '43215' }, evidence_level: 'own_site_confirmed', tier: 'A', license: null, services: [], property_types_served: [], internal_notes: null,
    source_id: `src_c${n}`, source_url: `https://c${n}.example.com/`, captured_date: D, last_verified_date: D, ...o };
}
export const fee = (n, o = {}) => ({ id: `fee_t${n}`, company_id: `co_t${n}`, property_type: null, management_pct: { type: 'pct_of_rent', value: 8 }, flat_fee: null, leasing_fee: null, renewal_fee: null, minimums: null, other_fees: [], verification_status: 'verified_own_site', notes: null,
  source_id: `src_c${n}`, source_urls: [`https://c${n}.example.com/pricing`], captured_date: D, last_verified_date: D, ...o });
export const area = (n, geo, o = {}) => ({ id: `sa_t${n}_${geo}`, company_id: `co_t${n}`, geography_id: `geo_${geo}`, source_id: `src_c${n}`, source_url: `https://c${n}.example.com/`, note: null, captured_date: D, last_verified_date: D, ...o });
export const ptFact = (n, pt = 'pt_single_family') => ({ property_type_id: pt, source_id: `src_c${n}`, source_url: null, captured_date: D, last_verified_date: D });

export function baseData() {
  const geography = [
    { id: 'geo_columbus_metro', type: 'metro', name: 'Columbus Metro', slug: 'columbus-metro', state: 'OH', parent_id: null },
    { id: 'geo_franklin_county', type: 'county', name: 'Franklin County', slug: 'franklin-county', state: 'OH', parent_id: 'geo_columbus_metro' },
    { id: 'geo_columbus', type: 'city', name: 'Columbus', slug: 'columbus', state: 'OH', parent_id: 'geo_franklin_county' },
    { id: 'geo_dublin', type: 'city', name: 'Dublin', slug: 'dublin', state: 'OH', parent_id: 'geo_franklin_county' }
  ];
  const companies = [1, 2, 3, 4, 5, 6].map((n) => company(n, { property_types_served: [ptFact(n)] }));
  return {
    companies,
    'fee-schedules': [1, 2, 3, 4, 5, 6].map((n) => fee(n)),
    'service-areas': [1, 2, 3, 4, 5, 6].map((n) => area(n, 'columbus')),
    'property-types': [{ id: 'pt_single_family', slug: 'single-family', name: 'Single-family' }],
    geography,
    sources: [1, 2, 3, 4, 5, 6].map((n) => siteSource(`c${n}`, `c${n}.example.com`)),
    suppression: []
  };
}
