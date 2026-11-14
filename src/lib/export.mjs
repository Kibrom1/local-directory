// Citable download of the published fee rows (CSV and JSON). Built only from rows the quality gate counts: verified, fresh, from an
// allowed source with reviewed terms, Columbus-scoped. One record per published number. No averages, no derived values.
const FEE_FIELDS = ['management_pct', 'flat_fee', 'leasing_fee', 'renewal_fee'];
export const EXPORT_COLUMNS = ['company_id', 'company', 'website', 'property_type', 'fee_type', 'amount_type', 'period', 'value', 'min', 'max', 'minimum_usd', 'basis', 'plan_name', 'plan_condition', 'plan_label_confirmed', 'row_minimum_monthly_usd', 'row_minimum_other', 'source', 'source_urls', 'captured_date', 'last_verified_date', 'verification_method', 'human_verified_date', 'scope'];
const num = (x) => (typeof x === 'number' ? x : null);

export function exportRows(site) {
  const out = [];
  for (const f of site.feeRows) {
    const c = site.data.companies.find((x) => x.id === f.company_id);
    const pt = f.property_type ? site.ptById.get(f.property_type) : null;
    const src = site.sourceById.get(f.source_id);
    const common = {
      company_id: c.id, company: c.name, website: c.website || null, property_type: pt ? pt.name : null,
      row_minimum_monthly_usd: f.minimums ? num(f.minimums.monthly_usd) : null, row_minimum_other: f.minimums ? f.minimums.other || null : null,
      source: src ? src.name : f.source_id, source_urls: f.source_urls.join(' | '), captured_date: f.captured_date, last_verified_date: f.last_verified_date,
      verification_method: f.verification_method || null, human_verified_date: f.human_verified_date || null, scope: f.scope || 'columbus_specific'
    };
    for (const k of FEE_FIELDS) {
      const v = f[k];
      if (!v) continue;
      const base = { ...common, fee_type: k, amount_type: v.type, period: v.period || null, basis: v.basis || null };
      if (num(v.value) !== null || num(v.min) !== null || num(v.max) !== null) out.push({ ...base, value: num(v.value), min: num(v.min), max: num(v.max), minimum_usd: num(v.minimum_usd), plan_name: null, plan_condition: null, plan_label_confirmed: null });
      for (const p of v.plans || []) {
        if (num(p.value) === null && num(p.min) === null && num(p.max) === null) continue;
        out.push({ ...base, value: num(p.value), min: num(p.min), max: num(p.max), minimum_usd: num(p.minimum_usd) ?? num(v.minimum_usd), plan_name: p.name || null, plan_condition: p.condition || null, plan_label_confirmed: typeof p.label_confirmed === 'boolean' ? p.label_confirmed : null });
      }
    }
  }
  return out.sort((a, b) => a.company.localeCompare(b.company) || String(a.property_type).localeCompare(String(b.property_type)) || a.fee_type.localeCompare(b.fee_type));
}

// A leading = + - @ would be run as a formula by spreadsheet apps: prefix an apostrophe.
const cell = (v) => {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows) => [EXPORT_COLUMNS.join(','), ...rows.map((r) => EXPORT_COLUMNS.map((k) => cell(r[k])).join(','))].join('\r\n') + '\r\n';

export function toJson(site, rows) {
  return JSON.stringify({
    title: 'Columbus PM Guide fee data',
    as_of: site.today,
    scope: 'Fees published on the companies\' own websites, for companies we reviewed. Not a survey and not a market average. Ranges and plans are kept as published; nothing is averaged.',
    cite_as: `Columbus PM Guide fee data, as of ${site.today}`,
    columns: EXPORT_COLUMNS,
    row_count: rows.length,
    rows
  }, null, 2) + '\n';
}
