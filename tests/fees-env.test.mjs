import test from 'node:test';
import assert from 'node:assert/strict';
import { describeFee, minimumsText, freshnessBadge, licenseBadge, UNKNOWN } from '../src/lib/fees.mjs';
import { variantsFor, estimateText, amountAtText } from '../src/lib/estimate.mjs';
import { rangeSummary } from '../src/lib/feetable.mjs';
import { readLaunchEnv } from '../src/lib/env.mjs';

test('describeFee: single, range, plans, greater-of minimum and unknown basis wording', () => {
  assert.deepEqual(describeFee({ type: 'pct_of_rent', value: 8.5, basis: 'rent collected' }), { main: '8.5%', basis: 'of rent collected', tag: null, plans: [], minimum: null, notes: null });
  const r = describeFee({ type: 'pct_of_rent', min: 7, max: 10 });
  assert.deepEqual([r.main, r.tag, r.basis], ['7-10%', 'range', 'of rent']);
  const p = describeFee({ type: 'flat_usd', period: 'monthly', plans: [{ name: 'A', value: 85 }, { name: 'B', value: 145, label_confirmed: false }] });
  assert.deepEqual([p.main, p.tag, p.basis, p.plans.length], ['$85-$145', '2 plans', 'per month', 2]);
  assert.match(p.plans[1].extra, /not confirmed/);
  assert.equal(describeFee({ type: 'pct_of_rent', value: 9, basis: 'gross rents', minimum_usd: 75 }).minimum, 'minimum $75');
  assert.equal(describeFee({ type: 'pct_of_rent', value: 6, basis: 'single-family only; rate basis not stated' }).basis, '(single-family only; rate basis not stated)');
  assert.equal(describeFee({ type: 'flat_usd', value: null, min: null }), null);
  assert.equal(describeFee(null), null);
});

test('plans are never merged into one number and ranges never averaged', () => {
  const p = describeFee({ type: 'pct_of_rent', plans: [{ name: 'Core', value: 8 }, { name: 'Signature', value: 10 }] });
  assert.equal(p.main, '8-10%');
  assert.ok(!/9/.test(p.main));
});

test('unknown states are four distinct texts and never 0 or a dash', () => {
  assert.deepEqual(Object.values(UNKNOWN), ['Not published', 'Not checked yet', 'Not offered', 'Varies, ask company']);
  assert.equal(minimumsText(null), null);
  assert.equal(minimumsText({ monthly_usd: null, other: null }), null);
});

test('estimates: percent, range, plans with minimums, flat, revenue basis, none', () => {
  assert.equal(estimateText(variantsFor({ management_pct: { type: 'pct_of_rent', value: 8 } }), 1500), '$120 / mo');
  assert.equal(estimateText(variantsFor({ management_pct: { type: 'pct_of_rent', min: 7, max: 10 } }), 1500), '$105 to $150 / mo');
  assert.equal(estimateText(variantsFor({ management_pct: { type: 'pct_of_rent', value: 9, minimum_usd: 75 } }), 500), '$75 / mo');
  assert.equal(estimateText(variantsFor({ management_pct: { type: 'pct_of_rent', plans: [{ value: 8, minimum_usd: 100 }, { value: 10, minimum_usd: 120 }] } }), 1500), '$120 to $150 / mo');
  assert.equal(estimateText(variantsFor({ flat_fee: { type: 'flat_usd', period: 'monthly', plans: [{ value: 85 }, { value: 145 }] } }), 1500), '$85 to $145 / mo');
  assert.equal(estimateText(variantsFor({ management_pct: { type: 'pct_of_rent', min: 7 } }), 1500), 'from $105 / mo');
  assert.equal(variantsFor({ management_pct: { type: 'pct_of_rent', value: 20 } }, { revenueBasis: true }), null);
  assert.equal(variantsFor({ leasing_fee: { type: 'pct_of_monthly_rent', value: 50 } }), null);
  assert.equal(estimateText(null, 1500), 'Not enough published data');
  assert.equal(estimateText({ p: [[8, 0]], f: [], o: null }, 0), 'Enter an example rent');
  assert.equal(variantsFor({ flat_fee: { type: 'flat_usd', period: 'one_time', value: 100 } }), null, 'one-time flat is not a monthly estimate');
});

test('amountAtText honors greater-of minimums and leaves ranges as ranges', () => {
  assert.equal(amountAtText({ type: 'pct_of_monthly_rent', value: 75, minimum_usd: 800 }, 1000), '$800');
  assert.equal(amountAtText({ type: 'pct_of_monthly_rent', min: 25, max: 100 }, 1500), '$375 to $1,500');
  assert.equal(amountAtText({ type: 'flat_usd', value: 250 }, 1500), '$250');
});

test('rangeSummary groups by how the fee is stated and gives low and high only', () => {
  const rows = [
    { company: { id: 'a' }, fee: { leasing_fee: { type: 'pct_of_monthly_rent', value: 50 } } },
    { company: { id: 'b' }, fee: { leasing_fee: { type: 'pct_of_monthly_rent', min: 25, max: 100 } } },
    { company: { id: 'c' }, fee: { leasing_fee: { type: 'flat_usd', value: 300, period: 'one_time' } } }
  ];
  const s = rangeSummary(rows, 'leasing_fee');
  assert.deepEqual(s.map((x) => [x.companies, x.text]), [[2, 'from 25% to 100%'], [1, '$300']]);
});

test('freshness and license badges carry words', () => {
  assert.deepEqual(freshnessBadge('2026-11-01', '2026-11-12', 180), { kind: 'ok', text: 'Verified 2026-11-01', age: 11 });
  assert.equal(freshnessBadge('2026-03-02', '2026-11-12', 180).kind, 'stale');
  assert.match(freshnessBadge('2026-03-02', '2026-11-12', 180).text, /months ago/);
  assert.equal(licenseBadge(null).text, 'License: not checked');
  assert.equal(licenseBadge({ status: 'self_stated' }).text, 'License: stated by company, not verified');
  assert.equal(licenseBadge({ status: 'active' }).kind, 'ok');
});

test('launch env: neither form action nor email is a blocking problem; either one clears it', () => {
  const none = readLaunchEnv({});
  assert.ok(none.problems.some((p) => p.level === 'error' && /PUBLIC_FORM_ACTION/.test(p.key)));
  assert.equal(none.formAction, null);
  const form = readLaunchEnv({ PUBLIC_FORM_ACTION: 'https://forms.example.org/x' });
  assert.ok(!form.problems.some((p) => /FORM_ACTION \/ /.test(p.key)));
  assert.ok(form.problems.some((p) => p.key === 'PUBLIC_CONTACT_EMAIL' && p.level === 'warn'));
  const mail = readLaunchEnv({ PUBLIC_CONTACT_EMAIL: 'a@b.org' });
  assert.ok(!mail.problems.some((p) => /FORM_ACTION \/ /.test(p.key)));
  assert.equal(readLaunchEnv({ PUBLIC_FORM_ACTION: 'http://insecure.org' }).formAction, null);
  assert.equal(readLaunchEnv({ PUBLIC_CONTACT_EMAIL: 'not an email' }).contactEmail, null);
  assert.ok(readLaunchEnv({ SITE_URL: 'https://columbus-pm-directory.example' }).problems.some((p) => p.key === 'SITE_URL'));
  assert.ok(!readLaunchEnv({ SITE_URL: 'https://realdomain.org', PUBLIC_FORM_ACTION: 'https://f.org/x', PUBLIC_CONTACT_EMAIL: 'a@b.org', PUBLIC_OPERATOR_NAME: 'x', PUBLIC_DISCLOSURE: 'y' }).problems.length);
});
