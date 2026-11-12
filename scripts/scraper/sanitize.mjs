// Facts-only guard: whatever an adapter returns, only schema-shaped fields survive.
// No prose paragraphs (strings over 200 chars or with markup are dropped), no images,
// no unknown keys. Personal data is out of scope: only business contact fields exist here.
const STR = (v, max = 200) => (typeof v === 'string' && v.length > 0 && v.length <= max && !/[<>]/.test(v) ? v.replace(/\s+/g, ' ').trim() : null);
const NUM = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

function feeValue(v, dropped, where) {
  if (!v || typeof v !== 'object') return null;
  if (!['flat_usd', 'pct_of_monthly_rent', 'pct_of_rent'].includes(v.type)) { dropped.push(`${where}: unknown fee type`); return null; }
  const out = { type: v.type };
  if (['one_time', 'monthly', 'per_unit_monthly', 'annual'].includes(v.period)) out.period = v.period;
  for (const k of ['value', 'min', 'max', 'minimum_usd']) if (NUM(v[k]) !== null) out[k] = v[k];
  const basis = STR(v.basis, 120); if (basis) out.basis = basis;
  if (Array.isArray(v.plans)) {
    const plans = v.plans.map((p) => {
      const o = {};
      const name = STR(p.name, 60); if (name) o.name = name;
      const cond = STR(p.condition, 80); if (cond) o.condition = cond;
      for (const k of ['value', 'min', 'max', 'minimum_usd']) if (NUM(p[k]) !== null) o[k] = p[k];
      return NUM(o.value) !== null || NUM(o.min) !== null || NUM(o.max) !== null ? o : null;
    }).filter(Boolean);
    if (plans.length) out.plans = plans;
  }
  const populated = NUM(out.value) !== null || NUM(out.min) !== null || NUM(out.max) !== null || (out.plans && out.plans.length);
  if (!populated) { dropped.push(`${where}: no numeric value`); return null; }
  return out;
}

export function sanitizeCandidate(raw) {
  const dropped = [];
  const c = raw && raw.company ? raw.company : {};
  const addr = c.address || {};
  const company = {
    name: STR(c.name, 120), website: STR(c.website, 200), phone: STR(c.phone, 30),
    address: { street: STR(addr.street, 120), city: STR(addr.city, 60), state: STR(addr.state, 2), zip: STR(addr.zip, 10) }
  };
  const known = new Set(['name', 'website', 'phone', 'address']);
  for (const k of Object.keys(c)) if (!known.has(k)) dropped.push(`company.${k}: not an allowed field`);
  for (const k of ['name', 'website', 'phone']) if (c[k] != null && company[k] === null) dropped.push(`company.${k}: rejected (too long, empty or contains markup)`);
  const areas = (raw.service_areas || []).map((a) => STR(a, 60)).filter(Boolean);
  const fees = (raw.fees || []).map((f, i) => {
    const row = { property_type: typeof f.property_type === 'string' && /^pt_[a-z0-9_]+$/.test(f.property_type) ? f.property_type : null, source_url: STR(f.source_url, 300) };
    for (const k of ['management_pct', 'flat_fee', 'leasing_fee', 'renewal_fee']) row[k] = feeValue(f[k], dropped, `fees[${i}].${k}`);
    const m = f.minimums;
    row.minimums = m && (NUM(m.monthly_usd) !== null || STR(m.other)) ? { monthly_usd: NUM(m.monthly_usd), other: STR(m.other) } : null;
    for (const k of Object.keys(f)) if (!['property_type', 'source_url', 'management_pct', 'flat_fee', 'leasing_fee', 'renewal_fee', 'minimums'].includes(k)) dropped.push(`fees[${i}].${k}: not an allowed field`);
    return row;
  });
  for (const k of Object.keys(raw || {})) if (!['company', 'service_areas', 'fees'].includes(k)) dropped.push(`${k}: not an allowed field`);
  return { candidate: { company, service_areas: areas, fees }, dropped };
}
