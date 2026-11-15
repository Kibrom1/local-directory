# UX revamp spec

Date: 2026-11-14 | Companion: `ux-review.md` (findings F1-F22), `ux-wireframes/index.html`. Builds on, and where noted replaces, `docs/ux/ux-spec.md`. Constraints held throughout: no payments, ads, sponsored or featured placement, accounts, reviews or ratings, lead forms or "contact this company" routing; unknown stays "Not published"; nothing implies endorsement.

Design stance: **a careful first edition.** The site has 6 indexable companies, 1 city, 6 fee rows and no human-checked facts. It wins trust by being exact about what it knows, when, how, and what it does not. Every template below is specified for 1 item as well as 20.

## 1. Principles (additions to ux-spec s1)
1. **Name the check.** Every fact says who or what read it: our tool or a person, and when.
2. **Gaps become questions.** Each "Not published" is an item on the owner's "ask the company" list.
3. **Show coverage before results.** Say what we cover and what we do not, once, plainly.
4. **Never hide a company for missing data; group it.**
5. **Numbers are ranges with named exclusions**, never a total that silently leaves things out.
6. **One page, one job.** Fee guides = what companies publish. Guides = how to decide. Profiles = one company's published facts. Tables = comparison.

## 2. Information architecture
Four owner tasks drive the top level: **find a company, compare fees, understand fees, learn.**

```
Home  /
├─ Find companies  /companies/            (new: all companies we list, grouped by city; noindex if thin)
│   ├─ City page  /city/<slug>/           (indexable only when gate met)
│   ├─ Property-type page  /property-types/<slug>/
│   └─ Company profile  /company/<slug>/
├─ Compare fees  /fees/                   (table + first-year estimator)
├─ Fee guides  /fee-guide/                (what companies publish: management, flat, leasing, renewal)
├─ Guides  /guides/                       (how to decide: choose a manager, what a manager does, agreement checklist, cost overview)
├─ About the data  /methodology/          (How to read this site + rules and change log)
├─ Corrections  /corrections/             (+ /corrections/log/)
└─ About /about/  ·  Privacy /privacy/  ·  Site map /sitemap/ (HTML, new)  ·  Search /search/
```

Changes from ux-spec s2:
- **Add `/companies/`.** The "Cities" anchor on the home page is a poor destination and the city picker has 1 option at launch. `/companies/` lists every company we publish, grouped by city served and then "Area not stated", with the same card and a "Publishes fees" marker. Indexable when 5+ indexable profiles exist; otherwise noindex,follow.
- **Header nav, 5 items:** Find companies · Compare fees · Fee guides · Guides · About. Rename "Landlord guides" to **Guides**; "Cities" disappears (cities are inside Find companies). Items link only to existing pages (existing rule); at launch "Guides" appears as soon as one guide is published.
- **Footer:** Corrections (same position every page), Corrections log, Methodology, Site map, Privacy. Remove the long identity paragraph; replace with a two-line version and the operator sentence.
- **Cross-links (required, a build check):** every guide links to the fee guide or fee table *and* to `/companies/`; every fee guide links to `/fees/` and the matching guides; every profile links to its city (if exists), `/fees/`, "Questions to ask" and Corrections; every page except legal ones shows the footer Corrections link.
- **Merge** the two draft `type: fee-guide` files that sit in `/guides/` into the generated `/fee-guide/` pages (see s7) so one question has one URL.
- Breadcrumbs: Home > Find companies > Columbus > Company.

## 3. Home page
**Job to be done:** "I own a rental in or near Columbus. Tell me quickly who can manage it, roughly what it costs, and whether I can trust this."

**First screen (375px, no scroll) must contain:** H1 (plain task wording), one-line lede, the two primary actions, a coverage line with a date, and the trust sentence. Nothing else.

| Block | Content |
|---|---|
| H1 | "Property management companies in the Columbus area: what they publish and charge" |
| Lede | "Free and independent. No ads, no paid placement. Each fee shows where it came from and how it was checked." |
| Primary actions (links, not a form) | **See what companies charge** → `/fees/`; **Find companies in your city** → `/companies/` |
| City chips | One chip per indexable city plus "All cities we list". Rendered only if there are 2+; if 1, a single sentence "We have a Columbus page; other cities are listed on All companies." |
| Coverage line | "We list {N} companies. {M} publish their fees online. Facts last read {date}." Linked "What we cover" → coverage panel (below) |
| Trust sentence | "Read by our tool from company websites; people check the fees we publish most prominently." (use only the wording that is true; see s6) |

Below the fold: (1) **Coverage panel** (N companies, M with fees, cities with pages, cities in our data without a page and why); (2) three **task cards** with live counts ("Compare fees from 6 companies", "Read: what to ask a manager", "How we check facts"); (3) Guides (2-3); (4) "Run or own a listed company?" Corrections link; (5) the site search, shown only when the search index is available (feature-detect).

No hero image, carousel, testimonials, ratings, "top picks". Counts are coverage, never market statistics.

**No-JS:** every action above is a link. The optional "Find a company" form posts GET to `/companies/?city=<slug>&type=<slug>` (a real form with `action`), and `/companies/` honors the query as a page anchor (`#city-columbus`) via a small redirect-free fallback: the form submit goes to `/companies/#<city>` when JS is off. No picker with fewer than 2 options is ever rendered.

## 4. Find companies: search, filters, city and property-type pages

### 4.1 `/companies/` (new) and `/city/<slug>/`
Same component; the city page is the same list scoped and with a short city intro.

Order of blocks:
1. H1 "Property management companies serving Columbus, OH" + lede with counts: "13 companies say they serve Columbus. 6 publish fees online."
2. **Coverage line** (not a banner): "Data last read Nov 11, 2026. 6 of 13 have fees we have read. How this list is ordered" (disclosure with rank rule).
3. **Group-by controls (replace filters that hide):** "Show: All · Publishes fees · Serves single-family · ..." as links or radio buttons that *regroup* rather than remove. Groups: "Say they serve this type (n)", "Type not stated (n)". Nothing is hidden.
4. List (compact cards, s4.2).
5. If the city has a page that is noindex or not published: "We have {n} companies in our data for Dublin but not enough checked facts to publish a Dublin page. See them in All companies."
6. Place facts (counties) and related guides: only if sourced.

### 4.2 Result card (two variants)
- **Full (has a fee row):** name · "Read from website Nov 11, 2026" · Management / Flat / Leasing / Renewal (same order as table) · "Fees for: single-family" when known · one source line · "Fees may be older than..." only past 180 days.
- **Compact (no fee row):** name · "No fee data recorded yet" · "Says it serves: Columbus, Delaware" · link "Check the company's pricing page" only if the company's own pricing URL is known. No four empty cells.
- License badge shows only when informative: "License stated by company" or "License matches Ohio record". "License not checked" is not a badge; it lives on the profile.
- Name is the link; no "Contact" button; no star, score or "featured".

### 4.3 Search (Pagefind)
Keep `/search/` noindex. Home search appears only when the index exists. No-JS: link to `/sitemap/` (plain A-Z list of every page). Search results title = H1; page types labelled (Company, City, Fee guide, Guide). Zero results: "No results for X" + links to All companies, Compare fees, Corrections ("Is a company missing?").

### 4.4 Property-type pages
Keep the ux-spec 4.8 template. Add: (a) the same grouping (stated / not stated); (b) a plain sentence "Only {n} of {N} companies state which property types they handle, so this list is short."; (c) STR on a revenue basis in its own table. Gate unchanged (3+).

## 5. Fees
### 5.1 `/fees/` layout
1. H1 "Property management fees from the companies we reviewed".
2. **Scope line** (one, positive): "6 of the 13 companies we list publish fees on their own websites. These are their numbers as published; the others are not in this table because they show no fees."
3. "How to read this table" disclosure (basis, ranges, plans, Not published, what is excluded).
4. **Estimator** (s5.3).
5. Table (desktop 48rem+): columns Company · Management · Flat · Leasing · Renewal · Minimums · Year-one range · Checked. Sticky first column. Row details disclosure holds plans and notes.
6. Mobile (<48rem): stacked cards, label above value, no right-aligned values, no sideways scroll. Compare mode (pick 2 or 3) stays a 48rem+ enhancement; on mobile the estimator's sort replaces it.
7. Third-party benchmarks are never on this page (they live in fee guides in the "Not our data" box).
8. "Where numbers come from" + methodology + Corrections.
9. "Questions to ask any company" (the 8 from s10) with print link.

### 5.2 Scope framing without being unhelpful
Principle: **say it once, say what it supports, give the next step.**
- Headline sentence: "6 of 13 companies publish fees. Here is what they publish."
- What this table can support: "how companies structure fees (percent vs flat, one-time fees); the range among companies that publish." What it cannot: "what is typical, or what a company you call will quote."
- Next step: "Companies that do not publish fees: ask them for these 8 things" with the question list.
- Forbidden words about our figures: average, typical, normal, going rate, median, best, cheapest, recommended. Range summary only as "from X to Y across n companies" and only when n >= 3.
- Header on fee guides repeats the n and date in the caption, not a banner.

### 5.3 First-year cost estimator ("What might year one cost?")
Purpose: convert percent / flat / one-time fees into a comparable dollar range, honestly.

**Inputs (no personal data, nothing stored or sent):** monthly rent per unit (number, preset buttons $1,000, $1,500, $2,000, no default selected on first load but the no-JS table uses $1,500 labelled "example"); number of units (1-4, default 1); "New tenant placements in year one" (0 or 1, default 1; explanatory text "A leasing fee is charged when a manager places a new tenant"); "Lease renewals in year one" (0 or 1, default 0).

**Outputs per company** (one row or card):
- Management cost for 12 months: published percent × rent (greater-of floors honored), flat fee × 12, or range; a company with plans shows the range across plans; a company with ambiguous basis (Mynd: per home or total unclear) shows "Basis unclear on its page" and is excluded from the number.
- Leasing fee (if placing): percent of one month, or flat.
- Renewal fee (if renewing).
- **Year-one range** = sum of components the company published. If any selected component is not published the row says: "Range covers management and leasing only. Renewal fee not published." The label is always "Published components only", never "total".
- Sort: default order (rank rule); user may sort by year-one range low (explicit action, announced). Default is never price.
- Companies with a revenue basis (short-term rental) are excluded with a visible line.

**States:** empty rent → "Enter a rent to see ranges" (table remains fully readable); invalid → inline error; 0 published components → "Not enough published data". Results announced in a `role=status` line ("6 companies, ranges updated"). Calculation runs in the browser; reuses `estimate.mjs` extended with leasing/renewal. No JS: the table shows the $1,500 example column, server-rendered, and a static three-rent table (1,000 / 1,500 / 2,000) in a `details`.

### 5.4 Not-published states (copy)
| State | Visible text | Where it applies | Note |
|---|---|---|---|
| Checked, absent | **Not published** | Company page read; no figure | Owner's required wording; add "Checked Nov 11" in the source note |
| Not offered | Not offered | Company states it does not charge | cited |
| Varies | Varies, ask the company | Company says it depends | cited |
| Never captured | Not recorded | Field we have not looked for (phone, address) | links "Check the company's website"; never implies the company hides it. Needs developer data support (Q3) |
| Unclear | Page does not say clearly | Ambiguous on source (Mynd flat per home?) | quote the note |

### 5.5 Fee guides
Keep ux-spec 4.5 with these changes:
- Each guide opens with a plain-language answer to its question in 2 sentences ("A leasing fee is charged when a manager finds you a new tenant. Companies we reviewed publish it as 50% to 100% of one month's rent, or as a flat amount.") built from data only when n >= 3; otherwise a definition without numbers.
- Table caption: "n companies we reviewed; read by our tool Nov 11".
- "What this means at $1,500 rent" illustration kept, labelled "illustration".
- Third-party benchmarks in a gray "Not our data" box, each "Published by X (date), accessed Y; vendor-written" where applicable.
- "Questions to ask" and "Read next" (fee comparison, matching Guide).
- Gate stays 5; below 5 show the hub line "management fee: 4 of 5 companies publish it; a guide appears at 5." (existing) and nothing more.

## 6. Trust and transparency
### 6.1 Verification wording (required vocabulary)
| Meaning | Words on the page | Source-note form |
|---|---|---|
| Our tool read the company's page | **"Read from the company's website by our tool on Nov 11, 2026."** | Source: Company pricing page. Read by our tool Nov 11, 2026. Not yet checked by a person. [Open page] |
| A person compared it to the page | **"Checked by a person on <date>."** | Source: ... Checked by a person <date>. |
| Company supplied it, no public page | **"Provided by the company, <date>. Not independently checked."** | existing |
| Company page changed since | "The company's page may have changed since <date>." | after 180 days |
Never use the bare word "verified" for a fee or service. Freshness badge text: "Read Nov 11" or "Checked by a person Nov 11"; 180-day amber: "Read 8 months ago: may have changed".

### 6.2 License wording (Ohio: broker license)
| State | Text |
|---|---|
| Matches state record | "License matches the Ohio state record (checked <date>)." plus license holder name and number as on the record |
| Stated by company | "The company says it is licensed (quote). We have not checked the state record." |
| Not checked | profile text only: "We have not checked a license for this company. Here is how you can: [Ohio license lookup]." |
| No match | "We did not find a matching license on <date>. This may be a name difference. Ask the company." (only after a documented check; owner approves wording, Q in review) |
Always: "In Ohio, charging a fee to manage rentals falls under a real estate broker license. A license shows the company is registered; it does not say anything about service quality."

### 6.3 Methodology
Split into two pages: **How to read this site** (owner-facing, one screen: what we list, how a fact gets here, how to read dates, how companies are ordered, what we do not do) and **Rules and change log** (thresholds, gates, dated changes). Dated change log stays. Add "How we check" with the two levels (tool-read, person-checked) and the target share person-checked.

### 6.4 Independence and no endorsement
- Every list page carries the ranking sentence in the disclosure, not a banner: "Order: serves this place, then how much we have checked, then A-Z. Fees and payment never affect order."
- Profile never uses "recommended", "best", "top", "trusted", "preferred". License badge never green-ticked unless matched to the state record.
- About names the operator and related business in plain words (build fails if empty).
- Outbound links: `rel="nofollow noopener"`, same tab, no redirect.

## 7. Landlord guides and internal linking
**Rule:** Fee guides (data) vs Guides (editorial). Decisions for the six drafts:

| Draft | Decision | Link into data |
|---|---|---|
| what-does-a-property-manager-do | Publish first | Block "What the fee rows we read include" links to `/fees/`; sample questions link to profile questions |
| how-to-choose-a-property-manager-columbus | Publish first | Links to `/companies/`, license lookup, `/fee-guide/` |
| management-agreement-checklist | Publish | Links to profile "Questions to ask" and `/fee-guide/leasing-fee/` |
| property-management-cost-columbus | Merge into `/fees/` (estimator) and `/fee-guide/` hub; keep an editorial "Cost overview" guide only if it adds Ohio context | Estimator embedded as link |
| leasing-fee-vs-renewal-fee | Split into `/fee-guide/leasing-fee/` and `/fee-guide/renewal-fee/` (data-driven); keep "difference" paragraph | n/a |
| ohio-security-deposits-process | Hold (Stage 2, human legal read of ORC 5321.16) | n/a |

Template changes: **Next-step card** gets a city picker (links to indexable cities), "Compare fees", "Questions to ask a manager (print)". Replace "first indexable city" logic. Inline links are allowed in the body with the pattern "[n companies] publish this; see them: /fees/#leasing". Each guide gets a "Related" row of two cross-type links. Reading time and "Last reviewed" visible under H1; "General information, not legal advice" stays. Guide front matter slugs must map to existing routes (draft placeholders differ, e.g. `/guides/leasing-fee-vs-renewal-fee/` vs `/fee-guide/leasing-fee/`).

## 8. Company profile (content blueprint)
Order and what is shown when data is thin:

1. H1 company name. Meta row: license note (only if informative) · "Read from website Nov 11, 2026" · "Correct or remove this listing" (top).
2. **At a glance** (definition list, 5 rows): Serves (areas) · Property types stated · Publishes fees (Yes/No, date) · License note · Website. Each value Not published / Not recorded as per s5.4.
3. Freshness banner only if over 180 days.
4. TOC (only sections that exist).
5. **Fees** (existing table) preceded by one line "Published by the company on its own website, not a quote." After the table: **"What this means at your rent"** link to estimator pre-set to this company (`/fees/?company=<slug>#estimator`, canonical `/fees/`).
6. **What the fee covers, as the company states it** (new). Only verbatim or tightly paraphrased facts from the page (e.g., "Fee includes: rent collection, accounting"); if none: "The company's pricing page does not say what the monthly fee covers. Ask: [question]."
7. **Terms we have not seen** (new, generated checklist): contract length, cancellation fee, who holds deposits and owner funds, maintenance and vendor markup, setup fee, termination notice. Each line "Not published on pages we read" or the published fact with source.
8. **Questions to ask {company}** (new, generated): from missing facts plus the 8 standard questions; collapsed `details` with a "Print this list" link. This is the profile's primary next step instead of a contact button.
9. License (existing, new wording s6.2).
10. Service areas (linked to city pages that exist, plain text otherwise).
11. Services and property types: only show non-empty groups; empty → one line "No services recorded yet" with Corrections link (invites the company, not a spec).
12. How to reach them: website (labelled "Visit company website, opens their own site"), phone ("Not recorded" or number with source), address. "Nothing is routed through this site." No form, no email capture.
13. Is this your company? (existing box) with per-section "Correct this" links prefilling `?section=fees`.
14. Sources list at the end of the page (every source note's URL once) for trust and for screen reader users.

No prose copied from the company. No rating, star, badge of quality.

## 9. Sparse-data and empty states (design honestly)
| Situation | Treatment |
|---|---|
| Site-wide coverage is small | Coverage panel on home (s3) with date; footer line "First edition. N companies." |
| City without a page (Dublin: 5 companies, 0 with fees) | `/companies/` group "Dublin (5)", links to the compact cards; text "Not enough checked facts for a Dublin page yet" |
| City page with companies, 0 fee rows | Page says so first: "None of the 5 companies publish fees on their websites. Ask them these questions." + question list + link to `/fees/` (Columbus) |
| Profile with no fees | Compact profile: at a glance, areas, contact, questions; Fees section = "We have not read fees for this company" + company's pricing page link if known |
| All services empty | Hide the Services block; show 1 line on the at-a-glance row |
| Fee comparison with 6 rows | Fine; no "pagination", no "load more"; show "6 companies" |
| Fee guide below gate | Not generated; hub row "4 of 5" |
| Zero guides published | "Guides" not in nav and no teaser on home (no "coming soon" promise) |
| Zero results after regroup | Not possible (grouping hides nothing); if zero companies at all, show coverage panel |
| Property-type page below gate | Not generated; type listed as text on profiles |
| Corrections form unconfigured | Existing red banner; build fails in strict mode |
| Stale data | Existing banner; plus "Facts last read" date in footer |
| Search index missing | Search box hidden; Site map link |

Microcopy for counts: use "6 of 13 companies publish fees" not "only 6", no apologies, no "coming soon" promises.

## 10. Microcopy and tone
Plain, specific, calm. 8th-grade reading level; sentences under 22 words; second person for the owner, third for companies. No "we're thrilled", no urgency, no scarcity words.

| Instead of | Use |
|---|---|
| Not checked yet | We have not recorded this yet (or **Not recorded**) |
| Verified 2026-11-11 | Read from website Nov 11, 2026 |
| Basis as published | Calculated on (rent collected / first month's rent) |
| Minimums | Minimum monthly fee |
| Est. monthly cost | Year-one range (published fees only) |
| Open source | Open {company} pricing page (link names the thing) |
| Companies we reviewed, not a market average (repeated) | 6 of 13 companies publish fees. These are their numbers. |
| Illustration only, not a quote | Example at $1,500 rent. A company's quote can differ. |
| Compare selected | Compare these 2 |
Standard questions (shared bank, used in fee guides, profiles, guides and the print page):
1. What does the monthly fee include and exclude?
2. What are all one-time fees (leasing, setup, renewal, lease-up, inspection)?
3. How long is the contract and what does ending it cost?
4. Who holds my rent and deposits, and where (trust account)?
5. Do you mark up maintenance or vendor invoices?
6. What is charged if a unit is vacant?
7. How and how often do I get statements and payouts?
8. Which Ohio broker license do you operate under (number), and who is the designated broker?

## 11. Corrections flow (P3)
- **Entry:** every profile (top and per-section), footer, `/corrections/`. Query prefill: `?type=&company=&section=`.
- **Form changes:** evidence = link **or** "I can send documents by email"; remove "request ID" promise (hosted tool) and say "You will get an email reply within 3 business days" + what was received; add "which part" select prefilled from `section`; remove name/role required (keep email required); show a short "What we will publish" statement: "Facts with a public page or a company-provided note ('Provided by the company, <date>')."
- **Confirmation page** (`/corrections/thanks/`, noindex): what happens next with dates computed in text ("by Nov 19").
- **Public log** `/corrections/log/` (static, from data/git): date received, company, section, outcome (Applied / Not applied, reason code), date applied. No requester data.
- Tone: "Fix a listing" first, "Remove" second and equal weight; removal needs no reason, says it is done within 5 business days and that suppressed companies are not re-added.
- A11y per accessibility-checklist s3 plus: no CAPTCHA; honeypot only.

## 12. Accessibility (WCAG 2.2 AA), mobile, performance, no-JS
Keep accessibility-checklist unchanged. Additions:
- **Reflow:** 320px test in CI: assert no horizontal scroll (`scrollWidth <= innerWidth`) on home, city, profile, fees, guide, corrections. Row header `min-width` and right-aligned values removed under 40rem (F12).
- **Link purpose (2.4.4):** source links name their object: "Open {company} pricing page" (visible) or visually hidden suffix.
- **Region label:** only apply "scrolls sideways" label when the table scrolls.
- **Estimator:** label + hint via `aria-describedby`; results in a status region; inputs 44px; error text next to field; not time-limited.
- **Grouping controls:** use real links/radios; announce counts; focus not moved.
- **Dates:** `<time datetime>` with long text dates.
- **Print:** stylesheet for profile "Questions to ask" and the fee table.
- **Target size 24px+ (2.5.8) and Focus Not Obscured (2.4.11)** unchanged, verified in the plan.
- **Cognitive load:** one primary action per screen; max 5 nav items; consistent order; help (Corrections, Methodology) in the same footer place (3.2.6).
- **Performance:** budgets in ux-spec s12 stand (no new client JS beyond estimator ~2 KB gzip; no images; system fonts). Estimator and grouping are progressive enhancements. No layout shift: server-render the example column and counts.
- **No-JS matrix:** home (all links, GET form with action) ✓; companies/city (full list, group headings static) ✓; fees (table + $1,500 column + static 3-rent table) ✓; profile ✓; guides ✓; corrections (form posts natively; browser validation) ✓; search ✗ (replaced by Site map).

## 13. Analytics (GA4, no personal data)
Keep: Google signals off, no ad personalization, no user IDs, no PII in events, no free-text, no company name in event values beyond the slug (a public identifier), no query text from search or forms.

| Event | When | Parameters (all enumerated or slugs) | Success question |
|---|---|---|---|
| `find_start` | Home action link or form used | `source: home_cta\|city_chip\|form`, `city_slug` | Do owners find companies? |
| `list_group` | Group control used | `group: all\|fees\|type_<slug>`, `page_type` | Do owners need filters? |
| `company_view` | Profile loaded | `slug`, `has_fees: y\|n`, `age_bucket: 0-90\|91-180\|180+` | Which companies matter? |
| `outbound_company` | Click on company website | `slug`, `from: profile\|card\|table` | Primary P1 success |
| `fee_table_view` | Fee table in viewport 50% | `rows` | Reach |
| `estimator_use` | First valid estimate | `units`, `rent_bucket: <1000\|1000-1500\|1500-2000\|>2000` | Is it used? |
| `estimator_sort` | Sort by year-one | none | Trust in numbers |
| `plans_open` | Plans details opened | `slug` | Detail demand |
| `question_list_open` / `question_list_print` | Questions list opened / print clicked | `from: profile\|fees\|guide` | Does "what to ask" work? |
| `source_open` | Source link click | `kind: company\|state\|third_party` | Do owners check sources? |
| `guide_next_step` | Guide next-step click | `target: fees\|companies\|city`, `guide_slug` | P2 to P1 conversion |
| `guide_scroll_90` | 90% scroll on guide | `guide_slug` | Read-through |
| `search_use` | Search submitted | none (never the query) | Search value |
| `corrections_start` / `corrections_submit` | Form focus / submit | `type`, `section`, `from` | P3 funnel (form tool completion is not visible; use thanks page view) |
| `corrections_log_view` | Log viewed | none | Transparency use |
| `nav_methodology` | Methodology link | `from` | Trust-seeking |
| `empty_state_shown` | Sparse state rendered | `kind: no_fees\|city_no_page\|zero_results` | How often are we thin |
Weekly view: add to `metrics.md` table: outbound-per-profile-view, guide-to-fees rate, estimator-use rate, corrections funnel.

## 14. Implementation plan for the developer
Ordered; each item lists the finding, files, acceptance test. Developer owns code; nothing below was changed by this review.

**Phase A: trust and dead ends (before launch; P0)**
1. Verification vocabulary (F2). `SourceNote.astro`, `fees.mjs` `freshnessBadge`, `Badge`, Methodology copy, schema already has `verification_method`/`human_verified_date`. AC: no template prints "Verified" for a fee; agent-read rows say "Read from website".
2. Unknown states (F3). `Unknown.astro` add `not_recorded`; profile contact uses it; ResultCard and profile never say "Not published" unless a check date exists. Data: per-field check marker (developer to design).
3. Home (F1, F5, F17). `index.astro`, `find.js`: links first, real GET form, coverage panel, no picker with <2 options. AC: no-JS user can reach `/companies/` and `/fees/` from home in one click.
4. `/companies/` page and `/sitemap/` (new routes). AC: lists all published companies; noindex when <5; no hidden companies.
5. Publish guides (F4). Resolve draft slugs, merge two fee drafts into fee guides, set `status: published` for three guides after human check; Next-step card with city picker. AC: nav shows Guides; every guide links to fees and companies.
6. About operator and disclosure required (F10). `about.astro`, env check.

**Phase B: decision support (launch window; P1)**
7. City/companies grouping instead of hiding (F11) in `filters.js`, `ResultCard`, city template.
8. Compact result card (F15).
9. Estimator with leasing/renewal, units and named exclusions (F6). `estimate.mjs`, `fees.js`, `FeeTable`, `fees/[...slug].astro`.
10. Profile blocks: at a glance, what the fee covers, terms not seen, questions (F9). New data keys needed only for "what the fee covers" (optional `inclusions[]` with source).
11. Scope copy rewrite (F7), microcopy pass (s10), date formatting (F16).
12. Corrections: evidence-or-email, thanks page, log (F8). `corrections.astro`, `corrections.js`; log page from a `data/corrections-log.json` (public, no requester data).
13. Mobile fixes and CI test for reflow (F12); source link names (F13).
14. Search degrade (F14).

**Phase C: after launch (P2)**
15. Methodology split (F22), glossary disclosures (F19), nav rename, analytics events (F20), property-type grouping, print styles.
16. Usability tests: 5 owners, 3 tasks (find fees in Westerville, estimate year one, find what to ask); 2 property managers on the corrections flow. Success: 4 of 5 complete each without help.

**Acceptance for the whole revamp:** axe zero serious/critical at 320 and 1280; no horizontal scroll at 320; no-JS matrix in s12 passes; copy audit finds none of: verified (for fees), average, typical, best, top, recommended, featured, partner; every fact shows source, date and check level.
