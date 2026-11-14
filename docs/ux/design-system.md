# Design system: Columbus PM Guide

Tokens: `design-tokens.json`. Reference CSS and markup: `prototype/style.css`, `prototype/*.html`. Components are plain HTML + CSS; JS only where stated. Mobile first.

## 1. Header
Brand link (text) + menu button; nav list below at under 48rem, inline at 48rem+.
States: default; menu open (`aria-expanded=true`, list visible); current page (underline 3px, `aria-current=page`); hover (underline); focus (3px outline); no-JS (list always visible). Not sticky.

## 2. Navigation
Main nav (6 items), breadcrumb, on-page TOC, footer links.
States: link default (primary, underline), hover (thicker underline), focus, visited (same color, no change), current. Touch target 44px high for nav links.

## 3. Search box
Home: city select + property-type select + "Show companies" (GET form). Site search: single `type=search` input labelled "Search the site" + button, Pagefind UI on `/search/`.
States: empty; focused; filled; loading (Pagefind: "Searching..." status); results (count in `role=status`); no results (message + links); error (index missing in dev: silent, plain link to `/search/`). Labels are always visible; placeholder text is never the label.

## 4. Result card
Name link, license badge, freshness badge, 4 facts, fee source line, optional stale banner.
States: default; fees not published (4 "Not published" chips, source line says "no fees found, checked <date>"); stale (>180 days) amber badge + inline warning; hidden (filtered out, `hidden`); focus-within outline on the link; no hover lift. Whole card is not a link (avoids duplicate/nested links); the name is the link.

## 5. Fee table
Columns and normalisation per `ux-spec.md` s6. Elements: caption, column headers with unit hints, row header = company (+ checkbox when compare mode), value cells with basis text, range tag, plan `details`, estimate cell, last-verified cell with source line.
States: default; row selected (checkbox checked; count in status); compare view (non-selected rows `hidden`, "Show all" visible); stale row (amber badge + "Over 180 days old"); unknown cell (chip text); dropped >365 days (row absent, listed in "not shown" note); empty (page not generated; if filtered to 0: message); mobile (cards with `data-label`); horizontal overflow (region focusable, labelled); print (full table).
Never: color-only states, averages, zero as unknown.

## 6. Badge
Variants: `ok` (verified, check mark + text), `none` (stated/not checked/unverified), `stale`, `bad` (inactive/not found).
Anatomy: pill, 0.8125rem semibold, border = text color, text always present. Not interactive; no tooltips (explanations live in text). Contrast in `accessibility-checklist.md`.

## 7. Source note
"Source: <name>, captured <date>, last verified <date>. [Open source]" at 0.8125rem muted, directly under or beside the fact.
States: normal; stale (date plus amber badge nearby); source link broken (flag in data quality report, not in UI); company-supplied ("Provided by the company, <date>, no public page"); third-party benchmark ("Published by <X> (<date>), accessed <date>", inside the gray "Not our data" box).

## 8. Freshness banner
Amber banner: bold lead "Fees last verified 8 months ago." + one sentence + link to source or correction.
States: none (under 180 days: nothing shown beyond the green badge); warning (180-365 days); expired (over 365 days, replaced by "Last known value (date). Not shown in comparisons until re-checked."). Server-rendered at build time (no layout shift). Not `role=alert`.

## 9. Form
Elements: fieldset/legend radios, text/email/url inputs, textarea, hint text, per-field error, error summary, submit, success message.
States per field: default; focus (3px outline); filled; error (`aria-invalid`, 2px red border via text color + message beginning "Enter..."; message linked with `aria-describedby`); disabled (not used). Form states: initial; validation error (summary appears, takes focus, lists problems); submitting (button text "Sending...", disabled; hosted tool permitting); success (message takes focus, request ID); failure (message with email fallback). Remove-type hides fact and evidence fields. Inputs are at least 44px high; `autocomplete` set.

## 10. Footer
Dark panel: identity statement, links (Correct or remove, Methodology, About, Privacy), counties, last data update date.
States: link default (white underline), hover (thicker underline), focus (3px white outline; the default blue ring is only 1.47:1 on the dark panel, white is 14.76:1).

## 11. Never built
No advertising, sponsored or "featured" styling, ratings or stars, review cards, lead-capture or "contact via us" buttons, and no highlight that ranks one company above another (the fee range bar is never coloured by value). The product constraint is no ads and no payments; nothing in this system reserves space for them.

## 12. Other small components
- **Banner** (`info`, `warn`, `bad`): left accent border + text; info is the scope/labeling note ("Companies we reviewed, not a market average").
- **Button** (primary, secondary, disabled): 44px high, text-only labels.
- **Chip "Not published"**: gray background, italic text.
- **Range/plan tag**: small bold muted text after a value.
- **Card** (value cards, next-step card): 1px border, 0.5rem radius.
- **TOC**: surface panel, ordered list of anchors.
