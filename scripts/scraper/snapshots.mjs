// Raw snapshot storage under a git-ignored folder (default ./snapshots).
// Each fetch stores the body plus a meta record with URL and timestamp, and
// appends to a per-source index.jsonl used for change detection.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const safeTs = (iso) => iso.replace(/[:.]/g, '-');

export function saveSnapshot(root, { sourceId, url, finalUrl, status, contentType, body, fetchedAt, userAgent, kind = 'page' }) {
  const u = new URL(finalUrl || url);
  const dir = path.join(root, sourceId, u.hostname);
  fs.mkdirSync(dir, { recursive: true });
  const hash = sha256(body);
  const base = `${safeTs(fetchedAt)}_${sha256(url).slice(0, 10)}`;
  const ext = /json/.test(contentType || '') ? 'json' : /html/.test(contentType || '') ? 'html' : 'txt';
  const file = path.join(dir, `${base}.${ext}`);
  fs.writeFileSync(file, body);
  const meta = { source_id: sourceId, url, final_url: finalUrl || url, fetched_at: fetchedAt, status, content_type: contentType || null, sha256: hash, bytes: Buffer.byteLength(body), user_agent: userAgent, kind, file: path.relative(root, file) };
  fs.writeFileSync(`${file}.meta.json`, JSON.stringify(meta, null, 2) + '\n');
  fs.appendFileSync(path.join(root, sourceId, 'index.jsonl'), JSON.stringify(meta) + '\n');
  return meta;
}

export function readIndex(root, sourceId) {
  const f = path.join(root, sourceId, 'index.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// Latest snapshot for a URL, optionally only those strictly before `before` (ISO time).
export function latestSnapshot(root, sourceId, url, { before = null, kind = 'page' } = {}) {
  const rows = readIndex(root, sourceId).filter((r) => r.url === url && r.kind === kind && (!before || r.fetched_at < before));
  return rows.length ? rows[rows.length - 1] : null;
}

export const readSnapshotBody = (root, meta) => fs.readFileSync(path.join(root, meta.file), 'utf8');
