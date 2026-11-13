# PRD: Columbus-area property management directory and landlord guide (widened, staged launch)

Status: draft for owner review | Date: 2026-11-11 | Author: PM agent
Inputs: `docs/BRIEF.md`, `docs/researcher/*` (cited by file), Developer foundation (`README.md`, `adr-001-stack.md`, `schemas/`, `src/`).
Owner decision at research gate: WIDEN to landlord topics, staged launch of 30-60 pages, revised thresholds in `docs/researcher/thresholds.md`.

## 1. Product in one paragraph
A free, independent, no-account website for rental owners in the Columbus, OH metro (Franklin, Delaware, Fairfield, Licking counties). It combines (a) a directory of property management companies with sourced facts, (b) the only structured, multi-company Columbus fee comparison we found (`demand.md` section 2: no competitor checked has one), and (c) landlord how-to guides that reuse the same data. Goal: organic traffic. No revenue in the current plan.

## 2. Evidence constraints that shape scope
| Fact | Source | Consequence |
|---|---|---|
| 13 Tier A companies (local office confirmed), 21 with Tier B and leads; 0 licenses confirmed against the state record | `supply-summary.md` | Directory alone cannot fill 150 pages; staged launch |
| 9 companies / 10 rows publish fees on their own pages (management % 6, flat 3, leasing 8, renewal 7) | `fee-data-notes.md`, `fee-benchmarks.md` section C | Fee data is the differentiator but small; label as "companies we reviewed", never as a market average |
| Ohio has no separate PM license; managing rentals for a fee falls under a real estate broker license | `supply-summary.md` | License field means "brokerage license", not "PM license"; candidate list must come from company sites |
| Search volume for Columbus is unmeasured (estimate 3,800-19,600, low confidence) | `demand.md` | Keyword Planner pull is a gate before the landlord content plan is final |
| Programmatic/thin pages are a site-trust risk | `demand.md` (Mueller, 2026-09-07) | Unique-data publishing bar (section 10) |
| Ad income would be about $1.50-$75/month at expected traffic | `traffic-value.md` | Ads are not a plan; owner question only |

## 3. Personas and jobs-to-be-done
**P1. Rental owner choosing a manager** (primary). Owns 1-4 rental units in Columbus or a suburb; has never hired a manager or is dissatisfied with one.
- When I am deciding whether to hire a manager, I want to see what each local company charges, in comparable terms, so I can estimate my cost before I talk to anyone.
- When I own a duplex or single-family home in a specific suburb, I want to know which companies serve that suburb and property type.
- When I read a fee, I want to know where it came from and how old it is, so I can trust it.
- Success: reaches a company profile or fee comparison, clicks through to a company's own website (plain link).

**P2. Landlord with a how-to question** (widening audience). Self-managing or considering it; arrives from an informational query (what a manager does, what fees are normal, how to price rent, how the process works).
- When I have a question about managing a rental, I want a clear, sourced, Columbus-aware answer, and a path to the fee data if I decide to hire.
- Success: reads a guide, then visits fee comparison or a city page (internal click-through).

**P3. Management company wanting its listing accurate.**
- When my company is listed, I want to correct wrong facts or remove my listing for free, without creating an account, and see the fix published.
- Success: submits a correction or removal, gets a reply, sees the change on the next build.

## 4. MVP scope (widened, staged launch, 30-60 indexable pages)
Everything below ships at launch unless marked Stage 2.
1. **Directory:** company profiles (only those clearing the quality bar), city pages, property-type pages (only where the bar is met).
2. **Fee comparison page** (companies with published fees; per-fee columns; every cell with source link and dates) and **Columbus fee guide set** (hub plus leasing fee, renewal fee, percent vs flat) combining our dataset with attributed third-party benchmarks (`fee-benchmarks.md` sections A/B, "published by X, accessed date").
3. **Landlord guides**, prioritized list in `backlog.csv` (content epic). Launch with the guides that reuse our data or verified official sources; legal-process topics (eviction, deposits) are Stage 2.
4. **Search and filter** (Pagefind, client-side): by city, property type, service, "publishes fees".
5. **Free claim/correct flow and removal flow** with suppression list.
6. **Trust pages:** About (identity, disclosure), Methodology (sources, ranking, freshness), Corrections, Privacy.
7. **Tracking:** GA4 and Search Console, rough numbers.
8. **SEO foundations:** sitemap, canonicals, robots, structured data, internal linking, noindex tier for thin pages.
9. **Scraper pipeline** limited to registry-approved sources, output as reviewed diffs.

## 5. Non-goals (explicit)
No payments or billing of any kind. No paid placement, featured listings, verification badges for a fee, affiliate or referral links, sponsored "best of" lists. No rental listings. No tenant referral. No lead-gen, quote forms, "contact this company" buttons or inquiry routing (company websites and phones are shown as plain public facts; outbound links carry no tracking redirects or referral parameters). No accounts or logins. No database, backend or admin UI. No user reviews or ratings (no personal data, no moderation burden). No legal advice (guides describe public processes and link to official sources). No collecting personal data about individuals beyond a business's published public contact details. No school-district pages at launch (`supply-summary.md`: 0 supportable; `demand.md`: SERP is rental listings).

## 6. Listing-ranking rules (neutral)
1. Default order on any list: (a) **relevance** to the page context (serves this city; offers this service; serves this property type), then (b) **data completeness score**, then (c) alphabetical by name. Ties are deterministic.
2. Completeness score = number of populated, verified fact groups out of 6 (license, fees, areas, services, property types, contact), matching the groups in `src/lib/quality.json`. A group counts only if its `last_verified_date` is within 365 days (proposed).
3. Never an input: payment, relationship with the site owner, claim status, advertising, company size, any related business (see section 8).
4. A fee value's amount never affects rank (cheapest is not "best"). Fee tables may be user-sortable by column; default is rule 1.
5. Unknown values display "Not published" and are not penalized beyond the completeness count. Companies that hide fees are listed, not hidden.
6. The rules are published on the Methodology page. Any change to them is logged there with a date.

## 7. Free claim/correct flow (no accounts, manual review)
- **Entry points:** "Correct or remove this listing" link on every company page and the footer; Corrections page.
- **Channel:** a hosted form (recommended: a free hosted form tool, third-party, no backend) with email as fallback. Fields: company name or profile URL; request type (correct / add / remove); the fact(s) and new value; evidence URL on the company's own site or other public source; requester name, role and email (used only to verify and reply). Owner decision on tool: `open-questions.md`.
- **Verification:** reply goes to an email on the company's own domain or to a published contact on its site. Unverifiable requests get one follow-up, then are held (proposed 14 days) and closed.
- **Publishing rule:** a correction is published only with a public source (the company's own page, license record). If the company supplies a fact with no public page, it may be published as "Provided by the company, [date]" with a source record of that type (schema gap, see backlog). Provenance rules in section 9 still apply.
- **SLA (proposed, owner to confirm):** acknowledge within 3 business days; apply within 14 days; removals applied at the next deploy and within 5 business days.
- **Log:** one row per request in a private log (not in the public repo if it contains requester emails). Public repo keeps only the suppression record (schema already contains no requester data).
- **No effect on ranking.** Claiming does not boost placement.

## 8. Site identity, disclosure
- **Name:** TBD from `domain-shortlist.md`. PM recommendation: **columbuspmguide.com** (guide wording fits widened scope and directory intent; short; no conflicting business found) with **centralohiopropertymanagers.com** as the alternative (best exact match, covers all four counties, but reads as directory only). Avoid "Buckeye" names (caution in the shortlist). Both need registrar and trademark-screen confirmation (not legal clearance).
- **About page must state:** who operates the site (owner decision on individual vs existing business entity), that it is free and independent, no paid listings, how data is collected, how to correct or remove, a contact address (current stub has a TODO).
- **Related-business disclosure:** the owner operates Gashana (productized consulting for property managers) and other businesses. The About page states any business that sells to or serves property managers, in plain words. Rules: no cross-promotion on listing, fee or ranking pages; no ranking effect; if a Gashana customer is ever listed, that is disclosed on that profile. Owner decision on wording and whether to link: `open-questions.md`.
- **Editorial policy (on Methodology page):** no monetization today; if any is introduced it is disclosed there first.

## 9. Data-provenance requirements
- Every fact (fee, license, service, area, property type, contact) carries `source_id`, `captured_date`, `last_verified_date`, rendered on the page next to the fact (or in an expandable "source" line) with a link to the source URL.
- Every `source_id` resolves to a registry row with `use_allowed: true`, robots and ToS decision with checked dates.
- Unknown = null/blank, never 0 or guessed. A third-party roundup is never a value source (rule used in `fee-data-notes.md`).
- Third-party benchmarks (`fee-benchmarks.md`) are rendered as "Published by [source], accessed [date]", visually separate from our company data; vendor-written sources are labeled as such.
- Ranges and plans: fee rows must not collapse ranges (HomeRiver 7-10%, leasing 25-100%, 10X ranges) into one number; the schema currently stores single values, so a schema change is a Must (backlog).
- Freshness display: fact older than 180 days shows "last verified N months ago"; older than 365 days is dropped from the fee comparison and from the completeness score until re-verified (proposed values).
- Known conflicts in `fee-data-notes.md` (Evernest, 10X, Reafco, Northpoint scope, HomeRiver) are resolved or annotated before the affected profile goes live.
- Companies whose robots.txt blocked fetching (RL Property Management Group, I Heart Real Estate PM; FYVE not confirmed) have no scraped fees. Their listings use only facts from approved sources; fees stay blank.
- Five Tier A seed rows cite a directory page (`supply-summary.md`): re-source from the company's own site or another approved source before publishing.

## 10. Staged-publishing rules and how the build gate maps to them
Principle: a page is indexable only if it carries data a visitor cannot get from the generic templated lead-gen pages in `competitors.csv`. Pages below the bar either are not generated or are generated as "listed, noindex".

| Page type | Unique-data bar to be indexable | Current build gate (`src/lib/quality.json`, `site.mjs`) | Gap to close (Developer) |
|---|---|---|---|
| Company profile | Passes gate AND has verified fees OR verified license (not just contact, areas, services) | 3+ fact groups including one of fees/license/areas. Areas + services + contact passes without fees or license | Add `indexRequireOneOf: [fees, license]`; below it, generate noindex or skip |
| City/suburb | 3+ indexable companies serving it, at least 1 with published fees | 2+ publishable companies | Raise to 3 for indexing; 2 = generated noindex; add fees condition |
| Property-type page | 3+ indexable companies with a sourced property-type fact for that type | No gate (no page template yet) | New template and gate |
| Fee comparison | 5+ companies with fee rows in scope (all, or per property type) | None | New gate |
| Fee-guide page (per fee type) | 5+ companies publish that fee type in our dataset (today: leasing 8, renewal 7, management % 6, flat 3) plus attributed benchmarks; flat-fee-only guide waits for 5 | None | New gate with per-fee-type counts |
| Landlord how-to guide | At least one element not available from templated competitors: Columbus/Ohio data from our dataset or a cited official public source (statute, court, Census), author-reviewed date, no advice language | None | Front-matter fields `sources[]`, `last_reviewed`; build fails if empty |
| Static/trust pages | Always | n/a | n/a |
| School-district pages | Not built | n/a | n/a |

Stage plan (page counts are indexable pages from the build report, placeholders excluded):
- **Stage 1 (launch): 30-45.** Roughly: 6 trust/static, 1 fee comparison, 4 fee guides, up to 13 company profiles (realistically 6-10 per `supply-summary.md`), ~5 cities (Columbus, Dublin, Westerville, Delaware, Hilliard per supply counts), 1-2 property types, ~6 guides. If fewer than 30 clear the bar, add guides that have real sourcing; do not add thin pages. If still under 30, owner decides whether to launch anyway.
- **Stage 2: up to 60.** Add only when (a) the prior batch is indexed (proposed: at least 70% of submitted URLs indexed in Search Console after 6 weeks) and (b) new pages clear the bar through new data (new companies, new fee rows, new sourced guide).
- **Stage 3: 60-100.** Requires 40 confirmed companies (threshold) and measured demand from Search Console queries (not estimates).
- **Beyond 100:** only on evidence that unique pages exist; no target number. The 150-300 original target is dropped.
- **Stop rule:** if more than 50% of submitted URLs show "Crawled/Discovered - currently not indexed" 8 weeks after submission, pause new pages and review quality (proposed).
- Placeholder data stays noindex and out of the sitemap (already implemented).

## 11. Correction and removal requirements
- Removal: add a record to `data/suppression.json` (by company id, domain or name), delete the company and its fee/area rows, rebuild. Validation already fails while a suppressed company is present.
- The scraper and any import must check the suppression list before proposing a candidate; a suppressed company is never re-added.
- Removal does not require a reason. Verification of requester per section 7.
- A removed company's URL returns 410 or the site's 404 (Developer to confirm static host behavior); it is dropped from the sitemap on the same build.
- Correction history: git history is the audit log (ADR-001). Each correction commit references the request ID.
- If a correction dispute is unresolved (source and company disagree), publish the value with both attributions or blank it (reason `correction_unresolved` exists in the schema).

## 12. Privacy policy requirements
The current page (`src/pages/privacy.astro`) is a stub and says "no forms"; it must change once the claim form exists.
Must cover, in plain language:
- Google Analytics 4: what it collects (pages viewed, approximate location, device/browser, referral), cookies, Google as processor, link to Google's policy and the Google Analytics opt-out add-on. Configuration commitments: no Google signals, no ad personalization, shortest data retention, no user IDs, no personal data in events or URLs.
- Google Search Console: aggregate search performance only; no visitor data.
- Claim/correct form: data submitted (name, role, email, evidence), used only to verify and reply, who hosts the form tool, retention (proposed: delete 12 months after closing), not published, not sold.
- Hosting (Vercel) server logs; Pagefind runs in the browser and sends nothing.
- No accounts, no ads (update if ads are ever approved), no sale of data.
- Business data: published business contact details only; removal process link.
- Contact address; last-updated date.
**Consent banner recommendation: no banner at launch.** Reasoning: US-focused local audience, GA4 used only for aggregate measurement, no ads, no personalization, no Google signals. Revisit and add a consent banner (and consent mode) if any of these occurs: display ads enabled; Google signals or remarketing wanted; GA4 shows meaningful non-US traffic (proposed trigger: more than 5% of sessions from the EU/UK). This is a product recommendation, not legal advice; the owner decides (`open-questions.md`).

## 13. Out-of-scope later extensions (not planned)
Home-services directory (`phase2-home-services.md`, `recommendation.md` item 6), school-district pages, user reviews, email newsletter (would need consent and a processor).
