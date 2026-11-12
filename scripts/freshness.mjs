// Lists facts and fee rows past 180 / 365 days (and the 150-day re-verify queue).
// Usage: npm run freshness [-- --days N]   (TODAY=YYYY-MM-DD overrides the date)
// Informational: exits 0, or 1 with --fail-over-365 when any fact is past 365 days.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readData } from './lib/validate-data.mjs';
import { collectFacts, summarizeFreshness, todayIso } from '../src/lib/freshness.mjs';
import { quality } from '../src/lib/site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const args = process.argv.slice(2);
const di = args.indexOf('--days');
const days = di >= 0 ? Number(args[di + 1]) : null;
const data = readData(dataDir);
const real = new Set(data.companies.filter((c) => !c.placeholder).map((c) => c.id));
const s = summarizeFreshness(collectFacts(data).filter((f) => real.has(f.company_id)), todayIso(), quality.freshness);

console.log(`Freshness as of ${s.as_of}: ${s.total_facts} facts, median age ${s.median_age_days} days, ${(s.share_within_180_days * 100).toFixed(0)}% within 180 days`);
console.log(`Past 150 days (re-verify queue): ${s.reverify_queue_150_count}; past 180 days: ${s.stale_180_count}; past 365 days: ${s.stale_365_count}; fee rows past ${quality.freshness.feeRowWarnDays} days: ${s.fee_rows_older_than_120_days}`);
const limit = days ?? quality.freshness.displayFlagDays;
const rows = s.aged.filter((x) => x.age_days > limit).sort((a, b) => b.age_days - a.age_days);
if (rows.length) {
  console.log(`\nFacts older than ${limit} days:`);
  for (const x of rows) console.log(`  ${String(x.age_days).padStart(4)}d  ${x.kind.padEnd(16)} ${x.record_id.padEnd(34)} ${x.last_verified_date}  ${x.label}  [${x.source_id}]`);
  console.log(`\nFacts past ${quality.freshness.dropDays} days are dropped from fee comparison and completeness until re-verified.`);
} else console.log(`\nNo facts older than ${limit} days.`);
if (args.includes('--fail-over-365') && s.stale_365_count > 0) process.exit(1);
