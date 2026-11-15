# Visual review and revamp proposal

Reviewer lens: principal visual/UI designer. Scope: look, hierarchy, data components, dark mode, motion, performance. UX flows and copy belong to the other reviewer.

**Evidence base and limits.** I read the design docs, `src/styles/site.css`, `Base.astro`, all seven components and the page templates. I rendered the clickable prototype (`docs/ux/prototype/`) at 1280px light (`screenshots/proto-*-1280.png`). I did not render the real Astro templates (no build here), so template findings come from reading the code and are marked *(code)*. My first prototype 375px captures were clipped by headless Chrome's minimum window width, so I discarded them and judged prototype mobile from its CSS. The revamp mockups were captured at 375px through an iframe harness, at 1280px light, and at 1280px dark (`screenshots/revamp-*`). Dark mode is verified for the mockups only, because the current site has none.

Mockups: open `visual-revamp/index.html` (home), `fees.html`, `company-evernest.html`, `city-columbus.html`, `states.html` (all component states). They use real data from `data/` (Evernest, HomeRiver, Reafco, RPM Midwest, Swiss, Mynd, 10X, ROOST). Stale, inactive-license and "varies" states appear only in `states.html`, labelled as specimens, because no real record is in those states today. Proposed tokens: `visual-revamp/design-tokens.proposed.json`.

## 1. What is already good (keep)

- **Contrast discipline.** Every text pair is computed and passes AA; badges always carry words; focus rings are 3px with offset. This is rare and worth protecting.
- **Honest data components.** Four distinct unknown states, range and plan tags, basis always printed, no averages. The component *rules* are right; the problem is how loudly they are drawn.
- **Restraint.** Zero web fonts, zero images, 10.7 KB CSS, no JS needed to read anything. That is a real performance and trust asset.
- **Mobile-first table-to-cards pattern** with `data-label` rows, and a labelled scroll region at md+.
- **Footer and "Correct or remove"** in a fixed position on every page.

## 2. Direction in one paragraph

The site currently looks like a well-built government form: system sans, white page, grey boxes, blue links, identical outlined cards everywhere. It is accessible but anonymous, and a rental owner has no visual signal that this is a careful, independent reference rather than a lead-gen site. The revamp makes the *ledger* the identity: warm paper background, a display serif for headings (editorial, "someone checked this"), tabular numerals, hairline rules, one steel-blue accent, and a faint Columbus street-grid motif instead of stock photos. Nothing decorative carries information, nothing is promoted, and no component can be read as an endorsement.

## 3. Brand and identity

| Topic | Today | Proposal |
|---|---|---|
| Name | "Columbus PM Guide", working name. "PM" is ambiguous (project manager) and the footer in the prototype says "(working name)". | Visual system works with any 2 to 4 word name. Decide the name before launch (PM/owner call), because the wordmark, title tags and JSON-LD all embed it. |
| Wordmark | Bold system-font text (`.brand`). No favicon (`<link rel="icon" href="data:,">` in `Base.astro`). | Rounded-square mark (three fee rows plus a check) + name in display serif + descriptor "Free. Independent. Sourced." Inline SVG, about 500 bytes. Reuse the mark as an SVG favicon. |
| Personality | Neutral, form-like. | Plain-spoken, dated, careful. Think almanac or ledger, not fintech dashboard and not marketplace. |
| Color | Cold grey and royal blue on white. | Warm paper `#fbfaf7`, ink `#16202a`, single accent steel blue `#0f4c75`. Green is reserved for "verified", amber for "stale", red for "bad": status colors never double as decoration. |
| Type | System sans only, 28/36px h1, bold everywhere. | System UI for data and body; `ui-serif` stack for h1 to h3 and the wordmark; fluid h1 (1.875 to 3rem); fee values 1.125rem/650 with tabular numerals; uppercase eyebrow labels. Still no web-font request. |
| Spacing | Good 4px scale, but sections are uniform. | Keep scale; add 2.5rem section rhythm and a 70rem measure for data pages. |
| Imagery | None. | No stock photos. Two devices only: the faint street-grid hero pattern (CSS gradients, `aria-hidden`, fades out behind text) and a grid "map tile" on city cards. Later, optional: simple line SVG diagrams in guides (fee anatomy). No people, no house icons that imply property listings. |

## 4. Findings, ranked

### P0 (fix before launch; they affect trust or readability of the core value)

**P0-1. The ad slot contradicts the product constraints.** Evidence: `design-system.md` section 11, `design-tokens.json` `components.adSlot` and the `neutralBadge` note, `prototype/fees.html` (large dashed "Advertisement (reserved, not built)" box under the table). The brief is no ads, no sponsored styling. A reserved ad box in the approved design system invites it later and, in the prototype, sits visually as the largest element under the fee table. Fix: delete section 11, the token and the prototype box; keep a "never built" list instead (see `states.html`, last section). Remove the "reserved ad" mention from the accessibility checklist.

**P0-2. First impression is generic.** Evidence: `proto-index-1280.png`, `src/pages/index.astro` *(code)*. The real home has an `h1`, a grey lede, then a filter form that is `js-only` (invisible without JS), so a no-JS or slow-JS visitor sees a headline and a search box only. There is no brand, no proof, no structure, and the city list is a plain bulleted list. Fix: `index.html` mockup. Warm hero with eyebrow, a benefit-led h1 ("See what Columbus property managers actually publish."), the finder as a single raised card, a trust row (No paid listings, No ads or accounts, Fees never change the order, Last data update date), then three "how to read" cards, city cards with counts, landlord links. Make the finder a real GET form that works without JS (links to `/city/columbus/` by default), enhanced by JS.

**P0-3. The fee table shouts "Not published" and buries numbers.** Evidence: `proto-fees-1280.png`: gray italic chips are as heavy as data, so rows like Delta/Echo read as a wall of chips; header cells stack unit hints into 4-line headers ("Management / % / of rent collected"); the numbers are 16px like the labels; and the real `FeeTable.astro` has 8 columns (including a rent estimate and minimums), so it needs about 62rem and scrolls horizontally on most laptops once sticky columns are added. Fix (`fees.html`): (a) group header row: Ongoing (management, flat) | One-time (leasing, renewal); (b) fee value 1.125rem/650 tabular, basis below in 0.8125rem muted; (c) unknown chip lighter, dashed, smaller than a value; (d) 0 to 12% range bar under management % for orientation, text still present, no colour ranking, no "lowest" highlight (never implies endorsement); (e) move the rent estimate out of the column set into the tools bar's illustration, so the table is 7 columns, not 8; (f) sticky header and first column; (g) legend as inline chips above the table. Keep A to Z order.

**P0-4. Dark mode and focus on dark do not exist.** Evidence: `grep prefers-color-scheme` returns nothing in `site.css` or the prototype. Many owners browse in the evening on phones with dark mode forced; the design currently renders light-only, and the default focus color (#0b3d91) is about 1.5:1 on dark surfaces. Fix: tokens as CSS variables with a dark block (light/dark proposed in the tokens file; all pairs 6.6:1 or higher, focus `#ffd479` at 12.9:1), `color-scheme: light dark`, and an optional user toggle (`data-theme`), all in the mockup CSS. No images need swapping, so the cost is about 1 KB.

### P1 (high impact on credibility and scanning)

**P1-1. Every fee row repeats an identical source sentence.** Evidence: `company/[slug].astro` *(code)*, `company-sample-alpha.html` 375px: 5 repeated "Source: Company pricing page, captured X, last verified Y" lines per fee set, each longer than the value. The product is trust, but repetition becomes noise and hides the one line that differs (a stale or conflicting source). Fix (`company-evernest.html`): a 3-column row: label | value+basis | source. When all rows share a source and dates, show the source once under the block header with "Open source" per row; show per-row text only when it differs or the value is "Not published" (then say "Checked <date>: not on the pages we read"). Add a 4-up "snapshot" strip of the four fees at the top of the profile so the answer appears in the first screen.

**P1-2. Hierarchy flat across page types.** Evidence: all prototype pages: `h1` 28 to 36px bold sans, every container the same 1px outlined box. Fix: page header block (eyebrow with page type, serif h1, meta row of badges, hairline), cards one elevation only (white on paper, hairline), banners reserved for scope and warnings. Per page: Home = hero + finder dominant; City = scope banner, filters, result cards with 4-fact strip; Company = snapshot strip, fee rows, then license, areas, contact; Fees = scope banner, legend, tools, table.

**P1-3. Result card is a mini form.** Evidence: `ResultCard.astro` *(code)*, `city-dublin` prototype. Name, two badges, a facts grid, a source line and property types are all similar weight. Fix (`city-columbus.html`): bigger serif name, badges beneath, facts strip separated by hairlines above and below with fee values bolded, source line and property types as footnote. License badge stays visually *equal* to the freshness badge (neither is "good"), and "Not checked yet" is used when there is no fee data.

**P1-4. License and freshness badge weight.** Evidence: `licenseBadge()` outputs a long pill, "License: stated by company, not verified" (about 38 characters), which wraps on 375px and visually dominates a verified freshness pill. Fix: keep the words (needed) but make `none` neutral grey with no icon, `ok` green with a check, `stale` and `bad` amber/red with a triangle; shorten the label to "License: self-stated" or "License: not verified" with the full statement in the License section (copy decision for the other reviewer).

**P1-5. Freshness is a date only.** Evidence: badges show "Verified 2026-11-11" with no age. An owner has to do date math. Fix: print age beneath ("3 days ago", later "8 months ago"), computed at build and shown as plain text; amber treatment only past `displayFlagDays` (180). Optional 5-pip age meter is in the CSS for stale states but I would not ship it unless the other reviewer wants it: it is decoration and adds a color-only cue.

**P1-6. Mobile nav and header.** Evidence: `site.css` hides the nav list behind a JS "Menu" button below 48rem. Without JS the full list shows stacked (4 to 5 rows of 44px) before any content; with JS the header is a lone 44px button. In the mockup without JS the nav wraps into two rows, which is acceptable and, with the 44px target, usable. Fix: keep the current progressive enhancement but make the closed state a compact bar (mark + name + Menu) and the open state a full-width panel with the same 44px rows; no hamburger icon-only button.

**P1-7. Design-token drift risk.** Evidence: `site.css` hard-codes `#08386d` (button hover) and `#fff` (footer links) outside the token set, and six templates use inline `style="..."` for layout. `npm run check:contrast` can miss these. Fix: add `--primary-press` and `--foot-link` tokens; replace inline styles with utility classes (`.meta`, `.stack`, `.cols`); extend the contrast checker to read the new dark block.

### P2 (polish)

- **P2-1 Unknown-state shapes.** Add border-shape differences (dashed, dotted, solid, double) as a secondary cue between the four unknown states. Text remains the primary cue. See `states.html`.
- **P2-2 Motion.** Today: none specified, and reduced motion is honoured. Add only 120ms color/underline/border transitions inside `prefers-reduced-motion: no-preference`. No entrance animation, count-up or parallax: motion implies promotion, which we do not do.
- **P2-3 Footer.** Split the dense paragraph into identity statement, "Trust" links and "Explore" links; keep "Correct or remove" in the same position on every page.
- **P2-4 Table print and compare mode.** Keep print stylesheet; selected-row state needs a visible, non-color treatment (checkbox plus a 3px left bar on the row).
- **P2-5 Prototype-only artifacts.** The purple SAMPLE bar and tags should not leak into templates; keep `.sample` only in `prototype/`.
- **P2-6 Illustration.** If guides want diagrams, use the same 2-color line SVG style (fee anatomy, "what a leasing fee covers"), inline, under 2 KB each.
- **P2-7 Card borders.** `--line` card edges are 1.3:1 against paper. Acceptable because cards contain text and aren't the sole indicator of a control; every interactive control (inputs, buttons, checkboxes) keeps the 3:1 `--ui` border. Keep that rule explicit in the system.

## 5. Data-heavy components: how to make dense fees scannable and trustworthy

1. **Value first, basis second, source last.** One fixed order in every cell: amount (largest), tag (`range`, `2 plans`), basis (small), plans (disclosure), nothing else.
2. **Group columns by meaning**, not by data model: Ongoing | One-time | Minimums | Verification.
3. **Ranges and plans.** Text ("7–10%" plus a `RANGE` tag) is canonical. The bar is aria-hidden orientation on a fixed 0 to 12% scale for management % only; it is not shown for flat dollars, mixed bases, or "plans" (no single axis is honest there). The bar color is the accent for every row: no green for "cheaper".
4. **"Not published" is quiet.** Dashed outline, smaller type, never zero, never a dash. Four states keep four texts.
5. **Freshness and source column.** Badge plus relative age plus one source line. Stale rows get amber badge and the plain sentence, not a row tint.
6. **Comparison selection.** Checkbox in the first column with a 44px hit area, a status line ("0 selected, choose 2 or 3") and a secondary "Compare selected" button that is `aria-disabled` until 2 are chosen. Selected rows get a left bar plus checked checkbox. Never rank or highlight a "best" row.
7. **License.** Badge sits in the page header next to freshness and again in the License section with its explanation. It is a statement of what we checked, not a grade.
8. **Mobile.** Cards with sticky-feeling company header and label/value rows in the same order as the columns; the Last-verified row stacks so the source line gets full width.

## 6. Empty and "Not published" states

- Page-level: a company with no fees shows the 4-up snapshot strip with four "Not checked yet" chips, then the fees section saying fees may exist on the company's own site, with a link. It does not collapse to a blank.
- Thin city pages keep the amber "We list only N companies here so far" banner (already in the template) and are noindex until threshold.
- Zero filter results: heading plus text and links; focus is not moved (unchanged).
- Never: zero, dash, empty cell, "N/A", or a tooltip as the only explanation.

## 7. Cards, lists, mobile, accessibility, performance

- **Cards/lists.** Three card roles only: *pillar* (icon + h3 + sentence), *city* (name link, count, grid tile), *result* (profile summary). No hover lift; whole card is not a link; the name is the link, avoiding nested anchors.
- **Mobile.** 16px gutters, 44px targets, tables become cards under 48rem, h1 scales fluidly with `text-balance`. The finder stacks to one column.
- **Accessibility.** Proposed palette pairs are in the tokens file (min 4.84:1 for UI borders, min 6.6:1 for text). `color-scheme` is set so native controls follow the theme. No information by color alone: unknown shapes, icons and words.
- **Performance.** Mockup CSS is 15.9 KB raw (4.4 KB gzip; it carries the dark block and mockup-only rules, the production set can be trimmed) versus 10.7 KB today, no images, no web fonts, one inline SVG mark (about 0.5 KB). Estimated page-weight change versus current: about +2 KB gzip. LCP element is text; no layout shift (no fonts swapped, fixed-size mark). Dark mode adds one CSS block. The street-grid hero is two CSS gradients with a mask, no network request.

## 8. Component library consistency

Observed: `.badge`, `.unk`, `.banner`, `.card`, `.result`, `.est` all define their own radius and padding; inline styles on six templates (`index`, `city`, `company`, `fees`, `guides`, `corrections`); hard-coded colors in two places; `.card.link-card` exists in CSS but is unused. Fix: single radius scale (6/10/pill), `.meta`/`.stack`/`.cols` utilities replacing inline styles, remove unused `.link-card`, one badge component with four variants, one "unknown" component with four kinds, one `FeeCell` for both the table and the profile rows so they cannot diverge. This also reduces the maintenance load on `FeeValue.astro`/`FeeTable.astro`.

## 9. Constraint check

No payment UI, no ads, no featured/sponsored/"recommended" styling, no stars, ratings or review cards, no lead capture, no "contact via us" button. Every unknown stays visibly "Not published" (or its sibling states). The trust row says "Fees never change the order", and the fee table is A to Z. The range bar is orientation only and is never colored by value.

## 10. One-page implementation plan (for the developer)

Order is by impact per hour. Each step is independently shippable and keeps `check:contrast`, `check:site` and axe green.

| # | Step | Files | Size |
|---|---|---|---|
| 1 | **Tokens.** Move all colors to CSS variables per `design-tokens.proposed.json`; add dark block, `color-scheme`, `--primary-press`, `--foot-link`; update `check:contrast` to read both themes. | `src/styles/site.css`, `docs/ux/design-tokens.json`, contrast script | S |
| 2 | **Remove ad slot** from design system, tokens and prototype; add "never built" list. | `docs/ux/*`, `prototype/fees.html` | XS |
| 3 | **Type and page header.** Add display serif stack to h1 to h3; fluid h1; `.eyebrow`, `.pagehead`, tabular numerals. | `site.css`, page templates | S |
| 4 | **Brand.** Inline SVG mark + wordmark in `Base.astro`; SVG favicon replaces `data:,`; footer split into columns; theme toggle optional. | `Base.astro` | S |
| 5 | **Home hero.** Replace plain h1/lede with hero, no-JS-safe finder, trust row, pillars, city cards. Copy from `index.html`. | `src/pages/index.astro`, `site.css` | M |
| 6 | **Fee cell + table.** One `FeeCell` (value, tag, basis, plans, optional range bar); group header row; 7 columns; sticky header/first column; estimate moves to the tools bar; mobile cards with stacked last-verified. | `FeeValue.astro`, `FeeTable.astro`, `fees/[...slug].astro`, `site.css` | M |
| 7 | **Profile.** Snapshot strip; fee rows with single shared source note; aside with TOC and date explainer. | `company/[slug].astro` | M |
| 8 | **Result card and city page.** New card layout, facts strip, badge variants and icons, shortened license labels (coordinate copy). | `ResultCard.astro`, `Badge.astro`, `city/[slug].astro` | S |
| 9 | **Unknown shapes, motion, print, selected-row state.** | `Unknown.astro`, `site.css` | XS |
| 10 | **Cleanup.** Replace inline styles with utilities, delete unused `.link-card`, strip prototype-only `.sample` from templates. | templates, `site.css` | S |

Acceptance: axe clean in both themes; every text pair at 4.5:1 or better and every control border at 3:1 or better in both themes; no horizontal page scroll at 320px; no new request types (fonts, images); total CSS under 16 KB raw; the fee table at 1280px shows all 7 columns without horizontal scroll at the default 70rem container (check; the mockup needs about 62rem min width and scrolls inside its labelled region below that).

## 11. Open questions for PM/owner

1. Final site name (affects wordmark and descriptor).
2. Is the serif display accepted, or should we stay all-sans for a stricter "data tool" tone? (One-line CSS change.)
3. Keep the rent estimate as a table column, or move it to the illustration panel as proposed (my recommendation)?
4. License label wording ("stated by company, not verified" vs a shorter form).
