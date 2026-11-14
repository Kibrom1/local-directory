// Pure quality gate: decides which pages exist, which are indexable and which
// are listed as noindex,follow. No file or Astro access, so it is unit tested.
// Rules come from quality.json and mirror docs/pm/prd.md section 10.
import { collectFacts, summarizeFreshness, daysBetween } from './freshness.mjs';

export const FEE_TYPES = ['management_pct', 'flat_fee', 'leasing_fee', 'renewal_fee'];
export const FEE_GUIDE_SLUGS = { management_pct: 'management-fee', flat_fee: 'flat-fee', leasing_fee: 'leasing-fee', renewal_fee: 'renewal-fee' };
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

export function evaluate(data, quality, options = {}) {
  let { today } = options;
  today = today || new Date().toISOString().slice(0, 10);
  const q = quality;
  const fresh = (d) => daysBetween(d, today) <= q.freshness.dropDays;
  const geoById = new Map(data.geography.map((g) => [g.id, g]));
  const ptById = new Map(data['property-types'] ? data['property-types'].map((p) => [p.id, p]) : (data.propertyTypes || []).map((p) => [p.id, p]));
  const sourceById = new Map(data.sources.map((s) => [s.id, s]));
  const fees = data['fee-schedules'] || data.fees;
  const areas = data['service-areas'] || data.areas;
  const srcOk = (id) => !!(sourceById.get(id) && sourceById.get(id).use_allowed);
  // Terms gate (quality.requireReviewedTermsForIndex, production only): a fact whose source has no recorded terms-of-service
  // review does not count toward INDEXABLE pages. Facts still display on a listed page if listed pages are published.
  const prod = options.prod !== false;
  const termsGateOn = q.requireReviewedTermsForIndex === true && prod;
  const TERMS_REVIEWED = ['allowed', 'silent', 'not_applicable'];
  const termsReviewed = (id) => { const x = sourceById.get(id); return !!x && TERMS_REVIEWED.includes(x.tos_decision); };
  const srcIdx = (id) => srcOk(id) && (!termsGateOn || termsReviewed(id));
  // Fee scope (fee row `scope`): rows that are network-wide or have unconfirmed plan mapping display with a caveat but only count
  // toward the fee gates when quality.feeScopesCountingTowardGates lists their scope (the owner override).
  const scopesCounting = q.feeScopesCountingTowardGates || ['columbus_specific', 'network_wide', 'unconfirmed_mapping'];
  const scopeCounts = (f) => scopesCounting.includes(f.scope || 'columbus_specific');
  // Listed (noindex,follow) pages are generated only when quality.publishListedTier is true, or in development.
  const publishListed = q.publishListedTier === true || !prod;

  const skipped = [];
  const noindexListed = [];
  const indexable = [];
  const placeholderPaths = new Set();
  const companyPages = [];

  const calc = (c, cFees, ok) => {
    const verifiedRows = cFees.filter((f) => q.verifiedFeeStatuses.includes(f.verification_status) && ok(f.source_id) && fresh(f.last_verified_date) && feeRowHasValue(f));
    const cAreas = areas.filter((a) => a.company_id === c.id && ok(a.source_id) && fresh(a.last_verified_date)).map((a) => geoById.get(a.geography_id)).filter(Boolean);
    const idFresh = ok(c.source_id) && fresh(c.last_verified_date);
    const licOk = !!(c.license && ['self_stated', 'active', 'inactive'].includes(c.license.status) && ok(c.license.source_id) && fresh(c.license.last_verified_date));
    const groups = {
      license: licOk,
      fees: verifiedRows.length > 0,
      areas: cAreas.length > 0,
      services: c.services.some((x) => ok(x.source_id) && fresh(x.last_verified_date)),
      property_types: c.property_types_served.some((x) => ok(x.source_id) && fresh(x.last_verified_date)),
      contact: idFresh && !!(c.website || c.phone || (c.address && (c.address.street || c.address.zip)))
    };
    const have = GROUPS.filter((k) => groups[k]);
    const verifiedLicense = !!(c.license && q.verifiedLicenseStatuses.includes(c.license.status) && ok(c.license.source_id) && fresh(c.license.last_verified_date));
    return { verifiedRows, cAreas, groups, have, verifiedLicense, verifiedFees: groups.fees };
  };
  const view = (r) => ({ verifiedFeeRows: r.verifiedRows, areas: r.cAreas, groups: r.groups, completeness: r.have.length, verifiedFees: r.verifiedFees, verifiedLicense: r.verifiedLicense });

  for (const c of data.companies) {
    const cFees = fees.filter((f) => f.company_id === c.id);
    const disp = calc(c, cFees, srcOk);
    const idx = termsGateOn ? calc(c, cFees, srcIdx) : disp;
    const have = idx.have;
    const verifiedFees = idx.verifiedFees;
    const verifiedLicense = idx.verifiedLicense;
    const base = { type: 'company', path: `/company/${c.slug}/`, id: c.id, company: c, fees: cFees, ...view(disp), idxCompleteness: idx.have.length };

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
    if (have.length < q.company.minFactGroups) reasons.push(`only ${have.length} fact group(s) (${have.join(', ') || 'none'}); need ${q.company.minFactGroups}${termsGateOn && disp.have.length > have.length ? ' (facts from sources with unreviewed terms of service are not counted toward indexing)' : ''}`);
    const hasRequired = (q.company.indexRequireOneOf.includes('fees') && verifiedFees) || (q.company.indexRequireOneOf.includes('license') && verifiedLicense);
    if (!hasRequired) reasons.push(`no verified ${q.company.indexRequireOneOf.join(' or ')} (areas, services and contact alone do not make a profile indexable)`);
    if (!reasons.length) {
      indexable.push({ path: base.path, type: 'company', id: c.id });
      companyPages.push({ ...base, ...view(idx), tier: 'indexable', robots: 'index, follow' });
    } else if (disp.have.length >= q.company.listed.minFactGroups && q.company.listed.requireEvidence.includes(c.evidence_level)) {
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

  // Listed tier switch: when off (production default) listed company and city pages are not generated. The report keeps them
  // (noindexListed) so the owner can see what they would be.
  const unpublishedListed = [];
  if (!publishListed) {
    for (let i = companyPages.length - 1; i >= 0; i--) if (companyPages[i].tier === 'listed') unpublishedListed.push(...companyPages.splice(i, 1));
    for (let i = cityPages.length - 1; i >= 0; i--) { if (cityPages[i].tier === 'listed') unpublishedListed.push(...cityPages.splice(i, 1)); else cityPages[i].listedCompanies = []; }
  }
  const publishedIds = new Set(companyPages.filter((p) => p.tier !== 'placeholder').map((p) => p.id));

  // Static pages that always exist. Utility pages (search, 404) are noindex and never counted.
  const staticPages = ['/', '/about/', '/privacy/', '/corrections/', '/methodology/'].map((p) => ({ path: p, type: 'static', id: null }));
  const utilityPages = ['/search/', '/site-map/', '/corrections-log/', '/404.html'];

  // Fee data. A company's fee rows count toward the comparison and the fee guides only when they are verified,
  // fresh and from an allowed source. Under the conservative rule (quality.feeComparison.requireStatedServiceArea)
  // the company must also state a service area on its own site. Both rules are always computed for the report.
  const hasArea = (cid) => areas.some((a) => a.company_id === cid && srcIdx(a.source_id) && fresh(a.last_verified_date) && geoById.has(a.geography_id));
  // Why a fee row is or is not usable for the gates. Used by feeRowsFor and the report.
  const feeRowChecks = (f) => {
    const c = data.companies.find((x) => x.id === f.company_id);
    return {
      company: !!c && !c.placeholder && c.evidence_level === 'own_site_confirmed',
      published: !!c && publishedIds.has(c.id),
      status: q.verifiedFeeStatuses.includes(f.verification_status),
      source: srcOk(f.source_id),
      terms: srcIdx(f.source_id),
      fresh: fresh(f.last_verified_date),
      value: feeRowHasValue(f),
      area: !!c && hasArea(c.id),
      scope: scopeCounts(f)
    };
  };
  const feeRowsFor = (rule, { ignoreScope = false } = {}) => fees.filter((f) => {
    const k = feeRowChecks(f);
    return k.company && k.published && k.status && k.source && k.terms && k.fresh && k.value && (rule === 'liberal' || k.area) && (ignoreScope || k.scope);
  });
  const countsFor = (rule) => {
    const rows = feeRowsFor(rule);
    const per = {};
    for (const k of FEE_TYPES) per[k] = new Set(rows.filter((f) => feeValuePopulated(f[k])).map((f) => f.company_id)).size;
    per.minimums = new Set(rows.filter((f) => f.minimums && (num(f.minimums.monthly_usd) || f.minimums.other)).map((f) => f.company_id)).size;
    return { rows, perFeeType: per, companies: new Set(rows.map((f) => f.company_id)) };
  };
  const feeCountsByRule = { conservative: countsFor('conservative'), liberal: countsFor('liberal') };
  const activeRule = q.feeComparison.requireStatedServiceArea === false ? 'liberal' : 'conservative';
  const active = feeCountsByRule[activeRule];
  const perFeeType = active.perFeeType;
  const companiesWithFees = active.companies;
  const feeRows = active.rows;
  // Rows shown in tables: everything the active rule allows, including rows whose scope keeps them out of the gate counts.
  const feeRowsShown = feeRowsFor(activeRule, { ignoreScope: true });
  const scopeExcludedRows = feeRowsShown.filter((f) => !scopeCounts(f));
  const excludedByAreaRule = [...feeCountsByRule.liberal.companies].filter((id) => !active.companies.has(id));

  // Gated page types (templates exist). `planned` keeps the full gate decision, eligible or not.
  const planned = [];
  const need = q.feeGuide.minCompaniesPerFeeType;
  planned.push({ type: 'fee-comparison', path: '/fees/', count: companiesWithFees.size, need: q.feeComparison.minCompanies, eligible: companiesWithFees.size >= q.feeComparison.minCompanies });
  for (const k of FEE_TYPES) planned.push({ type: 'fee-guide', path: `/fee-guide/${FEE_GUIDE_SLUGS[k]}/`, fee_type: k, count: perFeeType[k], need, eligible: perFeeType[k] >= need });
  planned.push({ type: 'fee-guide-hub', path: '/fee-guide/', count: planned.filter((p) => p.type === 'fee-guide' && p.eligible).length, need: 1, eligible: planned.some((p) => p.type === 'fee-guide' && p.eligible) });
  const indexableIds = new Set(companyPages.filter((p) => p.tier === 'indexable').map((p) => p.id));
  for (const pt of ptById.values()) {
    const n = data.companies.filter((c) => indexableIds.has(c.id) && c.property_types_served.some((p) => p.property_type_id === pt.id && srcOk(p.source_id) && fresh(p.last_verified_date))).length;
    planned.push({ type: 'property-type', path: `/property-types/${pt.slug}/`, property_type_id: pt.id, count: n, need: q.propertyType.indexMinCompanies, eligible: n >= q.propertyType.indexMinCompanies });
  }

  // Guides (content/guides/*.md), parsed and validated by src/lib/guides.mjs. Drafts are not published in production.
  const guidePages = [];
  const guideSlugs = new Set();
  for (const g of data.guides || []) {
    const base = { type: 'guide', path: `/guides/${g.slug}/`, id: g.slug, guide: g };
    if (g.status === 'draft' && prod) { skipped.push({ path: base.path, type: 'guide', id: g.slug, reasons: ['status draft: not published in production'] }); continue; }
    if (guideSlugs.has(g.slug)) { skipped.push({ path: base.path, type: 'guide', id: g.slug, reasons: ['duplicate slug'] }); continue; }
    guideSlugs.add(g.slug);
    if (g.status === 'draft') { guidePages.push({ ...base, tier: 'draft', robots: 'noindex, nofollow' }); continue; }
    guidePages.push({ ...base, tier: 'indexable', robots: 'index, follow' });
  }
  const publishedGuides = guidePages.filter((p) => p.tier === 'indexable');
  planned.push({ type: 'guide-hub', path: '/guides/', count: publishedGuides.length, need: 1, eligible: publishedGuides.length >= 1 });
  for (const p of planned) p.template_built = true;

  const extra = [];
  for (const p of planned.filter((x) => x.eligible)) extra.push({ path: p.path, type: p.type, id: p.fee_type || p.property_type_id || null });
  for (const g of publishedGuides) extra.push({ path: g.path, type: 'guide', id: g.id });
  const builtIndexable = [...staticPages, ...indexable, ...extra];

  return { termsGateOn, publishListed, unpublishedListed, publishedIds, feeRowsShown, scopeExcludedRows, feeRowChecks, scopeCounts, data, companyPages, cityPages, guidePages, indexable: builtIndexable, noindexListed, skipped, placeholderPaths, planned, perFeeType, companiesWithFees, feeRows, feeRule: activeRule, feeCountsByRule, excludedByAreaRule, utilityPages, prod, quality: q, today, geoById, ptById, sourceById, fresh };
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
    fee_rule: { active: site.feeRule, switch: 'src/lib/quality.json feeComparison.requireStatedServiceArea', excluded_companies_under_active_rule: site.excludedByAreaRule },
    fee_type_counts: site.perFeeType,
    fee_type_counts_by_rule: Object.fromEntries(Object.entries(site.feeCountsByRule).map(([k, v]) => [k, { companies_with_fees: v.companies.size, fee_rows: v.rows.length, per_fee_type: v.perFeeType }])),
    guides: { published: site.guidePages.filter((g) => g.tier === 'indexable').length, drafts_rendered_in_dev: site.guidePages.filter((g) => g.tier === 'draft').length, drafts_not_published_in_production: site.skipped.filter((x) => x.type === 'guide' && /draft/.test(x.reasons[0])).length, mode: site.prod ? 'production' : 'development' },
    utility_noindex_pages: site.utilityPages,
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
