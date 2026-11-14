// Orchestrates one scrape run for one approved source. Writes only under outDir
// (proposal, reports) and snapshotRoot; never into the data directory.
import fs from 'node:fs';
import path from 'node:path';
import { evaluateSource } from './allowlist.mjs';
import { PoliteFetcher, RobotsDisallowedError, RobotsUnavailableError, SuppressedError, OffSourceError } from './fetcher.mjs';
import { saveSnapshot, sha256 } from './snapshots.mjs';
import { sanitizeCandidate } from './sanitize.mjs';
import { proposeChanges, renderDiffReport } from './normalize.mjs';
import { detectPageChanges, checkWatch, getPause, setPause } from './changes.mjs';
import { recordRun, healthRow, loadHistory } from './health.mjs';
import { validateData } from '../lib/validate-data.mjs';

export async function runScrape({ data, sourceId, adapter, urls, tosUrls = [], snapshotRoot, outDir, cacheDir, schemaDir, fetcherOptions = {}, today, now = () => new Date(), expectFullSource = false }) {
  const source = data.sources.find((s) => s.id === sourceId);
  const gate = evaluateSource(source, { today });
  if (!gate.allowed) return { refused: true, reasons: gate.reasons };

  // A robots.txt or ToS change paused this source earlier: refuse until a human re-reviews and clears it (run.mjs --clear-pause).
  const pause = getPause(snapshotRoot, sourceId);
  if (pause) return { refused: true, reasons: [`source is paused since ${pause.paused_at}: ${pause.reason}. Re-review robots.txt and the terms, update the registry dates, then run with --clear-pause`] };

  const runStart = now().toISOString();
  const runAt = runStart;
  const robotsEvents = [];
  const fetcher = new PoliteFetcher({ cacheDir, suppression: data.suppression, today, onRobots: (e) => robotsEvents.push(e), ...fetcherOptions });
  const run = { source_id: sourceId, run_at: runAt, urls_attempted: 0, urls_ok: 0, parse_failures: 0, schema_failures: 0, facts_changed: 0, suppression_rejections: 0, robots_blocked: 0, robots_changed: false, paused: false, pause_reason: null };
  const fetched = []; const candidates = []; const errors = []; const droppedNotes = [];

  for (const url of urls) {
    run.urls_attempted++;
    try {
      const res = await fetcher.fetch(url, { source });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const meta = saveSnapshot(snapshotRoot, { sourceId, url, finalUrl: res.finalUrl, status: res.status, contentType: res.contentType, body: res.body, fetchedAt: res.fetchedAt, userAgent: fetcher.userAgent });
      fetched.push({ url, meta });
      let raw;
      try { raw = adapter.parse({ html: res.body, url: res.finalUrl, capturedDate: today }); } catch (e) { run.parse_failures++; errors.push({ url, kind: 'parse_failure', message: e.message }); continue; }
      const { candidate, dropped } = sanitizeCandidate(raw);
      if (dropped.length) droppedNotes.push({ url, dropped });
      if (!candidate.company.name) { run.parse_failures++; errors.push({ url, kind: 'parse_failure', message: 'no company name found' }); continue; }
      candidates.push({ candidate, url, capturedDate: today });
      run.urls_ok++;
    } catch (e) {
      if (e instanceof SuppressedError) { run.suppression_rejections++; errors.push({ url, kind: 'suppressed', message: e.message }); }
      else if (e instanceof RobotsDisallowedError) { run.robots_blocked++; errors.push({ url, kind: 'robots_disallowed', message: e.message }); }
      else if (e instanceof RobotsUnavailableError) { run.robots_blocked++; errors.push({ url, kind: 'robots_unavailable', message: e.message }); }
      else if (e instanceof OffSourceError) errors.push({ url, kind: 'off_source', message: e.message });
      else errors.push({ url, kind: 'fetch_failure', message: e.message });
    }
  }

  // robots.txt and ToS change detection: a change pauses the source until re-reviewed.
  for (const r of robotsEvents) {
    if (!r.hash) continue;
    const w = checkWatch(snapshotRoot, sourceId, `robots:${r.origin}`, r.hash);
    if (r.text != null) saveSnapshot(snapshotRoot, { sourceId, url: `${r.origin}/robots.txt`, finalUrl: `${r.origin}/robots.txt`, status: r.status, contentType: 'text/plain', body: r.text, fetchedAt: now().toISOString(), userAgent: fetcher.userAgent, kind: 'robots' });
    if (w.changed) { run.robots_changed = true; run.paused = true; run.pause_reason = `robots.txt changed for ${r.origin}`; }
  }
  for (const t of tosUrls) {
    try {
      const res = await fetcher.fetch(t, { source });
      const w = checkWatch(snapshotRoot, sourceId, `tos:${t}`, sha256(res.body));
      if (w.changed) { run.paused = true; run.pause_reason = `terms page changed: ${t}`; }
    } catch (e) { errors.push({ url: t, kind: 'tos_watch_failure', message: e.message }); }
  }

  // A change detected during this run means the pages above were fetched under unreviewed rules: persist the pause
  // and drop this run's candidates so nothing is proposed from them.
  if (run.paused) {
    setPause(snapshotRoot, sourceId, run.pause_reason);
    errors.push({ url: null, kind: 'paused', message: `${run.pause_reason}; ${candidates.length} candidate(s) discarded, source paused until re-reviewed` });
    candidates.length = 0;
  }

  const pageChanges = detectPageChanges(snapshotRoot, sourceId, fetched, runStart);
  const result = proposeChanges({ candidates, data, source, today, schemaDir, expectFullSource });
  run.facts_changed = result.changes.filter((c) => c.op !== 'reverify').length;
  run.schema_failures = result.validation.errors.length;
  run.suppression_rejections += result.rejected.filter((r) => /^suppressed/.test(r.reason)).length;

  const historyFile = path.join(path.dirname(outDir), 'history.json');
  recordRun(historyFile, run);
  const health = healthRow(loadHistory(historyFile)[sourceId]);

  fs.mkdirSync(path.join(outDir, 'proposed'), { recursive: true });
  for (const f of result.changedFiles) fs.writeFileSync(path.join(outDir, 'proposed', `${f}.json`), JSON.stringify(result.proposed[f], null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'changes.json'), JSON.stringify({ source_id: sourceId, run_at: runAt, changes: result.changes, anomalies: result.anomalies, rejected: result.rejected }, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'diff-report.md'), renderDiffReport({ source, runAt, result, pageChanges, health: { ...run } }));
  fs.writeFileSync(path.join(outDir, 'run-report.json'), JSON.stringify({ run, health, page_changes: pageChanges, errors, dropped_fields: droppedNotes, fetcher_stats: fetcher.stats, validation_errors: result.validation.errors }, null, 2) + '\n');
  return { refused: false, run, health, result, errors, pageChanges, outDir };
}
