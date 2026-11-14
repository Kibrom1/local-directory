// Minimal robots.txt parser (RFC 9309 semantics: longest matching rule wins,
// Allow beats Disallow on ties, * and $ wildcards, Crawl-delay read separately).
export function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [], crawlDelay: null }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') {
      if (value === '' && key === 'disallow') continue; // empty Disallow = nothing disallowed
      current.rules.push({ allow: key === 'allow', pattern: value });
    } else if (key === 'crawl-delay') {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelay = n;
    }
  }
  return { groups };
}

// Percent-escapes of unreserved characters are decoded and the rest upper-cased, so /%7Euser and /~user compare equal.
const normEsc = (str) => str.replace(/%[0-9a-f]{2}/gi, (m) => {
  const c = String.fromCharCode(parseInt(m.slice(1), 16));
  return /[A-Za-z0-9\-._~]/.test(c) ? c : m.toUpperCase();
});

const toRegex = (pattern) => {
  const p = normEsc(pattern);
  const anchored = p.endsWith('$');
  const body = (anchored ? p.slice(0, -1) : p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
};

// RFC 9309: the most specific matching user-agent wins, and every group naming that same agent is merged.
function groupFor(parsed, agentToken) {
  const token = agentToken.toLowerCase();
  let bestLen = -1;
  for (const g of parsed.groups) for (const a of g.agents) {
    if (a === '*') bestLen = Math.max(bestLen, 0);
    else if (token.includes(a)) bestLen = Math.max(bestLen, a.length);
  }
  if (bestLen < 0) return null;
  const matching = parsed.groups.filter((g) => g.agents.some((a) => (a === '*' ? bestLen === 0 : token.includes(a) && a.length === bestLen)));
  return { rules: matching.flatMap((g) => g.rules), crawlDelay: matching.map((g) => g.crawlDelay).find((d) => d !== null) ?? null };
}

export function isAllowed(parsed, agentToken, pathAndQuery) {
  const g = groupFor(parsed, agentToken);
  if (!g) return true;
  const target = normEsc(pathAndQuery);
  let verdict = true; let matchLen = -1;
  for (const r of g.rules) {
    if (!toRegex(r.pattern).test(target)) continue;
    const len = r.pattern.length;
    if (len > matchLen || (len === matchLen && r.allow)) { verdict = r.allow; matchLen = len; }
  }
  return verdict;
}

export const crawlDelay = (parsed, agentToken) => { const g = groupFor(parsed, agentToken); return g ? g.crawlDelay : null; };
