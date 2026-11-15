# Review 2: PR #17 (branch `visual-fixes`) re-check, plus Menu, keyboard, dark 1280, forced-colors

Date: 2026-11-15 | Site code not edited.

## Method and limits
- PR #17 was **not live** (production still served `Base.rbx4parn.css` and the old 1464px overflow). I built commit `8dab189` (`origin/visual-fixes`) in a throwaway git worktree outside the repo, served `dist/` on localhost, tested it in the Browser pane at 375, 1024 and 1280 (light, dark), then deleted the worktree and server. The shared checkout was not touched.
- Built CSS: `_astro/Base.CphGdfeN.css` = **14,951 bytes**. Against a 15,000-byte budget that is 49 bytes spare; against 15,360 it is 409. Byte costs below are estimates; measure after each change.
- Checked by DOM measurement and screenshots. Screenshots of a 1280 emulation are cropped to about 800px by the pane, so desktop results are measurements.
- **Forced-colors was not render-tested**: the Browser tool cannot emulate it. Findings under F-colors are from reading the built CSS.

## What PR #17 fixed (verified)
| Earlier item | Result |
|---|---|
| V1 page-level sideways scroll on `/fees/` | Fixed: `scrollWidth` 1280 at 1280, 1024 at 1024 |
| V2 hidden table columns | Fixed at 1280: all 8 columns inside the 1070px region (see N1 for a side effect). At 1024 the table still scrolls inside its own labelled region (1057 vs 974), which is acceptable |
| V3 sticky header over anchors | Fixed: `scroll-padding-top` 80px, `#license` lands at 80px under a 65px header; tagline hidden at 375 |
| V4 scale bar | Removed |
| V5 search | Partly: filter now reads "Section" (good). Clear button regressed (N3) |
| V6 profile source repeats | Improved: 3 source lines on the Evernest profile, page 4,373px tall. One regression (N2) |
| V7 city cards | Improved: 8,494px for 16 cards (from about 10,000), "(Single-family)" suffix gone from facts |
| V8 tag separators, V12 footer copy, V15 home city list grammar | Fixed ("1 publishes fees"; footer says Unknown values show as "Not published"; Compare fees and Fee guides in footer) |
| V11 footer separation | Fixed (1px border, distinct background) |
| Region label | Fixed (no longer says "scrolls sideways" when it is a card layout) |

## New findings

### P0
**N2. "Not published" chip overlaps its source text in profile fee cards at 375.** Page: `/company/evernest-columbus/` > Flat fee card. The chip ("Not published") and the text "Checked Nov 14, 2026: not on the pages we read." are on one line, and the chip's right edge sits on top of the first letters ("Not" / "Checked" collide). Likely cause: the two spans are in a right-aligned flex or float row with no wrap or gap after the source line was moved next to the value.
Fix: `.fee-card .src{display:block;margin-top:.25rem}` or give the value and the note `flex-basis:100%` under `<40rem`; about +40 bytes. To pay: delete the now-unused rules left from the removed scale bar and the old per-card source layout (search the CSS for `.scale`, `.fee-meter` and `.v .src` duplicates).

### P1
**N1. Website domain link spills into the neighbouring column in the fee table.** Page: `/fees/` at 1280 and 1024. "columbuspropertymanagement.co" is 21px wider than the 224px first column, so its underline runs under the Management % cell (measured overlap 21px). It is the longest domain; other rows fit.
Fix: `.fee-table th a,.fee-table th small{overflow-wrap:anywhere}` (about +50 bytes) or set the domain `<small>` to `font-size:.75rem`. Prefer `overflow-wrap:anywhere`.

**N3. Search "Clear" button is now off-screen but still focusable.** Page: `/search/?q=fees` at 375. The fix set `bottom:.4rem`, but the absolutely positioned button's containing block is the whole search form (results included, about 1,350px tall), so the button sits at the bottom of the results, 1,327px below the input. Sighted users cannot see it; keyboard users Tab to an invisible control (2.4.7 fail). The magnifier icon still overlaps the "Search the site" label, and there is still about 80px of empty space between the filter and "41 results".
Fix on the `/search/` inline style only (0 bytes in the global sheet): `.pagefind-ui__search-clear{top:2rem;bottom:auto;right:.4rem}` (measure so its top aligns with the input top; it was 26px above the input originally, so add about 26px to the original `top`); `.pagefind-ui__search-input{padding-inline-start:2.5rem}` and `.pagefind-ui__search-input` label gap `margin-top:.25rem`; collapse the gap with `.pagefind-ui__drawer{margin-top:0}`.

**N4. Menu: Escape does not close it, and the open header is 242px tall on a sticky bar.** Page: any, 375. Menu opens correctly (`aria-expanded=true`, 4 items each 44px tall, focus stays on the toggle). Escape leaves it open (`aria-expanded` stays true). With the menu open the sticky header takes about 30% of the viewport and content scrolls under it with no visual separator other than a 1px line. Not a WCAG failure by itself, but unexpected for a disclosure.
Fix in `nav.js` (not CSS): close on Escape and return focus to the toggle (about 5 lines); close when a link is followed. For separation use the existing line token as `box-shadow` on `.site-header` when open (about +30 bytes), or make the open menu non-sticky.

### P2
**N5. Small targets in navigation-like lists (2.5.8).** Pages: profile at 375. Breadcrumb "Home" is 38x17 CSS px; TOC links are 17-19px tall ("Fees", "License", "Service areas", ...), and "Compare fees across companies" 17px. These are not in running sentences, so the inline exception does not apply; the spacing exception may rescue the TOC but not the breadcrumb pair.
Fix: `.crumbs a,.toc a{display:inline-block;padding-block:.35rem}` (about +60 bytes). Pay for it by deleting the now-unused rules from the removed scale bar and from `.fee-wrap` sticky shadows if unused.

**N6. Redundant type statements on city and profile cards.** `/city/columbus/` Evernest: "(single-family only; rate basis not stated)" and "Fees shown are for Single-family." and "Property types: Single-family, ..." all say the same thing. A blank gap above "minimum $500" (an empty line between basis and minimum) remains.
Fix: drop "Fees shown are for X" when X is the only type with fees and is already in the note; remove the empty `<br>` before `minimum`.

**N7. Home city tiles are one column at 375.** `/` Browse by city: each tile about 140px, six tiles about 900px. Fix: `grid-template-columns:1fr 1fr` under 40rem for `.city-tile` (about +35 bytes), tiles already have short content.

## Keyboard walk (profile at 375, programmatic focus of all 29 focusable elements, plus a manual Menu pass)
- Tab order follows DOM order, no positive `tabindex` values.
- Focus ring: every element had a 3px outline (the `:focus-visible` rule, 3px, offset 2px). No element had `outline:none`.
- Focus not obscured: for every focused control below the header, its top edge stayed at or below the 65px header (scroll-padding works). Only the skip link sits above the header, as intended.
- Skip link works and is first.
- Hash links (`#license`, TOC) land 15px below the sticky header.
- Open Menu: first Tab goes to the first nav link, closes only on a second toggle (see N4).
- Not tested: Pagefind result list with a real screen reader, the corrections form submit flow, the compare checkboxes on `/fees/`.

## Dark mode at 1280 (`/fees/`)
- All text nodes in main, header and footer computed at or above 4.5:1 (3:1 for large text) against their effective background. No failures.
- Info banner, chips, "Not published" chip, badges and inputs all readable in the 800px-wide crop.
- Residual: the dark table header row and body rows are close in tone (`first-year` header cell on a near-identical surface), so scanning relies on row borders, which are present.

## Forced-colors (code reading only)
- The built CSS has **no `@media (forced-colors: active)` rules** and no `prefers-contrast` rules.
- Likely fine: badges and chips carry borders (`.badge{border:1px solid}`), buttons have a 2px border, the focus ring is an `outline` (forced-colors keeps outlines), text-only status cues ("Not published", "range", "plans").
- Risks to test with Windows High Contrast or Firefox forced colors: (a) the info banner's left bar is a border (fine) but its tinted background is dropped, so the banner needs its border or heading to stay distinct; (b) the disabled "Compare selected" button relies on lowered opacity and background, which forced colors flattens to the same colour as enabled; (c) the check icon in the green badge is an inline SVG: it should use `currentColor` (verify), otherwise it can disappear.
- Fix if (c) or (b) fail: `@media (forced-colors:active){.btn[disabled]{border-style:dashed}}` (about +45 bytes).

## CSS budget summary
Estimated additions: N1 +50, N2 +40, N4 +30, N5 +60, N7 +35 = about +215 bytes. Spare today: 49 bytes (15,000) or 409 (15,360). Removals to pay for it: dead rules left over from the scale bar and the old per-card source layout, duplicate `.v` and `.src` text-align rules at mobile and desktop (V2 changed the columns), and the forced-colors rule only if the test shows it is needed. Run a before/after byte count; do not merge if over budget. N3 costs 0 bytes (search page style only).

## Order
N2 and N3 first (visible breakage), then N1, N4, N5, then N6, N7 and the forced-colors check on a real device.
