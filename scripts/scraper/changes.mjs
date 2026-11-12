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
