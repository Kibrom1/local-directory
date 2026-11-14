// Operations logic shared by `npm run queue` and `npm run launch:check`: pure functions over data and dates.
import { collectFacts } from './freshness.mjs';
import { daysBetween } from './freshness.mjs';

export const SLA = { acknowledgeBusinessDays: 3, applyDays: 14, removalBusinessDays: 5 };

// Whole business days (Mon-Fri) from a to b, a exclusive. Holidays are not modeled.
export function businessDaysBetween(a, b) {
  let n = 0; const d = new Date(`${a}T00:00:00Z`); const end = new Date(`${b}T00:00:00Z`);
  while (d < end) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}

// Tiny CSV parser (quotes, commas, newlines in quotes). The corrections log is private and lives outside the repo.
export function parseCsv(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  const s = String(text).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some((x) => x !== '')) rows.push(row); }
  if (!rows.length) return [];
  const [head, ...rest] = rows;
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

// Log columns: id, received_date, type (correct|add|remove), company, status (open|waiting|closed), acknowledged_date, applied_date.
// Returns the open requests with what is overdue. The log may hold requester emails, so it is never read from the repo.
export function correctionsQueue(rows, today) {
  return rows.filter((r) => (r.status || 'open').toLowerCase() !== 'closed').map((r) => {
    const age = daysBetween(r.received_date, today);
    const ackDue = !r.acknowledged_date && businessDaysBetween(r.received_date, today) > SLA.acknowledgeBusinessDays;
    const removal = (r.type || '').toLowerCase() === 'remove';
    const applyDue = !r.applied_date && (removal ? businessDaysBetween(r.received_date, today) > SLA.removalBusinessDays : age > SLA.applyDays);
    return { id: r.id, type: r.type, company: r.company, received: r.received_date, age_days: age, status: r.status || 'open', needs: [!r.acknowledged_date ? 'acknowledge' : null, !r.applied_date ? (removal ? 'remove at next deploy' : 'apply or close') : null].filter(Boolean), overdue: [ackDue ? `acknowledgement overdue (${SLA.acknowledgeBusinessDays} business days)` : null, applyDue ? (removal ? `removal overdue (${SLA.removalBusinessDays} business days)` : `apply overdue (${SLA.applyDays} days)`) : null].filter(Boolean) };
  }).sort((a, b) => b.overdue.length - a.overdue.length || b.age_days - a.age_days);
}

// Facts that need a re-check: fee rows past 120 days, any fact past 150 days (re-verify queue), and facts past the 180-day display flag.
export function staleQueue(data, today, freshness) {
  const facts = collectFacts(data).map((f) => ({ ...f, age_days: daysBetween(f.last_verified_date, today) }));
  const placeholder = new Set(data.companies.filter((c) => c.placeholder).map((c) => c.id));
  const live = facts.filter((f) => !placeholder.has(f.company_id));
  return {
    fee_rows_over_warn: live.filter((f) => f.kind === 'fee_row' && f.age_days > freshness.feeRowWarnDays).sort((a, b) => b.age_days - a.age_days),
    reverify_queue: live.filter((f) => f.age_days > freshness.reverifyQueueDays).sort((a, b) => b.age_days - a.age_days),
    past_display_flag: live.filter((f) => f.age_days > freshness.displayFlagDays).length,
    past_drop: live.filter((f) => f.age_days > freshness.dropDays).length,
    total: live.length
  };
}

// Sources whose robots.txt or terms check is missing or older than maxAgeDays (only sources that are use_allowed matter).
export function sourceChecksDue(sources, today, maxAgeDays = 90) {
  const out = [];
  for (const s of sources.filter((x) => x.use_allowed)) {
    const manual = ['company_submission', 'official_reference'].includes(s.source_kind);
    for (const [what, decision, date] of [['robots.txt', s.robots_decision, s.robots_txt_checked_date], ['terms of service', s.tos_decision, s.tos_checked_date]]) {
      if (decision === 'not_applicable' || (manual && decision === 'not_applicable')) continue;
      if (decision === 'not_checked' || !date) out.push({ source_id: s.id, name: s.name, what, why: 'not checked yet' });
      else if (daysBetween(date, today) > maxAgeDays) out.push({ source_id: s.id, name: s.name, what, why: `last checked ${daysBetween(date, today)} days ago` });
    }
  }
  return out;
}
