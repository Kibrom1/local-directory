# UX spec: Columbus PM Guide (working name; domain not final)

Date: 2026-11-11 | Author: UX agent | Inputs: `docs/BRIEF.md`, `docs/pm/*` (approved PRD), `docs/researcher/*`, `src/` templates (read only).
Scope: static, mobile-first site, Astro + Pagefind. No payments, ads, accounts or inquiry routing at launch. Prototype: `docs/ux/prototype/index.html`. All prototype data is SAMPLE.

## 1. Design principles
1. **Answer the owner's question first**: who serves my suburb and property type, and what do they charge, where did that come from.
2. **Every fact shows its source and date** next to it. No fact without a source line.
3. **Unknown is a visible, honest state** ("Not published"), never blank, zero or hidden.
4. **Scope is always labeled**: "companies we reviewed, not a market average".
5. **No dark patterns, no pay-to-play signals.** No "contact this company" button, no lead forms, no "featured".
6. **Fast and light**: text-first, system fonts, no images required, about 5 KB of own JS.

## 2. Information architecture and URLs
Existing templates use `/city/<slug>/` and `/company/<slug>/`; keep them. All URLs end with a slash, lowercase, hyphenated, stable (an ID change must not change a slug).

| Page type | URL | Indexable when (PRD s10) | Prototype |
|---|---|---|---|
| Home | `/` | always | index.html |
| City/suburb results | `/city/<slug>/` e.g. `/city/dublin/` | 3+ indexable companies, 1+ with fees; 2 = noindex "listed" | city-dublin.html |
| Company profile | `/company/<slug>/` | passes gate and has verified fees or license | company-sample-alpha.html |
| Fee comparison | `/fees/` (all) ; `/fees/<property-type>/` per type when 5+ rows | 5+ companies with fee rows | fees.html |
| Fee guide hub | `/fee-guide/` | 1+ child guide indexable | not built |
| Fee guide | `/fee-guide/leasing-fee/`, `/fee-guide/renewal-fee/`, `/fee-guide/percent-vs-flat/` (4th guide: hub itself holds management %) | 5+ companies publish that fee type | fee-guide-leasing.html |
| Landlord guides hub | `/guides/` | 1+ guide | not built |
| Landlord guide | `/guides/<topic>/` e.g. `/guides/what-does-a-property-manager-do/` | cited source or our data, `last_reviewed` set | guide-...html |
| Property-type page | `/property-types/<slug>/` (`single-family`, `small-multifamily`, `hoa-community`, `short-term-rental`) | 3+ indexable companies with sourced type fact | not built (template in s4.8) |
| Search | `/search/` | noindex (utility) | not built |
| About | `/about/` | always | about.html |
| Methodology | `/methodology/` | always (sources, ranking, freshness, change log) | not built |
| Claim/correct and removal | `/corrections/` one page, one form; `?type=correct|add|remove&company=<name>` prefill | always | corrections.html |
| Privacy | `/privacy/` | always | not built |
| 404 / removed | `/404.html` with search and home links. Removed companies return the 404 (410 if host allows) | noindex | not built |

Cities list: no `/city/` index page at launch (about 5 cities); the home page lists them. Add `/cities/` when more than 8 exist. Not built: school-district pages.
URL rules: no query-string pages are indexable (`/fees/?city=dublin` is a client-side view of `/fees/`, canonical to `/fees/`). Breadcrumbs mirror hierarchy: Home > Cities > Dublin > Company.

## 3. Navigation
- **Header (all pages)**: brand "Columbus PM Guide" (home) | Compare fees | Fee guides | Landlord guides | Cities | About. Six items; at under 48rem a "Menu" button toggles the list (no JS: list shown). Current page gets `aria-current="page"` and underline (not color alone).
- **Footer (all pages)**: one-line identity statement (free, independent, no paid placement, sources and dates), then Correct or remove a listing | Methodology | About | Privacy, service-area counties, last data update date.
- **Breadcrumbs** on all non-home pages.
- **In-page TOC** on profiles and guides (anchors).
- **Contextual cross-links (required)**: guide -> fee comparison and a city page; fee guide -> fee comparison; city -> fee comparison and fee guides; profile -> city, fee comparison, correct link; every page has the correct/remove link in the footer.
- Existing `Base.astro` nav is "Columbus PM Directory / About / Privacy": replace with the above; footer text "see corrections" should link to `/corrections/` (it currently links to `/about/#corrections`).

## 4. Page templates (content blocks in order)
Common wrapper: skip link, header, breadcrumb, `main` (Pagefind body), footer.

### 4.1 Home
1. H1 "Find and compare Columbus-area property managers" + one-sentence lede (free, independent, sourced).
2. Find form: city select, property-type select (plain words: "Single-family house", "Small multifamily (2-4 units)", "HOA or community", "Short-term rental"), button "Show companies". Submits to `/city/<slug>/?type=<id>`; no-JS fallback works because it is a GET form. Link "Search the whole site" to `/search/`.
3. Three value cards: Fees side by side | Sources and dates | No pay to play (each links to fee comparison / About#how / Methodology).
4. Browse by city: only cities that pass the gate, with company count.
5. For landlords: 2-3 top guide links.
6. Own a company? Correct or remove link.
No hero image, no carousel, no testimonials, no counts presented as market stats.

### 4.2 City/suburb results
1. H1 "Property management in Dublin, Ohio". Lede with counts ("5 companies serve Dublin. 4 publish fees.").
2. Scope/ranking note (info banner): "Companies we reviewed, not a market average. Order: serves your place and type, then data completeness and recency, then A-Z. Fees and payment never affect order." Link to Methodology.
3. Filters: property type, "Only companies that publish fees"; link "Compare these companies in the fee table".
4. Result count (`role=status`).
5. Result list (cards, s5.1). 
6. Reserved ad slot A (after list; s9).
7. About-this-place facts (counties, nearby cities, related guides).
8. Empty/zero-filter state (hidden until needed).

### 4.3 Company profile
1. H1 company name; badge row: license badge, freshness badge, "Correct or remove this listing" link (near top so owners find it).
2. Lede: one sentence assembled from structured facts (types, areas). No copied company prose.
3. TOC.
4. Fees: per property type; table (Item | Amount with basis | Source and date). Disclaimer "published by the company, not a quote". Link to fee comparison.
5. License: badge + explanation that Ohio uses a real estate broker license for fee-based rental management + source note.
6. Service areas (linked to city pages that exist).
7. Services and property types.
8. Contact: published website and phone only, plain links; nothing routes through us; source note.
9. Correct-or-remove box (info banner).
10. Reserved ad slot B (right rail at 64rem+, after contact on mobile; s9).
Freshness banner (s7.4) sits directly under the H1 when any fee is over 180 days.

### 4.4 Fee comparison
1. H1 "Property management fees: companies we reviewed".
2. Scope banner (mandatory, s6.5).
3. Legend (Not published / range / plans / basis).
4. Rent illustration input (optional).
5. Compare controls (select 2 to 3, "Compare selected").
6. Fee table (s6).
7. Ad slot A (after table only).
8. "Where do these numbers come from" + methodology + correct link.
Per-property-type variant `/fees/<type>/` uses the same template, filtered.

### 4.5 Fee guide (per fee type)
1. H1 question-shaped ("Leasing fees: what Columbus property managers publish"). One-paragraph definition.
2. Meta line: last reviewed date, reviewer = site editor, Methodology link.
3. TOC.
4. "What companies we reviewed publish": mini table of that fee type (company, amount, basis, last verified) + scope banner (n companies, not an average). At most a range summary ("from X to Y across n companies"), never a mean.
5. Illustration in dollars at an example rent, labeled "illustration".
6. "Published benchmarks (third party)": separate gray box, each line "Published by X (date), accessed Y", vendor-written sources labeled.
7. Questions to ask a company.
8. Ad slot B.
9. Sources list (every figure above).
10. Related fee guides and fee comparison.

### 4.6 Landlord how-to guide
1. H1 question; lede; meta (last reviewed; "general information, not legal advice").
2. TOC.
3. Body: short sections, lists. At least one block of our own data or a cited official source ("What local companies list" using our dataset).
4. Next-step card: Compare fees | See companies in <city>.
5. Ad slot B (mid-article, after the second section on long guides only).
6. Sources (required; build fails if empty).
Legal-process topics (eviction, deposits) are Stage 2 and link to official sources.

### 4.7 About
H1; who runs the site (owner decision) and the related-business disclosure in plain words; what it costs (free, no paid placement, no ads at launch); how data is collected (link Methodology); corrections and removal; contact. No ad slots.

### 4.8 Property-type page
H1 "Property managers for single-family rentals in the Columbus area"; scope note; fee table for that type (reuses the fee table, filtered); companies serving it by city; what is different for this type (only from sourced facts); related guides. Gate: 3+ companies with a sourced fact for the type. STR fee basis is revenue, not rent: separate table with its own header.

### 4.9 Claim/correct and removal (`/corrections/`)
H1 "Correct or remove a listing". Lede (free, no account). What happens next (3 steps with the SLA). Error summary (hidden). Form: request type radios (Correct / Add / Remove) -> company name or page address -> fact fields and evidence link (hidden for Remove) -> your name, role, email -> Send. Privacy line next to email field. Success state with request ID. Email fallback line. Removal needs no reason and no evidence.

### 4.10 Privacy
Sections per PRD s12 (GA4, Search Console, form data, hosting, no accounts, no ads). Plain headings, last-updated date, contact. Must change from "no forms" once the form exists.

## 5. Components in use (details in `design-system.md`)
### 5.1 Result card
Name (link) | license badge | freshness badge | 4 key facts (Management, Flat, Leasing, Renewal) | one-line fee source | optional stale warning. Same facts and order as the fee table columns so users learn one pattern.

## 6. Fee comparison and fee-table design
### 6.1 Columns (fixed order, same labels everywhere)
Company (+ property types) | Management % (basis: of rent collected) | Flat fee (per unit per month) | Leasing fee | Renewal fee | Minimums | Est. monthly cost (management only) | Last verified (+ source).
Fee columns are ordered by how owners think: ongoing cost first, one-time costs next.

### 6.2 How values are normalised so they are comparable
| Case | Display | Rule |
|---|---|---|
| Single percent | `8%` + basis small text "of rent collected" | Basis always shown in the cell or header |
| Percent of first month (leasing) | `50%` + "of 1st month" | Never mixed with flat dollars in a sort |
| Flat dollars | `$150` + "flat" | |
| Flat fee per door | `$85-$145` + tag "3 plans" + `details` "Plans" listing each plan and price | Plans are never merged into one number |
| Range published | `7-10%` + tag "range" | Shown as published, never averaged, never the midpoint |
| Greater-of formulas (e.g. "$X or 25%") | text as published: "25% or $150, whichever is greater" | Not sortable, shown verbatim |
| Revenue basis (STR) | `20%` + "of booking revenue, not rent" | Not converted to rent; sits in its own property-type view or is flagged inline |
| Minimums | `$85 per month` or "$500 minimum on leasing fee" (from `minimums`) | |
| Per-type fees | One row per company per property type when fees differ; company name repeats with the type under it | PRD s9: schema must store ranges and plans (backlog Must) |

### 6.3 Unknown and blank values (four distinct states)
| State | Text | Meaning | Source line |
|---|---|---|---|
| Not published | "Not published" in gray chip | Company site checked, no figure | "Checked <date>: not on company site" |
| Not offered | "Not offered" | Company states it does not charge/offer this (e.g. flat-only plans) | cited |
| Not checked | "Not checked yet" | We have not looked at this fact | none |
| Varies | "Varies, ask company" | Company says it depends and gives no figure | cited |
Never 0, never a dash, never empty. The rent estimate column shows "Not enough published data" when no management or flat figure exists. Companies with no fee data are excluded from `/fees/` (PRD: table lists companies with published fees) but appear on city pages and profiles with "Not published".

### 6.4 Comparing at a glance
- Desktop/tablet (48rem+): real table, sticky first column, header cells with unit hints.
- Mobile: each company becomes a card with label/value rows in the same order (no sideways scroll).
- Compare mode: checkbox on each row, "Compare selected" for 2 or 3 rows, shows only those rows; "Show all" resets. Counter in a status region.
- Rent illustration: optional rent input (default 1500) adds the estimated monthly management cost per company, shown as a range when the company publishes a range; explicitly "illustration, not a quote". Excludes leasing and renewal.
- Sorting: default order is the ranking rule (PRD s6); user may sort by a column (built later, Stage 2 enhancement); the default is never price.

### 6.5 Mandatory labeling
Info banner above every fee table or fee summary: "**Companies we reviewed, not a market average.** This lists only companies that publish fees on their own websites (n of N). It is not a survey." Repeated in short form in captions of mini tables ("n companies we reviewed"). No sentence in a guide may call our numbers "average", "typical" or "the going rate"; third-party benchmarks may use their own wording only inside the attributed box.

## 7. Trust design
### 7.1 License badge states (Ohio: broker license, not a "PM license")
| State | Badge text | Style | Condition |
|---|---|---|---|
| Verified | "License verified" with check | green text, green border | Matches the state record; source and date shown |
| Stated by company | "License: stated by company, not verified" | gray | Company site states a license number |
| Not checked | "License: not checked" | gray | No data |
| Not found | "No matching license found" | red-ink, border; only after a documented check, with date | Needs owner policy on wording (open issue) |
| Expired/inactive | "License inactive (date)" | red-ink | From record |
Badge never means "recommended". Tooltip-free: explanation on profile in text.

### 7.2 Dates
Each fact shows "captured" (when we read it) and "last verified" (when we re-checked). Cards show only last verified; profiles show both in the source note; guides show "Last reviewed".

### 7.3 Source note (on every data point)
Format: `Source: <source name>, captured <date>, last verified <date>. [Open source]`. Visible text (not a tooltip), 0.8125rem, muted. Table rows: source in a column (cards: a line under the value). Aggregated facts (a count, a range across companies) cite the list of underlying rows.

### 7.4 Freshness
- Under 180 days: green "Verified <date>".
- Over 180 days: amber badge "Verified 8 months ago" plus banner text: "Fees last verified 8 months ago. They may have changed. Check the company site before relying on them." Banner appears on the card, the profile (under the H1) and the table row.
- Over 365 days: fee dropped from `/fees/` and the completeness count (PRD s6, s9); the profile shows "Last known: <value> (verified <date>). Not shown in comparisons until re-checked."
- Build rule: thresholds in one config (180/365) so the owner can change them.

### 7.5 Other trust elements
Footer identity line, About disclosure, Methodology change log, "Correct or remove" link everywhere, outbound links with `rel="nofollow noopener"` and no redirect, no ratings or reviews, no "claimed" badge (claiming does not change ranking, so it is not displayed as a quality signal; a plain "Details confirmed by the company, <date>" source note is used if the company supplies a fact).

## 8. Empty and thin states
| Situation | Behavior |
|---|---|
| City with 2 companies | Page generated `noindex`, not in sitemap, linked only from company pages; banner "We list only 2 companies here so far" |
| City with fewer than 2 | No page; the city is not in the home list |
| Filter returns 0 | Heading "No companies match these filters", what we list, suggestions (clear filters, other city, suggest an addition) |
| Company with only contact, areas, services | Not indexable per PRD (needs fees or license); if generated, `noindex`, shows "We have not found published fees" and the correct link |
| Fee unknown | s6.3 chips; page never hides companies that hide fees |
| All fees stale | Profile shows banner; fee comparison omits the company; city card shows warning |
| Fee guide with fewer than 5 rows | Page not generated (gate); link text in nav is removed, not left dead |
| Guide with no sources | Build fails |
| JS off | All content and links work; filters, compare mode and rent illustration simply absent; the form posts to the hosted tool (validation by browser `required`/`type=email`) |
| Search with no results | "No results for X" + links to cities and fee comparison |
| Placeholder data | Prototype-style "PLACEHOLDER" bar, noindex (already built) |

## 9. Reserved ad slots (not built, labeled)
Ads are not in the plan (traffic-value.md: about $1.50-$75/month). The layout reserves three places so adding them later does not shift layout, and so tables, forms and trust pages stay clean.
| Slot | Where | Size reserved |
|---|---|---|
| A | After the result list (city), after the fee table (fees) | 250px high, full width |
| B | Right rail at 64rem+ (profile, guides); after main content on mobile | 250px high |
| (none) | Never: above the fold on mobile, inside tables or forms, on corrections, about, privacy, methodology, 404 | n/a |
Rules if ever enabled: visible label "Advertisement"; dashed neutral box; never styled like a result; no ads from management companies in the same category placed as "recommended"; ads never affect order; update privacy policy and add the consent banner trigger (PRD s12) first. The prototype shows the boxes as "reserved, not built" for review only; production output contains no slot markup today.

## 10. Search and filter UX over static data
- **Site search (Pagefind)**: `/search/` page loads Pagefind UI on demand; the home page has a plain GET form to `/search/?q=` so no search JS loads on home. Index only `main` (`data-pagefind-body`); exclude nav, filters, footer (`data-pagefind-ignore`). Pagefind filters: `city`, `property_type`, `publishes_fees`, `page_type` set via `data-pagefind-filter` on profiles. Result title = H1, snippet from lede. Admin and placeholder pages excluded.
- **City filters**: only 2 controls (property type, publishes fees) over at most about 13 cards, done with a small script toggling `hidden`; URL parameter `?type=` pre-applies (home form uses it). No service filter at launch (service data is thin; add when 3+ distinct services exist per city).
- **Fee table**: compare checkboxes and rent illustration; no free-text filter needed for under 15 rows.
- **Bedrooms**: not a filter (no bedroom data; fees are per unit, not per bedroom). Findings in s12 task 1.
- Filter results announced in a `role=status` live region; filters are real form controls with labels; state in the URL where useful (`?type=`).

## 11. Accessibility approach (WCAG 2.2 AA)
Semantic HTML first (one h1, landmarks, real tables, real lists, real buttons and links); no ARIA where a native element works. Contrast pairs verified numerically in `accessibility-checklist.md` (all pass, lowest text ratio 7.11:1). 44px minimum targets. Visible 3px focus. Status changes via `role=status`. Form errors via summary with focus plus per-field messages. Reflow at 320px; table becomes cards on mobile. Text-only status cues (badges carry words). Reduced motion honored. Per-template checks and test plan: `accessibility-checklist.md`. The target is conformance claim only after axe, keyboard and screen-reader passes.

## 12. Performance guidance (Core Web Vitals, mobile p75: LCP 2.5s, INP 200ms, CLS 0.1)
- **No heavy JS.** Own JS under 10 KB, no framework on the client, no hydration; Astro outputs zero JS by default; the prototype's total is 4.3 KB. Pagefind JS/WASM loads only on `/search/`.
- **CSS**: one stylesheet under 15 KB (prototype 10.5 KB), inline critical or serve with long cache + `preload`; no CSS framework.
- **Fonts**: system fonts only (no font request, no swap shift).
- **Images**: none required (no logos, no company photos; the brief forbids copied images). If added: explicit width/height, AVIF/WebP, lazy-load below fold.
- **LCP element** is the H1/lede text: no render-blocking third-party scripts above it.
- **GA4**: load `async` after the `load` event; no Google Signals; keep out of `<head>` critical path. Budget it as the largest third-party cost (about 50 KB).
- **CLS**: reserved ad-slot height; table captions and banners are server-rendered, not injected; no late-inserted banners (freshness banner is build-time).
- **INP**: filter and compare handlers touch fewer than 50 nodes; no layout thrash.
- **Caching**: static hashed assets, `immutable`; HTML revalidated.
- **Budgets in CI**: Lighthouse CI on home, city, profile, fee table: performance 95+, LCP under 2.0s on mobile throttling, total transfer under 150 KB per page excluding GA4.

## 13. Usability scenarios (walked through on the prototype)
Persona P1: owner of a 3-bedroom house in Dublin. Click counts start on the home page.

### Task 1. Find a manager in Dublin for a 3BR house
Path: Home -> select city Dublin (default) -> property type "Single-family house" -> "Show companies" -> Dublin results (filtered by type) -> open a company card. **3 interactions + 1 click.**
Friction found: (a) No bedroom field exists, so "3BR" has no place to go. Fix: type labels use plain words ("Single-family house"), the scope note on the city page says fees are per unit, and the guide on fees explains per-unit vs per-bedroom. Do not add a bedroom filter (no data). (b) Users cannot tell which companies publish fees without opening each. Fix: the four fee facts are on every card and a "Only companies that publish fees" filter exists. (c) "Dublin" spans three counties; users may doubt completeness. Fix: "5 companies serve Dublin" lede plus methodology link.

### Task 2. Compare two companies
Path: City results -> "Compare these companies in the fee table" -> fee table -> tick two checkboxes -> "Compare selected" (enabled at 2) -> read rows. **4 clicks + 2 ticks.**
Friction found: (a) Button was inert until two selected with no explanation. Fix: status text "0 selected (choose 2 or 3)" and the button is disabled with `aria-disabled`. (b) More than 3 selected breaks readability. Fix: capped at 3 with a message. (c) Percent vs flat cannot be compared mentally. Fix: rent illustration column. (d) On mobile, compared rows are stacked cards, not side by side: acceptable (no sideways scrolling) but less ideal; see open issues. (e) Ranges (7-10%) could be misread as a midpoint; tagged "range", estimate shown as "$105 to $150 / mo".

### Task 3. Find the fee guide
Path: any page -> header "Fee guides" -> guide list/hub -> "Leasing fees" -> read. Or Home -> "For landlords" link -> guide. **2 clicks.**
Friction found: (a) "Fee guides" and "Landlord guides" are close in meaning. Fix: header label "Fee guides" for the fee set, "Landlord guides" for how-tos; the hubs cross-link; the fee comparison page links to guides in its scope banner. (b) Benchmarks from vendors could be mistaken for our data. Fix: separate "Not our data" box with source and date.

### Task 4. Correct a listing
Path: profile -> "Correct or remove this listing" (near the top, under the H1, and again at the bottom) -> form (company prefilled) -> choose "Correct a fact" -> fill fact + evidence link + name/role/email -> Send -> confirmation with request ID. **2 clicks to the form, about 6 fields.**
Friction found: (a) The link was only at the page bottom. Fix: added near the badges at the top; also in footer on every page. (b) "Remove" does not need evidence; showing the evidence field is confusing. Fix: choosing "Remove the listing" hides the fact and evidence fields. (c) Errors were easy to miss. Fix: error summary with focus plus per-field messages. (d) Owners worry about cost or an account. Fix: "Free. No account." in the lede; ranking effect statement. (e) Hosted form tool might break the page flow: pending owner decision.

### Task 5. Read a landlord how-to
Path: header "Landlord guides" -> guide -> TOC to "Common duties" -> "What local companies list" -> "Compare fees" card. **2 clicks to the guide; 1 click onward.**
Friction found: (a) A guide with no next step is a dead end. Fix: required next-step card (Compare fees | Companies in <city>). (b) Trust: "is this advice?" Fix: "general information, not legal advice" and last-reviewed date under the H1. (c) Guides with no local data feel generic. Fix: required "What local companies list" or an official-source block (build gate).

## 14. Open issues (for owner/PM/Developer)
1. **Mobile compare view**: stacked cards are not side by side. Option: allow a 2-column compare layout at 30rem for 2 selected rows. Needs a usability test on a real phone.
2. **Card label accessibility**: mobile fee cards render labels via CSS `data-label` pseudo-elements; some screen readers skip generated content. Alternative: emit visible `<span class="label">` text in each cell (costs HTML weight). Developer to choose; the desktop table markup is correct either way.
3. **License "not found" wording** and when it may be shown: needs the licensee file (supply-summary: 0 licenses confirmed) and owner policy.
4. **Hosted form tool** must meet WCAG 2.2 AA and let us style it or embed without iframe trouble; pending owner decision (open-questions.md).
5. **Schema gaps** for ranges, plans and "Provided by the company" source type (PRD s9, backlog Must) are prerequisites for s6.2.
6. **Rent illustration default of $1,500**: Columbus median rent figure comes from a vendor page (Hemlane, undated). Use a neutral example or the Census figure after verification; the default is labeled "example".
7. **Brand and domain** not final; logo is text only.
8. **Property-type page and fee-guide hub** templates are specified but not prototyped.
9. **Not tested with real users**: the walkthroughs are expert reviews. Run 5 short sessions on the live site (task list above) before Stage 2.
10. `Base.astro` nav and footer and `privacy.astro` ("no forms") must be updated to match s3 and s4.10.
