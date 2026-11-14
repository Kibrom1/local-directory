// Tests for the designer findings built so far: dark theme tokens, no-JS home, site map.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './helpers.mjs';
import { evaluateSite } from '../src/lib/site.mjs';

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('contrast: light and dark pairs all pass and the CSS holds no untokenised colours', () => {
  const r = spawnSync('node', ['scripts/contrast.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Dark theme/);
});
test('dark theme follows the system setting and declares colour-scheme', () => {
  assert.match(read('src/styles/site.css'), /@media \(prefers-color-scheme:dark\)/);
  assert.match(read('src/layouts/Base.astro'), /name="color-scheme" content="light dark"/);
});
test('home: the city picker needs 2+ cities and never hides the only way in', () => {
  const src = read('src/pages/index.astro');
  assert.match(src, /cities\.length > 1 && \(/);
  assert.match(src, /href="\/site-map\/"/, 'a plain link to every page exists without JavaScript');
  assert.match(src, /What this site covers today/);
});
test('site map: a noindex utility page, not in the sitemap or the indexable count', () => {
  const s = evaluateSite({ today: '2026-11-14', prod: true });
  assert.ok(s.utilityPages.includes('/site-map/'));
  assert.ok(!s.indexable.some((p) => p.path === '/site-map/'));
  assert.match(read('src/pages/site-map.astro'), /noindex/);
});
