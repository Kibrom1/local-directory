// Loads data from disk and applies the quality gate (src/lib/gate.mjs).
import fs from 'node:fs';
import path from 'node:path';
import quality from './quality.json' with { type: 'json' };
import { evaluate, buildReport as report } from './gate.mjs';
import { todayIso } from './freshness.mjs';

export function loadData(dir = path.join(process.cwd(), 'data')) {
  const load = (n) => JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));
  return { companies: load('companies'), 'fee-schedules': load('fee-schedules'), 'service-areas': load('service-areas'), 'property-types': load('property-types'), geography: load('geography'), sources: load('sources'), suppression: load('suppression') };
}

let cache;
export function getSite() {
  if (cache) return cache;
  cache = evaluate(loadData(), quality, { today: todayIso() });
  return cache;
}
export const buildReport = () => report(getSite());
export { quality };
