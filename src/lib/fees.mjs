// Fee display helpers for tables: split a published fee value into amount, basis, tag and plans.
// Ranges and plans are shown as published, never merged into one number or averaged. Pure.
import { daysBetween } from './freshness.mjs';
const num = (x) => typeof x === 'number';
const usd = (n) => `$${Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2)}`;
const pct = (n) => `${n}%`;
const PERIOD = { one_time: '', monthly: 'per month', per_unit_monthly: 'per unit per month', annual: 'per year' };

const fmt = (type, n) => (type === 'flat_usd' ? usd(n) : pct(n));
function amountOf(type, o) {
  if (num(o.value)) return { text: fmt(type, o.value), range: false };
  if (num(o.min) && num(o.max)) return { text: type === 'flat_usd' ? `${usd(o.min)}-${usd(o.max)}` : `${o.min}-${o.max}%`, range: true };
  if (num(o.min)) return { text: `from ${fmt(type, o.min)}`, range: true };
  if (num(o.max)) return { text: `up to ${fmt(type, o.max)}`, range: true };
  return null;
}
// Published basis wording is shown as the company states it. A basis that reads like a rent basis gets "of ...";
// anything else (for example "rate basis not stated") is shown in parentheses so it is never turned into a false basis.
const RENT_BASIS = /rent|month/i;
const NOT_STATED = /not stated|depends|only/i;
function basisOf(v) {
  const b = v.basis ? v.basis.replace(/^of\s+/, '') : null;
  if (v.type === 'flat_usd') return [PERIOD[v.period] || '', b ? `(${b})` : ''].filter(Boolean).join(' ');
  if (b && (!RENT_BASIS.test(b) || NOT_STATED.test(b)) && !/greater of/i.test(b)) return `(${b})`;
  if (v.type === 'pct_of_monthly_rent') return `of ${b || "one month's rent"}`;
  return `of ${b || 'rent'}`;
}

// Returns null when the value has no number at all. Otherwise
// { main, basis, tag, plans:[{label, text}], minimum, notes, range }.
export function describeFee(v) {
  if (!v) return null;
  const basis = basisOf(v);
  const minimum = num(v.minimum_usd) ? `minimum ${usd(v.minimum_usd)}` : null;
  const plans = (v.plans || []).map((p) => {
    const a = amountOf(v.type, p);
    if (!a) return null;
    const label = [p.name, p.condition].filter(Boolean).join(', ') || 'Plan';
    const extra = [num(p.minimum_usd) ? `minimum ${usd(p.minimum_usd)}` : null, p.label_confirmed === false ? 'plan label inferred, not confirmed' : null].filter(Boolean);
    return { label, text: a.text, extra: extra.join('; '), numeric: p };
  }).filter(Boolean);
  const head = amountOf(v.type, v);
  if (head) return { main: head.text, basis, tag: head.range ? 'range' : null, plans, minimum, notes: v.notes || null };
  if (!plans.length) return null;
  // Plan-based: show the span of the plans, tagged with the plan count.
  const vals = plans.flatMap((p) => [p.numeric.value, p.numeric.min, p.numeric.max]).filter(num);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const main = lo === hi ? fmt(v.type, lo) : (v.type === 'flat_usd' ? `${usd(lo)}-${usd(hi)}` : `${lo}-${hi}%`);
  return { main, basis, tag: `${plans.length} plan${plans.length === 1 ? '' : 's'}`, plans, minimum, notes: v.notes || null };
}

export function minimumsText(m) {
  if (!m) return null;
  const parts = [num(m.monthly_usd) ? `${usd(m.monthly_usd)} per month` : null, m.other].filter(Boolean);
  return parts.length ? parts.join('; ') : null;
}

export const UNKNOWN = {
  not_published: 'Not published',
  not_recorded: 'Not recorded',
  not_offered: 'Not offered',
  varies: 'Varies, ask company'
};

// 2026-11-11 -> "Nov 11, 2026". Fixed English month names, no locale or time zone, so the output never differs between builds.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m && MONTHS[Number(m[2]) - 1] ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : String(iso ?? '');
}
// Which "unknown" text a company field gets: "Not published" only where we recorded that the company does not state it
// (companies.fields_checked), otherwise "Not recorded" (we have no record of looking).
export const unknownKind = (company, field) => (company && company.fields_checked && company.fields_checked[field] ? 'not_published' : 'not_recorded');
export const ageDays = (date, today) => daysBetween(date, today);
export const monthsBetween = (date, today) => Math.max(0, Math.floor(ageDays(date, today) / 30));

// Verified / stale badge model for a dated fact.
export function freshnessBadge(date, today, flagDays) {
  const age = ageDays(date, today);
  if (age > flagDays) return { kind: 'stale', text: `Listing read ${monthsBetween(date, today)} months ago`, age };
  return { kind: 'ok', text: `Listing read ${fmtDate(date)}`, age };
}

export const LICENSE_EXPLANATION = 'Ohio has no separate property manager license. Companies that manage rental property for a fee generally work under a real estate broker license from the state. A company stating a license on its own website is not the same as us checking the state record.';

export function licenseBadge(lic, today) {
  if (!lic || lic.status === 'unverified') return { kind: 'none', text: 'License: not checked' };
  if (lic.status === 'self_stated') return { kind: 'none', text: 'License: stated by company, not verified' };
  if (lic.status === 'active') return { kind: 'ok', text: 'License verified' };
  if (lic.status === 'inactive') return { kind: 'bad', text: `License inactive (${fmtDate(lic.last_verified_date)})` };
  if (lic.status === 'none_found') return { kind: 'bad', text: `No matching license found (checked ${fmtDate(lic.last_verified_date)})` };
  return { kind: 'none', text: 'License: not checked' };
}

// How a fee row was checked, in the words visitors see. An automated read is never described as a person's check.
export const VERIFICATION_LABELS = {
  agent_read: (date) => `Read from the company's website by our tool on ${date}; not yet checked by a person`,
  human_compared: (date) => `Checked by a person, ${date}`
};
export function feeBadge(f, today, flagDays) {
  const human = f.verification_method === 'human_compared' && f.human_verified_date;
  const date = human ? f.human_verified_date : f.last_verified_date;
  const age = ageDays(f.last_verified_date, today);
  if (age > flagDays) {
    const n = monthsBetween(f.last_verified_date, today);
    return { kind: 'stale', text: human ? `Checked by a person ${n} months ago` : `Read from the company's website by our tool ${n} months ago; not yet checked by a person`, age, method: human ? 'human_compared' : 'agent_read' };
  }
  return { kind: 'ok', text: (human ? VERIFICATION_LABELS.human_compared : VERIFICATION_LABELS.agent_read)(fmtDate(date)), age, method: human ? 'human_compared' : 'agent_read' };
}

// Caveat shown next to fee rows whose scope keeps them out of the gate counts.
export function scopeCaveat(f) {
  if (f.scope === 'network_wide') return "This company's pricing page covers many markets, not only Columbus. Shown as published. It is not counted toward our fee comparison and fee guide thresholds.";
  if (f.scope === 'unconfirmed_mapping') return "Plan labels on the company's page are not confirmed next to these values. Shown as published. It is not counted toward our fee comparison and fee guide thresholds.";
  return null;
}
