# Principal-PM review: developer status (2026-11-14)

Branch `pm-findings` (from `review-fixes`). Pull request: https://github.com/Kibrom1/local-directory/pull/1. Commits made after the PR was opened (the PM decisions below) are local until the user says to push. No payment, ads, Vercel plan or revenue item is in scope.
Regenerate the numbers with `npm run report`, `npm run launch:check`, `npm run queue`.

## Result today (real data, production switches on)
- 5 indexable pages (static pages only). With the terms gate off the same data would build 18; the gate removes 13 pages (1 city, 7 company, 1 fee comparison, 2 fee guides, 2 property types).
- 28 pages would be listed but are not published (`publishListedTier` false).
- Launch check: 7 blockers, 6 warnings.

## Table
| # | Finding | What was done | Status | Commit |
|---|---------|---------------|--------|--------|
| 1 | Report the companies excluded by the service-area rule, and what would include them | Report section "Fee comparison: companies kept out" with the single missing fact; runbook data-entry checklist. Verified by reading each site: only Swiss Property Management Group states areas (7 added). 10X (office address only) and Reafco (none) stay out. Rule not changed. | Done in code; 10X and Reafco need owner | Swiss areas commit, ops commit |
| 2 | "What unlocks the next page" | Report section for every skipped, listed, unbuilt and draft page with the smallest data change. Gates untouched. | Done | analysis commit |
| 3 | Guide readiness checker | `npm run guides:check`: sources, dates, advice wording, links to unbuilt pages, parser warnings. All six drafts are blocked today (they link to `/fees/`, which is not built, and carry an H1 in the body). | Done; fixing and publishing guides needs owner | guides commit |
| 4 | Launch check | `npm run launch:check`, exit 1 while blockers remain; reuses `src/lib/env.mjs` and the strict validator. | Done; the blockers need owner | launch commit |
| 5 | Queue | `npm run queue --weekly/--monthly/--json`. | Done; naming the queue owner needs owner (open question 14) | ops commit |
| 6 | Downloadable fee data | CSV and JSON of gate-approved rows, with source URLs and dates, no averages; linked from fee comparison and methodology. Generated only when the fee comparison page exists, so none today. | Done | `461e304` |
| 7 | verified_by / verification_method / human_verified_date | Schema, validator, migration of all 10 rows to `agent_read`, badges, report counts, tests. | Done; a person must compare rows to set `human_compared` | `461e304` |
| 8 | Terms gate | `requireReviewedTermsForIndex` (true in production). Removes 13 pages today. Source decisions not edited. | Done; the terms reading needs owner | `461e304` |
| 9 | Resilience | Report section: per gated page, the single source or company whose removal drops it. | Done | analysis commit |
| 10 | Fee scope | `scope` field; NorthPoint `network_wide`, 10X `unconfirmed_mapping`; shown with caveat, not counted unless overridden in `quality.json`. Effect shown in the report. | Done; override is an owner decision | `461e304` |
| 11 | License route | Report line "license verification route: none available"; runbook manual lookup procedure (a person reads the Ohio eLicense page and records an `official_reference` source). Portal not scraped. | Done; a person must do lookups | analysis and docs commits |
| 12 | Listed-tier switch | `publishListedTier` (false in production). Templates, sitemap, internal links and tests follow; the report still shows what they would be. | Done | `461e304` |
| 13 | Scraper review | Prioritized checklist with minute estimates in the diff report; `npm run scraper:review` records `reviewed_by`; runbook step. | Done | scraper commit |
| 14 | Aging tests | Real `data/` at +120/+181/+366 days: no drop at +120 or +181 (warning and display flags only), all data-backed pages drop at +366. | Done | tests commit |

## Needs the owner (also in `open-questions.md`)
1. A person reads the terms and robots.txt of the 18 company-site sources and records the decisions (unblocks 13 pages).
2. A person compares each fee row with its live page (set `human_compared`).
3. Scope: find a Columbus-specific NorthPoint page and confirm 10X plan labels, or decide to override.
4. 10X and Reafco: a company-stated service area (their site or a company submission).
5. Launch settings: `SITE_URL`, `PUBLIC_OPERATOR_NAME`, `PUBLIC_DISCLOSURE`, form or contact email.
6. Name the queue owner and day; set `CORRECTIONS_LOG` outside the repo.
7. Licenses: do manual Ohio eLicense lookups, or keep "stated by company, not verified".
8. Evernest conflict note and the six drafts (fix links and H1, find sources, then publish).

## Environment
The Astro build fails inside `/Users/Kb/Desktop` because a stray `/Users/Kb/Desktop/tsconfig.json` extends `astro/tsconfigs/base`, which does not resolve from there. The project builds from a copy outside Desktop. Remove or move that file (it is the owner's, not touched). Node must be >= 22.23.4 (Node 22.22.2 is too old).

## Designers
No dependency: this work is gate logic, data and scripts. Any visual redesign should be built on the new states: the two badge texts, the scope caveat, no listed pages in production, and the "Use this data" links.

## Designer reviews (docs/ux/reviews): developer response
Their reviews used the pre-branch build (17 indexable pages, listed tier visible). With the production switches on, the site builds 5 static pages, so the redesign must work with no companies, cities or fee table.
- Built (steps 1-3): dark theme and tokenised colours with a contrast check for both themes (54 pairs); no-JS-safe home (city picker only with 2+ cities, plain A-Z site map link, "What this site covers today" panel); `/site-map/` utility page. Mobile overflow checked on the real build at 320px: none on home, city, company, fees, methodology and site map (the clipping in the designer's screenshots is a prototype artifact).
- Not built, needs owner or PM: verification wording (UX F2), "Not recorded" versus "Not published" (F3), first-year cost range (F6), public corrections log and relaxed evidence rule (F8), guide merge (F4), site name, serif display type, license badge shortening, "N days ago" (the two designers disagree; absolute dates stay).
- Waiting on data: fee cell and table rework, profile snapshot, result card. They need pages that exist only after the terms reviews.
- Designers to remove: the reserved ad slot (design-system section 11, `design-tokens.json` adSlot, `prototype/city-dublin.html`, `prototype/fees.html`).


## PM decisions (answered by the user) and what was built
| # | Decision | Built |
|---|---|---|
| 1 | Site name: "Central Ohio Property Management Guide", no "Columbus" in the name | `src/lib/brand.mjs` default and `PUBLIC_SITE_NAME`; header, footer, titles, structured data, export, README and `.env.example` updated; a test fails if a template hard-codes a name. Design docs and the prototype under `docs/ux/` still say "Columbus PM Guide (working name)": the designers own those. The download file names (`columbus-pm-fees.csv`) are unchanged. |
| 2 | Fee badge: "Read from the company's website by our tool on DATE; not yet checked by a person"; "Checked by a person, DATE" | Badge text, stale variant, result card, company banner, methodology ("How a fee was checked"). The word "verified" is no longer used for fees; source notes say "last read". License wording unchanged. |
| 3 | "Not recorded" for fields never looked at; "Not published" only where the company is confirmed not to state it | `companies.fields_checked` (per field: source and date), validator rules (source exists, date not future, field really empty), `unknownKind()` used on the company page. "Not checked yet" is now "Not recorded". All current records have no checks recorded, so every empty contact field reads "Not recorded". |
| 4 | First-year cost range, named gaps | `src/lib/firstyear.mjs`; fee table column "First-year cost, an illustration". Published figures only, range not average, missing fees named and never zero, open-ended fees not used, needs a published ongoing fee. Assumes one unit, rent collected, one renewal. Arithmetic hand-checked in tests. |
| 5 | Corrections: documents by email, public log | Form checkbox "I will email documents"; `data/corrections-log.json`, schema, validator (no emails, links, phone numbers; removals logged without the company); `/corrections-log/` noindex page linked from the form, footer and site map. Policy I chose, for the PM to confirm: a removal is logged without the company's name. |
| 6 | Keep the terms gate; launch small; keep the full license badge wording | No change to the gate (13 pages still held back); license badge unchanged. |

Still needs a person: the 18 terms reads, human comparison of fee rows, scope overrides, 10X and Reafco service areas, launch settings, and recording `fields_checked` where a company's page really shows no phone, address or website.

## 2026-11-14: listed tier published (owner decision)
`publishListedTier` is now true. The 17 company profiles and 12 city pages that have enough sourced facts but whose sources' terms are not yet reviewed are published as `noindex, follow`. The terms gate (`requireReviewedTermsForIndex`) is unchanged, so none of them is indexable and none counts toward the fee comparison. To make pages indexable, review the sources in `docs/pm/terms-review-checklist.md`. To undo: set `publishListedTier` back to false in `src/lib/quality.json`.

## 2026-11-14: terms gate off (owner decision)
`requireReviewedTermsForIndex` is now false: a source is excluded only when its terms prohibit automated access (`use_allowed` false). Sources still at `not_checked` count toward indexable pages and the fee comparison. The review checklist in `docs/pm/terms-review-checklist.md` is now how prohibitions get found: any source found to prohibit automated access must be set to `use_allowed: false`, which removes its facts. `tos_decision` is still only ever set by a person who has read the terms. To undo: set the switch back to true.

## 2026-11-14: second read of all ten fee rows
Every fee row was read again from its own source page and compared with the recorded values (Mynd, Evernest, HomeRiver, ROOST single-family and multifamily, 10X, Reafco, NorthPoint, Swiss, RPM Midwest). All ten match. `last_verified_date` was moved to 2026-11-14. The rows stay `agent_read`: this was a second automated read, not a person's comparison, so none is marked `human_compared`. Note: the 10X pricing page also carries unrelated casino text in other languages, which looks like injected spam; worth telling the company.
