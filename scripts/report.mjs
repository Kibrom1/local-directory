// Writes reports/build-report.json without running Astro (same gate as the build)
// and prints the counts the metrics sheet needs. Exit 1 when the stage page budget is exceeded.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fullReport as buildReport } from '../src/lib/analysis.mjs';
import { evaluateSite, quality } from '../src/lib/site.mjs';
import { readSiteEnv } from '../src/lib/env.mjs';
import { loadEnv } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
// Production mode unless --dev is passed (drafts are then counted as rendered, not published).
const dev = process.argv.includes('--dev');
let site;
try { site = evaluateSite({ dataDir, prod: !dev }); } catch (e) { console.error(`FAILED: ${e.message}`); process.exit(1); }
const r = buildReport(site);
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'build-report.json'), JSON.stringify(r, null, 2) + '\n');

const line = (k, v) => console.log(`${k.padEnd(44)} ${v}`);
console.log(`Build report as of ${r.as_of} (reports/build-report.json)\n`);
line('Indexable pages', `${r.indexable_count}  ${JSON.stringify(r.indexable_by_type)}`);
line('Noindex,follow (listed) pages', `${r.noindex_listed_count}  ${JSON.stringify(r.noindex_listed_by_type)}`);
line('Skipped pages', r.skipped_count);
line(`Stage ${r.stage_budget.stage} budget (${r.stage_budget.min ?? '-'}..${r.stage_budget.max ?? '-'})`, `${r.stage_budget.status}; projected with eligible planned pages: ${r.stage_budget.projected_indexable_with_eligible_planned_pages}`);
line('Companies by evidence level', JSON.stringify(r.companies.by_evidence_level));
line('Tier A companies (threshold ' + r.companies.tier_a_threshold + ')', r.companies.tier_a_count);
line('In Phase 1 with an allowed source', r.companies.in_phase1_with_allowed_source);
line('With verified fees / self-stated / verified license', `${r.companies.with_verified_fees} / ${r.companies.with_self_stated_license} / ${r.companies.with_verified_license}`);
line('Fee rule (switch: ' + r.fee_rule.switch.split(' ').pop() + ')', `${r.fee_rule.active}${r.fee_rule.excluded_companies_under_active_rule.length ? `; ${r.fee_rule.excluded_companies_under_active_rule.length} fee-publishing companies excluded (no stated service area): ${r.fee_rule.excluded_companies_under_active_rule.join(', ')}` : ''}`);
console.log(`\nCompanies with a verified fee per fee type, both rules (gate needs ${quality.feeGuide.minCompaniesPerFeeType}):`);
console.log(`  ${'fee type'.padEnd(18)} ${'conservative'.padStart(12)} ${'liberal'.padStart(8)}`);
const cons = r.fee_type_counts_by_rule.conservative, lib = r.fee_type_counts_by_rule.liberal;
console.log(`  ${'any fee row'.padEnd(18)} ${String(cons.companies_with_fees).padStart(12)} ${String(lib.companies_with_fees).padStart(8)}`);
for (const k of Object.keys(cons.per_fee_type)) console.log(`  ${k.padEnd(18)} ${String(cons.per_fee_type[k]).padStart(12)} ${String(lib.per_fee_type[k]).padStart(8)}`);
console.log('');
const A = r.analysis;
console.log('\nProduction switches (src/lib/quality.json):');
line('Terms gate (requireReviewedTermsForIndex)', `${A.terms_gate.effective_now ? 'ON' : 'off'}; removes ${A.terms_gate.removed_pages.length} indexable page(s) today ${JSON.stringify(A.terms_gate.removed_by_type)}; ${A.terms_gate.sources_with_terms_unreviewed.length} sources have no terms review`);
line('Listed tier (publishListedTier)', `${A.listed_tier.published_now ? 'published' : 'NOT published'}; ${A.listed_tier.would_be_listed} pages would be listed ${JSON.stringify(A.listed_tier.by_type)}`);
line('Fee scopes counting toward gates', `${JSON.stringify(A.scope_effect.counting_scopes)}; ${A.scope_effect.rows_shown_but_not_counted.length} row(s) shown but not counted: ${A.scope_effect.rows_shown_but_not_counted.map((x) => `${x.company} (${x.scope})`).join(', ') || 'none'}`);
line('Fee comparison companies now / all scopes', `${A.scope_effect.fee_comparison_now} / ${A.scope_effect.fee_comparison_if_all_scopes_counted}`);
line('Fee rows checked: agent read / by a person', `${A.verification.by_method.agent_read || 0} / ${A.verification.human_compared}`);
line('License verification route', A.license_route.status + (A.license_route.status === 'none available' ? ` (${A.license_route.official_sources} official sources, none allowed; statuses ${JSON.stringify(A.license_route.statuses)})` : ''));
console.log('\nFee rows kept out of the gate counts (smallest change for each):');
if (!A.fee_exclusions.excluded.length) console.log('  none');
for (const e of A.fee_exclusions.excluded) { console.log(`  ${e.company} ${e.row_id} [${e.blockers.join(', ')}]`); for (const t of e.smallest_change) console.log(`      - ${t}`); }
if (A.fee_exclusions.unlocked_by_stated_service_area.length) console.log(`  A stated service area alone would add: ${A.fee_exclusions.unlocked_by_stated_service_area.map((x) => `${x.company} (${x.fee_types.join(', ')})`).join('; ')}`);
console.log('\nWhat unlocks the next page (skipped, listed, unbuilt, draft):');
for (const u of A.unlocks) console.log(`  [${u.status}] ${u.path}\n      ${u.smallest_change}`);
console.log('\nResilience (pages that disappear if one company or source is removed; assumes terms reviews are recorded):');
for (const p of A.resilience.pages) console.log(`  ${p.path}${p.need !== null ? `  ${p.count}/${p.need} slack ${p.slack}` : ''}  ${p.single_points_of_failure.length ? 'FRAGILE: ' + p.single_points_of_failure.slice(0, 6).map((x) => `${x.kind} ${x.name}`).join('; ') + (p.single_points_of_failure.length > 6 ? ` (+${p.single_points_of_failure.length - 6} more)` : '') : 'ok'}`);
console.log('');
line('Guides (content/guides)', `${r.guides.published} published; drafts: ${r.guides.drafts_not_published_in_production} withheld (production), ${r.guides.drafts_rendered_in_dev} rendered (development); mode ${r.guides.mode}`);
line('Facts: total / median age (days)', `${r.freshness.total_facts} / ${r.freshness.median_age_days}`);
line('Stale facts >180 days / >365 days', `${r.freshness.stale_180_count} / ${r.freshness.stale_365_count}`);
console.log('\nGated page types (eligible pages are built; below-bar pages are not generated):');
for (const p of r.planned_pages) console.log(`  ${p.eligible ? 'built     ' : 'not built '} ${p.path}  ${p.count}/${p.need}  [${p.type}]`);
console.log('\nIndexable pages:');
for (const p of r.indexable) console.log(`  ${p.type.padEnd(16)} ${p.path}`);
const launch = readSiteEnv({ ...loadEnv('production', root, ''), ...process.env });
if (launch.problems.length) { console.log('\nLaunch configuration (strict builds fail on BLOCKS LAUNCH):'); for (const p of launch.problems) console.log(`  [${p.level === 'error' ? 'BLOCKS LAUNCH' : 'warning'}] ${p.key}`); }
if (r.noindex_listed.length) { console.log('\nNoindex,follow:'); for (const s of r.noindex_listed) console.log(`  ${s.path}: ${s.reasons.join('; ')}`); }
if (r.skipped.length) { console.log('\nSkipped:'); for (const s of r.skipped) console.log(`  ${s.path}: ${s.reasons.join('; ')}`); }
if (r.stage_budget.status === 'over_budget') { console.error(`\nFAILED: stage ${r.stage_budget.stage} page budget exceeded (${r.indexable_count} > ${r.stage_budget.max}).`); process.exit(1); }
if (r.stage_budget.status === 'below_stage_minimum') console.log(`\nNote: below the stage ${r.stage_budget.stage} minimum of ${r.stage_budget.min}; the owner decides whether to launch (PRD section 10). Do not add thin pages to reach it.`);
