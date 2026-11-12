// Formatting helpers for fee values (single numbers, ranges, plans) and provenance labels.
const usd = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const pctText = (n) => `${n}%`;
const PERIOD = { one_time: '', monthly: ' per month', per_unit_monthly: ' per unit per month', annual: ' per year' };

function amount(type, n) { return type === 'flat_usd' ? usd(n) : pctText(n); }
function basisText(v) {
  if (v.type === 'pct_of_monthly_rent') return v.basis ? ` of ${v.basis.replace(/^of /, '')}` : ' of one month\'s rent';
  if (v.type === 'pct_of_rent') return v.basis ? ` of rent (${v.basis})` : ' of rent';
  return '';
}
function core(v, o) {
  const num = (x) => typeof x === 'number';
  let s = null;
  if (num(o.value)) s = amount(v.type, o.value);
  else if (num(o.min) && num(o.max)) s = `${amount(v.type, o.min)} to ${amount(v.type, o.max)}`;
  else if (num(o.min)) s = `from ${amount(v.type, o.min)}`;
  else if (num(o.max)) s = `up to ${amount(v.type, o.max)}`;
  if (s && num(o.minimum_usd)) s += ` (minimum ${usd(o.minimum_usd)})`;
  return s;
}
// Returns { text, lines } or null. `lines` has one entry per plan.
export function formatFee(v) {
  if (!v) return null;
  const suffix = v.type === 'flat_usd' ? (PERIOD[v.period] || '') : basisText(v);
  const head = core(v, v);
  const lines = (v.plans || []).map((p) => {
    const t = core(v, p);
    if (!t) return null;
    const label = [p.name, p.condition].filter(Boolean).join(', ');
    return `${label ? `${label}: ` : ''}${t}${p.label_confirmed === false ? ' (plan label inferred)' : ''}`;
  }).filter(Boolean);
  if (!head && !lines.length) return null;
  const text = head ? `${head}${suffix}` : `${lines.join('; ')}${suffix}`;
  return { text, lines: head ? lines : [], notes: v.notes || null };
}
export const feeText = (v) => { const f = formatFee(v); return f ? f.text : null; };

export function monthsAgo(date, today) {
  const d = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
  return Math.max(0, Math.floor(d / 30));
}
export function provenanceLabel(source, captured, verified, today, flagDays = 180) {
  const company = source && source.source_kind === 'company_submission';
  const base = company ? `Provided by the company, ${captured}` : `Source: ${source ? source.name : 'unknown'}, captured ${captured}, last verified ${verified}`;
  const age = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${verified}T00:00:00Z`)) / 86400000);
  return age > flagDays ? `${base} (last verified ${monthsAgo(verified, today)} months ago)` : base;
}
