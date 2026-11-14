# Accessibility checklist (WCAG 2.2 AA)

Working brand: Columbus PM Guide. Target: WCAG 2.2 level AA on every template. Prototype: `docs/ux/prototype/`. Run each check before a template ships; record pass/fail in the PR.

## 1. Contrast pairs (computed, WCAG relative-luminance formula)
Text needs 4.5:1 (large text 3:1). UI boundaries and focus indicators need 3:1. Values computed with a script (python, same formula as WCAG 2.x), not estimated.

| Use | Foreground | Background | Ratio | Needs | Pass |
|---|---|---|---|---|---|
| Body text | #1a1a1a | #ffffff | 17.40 | 4.5 | yes |
| Body text on panel | #1a1a1a | #f4f6f8 | 16.07 | 4.5 | yes |
| Muted text, source notes | #4a4f57 | #ffffff | 8.24 | 4.5 | yes |
| Muted text on panel | #4a4f57 | #f4f6f8 | 7.61 | 4.5 | yes |
| Links, primary | #0b4a8f | #ffffff | 8.79 | 4.5 | yes |
| Links on panel | #0b4a8f | #f4f6f8 | 8.11 | 4.5 | yes |
| Primary button text | #ffffff | #0b4a8f | 8.79 | 4.5 | yes |
| Input/card border | #6b7280 | #ffffff | 4.83 | 3 | yes |
| Focus ring | #0b3d91 | #ffffff | 10.04 | 3 | yes |
| Focus ring on panel | #0b3d91 | #f4f6f8 | 9.27 | 3 | yes |
| Freshness warning text | #5a3b00 | #fff4d6 | 9.30 | 4.5 | yes |
| Freshness warning border | #8a5a00 | #ffffff | 5.93 | 3 | yes |
| Error text on error bg | #9b1c10 | #fdecea | 7.15 | 4.5 | yes |
| Error text on white | #9b1c10 | #ffffff | 8.18 | 4.5 | yes |
| Verified badge text | #0f5c35 | #e6f4ec | 7.11 | 4.5 | yes |
| Verified badge border | #0f5c35 | #ffffff | 8.07 | 3 | yes |
| Info banner text | #0b3a6b | #e8f1fb | 10.05 | 4.5 | yes |
| "Not published" chip | #4a4f57 | #eef0f3 | 7.22 | 4.5 | yes |
| Footer text | #e8ebef | #1f2933 | 12.34 | 4.5 | yes |
| Footer link and footer focus ring (white) | #ffffff | #1f2933 | 14.76 | 4.5 / 3 | yes |
| Default focus ring on dark footer (rejected) | #0b3d91 | #1f2933 | 1.47 | 3 | no, so footer and SAMPLE bar use a white outline |
| Prototype SAMPLE bar | #ffffff | #3b1d6e | 13.23 | 4.5 | yes |

Rule: no information by color alone. Verified/stale/unverified badges carry words; "Not published" is text; errors have text and an icon-free bold label; ranges are tagged "range".

## 2. Site-wide (every template)
- [ ] `lang="en"` on html; one `h1`; headings descend without skipping (1.3.1, 2.4.6).
- [ ] Skip link is the first focusable element and visible on focus (2.4.1).
- [ ] Landmarks: header, nav (labelled "Main"), main, footer; breadcrumbs are `nav aria-label="Breadcrumb"` with `aria-current="page"` on the last item.
- [ ] Unique, descriptive `<title>` per page; link text makes sense out of context (no bare "click here"/"read more") (2.4.4).
- [ ] Focus indicator visible, not clipped, 3:1, outline 3px with 2px offset (2.4.7, 2.4.11 Focus Not Obscured: no sticky header taller than 4rem; none in the design, nothing is sticky except the table first column, which is not over focusable content).
- [ ] Targets at least 44x44 CSS px for buttons, nav links, form controls, checkboxes' labels (2.5.8 min 24px is exceeded). Inline text links in prose are exempt.
- [ ] Layout reflows at 320 CSS px wide with no two-direction scrolling, except the fee table region, which scrolls horizontally inside a labelled region only at md+ widths and becomes cards on mobile (1.4.10).
- [ ] Zoom to 200% and text spacing overrides without loss (1.4.4, 1.4.12): no fixed heights on text containers.
- [ ] Mobile menu: button has `aria-expanded` and `aria-controls`; works with keyboard (Enter/Space); closes on second activation; without JS the nav list is visible (progressive enhancement).
- [ ] `prefers-reduced-motion` honored; nothing moves automatically (2.2.2).
- [ ] No content on hover only; no keyboard trap (1.4.13, 2.1.2).
- [ ] Consistent navigation order and help location (the "Correct or remove a listing" link is in the same footer position on every page) (3.2.3, 3.2.6).
- [ ] Outbound links to company sites open in the same tab with `rel="nofollow noopener"`; no "new window" surprises.

## 3. Per template
**Home.** [ ] Search form: both selects have visible `label`; submit button text "Show companies". [ ] City list is a real `ul` of links. [ ] Pagefind search input (live site) has a visible label and results announce count via `role="status"`.

**City/suburb results.** [ ] Filter form labelled via `aria-label`; each control has a visible label. [ ] Result count is `role="status" aria-live="polite"` and updates after filtering (4.1.3). [ ] Each result card is a list item with the company name as the link; badges are text. [ ] Zero-result state is a heading plus text, focus is not moved. [ ] Cards usable with no JS (filters hidden or simply no-ops; list still complete).

**Company profile.** [ ] "On this page" links are in-page anchors that exist. [ ] Fee table uses `caption`, `th scope="col"`, `th scope="row"` (1.3.1). [ ] Source notes are visible text, not tooltips (1.4.13). [ ] Freshness banner is text with a heading-like bold lead; not `role="alert"` (static content). [ ] Contact "Not published" is text.

**Fee comparison.** [ ] Table has caption (visually hidden allowed), column and row headers. [ ] Horizontal scroll region has `tabindex="0"`, `role="region"` and `aria-label` (so keyboard users can scroll) (2.1.1). [ ] Each compare checkbox has an `aria-label` including the company name. [ ] Selection count and "Compare selected" state are in a `role="status"` region; the button is `disabled` with `aria-disabled` and explained text, not silently inert. [ ] Rent input has a visible label, `inputmode="numeric"`, hint linked by `aria-describedby`; computed estimates are text in cells. [ ] Mobile card view: each value is paired with its label via `data-label` rendered as visible text (1.3.1; CSS generated content is a known gap for some screen readers, so the desktop table markup, which has real headers, stays the source of truth and labels also appear as text, see open issues). [ ] Range and plan details are real `details/summary` controls.

**Fee guide and landlord guide.** [ ] Reading width at most 42rem; heading outline matches the on-page TOC. [ ] Third-party benchmark box is distinguishable by text ("Not our data"), not color only. [ ] Sources section is an ordered/unordered list with real links and dates. [ ] "Last reviewed" date is text.

**Claim/correct form.** [ ] Every field has a visible `label`; hints linked with `aria-describedby` (3.3.2). [ ] Radio group in `fieldset` + `legend`. [ ] `autocomplete` tokens on name, email, organization, role (1.3.5). [ ] Required fields stated in text, not color/asterisk alone (3.3.2). [ ] On submit with errors: error summary appears, receives focus, lists fields; each field gets `aria-invalid="true"` and its own message linked via `aria-describedby` (3.3.1, 3.3.3). [ ] No CAPTCHA that depends on a cognitive test (3.3.8 Accessible Authentication: not applicable, no login; if a spam check is added use a honeypot or hosted-tool default that offers an alternative). [ ] Redundant entry: do not ask for the same email twice (3.3.7). [ ] Success message receives focus and gives a request ID. [ ] Hosted form tool must itself meet these; check before choosing (open issue).

**About / Methodology / Privacy.** [ ] Plain-language headings; each commitment is a list item. [ ] Dates as text.

## 4. Automated and manual test plan
1. axe DevTools or `@axe-core/cli` on each template at 320px and 1280px: zero serious/critical.
2. Lighthouse accessibility score 100 on each template (automated checks only, not proof of conformance).
3. Keyboard-only pass: Tab through header, filters, table, form; no traps, focus order matches reading order.
4. Screen reader spot checks: NVDA + Firefox and VoiceOver + Safari on fee table, filter result count, form errors.
5. 200% zoom and 320px reflow check; Windows High Contrast / forced-colors check (badges keep borders, so they stay visible).
6. Run `prototype/check-links.py` (links, fragments, unlabeled inputs) on any prototype change; on the live site use a link checker in CI.
