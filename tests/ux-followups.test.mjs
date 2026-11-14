import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('analytics events carry no parameters, so no typed text, company or URL can be sent', () => {
  const src = fs.readFileSync('src/scripts/analytics.js', 'utf8');
  const calls = [...src.matchAll(/gtag\('event',\s*([^)]*)\)/g)].map((m) => m[1].trim());
  assert.equal(calls.length, 1, 'one send helper');
  assert.equal(calls[0], 'name', 'event name only, no parameter object');
  for (const e of ['source_link_click', 'fee_compare_used', 'rent_example_changed', 'site_search_used']) {
    assert.ok(src.includes(`'${e}'`) && fs.readFileSync('src/pages/privacy.astro', 'utf8').length > 0);
  }
});

test('the privacy page names the counted events', () => {
  const p = fs.readFileSync('src/pages/privacy.astro', 'utf8');
  assert.match(p, /four counted events/);
  assert.match(p, /no search terms, no rent value, no company name/);
});

test('methodology has the two parts', () => {
  const m = fs.readFileSync('src/pages/methodology.astro', 'utf8');
  assert.match(m, /id="read">How to read this site/);
  assert.match(m, /id="rules">Rules and change log/);
});

test('profile questions are built only from missing fee types', () => {
  const c = fs.readFileSync('src/pages/company/[slug].astro', 'utf8');
  assert.match(c, /gapQuestions/);
  assert.match(c, /!fees\.some\(/);
});
