// First-year cost illustration (PM decision): built ONLY from the figures a company publishes, at an example rent.
// - A range from the lowest to the highest published combination. Never a midpoint, an average or a "typical" figure.
// - Components that are not published are NAMED, never counted as zero. A fee published only as "from X" or "up to Y" is
//   not used (an open end cannot give a range) and is named too.
// - It needs a published ongoing fee (management percent or monthly flat fee). Without one there is no first-year figure.
// - Assumes one unit, rent collected every month, and one lease renewal. It is an illustration, not a quote.
// Pure and dependency free: the build and the browser use the same code (a descriptor is stored in a data attribute).

const num = (x) => typeof x === 'number';
const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

// Closed endpoints of a published value: [[number, minimum_usd]], or null when any part is open-ended or the value is empty.
function closedEnds(v) {
  if (!v) return null;
  const out = []; let open = false;
  const top = num(v.minimum_usd) ? v.minimum_usd : 0;
  const take = (o, floor) => {
    if (num(o.value)) out.push([o.value, floor]);
    else if (num(o.min) && num(o.max)) out.push([o.min, floor], [o.max, floor]);
    else if (num(o.min) || num(o.max)) open = true;
  };
  if (num(v.value) || num(v.min) || num(v.max)) take(v, top);
  for (const p of v.plans || []) take(p, num(p.minimum_usd) ? p.minimum_usd : top);
  return open || !out.length ? null : out;
}

// Descriptor the browser can recompute at any rent. Returns null when no first-year figure can be built.
export function yearDescriptor(row, { revenueBasis = false } = {}) {
  if (!row || revenueBasis) return null;
  const miss = [];
  const m = row.management_pct && row.management_pct.type === 'pct_of_rent' ? closedEnds(row.management_pct) : null;
  const flat = row.flat_fee && row.flat_fee.type === 'flat_usd' && ['monthly', 'per_unit_monthly', 'annual'].includes(row.flat_fee.period) ? closedEnds(row.flat_fee) : null;
  const f = flat ? flat.map(([v]) => (row.flat_fee.period === 'annual' ? v / 12 : v)) : [];
  if (!m && !f.length) return null;
  const oneTime = (v, label) => {
    const e = closedEnds(v);
    if (!e) { miss.push(label); return []; }
    if (v.type === 'pct_of_monthly_rent') return e.map(([n, min]) => ['p', n, min]);
    if (v.type === 'flat_usd') return e.map(([n]) => ['u', n, 0]);
    miss.push(label); return [];
  };
  const l = oneTime(row.leasing_fee, 'leasing fee');
  const r = oneTime(row.renewal_fee, 'renewal fee');
  return { m: m || [], f, l, r, miss };
}

// { low, high } in dollars at the given monthly rent, or null for a missing descriptor or a rent that is not positive.
export function yearRange(d, rent) {
  if (!d || !(rent > 0)) return null;
  const ongoing = [...d.m.map(([p, min]) => Math.max(rent * p / 100, min || 0) * 12), ...d.f.map((x) => x * 12)];
  const once = (arr) => arr.map(([k, v, min]) => (k === 'p' ? Math.max(rent * v / 100, min || 0) : v));
  const parts = [ongoing, once(d.l), once(d.r)].filter((a) => a.length);
  return { low: parts.reduce((s, a) => s + Math.min(...a), 0), high: parts.reduce((s, a) => s + Math.max(...a), 0) };
}

export function yearText(d, rent) {
  if (!d) return 'Not enough published data';
  if (!(rent > 0)) return 'Enter an example rent';
  const { low, high } = yearRange(d, rent);
  return Math.round(low) === Math.round(high) ? `${usd(low)} in year one` : `${usd(low)} to ${usd(high)} in year one`;
}

// What the figure includes and what it leaves out, in words. Independent of the rent.
export function yearNotes(d) {
  if (!d) return null;
  const inc = [d.m.length ? 'management fee' : 'monthly flat fee', ...(d.l.length ? ['leasing fee'] : []), ...(d.r.length ? ['one renewal fee'] : [])];
  const base = `Includes: ${inc.join(', ')}.`;
  return d.miss.length ? `${base} Not published, so not included: ${d.miss.join(', ')}.` : base;
}
