// Validates data/*.json against schemas/*.schema.json, checks referential
// integrity, provenance, evidence-level rules and the suppression list.
// Exits 1 on any failure. `--strict` (launch check) also fails on warnings
// (placeholder records, sources used with robots/ToS not reviewed).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILES, readData, validateData } from './lib/validate-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const strict = process.argv.includes('--strict');

let data;
try { data = readData(dataDir); } catch (e) { console.error(`Validation FAILED: cannot read data (${e.message})`); process.exit(1); }
const { errors, warnings } = validateData(data, { schemaDir: path.join(root, 'schemas'), today: process.env.TODAY });
if (strict) errors.push(...warnings.map((w) => `(strict) ${w}`));

if (errors.length) {
  console.error(`Validation FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Validation passed: ${FILES.map((n) => `${n}=${data[n].length}`).join(', ')}`);
if (warnings.length) {
  console.log(`${warnings.length} warning(s) (fail only with --strict, the launch check):`);
  const byKind = new Map();
  for (const w of warnings) { const k = w.replace(/^sources src_[a-z0-9_]+: /, 'sources: ').replace(/^companies co_[a-z0-9_]+: /, 'companies: '); byKind.set(k, (byKind.get(k) || 0) + 1); }
  for (const [k, n] of byKind) console.log(`  - ${k}${n > 1 ? ` (x${n})` : ''}`);
}
