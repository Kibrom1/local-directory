// Per-source run history and the scraper health report.
import fs from 'node:fs';
import path from 'node:path';

export const SUCCESS_FLOOR = 0.9;

export function runFailed(run) {
  if (run.paused) return true;
  return run.urls_attempted > 0 && run.urls_ok / run.urls_attempted < SUCCESS_FLOOR;
}

export function loadHistory(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
export function recordRun(file, run) {
  const h = loadHistory(file);
  const list = h[run.source_id] || [];
  list.push(run);
  h[run.source_id] = list.slice(-50);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(h, null, 2) + '\n');
  return h;
}
// A source is stale after two failed runs in a row.
export function isStale(runs) {
  return runs.length >= 2 && runFailed(runs[runs.length - 1]) && runFailed(runs[runs.length - 2]);
}
export function healthRow(runs) {
  const last = runs[runs.length - 1];
  const prev = runs.length > 1 ? runs[runs.length - 2] : null;
  return {
    source_id: last.source_id, run_at: last.run_at, urls_attempted: last.urls_attempted, urls_ok: last.urls_ok,
    success_rate: last.urls_attempted ? +(last.urls_ok / last.urls_attempted).toFixed(3) : null,
    parse_failures: last.parse_failures, parse_failures_increased: prev ? last.parse_failures > prev.parse_failures : false,
    schema_failures: last.schema_failures, facts_changed: last.facts_changed, suppression_rejections: last.suppression_rejections,
    robots_blocked: last.robots_blocked, robots_changed: !!last.robots_changed, paused: !!last.paused, pause_reason: last.pause_reason || null,
    failed: runFailed(last), stale: isStale(runs)
  };
}
