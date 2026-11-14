// Verifies colour contrast numerically from docs/ux/design-tokens.json and that src/styles/site.css uses the same values.
// WCAG 2.x relative luminance. Text needs 4.5:1, UI boundaries and focus rings 3:1. Exit 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'docs/ux/design-tokens.json'), 'utf8')).color;
const css = fs.readFileSync(path.join(root, 'src/styles/site.css'), 'utf8');
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const T = (k, f = 'value') => tokens[k][f];
const W = '#ffffff';
// [label, foreground, background, needed]
const pairs = [
  ['Body text', T('ink'), T('bg'), 4.5], ['Body text on panel', T('ink'), T('surface'), 4.5],
  ['Muted text', T('muted'), T('bg'), 4.5], ['Muted on panel', T('muted'), T('surface'), 4.5], ['Muted on unknown chip', T('muted'), T('unknown', 'bg'), 4.5],
  ['Link', T('primary'), T('bg'), 4.5], ['Link on panel', T('primary'), T('surface'), 4.5], ['Link on info banner', T('primary'), T('info', 'bg'), 4.5],
  ['Primary button text', W, T('primary'), 4.5], ['Button hover text', W, '#0a3a5a', 4.5], ['Secondary button hover (link on info bg)', T('primary'), T('info', 'bg'), 4.5],
  ['Input/card border', T('ui'), T('bg'), 3], ['Input border on panel', T('ui'), T('surface'), 3], ['Focus ring', T('focus'), T('bg'), 3], ['Focus ring on panel', T('focus'), T('surface'), 3],
  ['Warning text', T('warn', 'ink'), T('warn', 'bg'), 4.5], ['Warning border', T('warn', 'line'), T('bg'), 3],
  ['Error text on error bg', T('danger', 'ink'), T('danger', 'bg'), 4.5], ['Error text on white', T('danger', 'ink'), T('bg'), 4.5],
  ['Verified badge', T('success', 'ink'), T('success', 'bg'), 4.5], ['Verified badge border', T('success', 'ink'), T('bg'), 3],
  ['Info banner', T('info', 'ink'), T('info', 'bg'), 4.5], ['Neutral badge', T('neutralBadge', 'ink'), T('neutralBadge', 'bg'), 4.5], ['Neutral badge border', T('ui'), T('neutralBadge', 'bg'), 3],
  ['"Not published" chip', T('unknown', 'ink'), T('unknown', 'bg'), 4.5], ['Disabled button text', T('muted'), T('unknown', 'bg'), 4.5],
  ['Footer text', T('footer', 'ink'), T('footer', 'bg'), 4.5], ['Footer link and focus ring', T('footer', 'link'), T('footer', 'bg'), 4.5]
];
let fail = 0;
console.log(`${'pair'.padEnd(44)} ${'fg'.padEnd(8)} ${'bg'.padEnd(8)} ratio  need`);
for (const [l, f, b, need] of pairs) {
  const r = ratio(f, b); const ok = r >= need; if (!ok) fail++;
  console.log(`${l.padEnd(44)} ${f} ${b} ${r.toFixed(2).padStart(5)}  ${need}  ${ok ? 'pass' : 'FAIL'}`);
}
// Claimed ratios in the tokens file must match the computed ones (to 0.02).
const claims = [['ink', '#ffffff', 'on bg #ffffff'], ['muted', '#ffffff', 'on bg'], ['primary', '#ffffff', 'on bg'], ['focus', '#ffffff', 'on bg']];
for (const [k, bg, key] of claims) { const c = tokens[k].contrast[key]; const r = ratio(tokens[k].value, bg); if (Math.abs(c - r) > 0.02) { fail++; console.log(`token claim mismatch: ${k} ${key} says ${c}, computed ${r.toFixed(2)}`); } }
// CSS custom properties must equal the tokens.
const css2tok = { ink: T('ink'), muted: T('muted'), bg: T('bg'), surface: T('surface'), line: T('line'), ui: T('ui'), primary: T('primary'), focus: T('focus'), 'warn-bg': T('warn', 'bg'), 'warn-ink': T('warn', 'ink'), 'warn-line': T('warn', 'line'), 'ok-bg': T('success', 'bg'), 'ok-ink': T('success', 'ink'), 'bad-bg': T('danger', 'bg'), 'bad-ink': T('danger', 'ink'), 'info-bg': T('info', 'bg'), 'info-ink': T('info', 'ink'), 'unk-bg': T('unknown', 'bg'), 'foot-bg': T('footer', 'bg'), 'foot-ink': T('footer', 'ink') };
for (const [v, hex] of Object.entries(css2tok)) { const m = css.match(new RegExp(`--${v}:(#[0-9a-fA-F]{6})`)); if (!m || m[1].toLowerCase() !== hex.toLowerCase()) { fail++; console.log(`CSS --${v} is ${m ? m[1] : 'missing'}, token says ${hex}`); } }
// Dark theme: values come from the @media (prefers-color-scheme:dark) block in the CSS itself.
const darkBlock = (css.match(/@media \(prefers-color-scheme:dark\)\{\s*:root\{([^}]*)\}/) || [])[1];
if (!darkBlock) { fail++; console.log('CSS has no dark theme block'); }
else {
  const D = Object.fromEntries([...darkBlock.matchAll(/--([a-z-]+):(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
  const need = ['ink', 'muted', 'bg', 'surface', 'ui', 'primary', 'focus', 'warn-bg', 'warn-ink', 'warn-line', 'ok-bg', 'ok-ink', 'bad-bg', 'bad-ink', 'info-bg', 'info-ink', 'unk-bg', 'foot-bg', 'foot-ink', 'foot-link', 'on-primary', 'primary-press'];
  for (const k of need) if (!D[k]) { fail++; console.log(`dark theme is missing --${k}`); }
  if (need.every((k) => D[k])) {
    const dp = [
      ['Body text', D.ink, D.bg, 4.5], ['Body text on panel', D.ink, D.surface, 4.5], ['Muted text', D.muted, D.bg, 4.5], ['Muted on panel', D.muted, D.surface, 4.5], ['Muted on unknown chip', D.muted, D['unk-bg'], 4.5],
      ['Link', D.primary, D.bg, 4.5], ['Link on panel', D.primary, D.surface, 4.5], ['Link on info banner', D.primary, D['info-bg'], 4.5],
      ['Primary button text', D['on-primary'], D.primary, 4.5], ['Button hover text', D['on-primary'], D['primary-press'], 4.5],
      ['Input/card border', D.ui, D.bg, 3], ['Input border on panel', D.ui, D.surface, 3], ['Focus ring', D.focus, D.bg, 3], ['Focus ring on panel', D.focus, D.surface, 3],
      ['Warning text', D['warn-ink'], D['warn-bg'], 4.5], ['Warning border', D['warn-line'], D.bg, 3], ['Error text on error bg', D['bad-ink'], D['bad-bg'], 4.5], ['Error text', D['bad-ink'], D.bg, 4.5],
      ['Verified badge', D['ok-ink'], D['ok-bg'], 4.5], ['Verified badge border', D['ok-ink'], D.bg, 3], ['Info banner', D['info-ink'], D['info-bg'], 4.5],
      ['Neutral badge', D.muted, D['unk-bg'], 4.5], ['Neutral badge border', D.ui, D['unk-bg'], 3], ['Unknown chip', D.muted, D['unk-bg'], 4.5],
      ['Footer text', D['foot-ink'], D['foot-bg'], 4.5], ['Footer link and focus ring', D['foot-link'], D['foot-bg'], 4.5]
    ];
    console.log('\nDark theme');
    for (const [l, f, b, n] of dp) { const r = ratio(f, b); const ok = r >= n; if (!ok) fail++; console.log(`${l.padEnd(44)} ${f} ${b} ${r.toFixed(2).padStart(5)}  ${n}  ${ok ? 'pass' : 'FAIL'}`); }
    pairs.push(...dp);
  }
}
// Any hex colour in the CSS outside the custom properties must be one of the tokens (or white/hover).
const known = new Set([...Object.values(css2tok), '#ffffff', '#fff', '#0a3a5a'].map((x) => x.toLowerCase()));
for (const m of css.replace(/--[a-z-]+:#[0-9a-fA-F]{3,6}/g, '').matchAll(/#[0-9a-fA-F]{3,6}\b/g)) if (!known.has(m[0].toLowerCase())) { fail++; console.log(`CSS uses colour ${m[0]} that is not a design token`); }
console.log(fail ? `\ncontrast FAILED (${fail})` : `\ncontrast passed: ${pairs.length} pairs, CSS matches tokens`);
process.exit(fail ? 1 : 0);
