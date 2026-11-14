# Columbus property management directory

Free static directory of property management companies in the Columbus, OH metro. Astro (static) + JSON data + Pagefind. No database, no backend. See `docs/BRIEF.md` for rules and `docs/developer/adr-001-stack.md` for the stack decision.

## Setup
```
npm install
cp .env.example .env     # optional: PUBLIC_GA_ID, SITE_URL; SCRAPER_CONTACT_URL for the scraper
npm run validate         # schema + referential integrity + provenance + evidence + suppression checks
npm run build            # validate, astro build, pagefind index into dist/, write reports/build-report.json
npm test                 # node:test unit tests (validator, gate, scraper) with local fixtures only
npm run report           # quality gate + metrics counts without a full build (exit 1 if over the stage budget)
npm run freshness        # facts and fee rows past 180 / 365 days (and the 150-day re-verify queue)
npm run validate:strict  # launch check: also fails on warnings (placeholder records, sources used with robots/ToS unreviewed)
npm run dev              # local dev server (search works only after a build; draft guides render here)
npm run build:strict     # launch build: validate:strict, fails if form/email, operator, disclosure or SITE_URL are unset, then check:site --strict
npm run check:site       # after build: canonical/title/description/JSON-LD, sitemap vs noindex, links, orphans, redirects, no SAMPLE/TODO text
npm run check:a11y       # axe-core in headless Chrome (puppeteer-core) at 320 and 1280 px; falls back to jsdom without Chrome
npm run check:contrast   # contrast pairs computed from docs/ux/design-tokens.json; CSS must match the tokens
npm run check:weight     # HTML/CSS/JS size per page against the UX budgets
npm run redirects:sync   # regenerate vercel.json from config/redirects.json
```
Requires Node 22. Build output: `dist/`. Reports are git-ignored under `reports/`. Operations: see `docs/developer/runbook.md`.

Environment variables: `PUBLIC_FORM_ACTION`, `PUBLIC_CONTACT_EMAIL`, `PUBLIC_OPERATOR_NAME`, `PUBLIC_DISCLOSURE` (see `.env.example`), `PUBLIC_GA_ID` (GA4 ID; tag omitted when unset), `SITE_URL` (production origin for canonicals, sitemap, robots.txt), `SCRAPER_CONTACT_URL` (scraper only), `TODAY` (YYYY-MM-DD, overrides the date for reports and tests).

## Layout
- `data/` JSON data files: companies, fee-schedules, service-areas, property-types, geography, sources, suppression
- `schemas/` one JSON Schema per data file, plus `common.schema.json` (shared fee value shapes)
- `scripts/validate.mjs` the validator CLI (`DATA_DIR=/path` validates another folder); logic in `scripts/lib/validate-data.mjs`
- `scripts/report.mjs`, `scripts/freshness.mjs` build report and freshness listing
- `scripts/scraper/` registry-driven scraper framework (see below)
- `src/lib/gate.mjs` the pure quality gate and build report; `src/lib/quality.json` thresholds; `src/lib/site.mjs` loads data; `src/lib/format.mjs` fee and provenance text
- `src/pages/` home, `city/[slug]`, `company/[slug]`, `fees/`, `fee-guide/`, `property-types/[slug]`, `guides/` (from `content/guides/*.md`), corrections, methodology, about, privacy, search, 404, robots.txt. Gated pages use `[...slug]` routes whose `getStaticPaths` returns nothing when the gate is not met.
- `src/layouts/Base.astro`, `src/components/`, `src/styles/site.css` (design tokens as CSS variables), `src/scripts/` (one small script per feature, loaded only where used)
- `src/lib/guides.mjs` guide loader/validator/renderer; `fees.mjs`, `estimate.mjs`, `feetable.mjs`, `feeguides.mjs` fee display, rent illustration, table rows, guide wording; `env.mjs` launch configuration checks
- `config/redirects.json` changed-slug redirects and removals; `config/published-paths.json` paths live at the last release; `vercel.json` generated from the redirects
- `tests/` unit tests and fixtures (`tests/fixtures/`)

## Data conventions
- Stable IDs: every record has a lowercase id with a type prefix (`co_`, `fee_`, `sa_`, `pt_`, `geo_`, `src_`, `sup_`). Never reuse or rename an ID; slugs may change, IDs may not.
- Provenance: every fact carries `source_id`, `captured_date`, `last_verified_date` (ISO dates) and, for fees and licenses, the exact source page URL(s). Every `source_id` must exist in `sources.json` and the source must have `use_allowed: true`. The source URL host must match the source's host. Record the robots.txt and terms-of-service decision on each source.
- Unknown stays `null` (or an empty array). Never guess, never use 0 for "unknown". The site shows "Not published" for nulls.
- Suppression: removal requests go in `suppression.json` (by company id, website domain or name). The company and its fee/area rows must be deleted from the data files; validation fails while a suppressed company is still present. The scraper never fetches a suppressed domain and rejects suppressed candidates.
- Placeholder: records with `"placeholder": true` are fake test data (none remain). Their pages are `noindex, nofollow` and excluded from the sitemap; `validate:strict` fails while any exist.

### Fee values: single numbers, ranges and plans
`management_pct`, `flat_fee`, `leasing_fee` and `renewal_fee` are each `null` or an object `{ type, period?, value | min/max | plans[], minimum_usd?, basis?, notes? }`:
- `type`: `flat_usd`, `pct_of_monthly_rent` (percent of one month's rent: leasing, renewal) or `pct_of_rent` (management).
- One number: `value`. A range: `min` and/or `max`. Plan-based: `plans: [{ name, condition, value | min/max, minimum_usd, label_confirmed }]`. Never collapse a range or plans into one number. `value` with `min/max`, or plans with a top-level number, is a validation error.
- `minimum_usd` records "greater of X or Y" floors. `other_fees[]` holds onboarding and standalone prices. `property_type` is `null` when the company does not tie the fee to a type.
- `verification_status`: `verified_own_site` (re-checked against the company's own page), `company_submitted` (rendered "Provided by the company, DATE") or `unverified`. Scraper output is always `unverified` until a human checks it.

### Sources
`source_kind`: `company_site`, `official_record`, `official_reference` (agency or statute page), `company_submission` (fact supplied by the company), `third_party_directory` (never a value source, `use_allowed` must be false), `lead_unverified`, `other`. `company_submission` and `official_reference` sources are read or received by a person, so robots/ToS decisions may be `not_applicable`; the scraper only automates `scrape`, `api` and `bulk_download` sources.

### Companies, evidence levels and tiers
- `evidence_level`: `own_site_confirmed` (the company's own site was read), `third_party_directory_only`, or `unverified_lead`. Only own-site-confirmed companies can be published; the other two are kept in the data flagged and are never generated, never indexable and never counted. They may carry identity fields only.
- `tier`: `A` = own-site confirmed with a street address in Phase 1 geography (this is what counts toward the 40-company threshold); `B` = own-site confirmed, serves the area, no local office confirmed; `unconfirmed` = not own-site confirmed.
- License: `status` is `unverified` unless the company's own site states a license (`self_stated`, with the exact `claim_text` and source URL). `active`/`inactive`/`none_found` require an official record source. A self-stated license is shown as "stated by the company" and does not make a page indexable.

## Quality gate (`src/lib/gate.mjs`, thresholds in `src/lib/quality.json`, rules from `docs/pm/prd.md` section 10)
- Company profile: indexable only with 3+ fact groups (license, fees, areas, services, property types, contact) AND verified fees or a verified license. Areas, services and contact alone are not enough. Below that but with 2+ groups and own-site evidence: generated as `noindex, follow` (listed tier, not in the sitemap or the search index). Otherwise skipped.
- City page: indexable with 3+ indexable companies and at least 1 with verified fees; 2 listed companies: `noindex, follow`; fewer: skipped.
- Fee comparison and each fee guide (management %, flat, leasing, renewal): eligible only with 5+ companies that have a verified, fresh value for that fee type. Property-type pages: 3+ indexable companies with a sourced type fact. All three page types are built; a page is generated only when its gate is met (`planned_pages` in the report).
- Freshness: facts older than 180 days show "last verified N months ago"; facts older than 365 days drop out of verified fees and completeness.
- Staged page budget (`stages`, `currentStage`): the build fails if indexable pages exceed the current stage maximum; below the stage minimum is reported, not a failure (the owner decides).
- Ordering on lists: completeness (populated fact groups of 6), then name. Nothing else can affect order.
- `reports/build-report.json` carries: `indexable_count` and by type, `noindex_listed_*`, `skipped` with reasons, `stage_budget`, `companies` (by evidence level, Tier A, Phase 1 with an allowed source, verified fees, licenses), `fee_type_counts`, `freshness` (stale at 180 and 365 days, median age), `sources` (used with ToS/robots unreviewed), `planned_pages`.

### Production switches (`src/lib/quality.json`)
- `requireReviewedTermsForIndex` (default true): facts from a source whose `tos_decision` is `not_checked` do not count toward indexable pages in production. Development shows everything.
- `publishListedTier` (default false): listed (noindex) company and city pages are not generated in production; the report still shows what they would be.
- `feeScopesCountingTowardGates` (default `["columbus_specific"]`): fee rows with another `scope` display with a caveat but do not count toward gates.
- Fee rows carry `verification_method` (`agent_read` or `human_compared`), `verified_by`, `human_verified_date` and `scope`. Verified fee rows are downloadable from the fee comparison page (`/fees-data/columbus-pm-fees.csv` and `.json`) once that page exists.
- Commands: `npm run launch:check`, `npm run queue`, `npm run guides:check`, `npm run scraper:review`. See `docs/developer/runbook.md`.

## Scraper framework (`scripts/scraper/`)
Registry-driven and manual-review only. It produces a reviewable diff report; it never writes into `data/`.
- `allowlist.mjs`: a source is approved only if `use_allowed` is true, `access_method` is `scrape`/`api`/`bulk_download`, `robots_decision` is `allowed`/`no_robots_txt`, `tos_decision` is `allowed`/`silent`, both check dates are recorded and at most 90 days old. `node scripts/scraper/run.mjs --list-sources` shows approved and refused sources with reasons. Today no source is approved (company terms are unread).
- `fetcher.mjs`: identifies itself via `SCRAPER_CONTACT_URL` in the User-Agent (refuses to run without it), fetches and checks `robots.txt` before every network fetch (also on each redirect hop), at most one request per 5 seconds per host (or the robots Crawl-delay), response cache, back-off on 429/5xx with Retry-After, never disables TLS verification, refuses suppressed domains and URLs outside the source's host.
- `snapshots.mjs`: raw snapshots with URL, timestamp and SHA-256 under `snapshots/` (git-ignored). `changes.mjs`: page change detection (new/unchanged/changed) and robots.txt / ToS watch; a change pauses the source until re-reviewed.
- `sanitize.mjs`: facts-only guard (no prose, no markup, no unknown fields). `adapters/`: one adapter per source; `example-fixture.mjs` runs against `tests/fixtures/example-company.html` only.
- `normalize.mjs`: proposes changes with source id, source URL and captured date on every change, anomaly flags (fee change over 25%, value to null, disappeared company, unknown area), suppression rejections (by id, domain, name), and a validation run on the proposed data. Scraped changes are always `unverified`.
- `health.mjs`: per-source run history (`reports/scraper/history.json`), success rate, parse failures, schema failures, facts changed; a source is stale after two failed runs in a row.
- Run: `SCRAPER_CONTACT_URL=https://... npm run scraper:run -- --source src_x --adapter name --url https://... ` then review `reports/scraper/<run>/diff-report.md`.

## Pages, gates and the fee-comparison rule
- Fee comparison `/fees/` (5+ companies), fee guides `/fee-guide/<fee>/` (management-fee, flat-fee, leasing-fee, renewal-fee; 5+ companies publishing that fee each, so flat-fee stays off while it has fewer) plus hub `/fee-guide/`, property types `/property-types/<slug>/` (3+ indexable companies), landlord guides `/guides/<slug>/`, hub `/guides/`. Navigation links exist only for pages that exist.
- One-line switch `feeComparison.requireStatedServiceArea` in `src/lib/quality.json`. `true` (default, conservative): a company's fee rows count toward the comparison, the guides' gates and the tables only if the company's own site states a service area (a `service-areas` row). `false`: every verified fee row counts. The report prints counts under both rules.
- Unknown values: "Not published" (a fee row exists and the field is empty), "Not checked yet" (no fee data recorded for the company, for example sites that block fetching), "Not offered" and "Varies, ask company" (supported by the component; the data model has no field for them yet).
- The rent illustration uses a labelled example rent of $1,500 (a round number, not a Columbus figure). Ranges stay ranges; percent values honor published dollar minimums.

## Guides (`content/guides/*.md`)
Front matter: `title, slug, description, type, keywords[], last_verified (YYYY-MM-DD), sources[{title,url,captured}], status (published|draft)`. Every guide renders its source list and last-verified date at `/guides/<slug>/` whatever `type` says. A published guide with a problem (no sources, bad date, H1 in body, unknown status, duplicate slug) fails the build. `status: draft` is withheld in production builds and rendered `noindex` in `npm run dev`. Raw HTML in the body is escaped. An empty or missing directory is fine.

## Correction form and launch configuration
`/corrections/` posts to `PUBLIC_FORM_ACTION` and shows `PUBLIC_CONTACT_EMAIL` as a visible fallback. With neither set the page renders a visible "cannot receive requests" notice instead of a form, the build prints a launch-configuration warning, and `build:strict` / `check:site --strict` fail. Operator name, related-business disclosure and `SITE_URL` are treated the same way.

## Redirects and changed slugs
Add `{from, to, reason, date}` to `config/redirects.json`, run `npm run redirects:sync` (writes `vercel.json` for host-level 301s; Astro also writes fallback redirect pages) and commit both. After each release run `npm run paths:snapshot` and commit `config/published-paths.json`: `check:site` then fails if a published path disappears without a redirect or a `removed` entry.
