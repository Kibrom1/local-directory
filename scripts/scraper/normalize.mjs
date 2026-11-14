// Turns sanitized candidates into a reviewable proposal: a change list with provenance,
// anomaly flags, and proposed copies of the data files. It never writes into data/.
import { validateData, domainOf, normName } from '../lib/validate-data.mjs';
import { matchSuppression } from './suppression.mjs';

const FEE_FIELDS = ['management_pct', 'flat_fee', 'leasing_fee', 'renewal_fee'];
const clone = (x) => JSON.parse(JSON.stringify(x));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const primary = (v) => (!v ? null : typeof v.value === 'number' ? v.value : typeof v.min === 'number' ? v.min : (v.plans || []).find((p) => typeof p.value === 'number')?.value ?? null);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nextNum = (rows, prefix) => rows.reduce((m, r) => { const x = r.id.match(new RegExp(`^${prefix}_(\\d+)$`)); return x ? Math.max(m, +x[1]) : m; }, 0) + 1;

export function proposeChanges({ candidates, data, source, today, schemaDir, expectFullSource = false, anomalyPct = 25 }) {
  const proposed = clone(data);
  const changes = []; const anomalies = []; const rejected = [];
  const geoByName = new Map(data.geography.filter((g) => g.type === 'city').map((g) => [g.name.toLowerCase(), g.id]));
  const prov = (url, captured) => ({ source_id: source.id, source_url: url || source.url, captured_date: captured, last_verified_date: captured });
  const touched = new Set();

  for (const { candidate, url, capturedDate } of candidates) {
    const cand = candidate.company;
    const label = cand.name || url;
    const sup = matchSuppression({ name: cand.name, website: cand.website }, data.suppression);
    if (sup) { rejected.push({ url, name: cand.name, reason: `suppressed (${sup.record.id}, matched by ${sup.by})` }); continue; }
    if (!cand.name) { rejected.push({ url, name: null, reason: 'no company name extracted' }); continue; }

    let co = proposed.companies.find((c) => (cand.website && domainOf(c.website) === domainOf(cand.website)) || normName(c.name) === normName(cand.name));
    if (!co) {
      const id = `co_${String(nextNum(proposed.companies, 'co')).padStart(3, '0')}`;
      let slug = slugify(cand.name); let i = 2;
      while (proposed.companies.some((c) => c.slug === slug)) slug = `${slugify(cand.name)}-${i++}`;
      const addr = cand.address && (cand.address.street || cand.address.city || cand.address.zip) ? { street: cand.address.street, city: cand.address.city, county: null, state: cand.address.state, zip: cand.address.zip } : null;
      co = { id, slug, name: cand.name, legal_name: null, website: cand.website, phone: cand.phone, address: addr, evidence_level: 'own_site_confirmed', tier: 'B', license: null, services: [], property_types_served: [], internal_notes: 'Proposed by the scraper; review tier, county and evidence before merging.', ...prov(url, capturedDate) };
      proposed.companies.push(co);
      changes.push({ op: 'add_company', company_id: id, label, after: { name: co.name, website: co.website, address: co.address, tier: co.tier }, ...prov(url, capturedDate), flagged: true, flag_reason: 'new company: needs human review' });
    } else {
      touched.add(co.id);
      for (const [field, newVal] of [['phone', cand.phone], ['website', cand.website]]) {
        if (newVal === null) continue;
        if (!same(co[field], newVal)) { changes.push({ op: 'modify', file: 'companies', company_id: co.id, label: co.name, field, before: co[field], after: newVal, ...prov(url, capturedDate) }); co[field] = newVal; }
      }
      const a = cand.address;
      if (a && (a.street || a.city || a.zip)) {
        const newAddr = { street: a.street, city: a.city, county: co.address ? co.address.county : null, state: a.state, zip: a.zip };
        if (!same(co.address, newAddr)) { changes.push({ op: 'modify', file: 'companies', company_id: co.id, label: co.name, field: 'address', before: co.address, after: newAddr, ...prov(url, capturedDate) }); co.address = newAddr; }
      }
    }

    // service areas (only add; a missing area is flagged, never removed)
    const seen = new Set();
    for (const name of candidate.service_areas) {
      const gid = geoByName.get(name.toLowerCase());
      if (!gid) { anomalies.push({ kind: 'unknown_area', company_id: co.id, detail: `area "${name}" is not in geography.json` }); continue; }
      seen.add(gid);
      if (!proposed['service-areas'].some((s) => s.company_id === co.id && s.geography_id === gid)) {
        const row = { id: `sa_${co.id}_${gid.replace(/^geo_/, '')}`, company_id: co.id, geography_id: gid, ...prov(url, capturedDate), note: null };
        proposed['service-areas'].push(row);
        changes.push({ op: 'add_service_area', file: 'service-areas', company_id: co.id, label: co.name, after: gid, ...prov(url, capturedDate) });
      } else if (touched.has(co.id)) {
        const row = proposed['service-areas'].find((s) => s.company_id === co.id && s.geography_id === gid && s.source_id === source.id);
        if (row && row.last_verified_date !== capturedDate) { changes.push({ op: 'reverify', file: 'service-areas', company_id: co.id, label: co.name, field: `area ${gid}`, before: row.last_verified_date, after: capturedDate, ...prov(url, capturedDate) }); row.last_verified_date = capturedDate; }
      }
    }
    if (candidate.service_areas.length) for (const s of proposed['service-areas'].filter((x) => x.company_id === co.id && x.source_id === source.id && !seen.has(x.geography_id))) anomalies.push({ kind: 'area_missing', company_id: co.id, detail: `${s.geography_id} was recorded from this source but is not on the page now` });

    // fees
    for (const f of candidate.fees) {
      let row = proposed['fee-schedules'].find((r) => r.company_id === co.id && r.property_type === f.property_type);
      if (!row) {
        row = { id: `fee_${co.id}_${f.property_type ? f.property_type.replace(/^pt_/, '') : 'all'}`, company_id: co.id, property_type: f.property_type, management_pct: null, flat_fee: null, leasing_fee: null, renewal_fee: null, minimums: null, other_fees: [], verification_status: 'unverified', notes: null, source_id: source.id, source_urls: [f.source_url || url], captured_date: capturedDate, last_verified_date: capturedDate };
        for (const k of FEE_FIELDS) row[k] = f[k];
        row.minimums = f.minimums;
        proposed['fee-schedules'].push(row);
        changes.push({ op: 'add_fee_row', file: 'fee-schedules', company_id: co.id, label: co.name, after: Object.fromEntries(FEE_FIELDS.map((k) => [k, f[k]])), ...prov(url, capturedDate), flagged: true, flag_reason: 'new fee row: set verification_status only after a human compares it with the page' });
        continue;
      }
      // A row owned by another source (a company submission, an official page) or already reviewed is never overwritten
      // by scraped values: report the difference and leave the row for a human.
      const ownedElsewhere = row.source_id !== source.id && row.verification_status !== 'unverified';
      if (ownedElsewhere) {
        const differs = FEE_FIELDS.filter((k) => f[k] !== null && !same(row[k], f[k]));
        if (differs.length) anomalies.push({ kind: 'source_conflict', company_id: co.id, detail: `${row.id}: scraped ${differs.join(', ')} differs from the ${row.verification_status} row from ${row.source_id}; NOT changed in the proposal, review manually` });
        continue;
      }
      const statusBefore = row.verification_status;
      let changedAny = false;
      for (const k of FEE_FIELDS) {
        const before = row[k]; const after = f[k];
        if (after === null && before !== null) {
          anomalies.push({ kind: 'value_to_null', company_id: co.id, detail: `${k} was ${JSON.stringify(before)} and is no longer on the page; NOT changed in the proposal, review manually` });
          continue;
        }
        if (after !== null && !same(before, after)) {
          const pb = primary(before); const pa = primary(after);
          const pct = pb && pa ? Math.abs(pa - pb) / pb * 100 : null;
          const flagged = pct !== null && pct > anomalyPct;
          if (flagged) anomalies.push({ kind: 'fee_change_over_limit', company_id: co.id, detail: `${k} changed ${pct.toFixed(0)}% (${pb} to ${pa}); limit ${anomalyPct}%` });
          changes.push({ op: 'modify', file: 'fee-schedules', company_id: co.id, label: co.name, field: `${row.id}.${k}`, before, after, ...prov(url, capturedDate), flagged, flag_reason: flagged ? `change over ${anomalyPct}%` : undefined });
          row[k] = after; changedAny = true;
        }
      }
      if (changedAny) {
        row.verification_status = 'unverified'; row.source_id = source.id; row.source_urls = [f.source_url || url]; row.captured_date = capturedDate; row.last_verified_date = capturedDate;
        if (statusBefore !== 'unverified') changes.push({ op: 'unverify', file: 'fee-schedules', company_id: co.id, label: co.name, field: `${row.id}.verification_status`, before: statusBefore, after: 'unverified', ...prov(url, capturedDate), flagged: true, flag_reason: 'scraped changes are never auto-verified' });
      } else if (row.source_id === source.id && row.last_verified_date !== capturedDate) {
        changes.push({ op: 'reverify', file: 'fee-schedules', company_id: co.id, label: co.name, field: `${row.id}.last_verified_date`, before: row.last_verified_date, after: capturedDate, ...prov(url, capturedDate) });
        row.last_verified_date = capturedDate;
      }
    }
  }

  if (expectFullSource) {
    const matched = new Set(changes.map((c) => c.company_id)); for (const id of touched) matched.add(id);
    for (const c of data.companies) if (c.source_id === source.id && !matched.has(c.id)) anomalies.push({ kind: 'company_disappeared', company_id: c.id, detail: `${c.name} was recorded from this source and was not found in this run` });
  }

  const validation = validateData(proposed, { schemaDir, today });
  const changedFiles = new Set();
  for (const c of changes) changedFiles.add(c.op === 'add_company' ? 'companies' : c.file);
  if (changes.some((c) => c.op === 'add_fee_row' || c.op === 'unverify')) changedFiles.add('fee-schedules');
  return { changes, anomalies, rejected, proposed, changedFiles: [...changedFiles], validation, flagged: changes.filter((c) => c.flagged).length + anomalies.length };
}

// Minutes a person needs per item type (rough, from the runbook procedure: open the source page, compare, decide).
const MINUTES = { validation: 10, anomaly: 6, flagged: 4, add_company: 12, add_fee_row: 8, modify: 3, add_service_area: 3, reverify: 0.5, unverify: 0 };
// Prioritized checklist: blockers first, then the things most likely to be wrong, then the routine ones. Never skip a flagged item.
export function reviewChecklist(result) {
  const out = ['## Review checklist (do in this order)', ''];
  const items = [];
  const add = (priority, text, minutes) => items.push({ priority, text, minutes });
  for (const e of result.validation.errors) add(1, `Validation error (blocks merge): ${e}`, MINUTES.validation);
  for (const a of result.anomalies) add(2, `Anomaly ${a.kind} ${a.company_id}: ${a.detail}`, MINUTES.anomaly);
  for (const c of result.changes.filter((x) => x.flagged && x.op !== 'unverify')) add(3, `Flagged ${c.op} ${c.label || ''} (${c.company_id})${c.flag_reason ? `: ${c.flag_reason}` : ''}`, c.op === 'add_company' ? MINUTES.add_company : c.op === 'add_fee_row' ? MINUTES.add_fee_row : MINUTES.flagged);
  for (const c of result.changes.filter((x) => !x.flagged && ['modify', 'add_service_area'].includes(x.op))) add(4, `${c.op} ${c.label || ''} ${c.field || c.after || ''} (compare with the source page)`, MINUTES[c.op]);
  const reverify = result.changes.filter((x) => x.op === 'reverify').length;
  if (reverify) add(5, `${reverify} re-verify date bump(s): spot-check 3, then accept as a batch`, Math.max(2, Math.min(10, reverify * MINUTES.reverify)));
  if (!items.length) out.push('_Nothing to review._', '');
  items.sort((a, b) => a.priority - b.priority);
  let n = 1;
  for (const i of items) out.push(`${n++}. [ ] (~${Math.round(i.minutes)} min) ${i.text}`);
  const total = Math.round(items.reduce((t, i) => t + i.minutes, 0));
  out.push('', `Estimated review time: about ${total} minute${total === 1 ? '' : 's'}. New fee rows stay \`unverified\` until a person compares them with the page (set verification_method human_compared, verified_by and human_verified_date).`, '', '**Sign-off:** after reviewing, record it with `node scripts/scraper/review.mjs --run <this run folder> --by <your handle> --decision accepted|partially_accepted|rejected`. Until then this run shows up in `npm run queue`.', '');
  return out;
}

export function renderDiffReport({ source, runAt, result, pageChanges = [], health = null }) {
  const L = [];
  L.push(`# Scraper proposal: ${source.id}`, '', `Run at ${runAt}. Source: ${source.name} (${source.url}). **Proposal only: nothing in data/ was changed.** Review each item, then copy the proposed files you accept into data/, run \`npm run validate\`, and commit.`, '');
  L.push(`- Changes proposed: ${result.changes.length} (${result.changes.filter((c) => c.flagged).length} flagged)`, `- Anomalies: ${result.anomalies.length}`, `- Candidates rejected: ${result.rejected.length}`, `- Proposed data validates: ${result.validation.errors.length === 0 ? 'yes' : `NO (${result.validation.errors.length} errors, blocks merge)`}`, '');
  if (result.validation.errors.length) { L.push('## Validation errors (blocks merge)', ...result.validation.errors.map((e) => `- ${e}`), ''); }
  if (result.anomalies.length) { L.push('## Anomalies (explicit review required)', ...result.anomalies.map((a) => `- **${a.kind}** ${a.company_id}: ${a.detail}`), ''); }
  if (result.rejected.length) { L.push('## Rejected candidates', ...result.rejected.map((r) => `- ${r.name || r.url}: ${r.reason}`), ''); }
  L.push(...reviewChecklist(result));
  L.push('## Changes');
  if (!result.changes.length) L.push('_None._');
  for (const c of result.changes) {
    L.push(`- ${c.flagged ? '**[FLAGGED]** ' : ''}\`${c.op}\` ${c.label || ''} (${c.company_id})${c.field ? ` ${c.field}` : ''}${c.flag_reason ? ` (${c.flag_reason})` : ''}`);
    if (c.before !== undefined) L.push(`  - before: \`${JSON.stringify(c.before)}\``);
    if (c.after !== undefined) L.push(`  - after: \`${JSON.stringify(c.after)}\``);
    L.push(`  - provenance: ${c.source_id}, ${c.source_url}, captured ${c.captured_date}`);
  }
  if (pageChanges.length) { L.push('', '## Page change detection', ...pageChanges.map((p) => `- ${p.status}: ${p.url}${p.previous_fetched_at ? ` (previous ${p.previous_fetched_at})` : ''}`)); }
  if (health) L.push('', '## Run health', `- URLs ${health.urls_ok}/${health.urls_attempted} ok, parse failures ${health.parse_failures}, robots blocked ${health.robots_blocked}, suppression rejections ${health.suppression_rejections}${health.paused ? `, PAUSED: ${health.pause_reason}` : ''}`);
  return L.join('\n') + '\n';
}
