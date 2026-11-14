// What blocks each guide from publication: invalid or missing sources, dead links, advice wording, uncited figures.
// It only reports. It never publishes a guide or edits one. Exit 1 when a draft has blockers (so CI can show it), 0 otherwise.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGuides } from '../src/lib/guides.mjs';
import { evaluateSite } from '../src/lib/site.mjs';
import { guideReadiness } from '../src/lib/guide-readiness.mjs';
import { todayIso } from '../src/lib/freshness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const today = todayIso();
const json = process.argv.includes('--json');
const g = loadGuides(path.join(root, 'content', 'guides'), { today });
const site = evaluateSite({ today, prod: true });
const builtPaths = new Set([...site.indexable.map((p) => p.path), ...site.companyPages.map((p) => p.path), ...site.cityPages.map((p) => p.path), '/', '/about/', '/privacy/', '/corrections/', '/methodology/']);
const ctx = { today, builtPaths, guideSlugs: new Set(g.guides.map((x) => x.slug)), publishedGuideSlugs: new Set(g.guides.filter((x) => x.status === 'published').map((x) => x.slug)) };
const parseWarnings = g.warnings.concat(g.errors);
// Front-matter and structure problems found while loading (for example an H1 in the body) are blockers for that guide.
const results = g.guides.map((x) => {
  const r = guideReadiness(x, ctx);
  for (const w of parseWarnings.filter((y) => y.startsWith(`${x.file}:`))) { const msg = w.slice(x.file.length + 2); if (!r.blockers.includes(msg)) r.blockers.push(msg); }
  r.ready = r.blockers.length === 0 && r.review.every((v) => /^status is draft/.test(v));
  return r;
});

if (json) { console.log(JSON.stringify({ today, results, parse_problems: parseWarnings }, null, 2)); process.exit(results.some((r) => r.blockers.length) ? 1 : 0); }

console.log(`Guide readiness as of ${today} (${results.length} guides). Built pages checked: ${builtPaths.size}\n`);
for (const r of results) {
  console.log(`${r.ready ? 'READY ' : r.blockers.length ? 'BLOCKED' : 'REVIEW '} ${r.slug}  [${r.status}] ${r.words} words, ${r.sources} sources, ${r.data_links} data links`);
  for (const b of r.blockers) console.log(`    BLOCKER  ${b}`);
  for (const v of r.review) console.log(`    review   ${v}`);
  for (const a of r.advice.slice(0, 4)) console.log(`      advice? ${a}`);
  if (r.advice.length > 4) console.log(`      ... ${r.advice.length - 4} more`);
}
const blocked = results.filter((r) => r.blockers.length).length;
console.log(`\n${results.filter((r) => r.ready).length} ready, ${blocked} blocked, ${results.length - blocked - results.filter((r) => r.ready).length} need editorial review. Publishing is a person's decision (status: published).`);
process.exit(blocked ? 1 : 0);
