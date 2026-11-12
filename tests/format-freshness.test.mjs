import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFee, feeText, provenanceLabel, monthsAgo } from '../src/lib/format.mjs';
import { collectFacts, summarizeFreshness, daysBetween } from '../src/lib/freshness.mjs';
import quality from '../src/lib/quality.json' with { type: 'json' };
import { baseData, TODAY } from './helpers.mjs';

test('formatFee: single number, range, plans and null', () => {
  assert.equal(feeText(null), null);
  assert.equal(feeText({ type: 'pct_of_rent', value: 6 }), '6% of rent');
  assert.equal(feeText({ type: 'pct_of_rent', min: 7, max: 10, basis: 'rate basis not stated' }), '7% to 10% of rent (rate basis not stated)');
  assert.equal(feeText({ type: 'flat_usd', value: 299, period: 'one_time' }), '$299');
  assert.equal(feeText({ type: 'pct_of_monthly_rent', value: 50, basis: "first month's rent" }), "50% of first month's rent");
  const plans = formatFee({ type: 'flat_usd', period: 'monthly', plans: [{ name: 'Core', value: 85 }, { name: 'Premium', condition: '2 homes', value: 145, label_confirmed: false }] });
  assert.equal(plans.text, 'Core: $85; Premium, 2 homes: $145 (plan label inferred) per month');
});

test('formatFee keeps minimums on a plan and never invents a number', () => {
  assert.equal(feeText({ type: 'pct_of_monthly_rent', value: 75, minimum_usd: 800 }), "75% (minimum $800) of one month's rent");
  assert.equal(feeText({ type: 'flat_usd', plans: [{ name: 'x', value: null }] }), null);
});

test('provenance label: company submissions say "Provided by the company"; old facts show months', () => {
  const src = { name: 'Site', source_kind: 'company_site' };
  assert.match(provenanceLabel(src, '2026-11-01', '2026-11-01', TODAY), /^Source: Site, captured 2026-11-01, last verified 2026-11-01$/);
  assert.match(provenanceLabel({ name: 'x', source_kind: 'company_submission' }, '2026-11-01', '2026-11-01', TODAY), /^Provided by the company, 2026-11-01$/);
  assert.match(provenanceLabel(src, '2026-01-01', '2026-01-01', TODAY), /last verified 10 months ago/);
  assert.equal(monthsAgo('2026-11-01', TODAY), 0);
});

test('freshness summary counts facts past 180 and 365 days', () => {
  const d = baseData();
  d.companies[0].last_verified_date = '2026-05-01'; d.companies[0].captured_date = '2026-05-01'; // 195 days
  d['fee-schedules'][0].last_verified_date = '2025-10-01'; d['fee-schedules'][0].captured_date = '2025-10-01'; // 407 days
  const s = summarizeFreshness(collectFacts(d), TODAY, quality.freshness);
  assert.equal(s.stale_180_count, 2);
  assert.equal(s.stale_365_count, 1);
  assert.equal(s.fee_rows_older_than_120_days, 1);
  assert.equal(s.stale_180_by_kind.fee_row, 1);
  assert.equal(daysBetween('2026-11-11', '2026-11-12'), 1);
});
