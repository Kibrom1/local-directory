// Loads data, builds indexes, and applies the build-time quality gate.
import fs from 'node:fs';
import path from 'node:path';
import quality from './quality.json' with { type: 'json' };

const dataDir = path.join(process.cwd(), 'data');
const load = (n) => JSON.parse(fs.readFileSync(path.join(dataDir, `${n}.json`), 'utf8'));

let cache;
export function getSite() {
  if (cache) return cache;
  const companies = load('companies');
  const fees = load('fee-schedules');
  const areas = load('service-areas');
  const propertyTypes = load('property-types');
  const geography = load('geography');
  const sources = load('sources');

  const geoById = new Map(geography.map((g) => [g.id, g]));
  const ptById = new Map(propertyTypes.map((p) => [p.id, p]));
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const feeHasValue = (f) =>
    f.management_pct !== null || f.flat_fee !== null || f.leasing_fee !== null || f.renewal_fee !== null ||
    (f.minimums && (f.minimums.monthly_usd !== null || f.minimums.other !== null));

  const skipped = [];
  const published = [];
  const placeholderPaths = new Set();

  // Company pages
  const companyPages = [];
  for (const c of companies) {
    const cFees = fees.filter((f) => f.company_id === c.id);
    const cAreas = areas.filter((a) => a.company_id === c.id).map((a) => geoById.get(a.geography_id));
    const groups = {
      license: !!c.license,
      fees: cFees.some(feeHasValue),
      areas: cAreas.length > 0,
      services: c.services.length > 0,
      property_types: c.property_types_served.length > 0,
      contact: !!(c.website || c.phone || (c.address && (c.address.street || c.address.zip)))
    };
    const have = Object.keys(groups).filter((k) => groups[k]);
    const reasons = [];
    if (have.length < quality.company.minFactGroups) reasons.push(`only ${have.length} fact group(s) (${have.join(', ') || 'none'}); need ${quality.company.minFactGroups}`);
    if (!quality.company.requireOneOf.some((k) => groups[k])) reasons.push(`none of required groups present (${quality.company.requireOneOf.join(' / ')})`);
    const page = { type: 'company', path: `/company/${c.slug}/`, company: c, fees: cFees, areas: cAreas, groups };
    if (reasons.length) skipped.push({ path: page.path, type: 'company', id: c.id, reasons });
    else { published.push({ path: page.path, type: 'company', id: c.id }); companyPages.push(page); }
    if (c.placeholder) placeholderPaths.add(page.path);
  }
  const publishedCompanyIds = new Set(companyPages.map((p) => p.company.id));

  // City pages
  const cityPages = [];
  for (const g of geography.filter((x) => x.type === 'city')) {
    const ids = new Set(areas.filter((a) => a.geography_id === g.id).map((a) => a.company_id));
    const listed = companyPages.filter((p) => ids.has(p.company.id));
    const page = { type: 'city', path: `/city/${g.slug}/`, geo: g, companies: listed };
    const need = quality.city.minPublishableCompanies;
    if (listed.length < need) skipped.push({ path: page.path, type: 'city', id: g.id, reasons: [`only ${listed.length} publishable company(ies); need ${need}`] });
    else { published.push({ path: page.path, type: 'city', id: g.id }); cityPages.push(page); }
    if (areas.some((a) => a.geography_id === g.id && a.placeholder)) placeholderPaths.add(page.path);
  }
  for (const p of ['/', '/about/', '/privacy/']) published.unshift({ path: p, type: 'static', id: null });

  return { companies, fees, areas, propertyTypes, geography, sources, geoById, ptById, sourceById, companyPages, cityPages, published, skipped, placeholderPaths, publishedCompanyIds, quality };
}

export function buildReport() {
  const s = getSite();
  const byType = {};
  for (const p of s.published) byType[p.type] = (byType[p.type] || 0) + 1;
  return {
    generated_at: new Date().toISOString(),
    thresholds: s.quality,
    published_count: s.published.length,
    skipped_count: s.skipped.length,
    published_by_type: byType,
    published: s.published,
    skipped: s.skipped,
    placeholder_pages_noindexed: [...s.placeholderPaths]
  };
}

export const fmtFee = (v) => (v === null || v === undefined ? null : v);
export function fmtAmount(a) {
  if (!a) return null;
  return a.type === 'flat_usd' ? `$${a.value}` : `${a.value}% of monthly rent`;
}
