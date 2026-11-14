// CLI: node scripts/scraper/run.mjs --source src_x --adapter name (--url U ... | --urls file) [--tos-url U]
// Requires SCRAPER_CONTACT_URL (a page where site owners can reach you). Output goes to
// reports/scraper/<run>/ (diff-report.md, changes.json, proposed/). It never writes data/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readData } from '../lib/validate-data.mjs';
import { buildAllowlist } from './allowlist.mjs';
import { runScrape } from './runner.mjs';
import { adapters } from './adapters/index.mjs';
import { clearPause, getPause } from './changes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n) => { const out = []; argv.forEach((a, i) => { if (a === `--${n}`) out.push(argv[i + 1]); }); return out; };
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const today = process.env.TODAY || new Date().toISOString().slice(0, 10);
const data = readData(dataDir);

if (argv.includes('--list-sources')) {
  const { approved, refused } = buildAllowlist(data.sources, { today });
  console.log(`Approved for automated access (${approved.length}):`);
  for (const a of approved) console.log(`  ${a.source.id}  ${a.source.url}`);
  console.log(`\nNot approved (${refused.length}):`);
  for (const r of refused) console.log(`  ${r.source.id}: ${r.reasons.join('; ')}`);
  process.exit(0);
}

const [sourceId] = opt('source');
if (argv.includes('--clear-pause')) {
  if (!sourceId) { console.error('Usage: --source <src_id> --clear-pause'); process.exit(2); }
  const p = getPause(path.join(root, 'snapshots'), sourceId);
  console.log(p ? `Cleared pause on ${sourceId} (was: ${p.reason}). Only do this after re-reading robots.txt and the terms and updating the registry dates.` : `${sourceId} was not paused.`);
  clearPause(path.join(root, 'snapshots'), sourceId);
  process.exit(0);
}
const [adapterName] = opt('adapter');
let urls = opt('url');
const [urlsFile] = opt('urls');
if (urlsFile) urls = urls.concat(fs.readFileSync(urlsFile, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')));
if (!sourceId || !adapterName || !urls.length) { console.error('Usage: node scripts/scraper/run.mjs --source <src_id> --adapter <name> (--url <u> ... | --urls <file>) [--tos-url <u>] [--full-source] | --list-sources | --source <src_id> --clear-pause'); process.exit(2); }
const adapter = adapters[adapterName];
if (!adapter) { console.error(`Unknown adapter ${adapterName}. Known: ${Object.keys(adapters).join(', ')}`); process.exit(2); }

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}_${sourceId}`;
const outDir = path.join(root, 'reports', 'scraper', runId);
try {
  const r = await runScrape({ data, sourceId, adapter, urls, tosUrls: opt('tos-url'), snapshotRoot: path.join(root, 'snapshots'), outDir, cacheDir: path.join(root, '.cache', 'scraper'), schemaDir: path.join(root, 'schemas'), today, expectFullSource: argv.includes('--full-source') });
  if (r.refused) { console.error(`REFUSED: source ${sourceId} is not approved for automated access:\n  - ${r.reasons.join('\n  - ')}`); process.exit(3); }
  console.log(`Run complete: ${r.run.urls_ok}/${r.run.urls_attempted} URLs ok, ${r.result.changes.length} changes proposed, ${r.result.anomalies.length} anomalies, ${r.result.rejected.length} rejected.`);
  console.log(`Review: ${path.relative(root, outDir)}/diff-report.md (nothing in data/ was changed)`);
  if (r.health.stale) console.log(`WARNING: source ${sourceId} is marked stale (two failed runs in a row).`);
  if (r.run.paused) console.log(`WARNING: source paused: ${r.run.pause_reason}. Re-review robots/ToS before the next run.`);
  process.exit(r.run.schema_failures ? 1 : 0);
} catch (e) {
  console.error(`${e.name}: ${e.message}`);
  process.exit(e.name === 'ConfigError' ? 2 : 1);
}
