// One-person operations queue. Run weekly (`npm run queue -- --weekly`) or monthly (`-- --monthly`); no flag = everything.
//   corrections to process   (private log, CORRECTIONS_LOG=/path/to/log.csv; columns in src/lib/ops.mjs)
//   scraper proposals awaiting review
//   facts that need a re-check (fee rows > 120 days, any fact > 150 days)
//   sources whose robots.txt / terms check is missing or older than 90 days   (monthly)
//   fee rows only read by an agent (to be compared by a person)               (monthly)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readData } from './lib/validate-data.mjs';
import quality from '../src/lib/quality.json' with { type: 'json' };
import { todayIso } from '../src/lib/freshness.mjs';
import { correctionsQueue, parseCsv, staleQueue, sourceChecksDue } from '../src/lib/ops.mjs';
import { pendingReviews } from './scraper/review.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const weekly = argv.includes('--weekly'); const monthly = argv.includes('--monthly');
const all = !weekly && !monthly;
const asJson = argv.includes('--json');
const today = todayIso();
const data = readData(process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data'));

const out = { as_of: today, mode: all ? 'all' : weekly ? 'weekly' : 'monthly' };
const logPath = process.env.CORRECTIONS_LOG;
if (all || weekly) {
  if (!logPath) out.corrections = { configured: false, note: 'Set CORRECTIONS_LOG=/path/to/private-log.csv (id,received_date,type,company,status,acknowledged_date,applied_date). Keep it outside this repo: it may hold requester emails.' };
  else if (!fs.existsSync(logPath)) out.corrections = { configured: true, error: `${logPath} not found` };
  else out.corrections = { configured: true, open: correctionsQueue(parseCsv(fs.readFileSync(logPath, 'utf8')), today) };
  out.scraper_proposals_awaiting_review = pendingReviews(path.join(root, 'reports', 'scraper'));
}
const stale = staleQueue(data, today, quality.freshness);
out.facts = { total: stale.total, past_display_flag: stale.past_display_flag, past_drop: stale.past_drop, fee_rows_over_warn: stale.fee_rows_over_warn.length, reverify_queue: stale.reverify_queue.length, oldest: stale.reverify_queue.slice(0, 15).map((f) => ({ label: f.label, age_days: f.age_days })) };
if (all || monthly) {
  out.source_checks_due = sourceChecksDue(data.sources, today, 90);
  const rows = data['fee-schedules'];
  out.fee_rows_not_checked_by_a_person = rows.filter((f) => f.verification_method !== 'human_compared').map((f) => f.id);
}

if (asJson) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
const h = (t) => console.log(`\n${t}`);
console.log(`Operations queue as of ${today} (${out.mode})`);
if (out.corrections) {
  h('Corrections to process');
  if (!out.corrections.configured) console.log(`  ${out.corrections.note}`);
  else if (out.corrections.error) console.log(`  ${out.corrections.error}`);
  else if (!out.corrections.open.length) console.log('  none open');
  else for (const c of out.corrections.open) console.log(`  ${c.overdue.length ? 'OVERDUE ' : ''}${c.id} ${c.type} ${c.company} (received ${c.received}, ${c.age_days}d): needs ${c.needs.join(' + ')}${c.overdue.length ? ` [${c.overdue.join('; ')}]` : ''}`);
}
if (out.scraper_proposals_awaiting_review) {
  h('Scraper proposals awaiting review');
  if (!out.scraper_proposals_awaiting_review.length) console.log('  none');
  for (const p of out.scraper_proposals_awaiting_review) console.log(`  ${p.run}: ${p.changes ?? '?'} changes, ${p.anomalies ?? '?'} anomalies; read ${path.relative(root, p.dir)}/diff-report.md then node scripts/scraper/review.mjs --run ${p.run} --by <handle> --decision ...`);
}
h(`Facts needing a re-check (${out.facts.total} facts; ${out.facts.reverify_queue} over ${quality.freshness.reverifyQueueDays} days, ${out.facts.fee_rows_over_warn} fee rows over ${quality.freshness.feeRowWarnDays} days, ${out.facts.past_display_flag} past the ${quality.freshness.displayFlagDays}-day flag, ${out.facts.past_drop} dropped)`);
if (!out.facts.oldest.length) console.log('  nothing is past the re-verify age yet');
for (const f of out.facts.oldest) console.log(`  ${f.age_days}d  ${f.label}`);
if (out.source_checks_due) {
  h(`Sources whose robots.txt / terms check is missing or older than 90 days (${out.source_checks_due.length})`);
  const bySource = new Map();
  for (const s of out.source_checks_due) { if (!bySource.has(s.source_id)) bySource.set(s.source_id, []); bySource.get(s.source_id).push(`${s.what} ${s.why}`); }
  for (const [id, w] of bySource) console.log(`  ${id}: ${w.join('; ')}`);
  h(`Fee rows not yet checked by a person (${out.fee_rows_not_checked_by_a_person.length} of ${data['fee-schedules'].length})`);
  console.log(`  ${out.fee_rows_not_checked_by_a_person.join(', ') || 'none'}`);
}
