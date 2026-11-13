// Runs scripts/check-site.mjs against tiny fabricated dist folders (never the real build).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './helpers.mjs';

const ORIGIN = 'https://pm.test.invalid';
const page = ({ p, title = 'A title', desc = 'A description that is long enough to be a useful meta description for this test page.', robots, canon = true, body = '', ld = null, h1 = 'Heading', pagefind = true }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>${desc ? `<meta name="description" content="${desc}">` : ''}${canon ? `<link rel="canonical" href="${ORIGIN}${p}">` : ''}${robots ? `<meta name="robots" content="${robots}">` : ''}${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ''}</head><body><main ${pagefind && !robots ? 'data-pagefind-body' : ''}><h1>${h1}</h1>${body}</main><footer><a href="/corrections/">Correct</a></footer></body></html>`;
const WEBSITE = { '@context': 'https://schema.org', '@type': 'WebSite' };
const CRUMBS = { '@context': 'https://schema.org', '@type': 'BreadcrumbList' };

function makeDist(files, { sitemap = ['/', '/about/', '/corrections/'] } = {}) {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'));
  const put = (rel, txt) => { const f = path.join(dist, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };
  const base = {
    '/': page({ p: '/', title: 'Home', ld: WEBSITE, body: '<a href="/about/">About</a> <a href="/corrections/">Fix</a>' }),
    '/about/': page({ p: '/about/', title: 'About', desc: 'About description that is long enough to be a useful meta description here.', ld: CRUMBS }),
    '/corrections/': page({ p: '/corrections/', title: 'Corrections', desc: 'Corrections description that is long enough to be a useful meta description.', ld: CRUMBS, body: '<form id="correct-form" action="https://forms.test.invalid/x" method="post"></form>' }),
    ...files
  };
  for (const [p, html] of Object.entries(base)) { if (html) put(p.endsWith('/') ? `${p.slice(1)}index.html` : p.slice(1), html); }
  put('sitemap-index.xml', `<sitemapindex><sitemap><loc>${ORIGIN}/sitemap-0.xml</loc></sitemap></sitemapindex>`);
  put('sitemap-0.xml', `<urlset>${sitemap.map((u) => `<url><loc>${ORIGIN}${u}</loc></url>`).join('')}</urlset>`);
  put('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap-index.xml\n`);
  put('pagefind/pagefind-entry.json', JSON.stringify({ languages: { en: { page_count: 3 } } }));
  return dist;
}
const run = (dist, ...args) => spawnSync(process.execPath, [path.join(root, 'scripts', 'check-site.mjs'), `--dist=${dist}`, '--report=/nonexistent.json', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, STRICT_BUILD: '' } });

test('check:site passes on a clean fabricated site', () => {
  const r = run(makeDist({}));
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('check:site fails on TODO text, SAMPLE and placeholder text', () => {
  for (const word of ['TODO fix', 'SAMPLE Alpha', 'placeholder text']) {
    const r = run(makeDist({ '/about/': page({ p: '/about/', title: 'About', desc: 'About description that is long enough to be a useful meta description here.', ld: CRUMBS, body: `<p>${word}</p>` }) }));
    assert.equal(r.status, 1, word);
    assert.match(r.stderr, /contains/);
  }
});

test('check:site fails on missing canonical, missing description, missing JSON-LD and duplicate titles', () => {
  assert.match(run(makeDist({ '/about/': page({ p: '/about/', title: 'About', canon: false, ld: CRUMBS }) })).stderr, /missing canonical/);
  assert.match(run(makeDist({ '/about/': page({ p: '/about/', title: 'About', desc: '', ld: CRUMBS }) })).stderr, /no meta description/);
  assert.match(run(makeDist({ '/about/': page({ p: '/about/', title: 'About', ld: null }) })).stderr, /missing BreadcrumbList JSON-LD/);
  assert.match(run(makeDist({ '/about/': page({ p: '/about/', title: 'Home', desc: 'Other description that is long enough to be a useful meta description here.', ld: CRUMBS }) })).stderr, /duplicate <title>/);
});

test('check:site fails when a noindex page is in the sitemap, or an indexable page is not', () => {
  const noidx = { '/hidden/': page({ p: '/hidden/', title: 'Hidden', robots: 'noindex, follow', body: '' }), '/': page({ p: '/', title: 'Home', ld: WEBSITE, body: '<a href="/about/">A</a><a href="/corrections/">C</a><a href="/hidden/">h</a>' }) };
  assert.match(run(makeDist(noidx, { sitemap: ['/', '/about/', '/corrections/', '/hidden/'] })).stderr, /which is noindex/);
  assert.match(run(makeDist({}, { sitemap: ['/', '/about/'] })).stderr, /is not in the sitemap/);
});

test('check:site fails on a broken internal link, a missing fragment and an orphan indexable page', () => {
  assert.match(run(makeDist({ '/': page({ p: '/', title: 'Home', ld: WEBSITE, body: '<a href="/about/">A</a><a href="/corrections/">C</a><a href="/nope/">x</a>' }) })).stderr, /broken internal link \/nope\//);
  assert.match(run(makeDist({ '/': page({ p: '/', title: 'Home', ld: WEBSITE, body: '<a href="/about/#missing">A</a><a href="/corrections/">C</a>' }) })).stderr, /#missing/);
  const orphan = { '/lonely/': page({ p: '/lonely/', title: 'Lonely', desc: 'Lonely description that is long enough to be a useful meta description here.', ld: CRUMBS }) };
  assert.match(run(makeDist(orphan, { sitemap: ['/', '/about/', '/corrections/', '/lonely/'] })).stderr, /orphan page: nothing links to indexable page \/lonely\//);
});

test('check:site requires rel nofollow noopener on external links', () => {
  const r = run(makeDist({ '/': page({ p: '/', title: 'Home', ld: WEBSITE, body: '<a href="/about/">A</a><a href="/corrections/">C</a><a href="https://example.org/">x</a>' }) }));
  assert.match(r.stderr, /lacks rel="noopener"/);
});

test('strict mode fails when the corrections page has neither a form nor a mailto link; plain mode only warns', () => {
  const dead = { '/corrections/': page({ p: '/corrections/', title: 'Corrections', desc: 'Corrections description that is long enough to be a useful meta description.', ld: CRUMBS, body: '<p>This page cannot receive requests yet.</p>' }) };
  const plain = run(makeDist(dead));
  assert.equal(plain.status, 0, plain.stderr);
  assert.match(plain.stdout, /no form and no mailto fallback/);
  const strict = run(makeDist(dead), '--strict');
  assert.equal(strict.status, 1);
  assert.match(strict.stderr, /no form and no mailto fallback/);
});
