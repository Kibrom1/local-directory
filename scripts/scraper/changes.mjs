// Change detection between runs: page content hashes and robots.txt / ToS watch pages.
import fs from 'node:fs';
import path from 'node:path';
import { latestSnapshot } from './snapshots.mjs';

// results: [{ url, meta (snapshot meta just saved) }]. `before` = this run's start time.
export function detectPageChanges(root, sourceId, results, before) {
  return results.map(({ url, meta }) => {
    const prev = latestSnapshot(root, sourceId, url, { before });
    return { url, status: !prev ? 'new' : prev.sha256 === meta.sha256 ? 'unchanged' : 'changed', previous_fetched_at: prev ? prev.fetched_at : null, previous_sha256: prev ? prev.sha256 : null, sha256: meta.sha256 };
  });
}

const watchFile = (root, sourceId) => path.join(root, sourceId, 'watch-history.json');
// kind: 'robots:<origin>' or 'tos:<url>'. Returns { changed, previous } and records the new hash.
export function checkWatch(root, sourceId, key, hash) {
  const f = watchFile(root, sourceId);
  let h = {};
  try { h = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* first run */ }
  const previous = h[key] || null;
  h[key] = { hash, seen_at: new Date().toISOString() };
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(h, null, 2) + '\n');
  return { changed: !!previous && previous.hash !== hash, first_seen: !previous, previous };
}

// Pause state: a robots.txt or ToS change pauses the source until a human re-reviews it and clears the pause.
// The pause is persisted (the watch hash alone is overwritten on first sight, so the next run would look "unchanged").
const pauseFile = (root, sourceId) => path.join(root, sourceId, 'paused.json');
export function getPause(root, sourceId) {
  try { return JSON.parse(fs.readFileSync(pauseFile(root, sourceId), 'utf8')); } catch { return null; }
}
export function setPause(root, sourceId, reason) {
  const f = pauseFile(root, sourceId);
  const existing = getPause(root, sourceId);
  if (existing) return existing;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const rec = { reason, paused_at: new Date().toISOString() };
  fs.writeFileSync(f, JSON.stringify(rec, null, 2) + '\n');
  return rec;
}
export function clearPause(root, sourceId) {
  try { fs.unlinkSync(pauseFile(root, sourceId)); return true; } catch { return false; }
}
