// Builds the rows for fee tables (comparison page, property-type pages) from gate output. Pure.
import { rankPages } from './gate.mjs';
import { variantsFor } from './estimate.mjs';
import { feeBadge, scopeCaveat, minimumsText } from './fees.mjs';

// rows: fee-schedule rows already filtered by the gate (verified, fresh, allowed source). Default order is the ranking
// rule (completeness, then name), never price. One row per company per property type.
export function buildFeeRows(site, rows, { revenueBasis = () => false } = {}) {
  const order = new Map(rankPages(site.companyPages).map((p, i) => [p.id, i]));
  const pageById = new Map(site.companyPages.map((p) => [p.id, p]));
  const out = [];
  for (const f of rows) {
    const page = pageById.get(f.company_id);
    if (!page || page.tier === 'placeholder') continue;
    const pt = f.property_type ? site.ptById.get(f.property_type) : null;
    out.push({
      key: f.id, fee: f, company: page.company, path: page.tier === 'indexable' || page.tier === 'listed' ? page.path : null,
      ptName: pt ? pt.name : null, est: variantsFor(f, { revenueBasis: revenueBasis(f) }), revenue: revenueBasis(f),
      badge: feeBadge(f, site.today, site.quality.freshness.displayFlagDays), caveat: scopeCaveat(f),
      minimums: minimumsText(f.minimums), order: order.get(f.company_id) ?? 999
    });
  }
  return out.sort((a, b) => (a.order - b.order) || String(a.ptName).localeCompare(String(b.ptName)));
}

// Range summary for a fee guide: for each way companies state the fee (percent of rent, percent of one month's rent,
// flat dollars by period) the number of companies and the lowest and highest published figure. Never a mean or median.
const LABEL = { pct_of_rent: 'a percent of rent', pct_of_monthly_rent: "a percent of one month's rent", flat_usd: 'flat dollars' };
export function rangeSummary(rows, key) {
  const groups = new Map();
  for (const r of rows) {
    const v = r.fee[key];
    if (!v) continue;
    const nums = [v.value, v.min, v.max, ...(v.plans || []).flatMap((p) => [p.value, p.min, p.max])].filter((x) => typeof x === 'number');
    if (!nums.length) continue;
    const g = `${v.type}${v.type === 'flat_usd' && v.period ? `:${v.period}` : ''}`;
    const cur = groups.get(g) || { type: v.type, period: v.period, companies: new Set(), lo: Infinity, hi: -Infinity };
    cur.companies.add(r.company.id);
    cur.lo = Math.min(cur.lo, ...nums); cur.hi = Math.max(cur.hi, ...nums);
    groups.set(g, cur);
  }
  const money = (n) => `$${n.toLocaleString('en-US')}`;
  return [...groups.values()].map((g) => {
    const f = g.type === 'flat_usd' ? money : (n) => `${n}%`;
    const per = g.type === 'flat_usd' && g.period && g.period !== 'one_time' ? ` ${g.period === 'monthly' ? 'per month' : g.period === 'per_unit_monthly' ? 'per unit per month' : 'per year'}` : '';
    return { label: LABEL[g.type], companies: g.companies.size, text: g.lo === g.hi ? `${f(g.lo)}${per}` : `from ${f(g.lo)} to ${f(g.hi)}${per}` };
  });
}
