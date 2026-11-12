// Suppression-list checks for the scraper: removed data is never re-scraped or re-added.
import { domainOf, normName } from '../lib/validate-data.mjs';

const cleanDomain = (d) => (d || '').toLowerCase().replace(/^www\./, '');

// Returns the matching suppression record or null. Match types: company id, website domain, normalized name.
export function matchSuppression({ id = null, website = null, name = null } = {}, suppression) {
  const dom = website ? domainOf(website) : null;
  for (const s of suppression) {
    if (s.company_id && id && s.company_id === id) return { record: s, by: 'company_id' };
    if (s.domain && dom && (dom === cleanDomain(s.domain) || dom.endsWith(`.${cleanDomain(s.domain)}`))) return { record: s, by: 'domain' };
    if (s.name && name && normName(s.name) === normName(name)) return { record: s, by: 'name' };
  }
  return null;
}

// Blocks fetching any URL on a suppressed domain.
export function urlSuppressed(url, suppression) {
  const dom = domainOf(url);
  if (!dom) return null;
  for (const s of suppression) if (s.domain && (dom === cleanDomain(s.domain) || dom.endsWith(`.${cleanDomain(s.domain)}`))) return { record: s, by: 'domain' };
  return null;
}
