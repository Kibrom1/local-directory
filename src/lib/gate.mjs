// Pure quality gate: decides which pages exist, which are indexable and which
// are listed as noindex,follow. No file or Astro access, so it is unit tested.
// Rules come from quality.json and mirror docs/pm/prd.md section 10.
import { collectFacts, summarizeFreshness, daysBetween } from './freshness.mjs';

export const FEE_TYPES = ['management_pct', 'flat_fee', 'leasing_fee', 'renewal_fee'];
export const GROUPS = ['license', 'fees', 'areas', 'services', 'property_types', 'contact'];
const num = (x) => typeof x === 'number';

export function feeValuePopulated(v) {
  if (!v) return false;
  return num(v.value) || num(v.min) || num(v.max) || (Array.isArray(v.plans) && v.plans.some((p) => num(p.value) || num(p.min) || num(p.max)));
}
export function feeRowHasValue(f) {
  return FEE_TYPES.some((k) => feeValuePopulated(f[k])) ||
    !!(f.minimums && (num(f.minimums.monthly_usd) || f.minimums.other)) ||
    (f.other_fees || []).some((o) => feeValuePopulated(o.amount));
}

// Completeness then name: the only inputs to ordering (PRD section 6). Payment,
// claim status or any field outside the six groups cannot affect order.
export function rankPages(pages) {
  return [...pages].sort((a, b) => (b.completeness - a.completeness) || a.company.name.localeCompare(b.company.name) || a.company.id.localeCompare(b.company.id));
}

export function evaluate(data, quality, { today } = {}) {
  today = today || new Date().toISOString().slice(0, 10);
  const q = quality;
  const fresh = (d) => daysBetween(d, today) <= q.freshness.dropDays;
  const geoById = new Map(data.geography.map((g) => [g.id, g]));
  const ptById = new Map(data['property-types'] ? data['property-types'].map((p) => [p.id, p]) : (data.propertyTypes || []).map((p) => [p.id, p]));
  const sourceById = new Map(data.sources.map((s) => [s.id, s]));
  const fees = data['fee-schedules'] || data.fees;
  const areas = data['service-areas'] || data.areas;
  const srcOk = (id) => !!(sourceById.get(id) && sourceById.get(id).use_allowed);

  const skipped = [];
  const noindexListed = [];
  const indexable = [];
  const placeholderPaths = new Set();
  const companyPages = [];

  for (const c of data.companies) {
    const cFees = fees.filter((f) => f.company_id === c.id);
    const verifiedRows = cFees.filter((f) => q.verifiedFeeStatuses.includes(f.verification_status) && srcOk(f.source_id) && fresh(f.last_verified_date) && feeRowHasValue(f));
    const cAreaRows = areas.filter((a) => a.company_id === c.id && srcOk(a.source_id) && fresh(a.last_verified_date));
    const cAreas = cAreaRows.map((a) => geoById.get(a.geography_id)).filter(Boolean);
    const idFresh = srcOk(c.source_id) && fresh(c.last_verified_date);
    const licOk = !!(c.license && ['self_stated', 'active', 'inactive'].includes(c.license.status) && srcOk(c.license.source_id) && fresh(c.license.last_verified_date));
    const groups = {
      license: licOk,
      fees: verifiedRows.length > 0,
      areas: cAreas.length > 0,
      services: c.services.some((s) => srcOk(s.source_id) && fresh(s.last_verified_date)),
      property_types: c.property_types_served.some((s) => srcOk(s.source_id) && fresh(s.last_verified_date)),
      contact: idFresh && !!(c.website || c.phone || (c.address && (c.address.street || c.address.zip)))
    };
    const have = GROUPS.filter((k) => groups[k]);
    const verifiedLicense = !!(c.license && q.verifiedLicenseStatuses.includes(c.license.status) && srcOk(c.license.source_id) && fresh(c.license.last_verified_date));
    const verifiedFees = groups.fees;
    const base = { type: 'company', path: `/company/${c.slug}/`, id: c.id, company: c, fees: cFees, verifiedFeeRows: verifiedRows, areas: cAreas, groups, completeness: have.length, verifiedFees, verifiedLicense };

    if (c.placeholder) {
      placeholderPaths.add(base.path);
      companyPages.push({ ...base, tier: 'placeholder', robots: 'noindex, nofollow' });
      continue;
    }
    const reasons = [];
    if (!q.company.indexRequireEvidence.includes(c.evidence_level)) {
      skipped.push({ path: base.path, type: 'company', id: c.id, reasons: [`evidence level ${c.evidence_level}: only own-site-confirmed companies are published`] });
      continue;
    }
    if (have.length < q.company.minFactGroups) reasons.push(`only ${have.length} fact group(s) (${have.join(', ') || 'none'}); need ${q.company.minFactGroups}`);
    const hasRequired = (q.company.indexRequireOneOf.includes('fees') && verifiedFees) || (q.company.indexRequireOneOf.includes('license') && verifiedLicense);
    if (!hasRequired) reasons.push(`no verified ${q.company.indexRequireOneOf.join(' or ')} (areas, services and contact alone do not make a profile indexable)`);
    if (!reasons.length) {
      indexable.push({ path: base.path, type: 'company', id: c.id });
      companyPages.push({ ...base, tier: 'indexable', robots: 'index, follow' });
    } else if (have.length >= q.company.listed.minFactGroups && q.company.listed.requireEvidence.includes(c.evidence_level)) {
      noindexListed.push({ path: base.path, type: 'company', id: c.id, reasons });
      companyPages.push({ ...base, tier: 'listed', robots: 'noindex, follow' });
    } else {
      skipped.push({ path: base.path, type: 'company', id: c.id, reasons: [...reasons, `below listed bar (${q.company.listed.minFactGroups} fact groups)`] });
    }
  }

  // City pages
  const cityPages = [];
  for (const g of data.geography.filter((x) => x.type === 'city')) {
    const serving = new Set(areas.filter((a) => a.geography_id === g.id).map((a) => a.company_id));
    const live = companyPages.filter((p) => serving.has(p.id));
    const base = { type: 'city', path: `/city/${g.slug}/`, id: g.id, geo: g };
    if (live.some((p) => p.tier === 'placeholder')) {
      placeholderPaths.add(base.path);
      cityPages.push({ ...base, companies: rankPages(live.filter((p) => p.tier !== 'listed')), listedCompanies: [], tier: 'placeholder', robots: 'noindex, nofollow' });
      continue;
    }
    const idx = rankPages(live.filter((p) => p.tier === 'indexable'));
    const listed = rankPages(live.filter((p) => p.tier === 'listed'));
    const withFees = idx.filter((p) => p.verifiedFees).length;
    const reasons = [];
    if (idx.length < q.city.indexMinCompanies) reasons.push(`only ${idx.length} indexable company(ies) serve it; need ${q.city.indexMinCompanies}`);
    if (withFees < q.city.indexMinCompaniesWithFees) reasons.push(`${withFees} with verified fees; need ${q.city.indexMinCompaniesWithFees}`);
    if (!reasons.length) {
      indexable.push({ path: base.path, type: 'city', id: g.id });
      cityPages.push({ ...base, companies: idx, listedCompanies: listed, tier: 'indexable', robots: 'index, follow', withFees });
    } else if (idx.length + listed.length >= q.city.listedMinCompanies) {
      noindexListed.push({ path: base.path, type: 'city', id: g.id, reasons });
      cityPages.push({ ...base, companies: idx, listedCompanies: listed, tier: 'listed', robots: 'noindex, follow', withFees });
    } else {
      skipped.push({ path: base.path, type: 'city', id: g.id, reasons: [...reasons, `fewer than ${q.city.listedMinCompanies} listed companies`] });
    }
  }

  const staticPages = ['/', '/about/', '/privacy/'].map((p) => ({ path: p, type: 'static', id: null }));
  const builtIndexable = [...staticPages, ...indexable];

  // Fee data counts (companies with at least one verified, fresh value per fee type)
  const feeCompanies = (pred) => new Set(fees.filter((f) => {
    const c = data.companies.find((x) => x.id === f.company_id);
    return c && !c.placeholder && c.evidence_level === 'own_site_confirmed' && q.verifiedFeeStatuses.includes(f.verification_status) && srcOk(f.source_id) && fresh(f.last_verified_date) && pred(f);
  }).map((f) => f.company_id));
  const perFeeType = {};
  for (const k of FEE_TYPES) perFeeType[k] = feeCompanies((f) => feeValuePopulated(f[k])).size;
  perFeeType.minimums = feeCompanies((f) => !!(f.minimums && (num(f.minimums.monthly_usd) || f.minimums.other))).size;
  const companiesWithFees = feeCompanies(feeRowHasValue);

  // Pages whose gate is decided here but whose templates are built later.
  const planned = [];
  const need = q.feeGuide.minCompaniesPerFeeType;
  planned.push({ type: 'fee-comparison', path: '/fees/', count: companiesWithFees.size, need: q.feeComparison.minCompanies, eligible: companiesWithFees.size >= q.feeComparison.minCompanies });
  for (const k of FEE_TYPES) planned.push({ type: 'fee-guide', path: `/fees/${k.replace(/_/g, '-')}/`, fee_type: k, count: perFeeType[k], need, eligible: perFeeType[k] >= need });
  const indexableIds = new Set(companyPages.filter((p) => p.tier === 'indexable').map((p) => p.id));
  for (const pt of ptById.values()) {
    const n = data.companies.filter((c) => indexableIds.has(c.id) && c.property_types_served.some((p) => p.property_type_id === pt.id && srcOk(p.source_id) && fresh(p.last_verified_date))).length;
    planned.push({ type: 'property-type', path: `/property-type/${pt.slug}/`, property_type_id: pt.id, count: n, need: q.propertyType.indexMinCompanies, eligible: n >= q.propertyType.indexMinCompanies });
  }
  for (const p of planned) p.template_built = false;

  return { data, companyPages, cityPages, indexable: builtIndexable, noindexListed, skipped, placeholderPaths, planned, perFeeType, companiesWithFees, quality: q, today, geoById, ptById, sourceById, fresh };
}

export function buildReport(site) {
  const { data, quality: q, today } = site;
  const byType = {};
  for (const p of site.indexable) byType[p.type] = (byType[p.type] || 0) + 1;
  const listedByType = {};
  for (const p of site.noindexListed) listedByType[p.type] = (listedByType[p.type] || 0) + 1;

  const count = (pred) => data.companies.filter(pred).length;
  const real = (c) => !c.placeholder;
  const byEvidence = {};
  for (const c of data.companies.filter(real)) byEvidence[c.evidence_level] = (byEvidence[c.evidence_level] || 0) + 1;
  const tierA = count((c) => real(c) && c.tier === 'A' && c.evidence_level === 'own_site_confirmed');
  const sourceOk = (id) => !!(site.sourceById.get(id) && site.sourceById.get(id).use_allowed);
  const inPhase1 = (c) => {
    const a = c.address;
    const cityNames = new Set(data.geography.filter((g) => g.type === 'city').map((g) => g.name.toLowerCase()));
    const counties = new Set(data.geography.filter((g) => g.type === 'county').map((g) => g.name.replace(/ County$/, '').toLowerCase()));
    const office = a && a.state === 'OH' && ((a.city && cityNames.has(a.city.toLowerCase())) || (a.county && counties.has(a.county.toLowerCase())));
    return office || data['service-areas'].some((s) => s.company_id === c.id);
  };
  const phase1Allowed = count((c) => real(c) && inPhase1(c) && sourceOk(c.source_id));

  const facts = collectFacts(data).filter((f) => { const c = data.companies.find((x) => x.id === f.company_id); return c && !c.placeholder; });
  const fr = summarizeFreshness(facts, today, q.freshness);
  const { aged, ...freshness } = fr;

  const stage = q.stages.find((s) => s.stage === q.currentStage);
  const n = site.indexable.length;
  let budgetStatus = 'within_budget';
  if (stage.maxIndexable !== null && n > stage.maxIndexable) budgetStatus = 'over_budget';
  else if (stage.minIndexable !== null && n < stage.minIndexable) budgetStatus = 'below_stage_minimum';
  const eligiblePlanned = site.planned.filter((p) => p.eligible);

  const usedSources = new Set();
  for (const c of data.companies.filter(real)) { usedSources.add(c.source_id); for (const f of [c.license, ...c.services, ...c.property_types_served]) if (f) usedSources.add(f.source_id); }
  for (const f of data['fee-schedules']) usedSources.add(f.source_id);
  for (const a of data['service-areas']) usedSources.add(a.source_id);
  const used = [...usedSources].map((id) => site.sourceById.get(id)).filter(Boolean);

  return {
    generated_at: new Date().toISOString(),
    as_of: today,
    thresholds: q,
    indexable_count: n,
    indexable_by_type: byType,
    noindex_listed_count: site.noindexListed.length,
    noindex_listed_by_type: listedByType,
    skipped_count: site.skipped.length,
    stage_budget: { stage: stage.stage, min: stage.minIndexable, max: stage.maxIndexable, status: budgetStatus, indexable_count: n, projected_indexable_with_eligible_planned_pages: n + eligiblePlanned.length },
    companies: {
      total_records: data.companies.filter(real).length,
      by_evidence_level: byEvidence,
      tier_a_count: tierA,
      tier_a_threshold: q.thresholds.tierACompanies,
      in_phase1_with_allowed_source: phase1Allowed,
      with_verified_fees: site.companiesWithFees.size,
      with_self_stated_license: count((c) => real(c) && c.license && c.license.status === 'self_stated'),
      with_verified_license: count((c) => real(c) && c.license && q.verifiedLicenseStatuses.includes(c.license.status))
    },
    fee_type_counts: site.perFeeType,
    freshness,
    sources: {
      total: data.sources.length,
      used_by_published_data: used.length,
      used_with_tos_not_reviewed: used.filter((s) => s.tos_decision === 'not_checked').map((s) => s.id),
      used_with_robots_not_checked: used.filter((s) => s.robots_decision === 'not_checked').map((s) => s.id)
    },
    indexable: site.indexable,
    noindex_listed: site.noindexListed,
    skipped: site.skipped,
    planned_pages: site.planned,
    placeholder_pages_noindexed: [...site.placeholderPaths]
  };
}
