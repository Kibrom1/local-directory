# Live site UX and visual review: centralohiopmguide.com

Date: 2026-11-15 | Requested by: Developer session | Reviewer: UX | Site code not edited.

## Method and limits
- Pages: home, `/city/columbus/`, `/city/dublin/` (listed tier), `/company/evernest-columbus/`, `/fees/`, `/search/?q=fees`, footer on each.
- Widths: 375 (phone) and 1280 (desktop), light; 375 dark. Measured in the built-in browser with DOM checks (scrollWidth, element rects, computed styles), plus screenshots. The pane crops screenshots of a 1280 emulation to about 800px wide, so desktop conclusions come from measurements, not from the cropped images.
- Not covered: Menu open state, keyboard walk, forced-colors, dark at 1280, the PR #16 branch if it is not deployed (the website links were visible on the live site, so I treated them as live).
- Correction to my earlier review: I flagged clipped text in the prototype's 375px screenshots (F12). The live site has **no horizontal overflow at 375** on home, profile, city or fees (`scrollWidth` = 375), so that clipping was most likely a capture artifact. Treat F12 as closed for mobile; the real overflow is the desktop one in V1 below.

## Findings (ranked)

### P0

**V1. Fee comparison scrolls the whole page sideways at desktop width.** Page: `/fees/`, 1280px (also 800px). `document.documentElement.scrollWidth` is 1464 against a 1280 viewport. Cause: the visually hidden `<span class="sr">` text added for website links ("for Evernest Columbus", "company website for ...") is `position:absolute` inside the table, but `.fee-wrap` is not a containing block, so the spans sit at x = 1346-1464 and are not clipped by the wrapper's `overflow:auto`. Visitors get a page-level horizontal scrollbar and a blank strip.
Fix: `.fee-wrap{position:relative}` (about 22 bytes). Check the same pattern anywhere `.sr` sits inside an overflow container (profile fee tables).

**V2. The desktop fee table hides two key columns.** Page: `/fees/`, 1280px. Table is 1387px wide inside a 1070px scroll region, so "First-year cost" and "How we checked it, and source" start off-screen; at first view an owner sees no year-one figure and no source (the two things the site sells). First column is 262px, and the header row is about 150px tall because "What is this?" disclosures and long headings wrap.
Fix, pick one: (a) drop the "Minimums" column and show it under the leasing value ("minimum $500" is already printed there), and shorten the two long headings ("First-year cost" with the example-rent text moved to the caption; "Source"); (b) move "What is this?" out of header cells into the legend; (c) cap first column at 14rem. Target: all columns visible at 1100px content width without scrolling.

### P1

**V3. Sticky header covers anchor targets and focused elements.** Pages: any page with a TOC (profile) and keyboard use. Header is 65px tall (3 lines at 375: wordmark wraps to two lines plus tagline) and `scroll-margin-top` is 0 on headings, so "Fees", "License" etc. land under the header; WCAG 2.2 Focus Not Obscured (2.4.11) is at risk for focused links near the top.
Fix: `[id]{scroll-margin-top:5rem}` (about 30 bytes) and `html{scroll-padding-top:5rem}` instead if smaller; shrink the mobile header to one line of wordmark plus Menu by hiding the tagline under 40rem (`.tagline{display:none}` in a media query, about 40 bytes) which also gives 18px back on every screen.

**V4. Decorative "scale" bar next to every percent implies a ranking.** Pages: `/fees/` (rows and cards), likely the city cards. A small track with a dot (`<span class="scale" aria-hidden><i style="left:50%;width:4%">`) sits beside "6%", unlabeled. Its position (6% sits at the middle) cannot be understood, it is hidden from assistive tech, and it reads as a cheap-to-expensive gauge, which cuts against "fees never change order" and "not a market average". On mobile it also squeezes the basis text into a 4-line column ("(single-family only; rate basis not stated)").
Fix: remove it. This is the CSS you can spend elsewhere: delete the `.scale` and `.scale i` rules and the span in `FeeTable`. Expect a few hundred bytes back.

**V5. Search box UI is broken at 375.** Page: `/search/`. The "Clear" button (44x46) sits 26px above the input's top edge, overlapping the label row and the input border; the magnifier icon overlaps the "Search the site" label; the filter heading reads "Page_type" (raw field name); about 100px of blank space between the filter and "41 results".
Fix: set `.pagefind-ui__search-clear{top:auto;bottom:.4rem;right:.4rem}` and `.pagefind-ui__search-input{padding-inline-start:2.25rem}` plus label margin; rename the filter by setting the Pagefind translation `filters` or a custom label, e.g. "Type of page"; hide the empty filter block until it has options. Budget: the page loads Pagefind's own CSS, so put these fixes in a `<style>` on `/search/` only, not in the global sheet.

**V6. Mobile profile fee blocks are long and repeat the same source line.** Page: `/company/evernest-columbus/` at 375. Each of 4-6 fee items is its own card with identical text "Source: Evernest Columbus (columbuspropertymanagement.co), captured Nov 11, 2026, last read Nov 14, 2026. Open source" (five lines), and the long domain breaks mid-word ("columbuspropertymanageme / nt.co"). Roughly 1.3 screens per fee; "Fees" alone is about 5 screens.
Fix: on `<48rem`, render one card with four rows and one source line under it (the row-level source only when it differs); shorten the text (avoids needing `overflow-wrap`) to "Source: company pricing page, read Nov 14, 2026. Open page" and put the domain once in the header. Dates in a source line mix "Nov 14, 2026" and "Checked 2026-11-14: not on the pages we read": use the long form everywhere.

**V7. Result cards repeat "(Single-family)" four times and the basis note twice.** Pages: `/city/columbus/` (Evernest card, mobile). "6% (single-family only; rate basis not stated) (Single-family)" shows the type in the note and again as a suffix; the suffix also repeats on Leasing and Renewal. A card is about 650px tall at 375, so 16 companies are about 10,000px.
Fix: show the fee type once ("Fees for single-family") in the card header, drop per-fact suffixes when all facts share the type; keep the suffix only when facts differ. In the list, collapse "Show plans" details into one line for the card ("Flat $90-$105, 3 plans"). Consider a compact card for the 5-6 companies with no fee row (one line instead of four empty facts).

**V8. Tags run into amounts in text and for screen readers.** Pages: city, fees, profile. Extracted text reads "$90-$1053 PLANS" and "7-10%RANGE": the badge has no text separator, so copy/paste and some screen readers produce "$1053 plans". Visually it is fine because of padding.
Fix: add a visually hidden space or `: ` before the tag text, or wrap the tag as `<span class="tag"> (3 plans)</span>`; about 10 bytes of markup, no CSS.

### P2

**V9. First screen of `/fees/` on mobile is all explanation.** At 375 the title, a 9-line scope banner, the legend and the rent box fill about 2.2 screens before any company. Fix: collapse legend into the "What is this?" disclosures already in the table (or a single `details`), shorten the banner to two lines, and move the rent input beside "First-year cost". Also give the rent input a `$` prefix and a `/mo` hint; "1500" alone is ambiguous.

**V10. Mobile fee list is 10,442px for 10 rows.** Page `/fees/`. Compare mode (checkboxes, "0 selected") adds friction on a one-column card layout where two cards can't be seen at once. Fix: hide compare mode under `48rem` (CSS only, `.js-only` already exists), keep sort-by-name; the estimator carries the comparison.

**V11. Dark mode footer has almost no separation from the page.** Page background rgb(15,23,30), footer about rgb(10,15,21). The footer reads as a continuation. Fix: `border-top:1px solid` using the existing line token, about 25 bytes.

**V12. Footer copy contradicts the product.** Footer says "Unknown values are left blank, never guessed" but the site shows a visible "Not published" chip. Fix: "Unknown values show as 'Not published', never guessed."; and the footer lacks Compare fees and Fee guides (the site's main tasks); add them to "Explore" (text only, no new CSS).

**V13. Listed-tier banner talks to search engines, not visitors.** `/city/dublin/`: "This page is not indexed by search engines until more companies with sourced data serve Dublin." Visitors do not care about indexing. Fix: "We list 6 companies here so far, and 1 publishes fees. We add a city page when enough of its facts are checked." Also "Compare these companies in the fee table" on a city page links to the all-company table; reword to "See all companies that publish fees" or scope it.

**V14. Home page: first screen has no action above the fold on 375.** The hero with four trust ticks uses about 420px; the "Find" form starts at about 440px and the button sits flush against the select (no gap above "Show companies"), unlike the gap above "Property type". Fix: reduce the hero lede or put the ticks in one line, and add `margin-top:.75rem` (about 20 bytes) before the button. Grammar: "1 publish fees" on city tiles ("companies serve it, 1 publish fees"): pluralise the verb.

**V15. "Browse by city" shows 12 cities, 5 of them with 2 companies or 0 fees.** Home grid. Cities with "0 publish fees" are shown on equal footing; fine for honesty, but the 12-tile grid pushes the A-Z list far down. Fix: show the 5 largest cities plus a "All 12 cities" link, or render as one comma list. Reduces page height and keeps the trust story.

**V16. Company website link duplicates visually with the name link.** Cards and profile now show the domain as a second blue link. Fine for users, but on cards two adjacent links with similar weight compete. Fix: make the domain link small and muted with an "Opens their site" suffix (reuse the existing `.small`/`.muted` classes, no new CSS).

## What works (keep)
- No horizontal overflow at 375 on home, profile, city or fees.
- Dark theme is coherent: contrast on badges, chips and form controls looks good in the screenshots.
- Visible, plain verification wording: "Read from the company's website by our tool on Nov 14, 2026" matches my P0 recommendation. Distinguish later from "Checked by a person".
- Footer now has "Contact and corrections" and "Corrections log"; coverage panel on home is honest.
- First-year cost shows "Includes: management fee, leasing fee, one renewal fee."

## CSS budget (15 KB, about 150 bytes spare)
| Change | Bytes |
|---|---|
| Remove `.scale`, `.scale i` rules and the markup (V4) | about -200 to -350 (measure) |
| `.fee-wrap{position:relative}` (V1) | +22 |
| `[id]{scroll-margin-top:5rem}` (V3) | +30 |
| Hide tagline under 40rem (V3) | +40 |
| Footer top border (V11) | +25 |
| Button top margin (V14) | +20 |
| Hide compare mode under 48rem (V10) | +40 |
| Search fixes (V5) | 0 (inline `<style>` on `/search/` only) |
V1, V3, V10, V11, V14 total about +180 bytes, paid for by removing the scale bar. Do V4 in the same change.

## Order of work
V1, V2, V4 first (one change, net bytes negative); then V3, V8, V5; then V6, V7, V9, V10; then copy fixes V12, V13, V15, V16 and the small items.
