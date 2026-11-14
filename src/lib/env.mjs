// Launch configuration read from environment variables (PUBLIC_* values are inlined into the static pages).
// A missing form destination must never ship silently: the build prints a loud warning and strict mode fails.
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
export const PLACEHOLDER_SITE = /\.example(\/|$)/;

export function readLaunchEnv(env = {}) {
  const v = (k) => { const x = env[k]; return typeof x === 'string' && x.trim() ? x.trim() : null; };
  const formAction = v('PUBLIC_FORM_ACTION');
  const contactEmail = v('PUBLIC_CONTACT_EMAIL');
  const operator = v('PUBLIC_OPERATOR_NAME');
  const disclosure = v('PUBLIC_DISCLOSURE');
  const siteUrl = v('SITE_URL');
  const problems = []; // { key, level: 'error' (blocks launch) | 'warn', message }
  if (formAction && !/^https:\/\/[^\s]+$/.test(formAction)) problems.push({ key: 'PUBLIC_FORM_ACTION', level: 'error', message: 'PUBLIC_FORM_ACTION must be an https:// URL (the hosted form endpoint).' });
  if (contactEmail && !EMAIL.test(contactEmail)) problems.push({ key: 'PUBLIC_CONTACT_EMAIL', level: 'error', message: 'PUBLIC_CONTACT_EMAIL is not a valid email address.' });
  const formOk = !!formAction && !problems.some((p) => p.key === 'PUBLIC_FORM_ACTION');
  const emailOk = !!contactEmail && !problems.some((p) => p.key === 'PUBLIC_CONTACT_EMAIL');
  if (!formOk && !emailOk) problems.push({ key: 'PUBLIC_FORM_ACTION / PUBLIC_CONTACT_EMAIL', level: 'error', message: 'Neither a form destination (PUBLIC_FORM_ACTION) nor a contact email (PUBLIC_CONTACT_EMAIL) is set. The Corrections page would have no way to receive requests, so it will say so instead of showing a dead form.' });
  else if (!emailOk) problems.push({ key: 'PUBLIC_CONTACT_EMAIL', level: 'warn', message: 'No visible email fallback (PUBLIC_CONTACT_EMAIL). If the form host is down, visitors have no other way to reach you.' });
  if (!operator) problems.push({ key: 'PUBLIC_OPERATOR_NAME', level: 'error', message: 'The About page must name who operates the site (owner decision). The section is omitted until this is set.' });
  if (!disclosure) problems.push({ key: 'PUBLIC_DISCLOSURE', level: 'error', message: 'The About page must disclose any related business that serves property managers (owner decision, PRD section 8). The section is omitted until this is set.' });
  if (!siteUrl || PLACEHOLDER_SITE.test(siteUrl)) problems.push({ key: 'SITE_URL', level: 'error', message: 'SITE_URL is unset or still the placeholder domain, so canonical URLs, the sitemap and robots.txt point at a domain that is not yours.' });
  return { formAction: formOk ? formAction : null, contactEmail: emailOk ? contactEmail : null, operator, disclosure, siteUrl, gaId: v('PUBLIC_GA_ID'), problems };
}

export function formatProblems(problems) {
  const bar = '='.repeat(78);
  const lines = problems.map((p) => `  [${p.level === 'error' ? 'BLOCKS LAUNCH' : 'warning'}] ${p.key}: ${p.message}`);
  return `\n${bar}\nLAUNCH CONFIGURATION INCOMPLETE\n${bar}\n${lines.join('\n')}\n${bar}\n`;
}

// The public contact address for corrections and privacy questions. It is public on the site anyway, so it lives here and
// PUBLIC_CONTACT_EMAIL only overrides it. Everything in the site and its checks reads launch settings through readSiteEnv.
export const DEFAULT_CONTACT_EMAIL = 'brightstepsdigitalllc@gmail.com';
// Who runs the site (owner confirmed 2026-11-14). PUBLIC_OPERATOR_NAME overrides it.
export const DEFAULT_OPERATOR_NAME = 'Bright Steps Digital LLC';
export const readSiteEnv = (env = {}) => readLaunchEnv({ PUBLIC_CONTACT_EMAIL: DEFAULT_CONTACT_EMAIL, PUBLIC_OPERATOR_NAME: DEFAULT_OPERATOR_NAME, ...env });
