// Loads data from disk and applies the quality gate (src/lib/gate.mjs).
import fs from 'node:fs';
import path from 'node:path';
import quality from './quality.json' with { type: 'json' };
import { evaluate, buildReport as report } from './gate.mjs';
import { todayIso } from './freshness.mjs';
import { loadGuides } from './guides.mjs';

export function loadData(dir = path.join(process.cwd(), 'data')) {
  const load = (n) => JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));
  return { companies: load('companies'), 'fee-schedules': load('fee-schedules'), 'service-areas': load('service-areas'), 'property-types': load('property-types'), geography: load('geography'), sources: load('sources'), suppression: load('suppression') };
}

// Production unless Astro's dev server says otherwise (fail closed: drafts stay unpublished).
export const isProd = () => process.env.NODE_ENV !== 'development';

// Evaluates everything the templates need. Throws with every guide problem listed so the build fails loudly.
export function evaluateSite({ dataDir, guidesDir, today = todayIso(), prod = isProd() } = {}) {
  const data = loadData(dataDir);
  const g = loadGuides(guidesDir, { today });
  if (g.errors.length) throw new Error(`Guide problems (fix before building):\n  - ${g.errors.join('\n  - ')}`);
  const site = evaluate({ ...data, guides: g.guides }, quality, { today, prod });
  site.guideWarnings = g.warnings;
  const eligible = (t) => site.planned.some((p) => p.type === t && p.eligible);
  // Navigation links exist only for pages that exist (no dead links).
  site.nav = { fees: eligible('fee-comparison'), feeGuides: eligible('fee-guide-hub'), guides: eligible('guide-hub') };
  const dates = [];
  for (const c of data.companies.filter((x) => !x.placeholder && x.evidence_level === 'own_site_confirmed')) dates.push(c.last_verified_date);
  for (const f of data['fee-schedules']) dates.push(f.last_verified_date);
  site.lastDataUpdate = dates.sort().at(-1) || null;
  return site;
}

let cache;
export function getSite() {
  if (cache) return cache;
  cache = evaluateSite();
  return cache;
}
export const buildReport = () => report(getSite());
export { quality };
