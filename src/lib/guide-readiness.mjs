// What stands between a draft guide and publication. Pure: takes a parsed guide (see guides.mjs) and the set of pages that
// exist, returns blockers (must fix), review items (an editor decides) and facts. It never changes a guide or invents a source.
import { checkGuide } from './guides.mjs';
import { daysBetween } from './freshness.mjs';

// Wording that reads as advice, a guarantee or an unsourced legal claim. A hit is a prompt for an editor, not a verdict.
export const ADVICE_PATTERNS = [
  [/\byou (must|should|need to|have to|ought to)\b/i, 'directive ("you must/should"): describe the process instead'],
  [/\b(guarantee[sd]?|always|never|definitely|certainly)\b/i, 'absolute wording'],
  [/\bwe (recommend|advise|suggest) (you|that you)\b/i, 'recommendation to the reader'],
  [/\b(illegal|unlawful|against the law|legally required|required by law)\b/i, 'legal claim: needs a statute or official page next to it'],
  [/\b(sue|lawsuit|liable|liability|penalt(y|ies))\b/i, 'legal consequence: needs an official source']
];
const LEGAL_TOPIC = /\b(deposit|evict|lease|statute|ORC|tenant rights|notice)\b/i;
const DATA_PAGE = /^\/(fees|fee-guide|city|company|property-types)\//;

const links = (body) => [...body.matchAll(/\]\((\/[^)\s#]*)(?:#[^)]*)?\)/g)].map((m) => m[1]);
const words = (body) => (body.match(/\b[\w'-]+\b/g) || []).length;
const stripCode = (b) => b.replace(/```[\s\S]*?```/g, '');

// ctx: { today, builtPaths:Set, guideSlugs:Set (all guide files), publishedGuideSlugs:Set }
export function guideReadiness(g, ctx) {
  const blockers = []; const review = [];
  const body = stripCode(g.body || '');
  for (const p of checkGuide(g, ctx.today)) if (!/^status must/.test(p)) blockers.push(p);
  if (g.status !== 'published') review.push('status is draft: a person sets status: published when the items below are cleared');

  if (Array.isArray(g.sources) && g.sources.length) {
    const urls = g.sources.map((s) => s && s.url).filter(Boolean);
    if (new Set(urls).size !== urls.length) review.push('the same source URL is listed twice');
    const nonHttps = urls.filter((u) => !/^https:/.test(u));
    if (nonHttps.length) review.push(`${nonHttps.length} source URL(s) are not https`);
    const old = g.sources.filter((s) => s && s.captured && daysBetween(s.captured, ctx.today) > 365);
    if (old.length) review.push(`${old.length} source(s) captured more than 365 days ago: re-read them`);
  }
  if (g.last_verified && daysBetween(g.last_verified, ctx.today) > 180) review.push(`last_verified is ${daysBetween(g.last_verified, ctx.today)} days old (limit 180)`);

  const internal = links(body);
  const dataLinks = internal.filter((p) => DATA_PAGE.test(p));
  if (!dataLinks.length) review.push('links to none of our data pages (/fees/, /fee-guide/, /city/, /company/, /property-types/): a guide should lead into the data');
  for (const p of new Set(internal)) {
    const m = /^\/guides\/([^/]+)\/$/.exec(p);
    if (m) {
      if (!ctx.guideSlugs.has(m[1])) blockers.push(`links to ${p}, which is not a guide in content/guides`);
      else if (!ctx.publishedGuideSlugs.has(m[1])) review.push(`links to draft guide ${p}: publish together or the link is dead`);
    } else if (!ctx.builtPaths.has(p)) {
      blockers.push(`links to ${p}, which is not built under the current gates (it would be a dead link in production)`);
    }
  }

  const adviceHits = [];
  for (const [re, why] of ADVICE_PATTERNS) {
    for (const line of body.split('\n')) { const m = re.exec(line); if (m) adviceHits.push(`"${line.trim().slice(0, 90)}" (${why})`); }
  }
  if (adviceHits.length) review.push(`${adviceHits.length} passage(s) read as advice or an unsourced claim`);

  const paras = body.split(/\n\s*\n/);
  const uncited = paras.filter((p) => /[$][\d,]+|\d+(\.\d+)?\s?%/.test(p) && !/\]\(https?:|\]\(\/|source|according to|published by|per /i.test(p));
  if (uncited.length) review.push(`${uncited.length} paragraph(s) state a dollar or percent figure with no citation or link nearby`);
  if (LEGAL_TOPIC.test(body) && !/not legal advice/i.test(body)) review.push('touches legal topics but does not say it is not legal advice');
  if (words(body) < 300) review.push(`only ${words(body)} words: thin pages are not published`);
  if (!(g.sources || []).some((s) => s && /\.(gov|us)\b|codes\.ohio|ohio\.gov/i.test(s.url || '')) && g.type !== 'fee-guide') review.push('no official (.gov / statute) source: PRD section 10 requires Columbus/Ohio data or a cited official page');

  return { slug: g.slug, file: g.file, status: g.status, blockers, review, advice: adviceHits, words: words(body), sources: (g.sources || []).length, data_links: dataLinks.length, ready: blockers.length === 0 && review.every((r) => /^status is draft/.test(r)) };
}
