// Records who reviewed a scraper proposal and what they decided. A proposal is "awaiting review" until review.json exists in its run
// folder (`npm run queue` lists those). Accepting never copies anything into data/: a person applies the proposed files, runs
// `npm run validate`, and commits. Usage:
//   node scripts/scraper/review.mjs --run <run folder or run id> --by <handle> --decision accepted|partially_accepted|rejected [--note "text"]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REVIEW_DECISIONS = ['accepted', 'partially_accepted', 'rejected'];
const HANDLE = /^[A-Za-z0-9 _.-]{2,40}$/;

export function recordReview(runDir, { by, decision, note = null, now = new Date() }) {
  if (!HANDLE.test(by || '')) throw new Error('--by must be a role or handle (2-40 letters, digits, space, _ . -)');
  if (!REVIEW_DECISIONS.includes(decision)) throw new Error(`--decision must be one of ${REVIEW_DECISIONS.join(', ')}`);
  if (!fs.existsSync(path.join(runDir, 'diff-report.md'))) throw new Error(`${runDir} is not a scraper run folder (no diff-report.md)`);
  let run = {};
  try { run = JSON.parse(fs.readFileSync(path.join(runDir, 'run-report.json'), 'utf8')); } catch { /* older runs */ }
  if (decision !== 'rejected') {
    if ((run.validation_errors || []).length) throw new Error(`the proposal has ${run.validation_errors.length} validation error(s); it cannot be accepted (reject it or fix the source data)`);
    if (run.run && run.run.paused) throw new Error(`the source was paused (${run.run.pause_reason}); re-review robots.txt and terms first, then re-run the scrape`);
  }
  const rec = { reviewed_by: by, decision, reviewed_at: now.toISOString(), note };
  fs.writeFileSync(path.join(runDir, 'review.json'), JSON.stringify(rec, null, 2) + '\n');
  return rec;
}

// Runs under reports/scraper that have a diff report but no review.json.
export function pendingReviews(reportsRoot = path.join(root, 'reports', 'scraper')) {
  if (!fs.existsSync(reportsRoot)) return [];
  return fs.readdirSync(reportsRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(reportsRoot, d.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'diff-report.md')) && !fs.existsSync(path.join(dir, 'review.json')))
    .map((dir) => {
      let changes = null; let anomalies = null; let source = path.basename(dir).split('_').slice(1).join('_');
      try { const c = JSON.parse(fs.readFileSync(path.join(dir, 'changes.json'), 'utf8')); changes = c.changes.length; anomalies = c.anomalies.length; source = c.source_id; } catch { /* ignore */ }
      return { dir, run: path.basename(dir), source, changes, anomalies, created: fs.statSync(path.join(dir, 'diff-report.md')).mtime.toISOString().slice(0, 10) };
    }).sort((a, b) => a.created.localeCompare(b.created));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const run = opt('run');
  if (!run) { console.error('Usage: node scripts/scraper/review.mjs --run <run folder or id> --by <handle> --decision accepted|partially_accepted|rejected [--note "text"]'); process.exit(2); }
  const dir = fs.existsSync(run) ? path.resolve(run) : path.join(root, 'reports', 'scraper', run);
  try {
    const r = recordReview(dir, { by: opt('by'), decision: opt('decision'), note: opt('note') || null });
    console.log(`Recorded: ${path.basename(dir)} ${r.decision} by ${r.reviewed_by}. Nothing in data/ was changed; apply the proposed files yourself, run npm run validate, commit.`);
  } catch (e) { console.error(`REFUSED: ${e.message}`); process.exit(1); }
}
