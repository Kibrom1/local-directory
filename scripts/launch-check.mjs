// One readable launch checklist: every open blocker, who owns it, and the exact next action. Exits 1 while any blocker remains.
// Reuses the launch configuration check (src/lib/env.mjs), the data validator (strict warnings) and the quality gate analysis.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { readData, validateData } from './lib/validate-data.mjs';
import { readSiteEnv } from '../src/lib/env.mjs';
import { evaluateSite } from '../src/lib/site.mjs';
import { analyze } from '../src/lib/analysis.mjs';
import { todayIso } from '../src/lib/freshness.mjs';
import { loadGuides } from '../src/lib/guides.mjs';
import { guideReadiness } from '../src/lib/guide-readiness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = todayIso();
const asJson = process.argv.includes('--json');
const items = [];
const add = (level, owner, title, action) => items.push({ level, owner, title, action });

// 1. Launch configuration (owner decisions)
const env = readSiteEnv({ ...loadEnv('production', root, ''), ...process.env });
for (const p of env.problems) add(p.level === 'error' ? 'BLOCKER' : 'warning', 'owner', `${p.key}: ${p.message}`, `Set ${p.key.split(' / ')[0]} in .env or the host's environment variables.`);

// 2. Data validation, strict (the launch check): errors, placeholders, unreviewed terms and robots
const data = readData(path.join(root, 'data'));
const v = validateData(data, { schemaDir: path.join(root, 'schemas'), today });
for (const e of v.errors) add('BLOCKER', 'developer', `Validation error: ${e}`, 'Fix the data (npm run validate).');
const tosIds = v.warnings.filter((w) => /terms of service not reviewed/.test(w)).map((w) => w.match(/^sources (src_[a-z0-9_]+)/)?.[1]).filter(Boolean);
const robotsIds = v.warnings.filter((w) => /robots\.txt not checked/.test(w)).map((w) => w.match(/^sources (src_[a-z0-9_]+)/)?.[1]).filter(Boolean);
if (tosIds.length) add('BLOCKER', 'person reading the terms', `${tosIds.length} sources used by published data have no terms-of-service review`, `Read each source's terms, then set tos_decision and tos_checked_date in data/sources.json (a prohibition means removing that source's data). Sources: ${tosIds.join(', ')}`);
if (robotsIds.length) add('BLOCKER', 'person reading the terms', `${robotsIds.length} sources have no robots.txt check`, `Read each robots.txt and set robots_decision and robots_txt_checked_date. Sources: ${robotsIds.join(', ')}`);
for (const w of v.warnings.filter((x) => /placeholder/.test(x))) add('BLOCKER', 'developer', w, 'Remove placeholder records before launch.');

// 3. Pages that exist, and what the production switches do
const site = evaluateSite({ today, prod: true });
const A = analyze(site);
if (A.terms_gate.removed_pages.length) add('BLOCKER', 'person reading the terms', `The terms gate keeps ${A.terms_gate.removed_pages.length} pages out of the index until the terms reviews above are recorded ${JSON.stringify(A.terms_gate.removed_by_type)}`, 'Same action as the terms-of-service item; re-run npm run report to see the pages return.');
const min = site.quality.stages.find((s) => s.stage === site.quality.currentStage).minIndexable;
const built = site.indexable.length;
if (min !== null && built < min) add('warning', 'owner', `${built} indexable pages (stage ${site.quality.currentStage} minimum ${min})`, 'Owner decides: launch smaller, or add data (see "What unlocks the next page" in npm run report). Do not relax the gates.');
if (!A.verification.human_compared) add('warning', 'person reviewing data', `No fee row has been compared with its page by a person (${A.verification.by_method.agent_read || 0} agent reads)`, 'Compare each row with the live page, then set verification_method human_compared, verified_by and human_verified_date.');
if (A.scope_effect.rows_shown_but_not_counted.length) add('warning', 'owner', `${A.scope_effect.rows_shown_but_not_counted.length} fee row(s) are shown with a caveat but not counted: ${A.scope_effect.rows_shown_but_not_counted.map((x) => `${x.company} (${x.scope})`).join(', ')}`, 'Find a Columbus-specific page or confirm plan labels, or add the scope to quality.json feeScopesCountingTowardGates.');
const excluded = A.fee_exclusions.excluded.filter((e) => e.blockers.includes('area'));
if (excluded.length) add('warning', 'person reading company sites', `${excluded.length} fee-publishing compan${excluded.length === 1 ? 'y has' : 'ies have'} no stated service area: ${[...new Set(excluded.map((e) => e.company))].join(', ')}`, 'Add a service-areas row only if the company\'s own site names the area (runbook: stated service area checklist).');
if (A.license_route.status !== 'available') add('warning', 'owner', 'License verification route: none available', 'License notes stay "stated by company, not verified". Manual lookup procedure is in docs/developer/runbook.md.');
const g = loadGuides(path.join(root, 'content', 'guides'), { today });
const builtPaths = new Set([...site.indexable.map((p) => p.path), ...site.companyPages.map((p) => p.path), ...site.cityPages.map((p) => p.path)]);
const ctx = { today, builtPaths, guideSlugs: new Set(g.guides.map((x) => x.slug)), publishedGuideSlugs: new Set(g.guides.filter((x) => x.status === 'published').map((x) => x.slug)) };
const drafts = g.guides.filter((x) => x.status !== 'published').map((x) => guideReadiness(x, ctx));
if (drafts.length) add('warning', 'owner / editor', `${drafts.length} draft guides unpublished (${drafts.filter((d) => d.blockers.length).length} have blockers)`, 'npm run guides:check lists what blocks each one.');

if (asJson) { console.log(JSON.stringify({ as_of: today, blockers: items.filter((i) => i.level === 'BLOCKER').length, items }, null, 2)); process.exit(items.some((i) => i.level === 'BLOCKER') ? 1 : 0); }
const blockers = items.filter((i) => i.level === 'BLOCKER');
const warnings = items.filter((i) => i.level !== 'BLOCKER');
console.log(`LAUNCH CHECK as of ${today}: ${blockers.length} blocker(s), ${warnings.length} warning(s)\n`);
for (const [label, list] of [['BLOCKERS (launch is refused while any remain)', blockers], ['WARNINGS (decide or accept, then record the decision in docs/pm/open-questions.md)', warnings]]) {
  console.log(label);
  if (!list.length) console.log('  none');
  list.forEach((i, n) => { console.log(`  [ ] ${n + 1}. ${i.title}\n        owner: ${i.owner}\n        next:  ${i.action}`); });
  console.log('');
}
process.exit(blockers.length ? 1 : 0);
