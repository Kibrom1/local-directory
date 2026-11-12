// Fact freshness: collects every dated fact and summarizes staleness.
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const todayIso = () => process.env.TODAY || new Date().toISOString().slice(0, 10);

export function collectFacts(data) {
  const facts = [];
  const push = (kind, recordId, companyId, label, o) => facts.push({ kind, record_id: recordId, company_id: companyId, label, source_id: o.source_id, last_verified_date: o.last_verified_date, captured_date: o.captured_date });
  for (const c of data.companies) {
    push('company_identity', c.id, c.id, c.name, c);
    if (c.license) push('license', c.id, c.id, `${c.name} license (${c.license.status})`, c.license);
    for (const s of c.services) push('service', c.id, c.id, `${c.name} service ${s.service}`, s);
    for (const p of c.property_types_served) push('property_type', c.id, c.id, `${c.name} property type ${p.property_type_id}`, p);
  }
  const nameOf = new Map(data.companies.map((c) => [c.id, c.name]));
  for (const f of data['fee-schedules']) push('fee_row', f.id, f.company_id, `${nameOf.get(f.company_id) || f.company_id} fees (${f.property_type || 'all types'})`, f);
  for (const a of data['service-areas']) push('service_area', a.id, a.company_id, `${nameOf.get(a.company_id) || a.company_id} area ${a.geography_id}`, a);
  return facts;
}

export function summarizeFreshness(facts, today, f) {
  const aged = facts.map((x) => ({ ...x, age_days: daysBetween(x.last_verified_date, today) }));
  const ages = aged.map((x) => x.age_days).sort((a, b) => a - b);
  const median = ages.length ? (ages.length % 2 ? ages[(ages.length - 1) / 2] : (ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2) : null;
  const over = (n) => aged.filter((x) => x.age_days > n);
  const byKind = {};
  for (const x of over(f.displayFlagDays)) byKind[x.kind] = (byKind[x.kind] || 0) + 1;
  return {
    as_of: today,
    total_facts: aged.length,
    median_age_days: median,
    share_within_180_days: aged.length ? +((aged.length - over(f.displayFlagDays).length) / aged.length).toFixed(3) : null,
    stale_180_count: over(f.displayFlagDays).length,
    stale_365_count: over(f.dropDays).length,
    reverify_queue_150_count: over(f.reverifyQueueDays).length,
    fee_rows_older_than_120_days: aged.filter((x) => x.kind === 'fee_row' && x.age_days > f.feeRowWarnDays).length,
    stale_180_by_kind: byKind,
    aged
  };
}
