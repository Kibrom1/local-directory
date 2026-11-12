// Registry-driven allowlist. A source may be fetched automatically only if the
// registry (data/sources.json) says so AND its robots/ToS decisions are recorded and recent.
import { daysBetween } from '../lib/validate-data.mjs';

export const AUTOMATED_METHODS = ['scrape', 'api', 'bulk_download'];

export function evaluateSource(source, { today = new Date().toISOString().slice(0, 10), maxCheckAgeDays = 90 } = {}) {
  const reasons = [];
  if (!source) return { allowed: false, reasons: ['source is not in the registry'] };
  if (!source.use_allowed) reasons.push('use_allowed is false');
  if (!source.url) reasons.push('no url recorded');
  if (!AUTOMATED_METHODS.includes(source.access_method)) reasons.push(`access_method ${source.access_method} is not automated`);
  if (!['allowed', 'no_robots_txt'].includes(source.robots_decision)) reasons.push(`robots_decision is ${source.robots_decision}`);
  if (!['allowed', 'silent'].includes(source.tos_decision)) reasons.push(`tos_decision is ${source.tos_decision}`);
  for (const [k, d] of [['robots_txt_checked_date', source.robots_txt_checked_date], ['tos_checked_date', source.tos_checked_date]]) {
    if (!d) reasons.push(`${k} not recorded`);
    else if (daysBetween(d, today) > maxCheckAgeDays) reasons.push(`${k} is ${daysBetween(d, today)} days old (limit ${maxCheckAgeDays})`);
  }
  return { allowed: reasons.length === 0, reasons };
}

export function buildAllowlist(sources, opts) {
  const approved = []; const refused = [];
  for (const s of sources) {
    const r = evaluateSource(s, opts);
    (r.allowed ? approved : refused).push({ source: s, reasons: r.reasons });
  }
  return { approved, refused };
}

export class SourceNotAllowedError extends Error {
  constructor(sourceId, reasons) { super(`source ${sourceId} is not approved for automated access: ${reasons.join('; ')}`); this.name = 'SourceNotAllowedError'; this.reasons = reasons; }
}
export function assertAllowed(source, opts) {
  const r = evaluateSource(source, opts);
  if (!r.allowed) throw new SourceNotAllowedError(source ? source.id : '(unknown)', r.reasons);
  return source;
}
