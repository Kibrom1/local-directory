// Product analysis on top of the quality gate: what blocks each page, what would unlock it, how fragile the built pages are,
// what the production switches remove, and how the facts were checked. Pure: it re-runs `evaluate` on modified copies of the
// data and never touches files. Used by `npm run report`, the build report and `npm run launch:check`.
import { evaluate, buildReport, FEE_TYPES, GROUPS } from './gate.mjs';

const REVIEWED = ['allowed', 'silent', 'not_applicable'];
const pathsOf = (site) => new Set(site.indexable.filter((p) => p.type !== 'static').map((p) => p.path));
const countBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const lost = (before, after) => [...before].filter((p) => !after.has(p)).sort();
const FEE_LABEL = { management_pct: 'management %', flat_fee: 'flat fee', leasing_fee: 'leasing fee', renewal_fee: 'renewal fee' };

export function analyze(site) {
  const { data, quality: q, today, prod } = site;
  const opts = { today, prod };
  const run = (qOverride, mutate) => evaluate(mutate ? mutate(data) : data, { ...q, ...qOverride }, opts);
  const nameOf = new Map(data.companies.map((c) => [c.id, c.name]));
  const srcById = new Map(data.sources.map((s) => [s.id, s]));

  // Baseline for the analysis below: the same data with the terms gate off, so each finding is about the data (a missing fact,
  // a stale row) and the one global blocker (no terms reviews recorded) is reported once under terms_gate.
  const baseQ = { requireReviewedTermsForIndex: false };
  const B = run(baseQ, null);

  // ---- 1. What the production switches remove today
  const withTerms = run({ requireReviewedTermsForIndex: true }, null);
  const withoutTerms = run({ requireReviewedTermsForIndex: false }, null);
  const removedByTerms = lost(pathsOf(withoutTerms), pathsOf(withTerms));
  const unreviewed = data.sources.filter((s) => s.use_allowed && !REVIEWED.includes(s.tos_decision)).map((s) => s.id);
  const terms_gate = {
    switch: 'src/lib/quality.json requireReviewedTermsForIndex',
    effective_now: !!site.termsGateOn,
    indexable_without_gate: pathsOf(withoutTerms).size,
    indexable_with_gate: pathsOf(withTerms).size,
    removed_pages: removedByTerms,
    removed_by_type: countBy(removedByTerms, (p) => p.split('/')[1]),
    sources_with_terms_unreviewed: unreviewed,
    note: 'Facts from these sources do not count toward indexable pages until a person reads the terms and records the decision in data/sources.json. All findings below assume this is done (they describe the data).'
  };
  const listed_tier = {
    switch: 'src/lib/quality.json publishListedTier',
    published_now: !!site.publishListed,
    would_be_listed: site.noindexListed.length,
    by_type: countBy(site.noindexListed, (x) => x.type),
    paths: site.noindexListed.map((x) => x.path)
  };

  // ---- 2. Fee exclusions: for every company with fee rows, what keeps its rows out of the gate counts
  const BLOCKER_TEXT = {
    area: (c) => `its own site must state a service area we serve: add a service-areas row (geography_id, source_url on ${hostOf(c.website)}) only if a page there names the area`,
    terms: (_c, r) => `a person must read the terms of ${r.source_id} and record tos_decision in data/sources.json`,
    scope: () => 'owner override: add the scope to quality.json feeScopesCountingTowardGates, or find a Columbus-specific page and update the row',
    fresh: () => 're-check the page and update last_verified_date',
    status: () => 'verify the row against the company page and set verification_status',
    published: () => 'the company page is not published (see its reasons in the skipped/listed section)',
    source: () => 'the fee source must be use_allowed in data/sources.json (terms and robots decisions recorded)',
    value: () => 'the row has no fee numbers',
    company: () => 'the company needs own-site confirmation'
  };
  const exclusions = [];
  const feesByCompany = new Map();
  for (const f of data['fee-schedules']) { if (!feesByCompany.has(f.company_id)) feesByCompany.set(f.company_id, []); feesByCompany.get(f.company_id).push(f); }
  const countedRows = new Set(B.feeRows.map((f) => f.id));
  for (const [cid, rows] of feesByCompany) {
    const c = data.companies.find((x) => x.id === cid);
    for (const r of rows) {
      if (countedRows.has(r.id)) continue;
      const checks = B.feeRowChecks(r);
      const blockers = Object.keys(checks).filter((k) => !checks[k] && !(k === 'area' && B.feeRule === 'liberal'));
      if (!blockers.length) continue;
      const feeTypes = FEE_TYPES.filter((k) => r[k] && (typeof r[k].value === 'number' || typeof r[k].min === 'number' || typeof r[k].max === 'number' || (r[k].plans || []).length));
      exclusions.push({ company_id: cid, company: nameOf.get(cid), row_id: r.id, fee_types: feeTypes, blockers, smallest_change: blockers.map((b) => `${b}: ${BLOCKER_TEXT[b](c, r)}`) });
    }
  }
  const onlyArea = exclusions.filter((e) => e.blockers.length === 1 && e.blockers[0] === 'area');
  const fee_exclusions = {
    rule: B.feeRule,
    counted_rows: countedRows.size,
    excluded_rows: exclusions.length,
    excluded: exclusions,
    unlocked_by_stated_service_area: onlyArea.map((e) => ({ company_id: e.company_id, company: e.company, fee_types: e.fee_types, adds: `+1 company for ${e.fee_types.map((k) => FEE_LABEL[k]).join(', ')}` }))
  };

  // ---- 3. Scope effect (network-wide and unconfirmed-mapping rows)
  const allScopes = run({ ...baseQ, feeScopesCountingTowardGates: ['columbus_specific', 'network_wide', 'unconfirmed_mapping'] }, null);
  const scope_effect = {
    switch: 'src/lib/quality.json feeScopesCountingTowardGates',
    counting_scopes: q.feeScopesCountingTowardGates || 'all',
    rows_shown_but_not_counted: B.scopeExcludedRows.map((f) => ({ row_id: f.id, company_id: f.company_id, company: nameOf.get(f.company_id), scope: f.scope })),
    per_fee_type_now: B.perFeeType,
    per_fee_type_if_all_scopes_counted: allScopes.perFeeType,
    fee_comparison_now: B.companiesWithFees.size,
    fee_comparison_if_all_scopes_counted: allScopes.companiesWithFees.size
  };

  // ---- 4. Verification: how fee rows were checked
  const rows = data['fee-schedules'];
  const verification = {
    fee_rows: rows.length,
    by_method: countBy(rows, (f) => f.verification_method || 'unspecified'),
    counted_by_method: countBy(B.feeRows, (f) => f.verification_method || 'unspecified'),
    human_compared: rows.filter((f) => f.verification_method === 'human_compared').length,
    note: 'agent_read = an automated read matched the page; human_compared = a person compared it. Visitors see which one.'
  };

  // ---- 5. License route
  const official = data.sources.filter((s) => ['official_record', 'official_reference'].includes(s.source_kind));
  const usable = official.filter((s) => s.use_allowed);
  const license_route = {
    status: usable.length ? 'available' : 'none available',
    official_sources: official.length,
    official_sources_use_allowed: usable.map((s) => s.id),
    blocked: official.filter((s) => !s.use_allowed).map((s) => ({ id: s.id, why: (s.decision_notes || '').slice(0, 160) })),
    statuses: countBy(data.companies.filter((c) => !c.placeholder && c.evidence_level === 'own_site_confirmed'), (c) => (c.license ? c.license.status : 'none')),
    note: usable.length ? 'A verified license badge can be earned through the allowed official source(s).' : 'No allowed official source: no company can earn "License verified" yet. License notes stay "stated by company, not verified". Manual lookup procedure: docs/developer/runbook.md.'
  };

  // ---- 6. What unlocks the next page
  const unlocks = [];
  const pageById = new Map(B.companyPages.map((p) => [p.id, p]));
  for (const x of B.skipped.filter((s) => s.type === 'company')) {
    const c = data.companies.find((y) => y.id === x.id);
    const ev = c && c.evidence_level;
    unlocks.push({ path: x.path, type: 'company', status: 'skipped', reason: x.reasons.join('; '), smallest_change: ev && ev !== 'own_site_confirmed'
      ? `Find the company's own website and record it as a company_site source with the facts read there (evidence_level ${ev} cannot be published). Needs a person to confirm the site is the company's.`
      : 'Read the company\'s own pages and record at least two more fact groups (fees, service areas, services, property types) with sources.' });
  }
  const groupHint = { license: 'a license note from its own site', fees: 'a fee row from its own pricing page', areas: 'a service-areas row for an area its site names', services: 'a services fact from its site', property_types: 'a property-types fact from its site', contact: 'website, phone or address from its site' };
  for (const x of B.noindexListed.filter((s) => s.type === 'company')) {
    const p = pageById.get(x.id) || B.unpublishedListed.find((u) => u.id === x.id);
    const PRIORITY = ['areas', 'services', 'property_types', 'contact', 'license', 'fees'];
    const missing = p ? PRIORITY.filter((g) => GROUPS.includes(g) && !p.groups[g]) : [];
    const needFees = x.reasons.some((r) => /no verified/.test(r));
    unlocks.push({ path: x.path, type: 'company', status: 'listed', reason: x.reasons.join('; '), smallest_change: needFees ? `Add ${groupHint.fees}${missing.includes('fees') ? '' : ' (existing fee rows are unverified or stale)'}. An indexable profile needs verified fees or a verified license${p && p.completeness < 3 ? ` and ${3 - p.completeness} more fact group(s)` : ''}.` : `Add ${missing.slice(0, Math.max(1, 3 - (p ? p.completeness : 0))).map((g) => groupHint[g]).join(' and ')}.` });
  }
  for (const x of [...B.skipped, ...B.noindexListed].filter((s) => s.type === 'city')) {
    const g = B.geoById.get(x.id);
    const serving = B.companyPages.filter((p) => p.tier !== 'placeholder').filter((p) => data['service-areas'].some((a) => a.company_id === p.id && a.geography_id === x.id));
    const idxN = serving.filter((p) => p.tier === 'indexable').length;
    const needN = q.city.indexMinCompanies;
    const needFee = q.city.indexMinCompaniesWithFees;
    const withFees = serving.filter((p) => p.tier === 'indexable' && p.verifiedFees).length;
    const parts = [];
    if (idxN < needN) parts.push(`${needN - idxN} more indexable ${needN - idxN === 1 ? 'company' : 'companies'} that state ${g ? g.name : x.id} as a service area (a service-areas row each)`);
    if (withFees < needFee) parts.push(`${needFee - withFees} of them with a verified fee row`);
    unlocks.push({ path: x.path, type: 'city', status: B.noindexListed.includes(x) ? 'listed' : 'skipped', reason: x.reasons.join('; '), smallest_change: parts.join(', ') || 'Meets the bar; see the reasons.' });
  }
  for (const p of B.planned.filter((y) => !y.eligible)) {
    const cand = exclusions.filter((e) => p.fee_type ? e.fee_types.includes(p.fee_type) : true);
    const candCompanies = [...new Set(cand.map((e) => e.company))];
    const gap = p.need - p.count;
    let change;
    if (p.type === 'fee-guide') change = `${gap} more ${gap === 1 ? 'company' : 'companies'} with a counted ${FEE_LABEL[p.fee_type]} value. ${candCompanies.length ? `Already published but excluded: ${candCompanies.join(', ')} (see fee_exclusions for the one change each needs).` : 'No excluded rows to recover: needs new fee-publishing companies.'}`;
    else if (p.type === 'property-type') change = `${gap} more indexable ${gap === 1 ? 'company' : 'companies'} with a sourced property-types fact for this type.`;
    else if (p.type === 'fee-comparison') change = `${gap} more ${gap === 1 ? 'company' : 'companies'} with counted fee rows. ${candCompanies.length ? `Excluded now: ${candCompanies.join(', ')}.` : ''}`;
    else change = 'Needs at least one eligible fee guide.';
    unlocks.push({ path: p.path, type: p.type, status: 'unbuilt', reason: `${p.count}/${p.need}`, smallest_change: change, reachable_from_excluded_rows: p.fee_type ? p.count + candCompanies.length >= p.need : null });
  }
  for (const g of B.guidePages.filter((x) => x.tier === 'draft').concat(B.skipped.filter((s) => s.type === 'guide').map((s) => ({ path: s.path, id: s.id })))) {
    unlocks.push({ path: g.path, type: 'guide', status: 'draft', reason: 'status draft: not published in production', smallest_change: 'Run `npm run guides:check` for what blocks this draft (sources, dates, advice wording, links); a person then sets status: published.' });
  }

  // ---- 7. Resilience: pages that disappear if one company or one source is removed (assuming terms reviews are recorded,
  //         so the question is about the data, not the missing reviews)
  const baseline = B;
  const basePaths = pathsOf(baseline);
  const spof = new Map();
  const note = (path, entry) => { if (!spof.has(path)) spof.set(path, []); spof.get(path).push(entry); };
  const without = (cid) => (d) => ({ ...d, companies: d.companies.filter((c) => c.id !== cid), 'fee-schedules': d['fee-schedules'].filter((f) => f.company_id !== cid), 'service-areas': d['service-areas'].filter((a) => a.company_id !== cid) });
  for (const c of data.companies.filter((x) => !x.placeholder)) {
    const after = pathsOf(run(baseQ, without(c.id)));
    for (const p of lost(basePaths, after)) if (p !== `/company/${c.slug}/`) note(p, { kind: 'company', id: c.id, name: c.name });
  }
  const usedSources = new Set([...data.companies.map((c) => c.source_id), ...data['fee-schedules'].map((f) => f.source_id), ...data['service-areas'].map((a) => a.source_id)]);
  for (const sid of usedSources) {
    const s = srcById.get(sid);
    if (!s || !s.use_allowed) continue;
    const after = pathsOf(run(baseQ, (d) => ({ ...d, sources: d.sources.map((x) => (x.id === sid ? { ...x, use_allowed: false } : x)) })));
    for (const p of lost(basePaths, after)) {
      const companyPage = p.startsWith('/company/');
      if (!companyPage) note(p, { kind: 'source', id: sid, name: s.name });
    }
  }
  const gatedTypes = new Set(['fee-comparison', 'fee-guide', 'fee-guide-hub', 'property-type', 'city']);
  const plannedByPath = new Map(baseline.planned.map((p) => [p.path, p]));
  const resilience = {
    assumes: 'Terms reviews recorded for every source (so this measures data fragility, not missing reviews).',
    pages: baseline.indexable.filter((p) => gatedTypes.has(p.type)).map((p) => {
      const pl = plannedByPath.get(p.path);
      const fails = spof.get(p.path) || [];
      return { path: p.path, type: p.type, count: pl ? pl.count : null, need: pl ? pl.need : null, slack: pl ? pl.count - pl.need : null, single_points_of_failure: fails };
    })
  };
  resilience.fragile_pages = resilience.pages.filter((p) => p.single_points_of_failure.length).length;

  return { terms_gate, listed_tier, fee_exclusions, scope_effect, verification, license_route, unlocks, resilience };
}

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'the company site'; } }

// Full report = the gate's build report plus the analysis above.
export function fullReport(site) {
  return { ...buildReport(site), analysis: analyze(site) };
}
