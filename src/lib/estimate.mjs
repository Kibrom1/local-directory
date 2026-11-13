// Rent illustration math, shared by the build (default rent, server-rendered) and the browser (live update).
// Not a quote: it applies a company's published management or flat fee to an example rent. Leasing and renewal
// fees are excluded. Ranges stay ranges (low and high ends), never a midpoint. Pure and dependency free.

const num = (x) => typeof x === 'number';
export const EXAMPLE_RENT = 1500;

// Endpoints of a published value: single value, min/max, or every plan. Returns { ends: [number], open }.
function ends(v) {
  const out = []; let open = null;
  const take = (o, minUsd) => {
    if (num(o.value)) out.push([o.value, minUsd]);
    else if (num(o.min) && num(o.max)) { out.push([o.min, minUsd], [o.max, minUsd]); }
    else if (num(o.min)) { out.push([o.min, minUsd]); open = open || 'from'; }
    else if (num(o.max)) { out.push([o.max, minUsd]); open = open || 'upto'; }
  };
  const top = num(v.minimum_usd) ? v.minimum_usd : 0;
  if (num(v.value) || num(v.min) || num(v.max)) take(v, top);
  for (const p of v.plans || []) take(p, num(p.minimum_usd) ? p.minimum_usd : top);
  return { ends: out, open };
}

// Compact description the browser can read from a data attribute: { p: [[pct, minUsd]], f: [usd], o: 'from'|'upto'|null }.
// Returns null when there is nothing to estimate (no management % and no monthly flat fee, or a revenue basis).
export function variantsFor(row, { revenueBasis = false } = {}) {
  if (revenueBasis) return null;
  const out = { p: [], f: [], o: null };
  const m = row.management_pct;
  if (m && m.type === 'pct_of_rent') { const e = ends(m); out.p = e.ends; out.o = out.o || e.open; }
  const f = row.flat_fee;
  if (f && f.type === 'flat_usd' && (f.period === 'monthly' || f.period === 'per_unit_monthly')) { const e = ends(f); out.f = e.ends.map((x) => x[0]); out.o = out.o || e.open; }
  return out.p.length || out.f.length ? out : null;
}

const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const span = (lo, hi, open) => (open === 'from' ? `from ${usd(lo)}` : open === 'upto' ? `up to ${usd(hi)}` : Math.round(lo) === Math.round(hi) ? usd(lo) : `${usd(lo)} to ${usd(hi)}`);

// Returns display text such as "$120 / mo" or "$105 to $150 / mo", or null when rent is not a positive number.
export function estimateText(v, rent) {
  if (!v) return 'Not enough published data';
  if (!(rent > 0)) return 'Enter an example rent';
  const parts = [];
  if (v.p.length) {
    const vals = v.p.map(([pct, min]) => Math.max(rent * pct / 100, min || 0));
    parts.push(`${v.f.length ? 'Management ' : ''}${span(Math.min(...vals), Math.max(...vals), v.o)} / mo`);
  }
  if (v.f.length) parts.push(`${v.p.length ? 'Flat ' : ''}${span(Math.min(...v.f), Math.max(...v.f), v.o)} / mo`);
  return parts.join('; ');
}

// Dollar amount a published fee comes to at an example rent (illustration only). Percent values apply to the rent
// (greater-of floors honored); flat dollars are shown as published. Returns text or null when there is no number.
export function amountAtText(v, rent) {
  if (!v) return null;
  const { ends: e, open } = ends(v);
  if (!e.length) return null;
  const vals = e.map(([n, min]) => (v.type === 'flat_usd' ? n : Math.max(rent * n / 100, min || 0)));
  return span(Math.min(...vals), Math.max(...vals), open);
}
