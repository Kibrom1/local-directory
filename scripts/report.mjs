// Writes reports/build-report.json without running Astro (same gate as the build)
// and prints the counts the metrics sheet needs. Exit 1 when the stage page budget is exceeded.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, buildReport } from '../src/lib/gate.mjs';
import { loadData, quality } from '../src/lib/site.mjs';
import { todayIso } from '../src/lib/freshness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const site = evaluate(loadData(dataDir), quality, { today: todayIso() });
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
line('Companies per fee type (gate needs ' + quality.feeGuide.minCompaniesPerFeeType + ')', JSON.stringify(r.fee_type_counts));
line('Facts: total / median age (days)', `${r.freshness.total_facts} / ${r.freshness.median_age_days}`);
line('Stale facts >180 days / >365 days', `${r.freshness.stale_180_count} / ${r.freshness.stale_365_count}`);
console.log('\nPlanned pages (gate decided, template not built yet):');
for (const p of r.planned_pages) console.log(`  ${p.eligible ? 'eligible ' : 'below bar '} ${p.path}  ${p.count}/${p.need}`);
if (r.noindex_listed.length) { console.log('\nNoindex,follow:'); for (const s of r.noindex_listed) console.log(`  ${s.path}: ${s.reasons.join('; ')}`); }
if (r.skipped.length) { console.log('\nSkipped:'); for (const s of r.skipped) console.log(`  ${s.path}: ${s.reasons.join('; ')}`); }
if (r.stage_budget.status === 'over_budget') { console.error(`\nFAILED: stage ${r.stage_budget.stage} page budget exceeded (${r.indexable_count} > ${r.stage_budget.max}).`); process.exit(1); }
if (r.stage_budget.status === 'below_stage_minimum') console.log(`\nNote: below the stage ${r.stage_budget.stage} minimum of ${r.stage_budget.min}; the owner decides whether to launch (PRD section 10). Do not add thin pages to reach it.`);
