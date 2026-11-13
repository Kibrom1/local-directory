import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadGuides, renderMarkdown, splitFrontMatter } from '../src/lib/guides.mjs';

const fm = (o = {}, body = '## First\n\nText with a [link](https://example.org/x) and [internal](/fees/).\n\n## Second\n') => {
  const d = { title: 'T', slug: 'a-guide', description: 'Plain description.', type: 'guide', keywords: ['k'], last_verified: '2026-11-12', sources: [{ title: 'S', url: 'https://example.org/', captured: '2026-11-12' }], status: 'published', ...o };
  const lines = Object.entries(d).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n${body}`;
};
function dirWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guides-'));
  for (const [n, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), c);
  return dir;
}
const TODAY = '2026-11-12';

test('missing or empty guides directory is fine', () => {
  assert.deepEqual(loadGuides('/nonexistent-dir-xyz', { today: TODAY }).guides, []);
  const r = loadGuides(dirWith({ 'README.md': '# readme' }), { today: TODAY });
  assert.deepEqual([r.guides.length, r.errors.length], [0, 0]);
});

test('valid guide renders html, toc with ids, external rel and keeps sources and date', () => {
  const r = loadGuides(dirWith({ 'a.md': fm() }), { today: TODAY });
  assert.deepEqual(r.errors, []);
  const g = r.guides[0];
  assert.equal(g.last_verified, '2026-11-12');
  assert.equal(g.sources.length, 1);
  assert.deepEqual(g.toc.map((t) => t.id), ['first', 'second']);
  assert.match(g.html, /<h2 id="first">First<\/h2>/);
  assert.match(g.html, /<a href="https:\/\/example.org\/x" rel="nofollow noopener">link<\/a>/);
  assert.match(g.html, /<a href="\/fees\/">internal<\/a>/);
});

test('a published guide without sources, with a bad date or an H1 is a build error', () => {
  for (const [o, body, re] of [[{ sources: [] }, undefined, /sources must list at least one/], [{ last_verified: '2026-13-40' }, undefined, /last_verified/], [{}, '# Title again\n\ntext', /must not contain an H1/], [{ status: 'review' }, undefined, /status must be one of/], [{ slug: 'Bad Slug' }, undefined, /slug/], [{ sources: [{ title: 'S', url: 'ftp://x', captured: '2026-11-12' }] }, undefined, /url must be/], [{ last_verified: '2027-01-01' }, undefined, /future/]]) {
    const r = loadGuides(dirWith({ 'a.md': fm(o, body) }), { today: TODAY });
    assert.ok(r.errors.some((e) => re.test(e)), `${JSON.stringify(o)} -> ${r.errors.join('|')}`);
    assert.equal(r.guides.length, 0);
  }
});

test('a draft with problems only warns and is still loaded so dev can render it', () => {
  const r = loadGuides(dirWith({ 'a.md': fm({ status: 'draft', sources: [] }) }), { today: TODAY });
  assert.equal(r.errors.length, 0);
  assert.ok(r.warnings.some((w) => /sources/.test(w)));
  assert.equal(r.guides[0].status, 'draft');
});

test('missing front matter and duplicate slugs are errors', () => {
  assert.ok(loadGuides(dirWith({ 'a.md': 'no front matter' }), { today: TODAY }).errors[0].includes('missing YAML front matter'));
  const r = loadGuides(dirWith({ 'a.md': fm(), 'b.md': fm() }), { today: TODAY });
  assert.ok(r.errors.some((e) => /already used/.test(e)));
});

test('raw HTML in guide bodies is escaped, not passed through', () => {
  const { html } = renderMarkdown('## H\n\n<script>alert(1)</script>\n');
  assert.ok(!/<script>/.test(html));
  assert.match(html, /&lt;script&gt;/);
});

test('unquoted yaml dates are accepted', () => {
  const raw = fm().replace('last_verified: "2026-11-12"', 'last_verified: 2026-11-12').replace('"captured":"2026-11-12"', '"captured":"2026-11-12"');
  assert.equal(String(splitFrontMatter(raw).data.last_verified), '2026-11-12');
  assert.deepEqual(loadGuides(dirWith({ 'a.md': raw }), { today: TODAY }).errors, []);
});
