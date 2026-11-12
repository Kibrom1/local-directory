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

const toRegex = (pattern) => {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
};

function groupFor(parsed, agentToken) {
  const token = agentToken.toLowerCase();
  let best = null; let bestLen = -1;
  for (const g of parsed.groups) {
    for (const a of g.agents) {
      if (a === '*') { if (bestLen < 0) { best = g; bestLen = 0; } }
      else if (token.includes(a) && a.length > bestLen) { best = g; bestLen = a.length; }
    }
  }
  return best;
}

export function isAllowed(parsed, agentToken, pathAndQuery) {
  const g = groupFor(parsed, agentToken);
  if (!g) return true;
  let verdict = true; let matchLen = -1;
  for (const r of g.rules) {
    if (!toRegex(r.pattern).test(pathAndQuery)) continue;
    const len = r.pattern.length;
    if (len > matchLen || (len === matchLen && r.allow)) { verdict = r.allow; matchLen = len; }
  }
  return verdict;
}

export const crawlDelay = (parsed, agentToken) => { const g = groupFor(parsed, agentToken); return g ? g.crawlDelay : null; };
