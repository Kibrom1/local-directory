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
npm run dev              # local dev server (search works only after a build)
```
Requires Node 22. Build output: `dist/`. Reports are git-ignored under `reports/`. Operations: see `docs/developer/runbook.md`.

Environment variables: `PUBLIC_GA_ID` (GA4 ID; tag omitted when unset), `SITE_URL` (production origin for canonicals, sitemap, robots.txt), `SCRAPER_CONTACT_URL` (scraper only), `TODAY` (YYYY-MM-DD, overrides the date for reports and tests).

## Layout
- `data/` JSON data files: companies, fee-schedules, service-areas, property-types, geography, sources, suppression
- `schemas/` one JSON Schema per data file, plus `common.schema.json` (shared fee value shapes)
- `scripts/validate.mjs` the validator CLI (`DATA_DIR=/path` validates another folder); logic in `scripts/lib/validate-data.mjs`
- `scripts/report.mjs`, `scripts/freshness.mjs` build report and freshness listing
- `scripts/scraper/` registry-driven scraper framework (see below)
- `src/lib/gate.mjs` the pure quality gate and build report; `src/lib/quality.json` thresholds; `src/lib/site.mjs` loads data; `src/lib/format.mjs` fee and provenance text
- `src/pages/` home, `city/[slug]`, `company/[slug]`, about, privacy, robots.txt
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
- Fee comparison and each fee guide (management %, flat, leasing, renewal): eligible only with 5+ companies that have a verified, fresh value for that fee type. Property-type pages: 3+ indexable companies with a sourced type fact. These three page types are gated in the report (`planned_pages`) but their templates are not built yet.
- Freshness: facts older than 180 days show "last verified N months ago"; facts older than 365 days drop out of verified fees and completeness.
- Staged page budget (`stages`, `currentStage`): the build fails if indexable pages exceed the current stage maximum; below the stage minimum is reported, not a failure (the owner decides).
- Ordering on lists: completeness (populated fact groups of 6), then name. Nothing else can affect order.
- `reports/build-report.json` carries: `indexable_count` and by type, `noindex_listed_*`, `skipped` with reasons, `stage_budget`, `companies` (by evidence level, Tier A, Phase 1 with an allowed source, verified fees, licenses), `fee_type_counts`, `freshness` (stale at 180 and 365 days, median age), `sources` (used with ToS/robots unreviewed), `planned_pages`.

## Scraper framework (`scripts/scraper/`)
Registry-driven and manual-review only. It produces a reviewable diff report; it never writes into `data/`.
- `allowlist.mjs`: a source is approved only if `use_allowed` is true, `access_method` is `scrape`/`api`/`bulk_download`, `robots_decision` is `allowed`/`no_robots_txt`, `tos_decision` is `allowed`/`silent`, both check dates are recorded and at most 90 days old. `node scripts/scraper/run.mjs --list-sources` shows approved and refused sources with reasons. Today no source is approved (company terms are unread).
- `fetcher.mjs`: identifies itself via `SCRAPER_CONTACT_URL` in the User-Agent (refuses to run without it), fetches and checks `robots.txt` before every network fetch (also on each redirect hop), at most one request per 5 seconds per host (or the robots Crawl-delay), response cache, back-off on 429/5xx with Retry-After, never disables TLS verification, refuses suppressed domains and URLs outside the source's host.
- `snapshots.mjs`: raw snapshots with URL, timestamp and SHA-256 under `snapshots/` (git-ignored). `changes.mjs`: page change detection (new/unchanged/changed) and robots.txt / ToS watch; a change pauses the source until re-reviewed.
- `sanitize.mjs`: facts-only guard (no prose, no markup, no unknown fields). `adapters/`: one adapter per source; `example-fixture.mjs` runs against `tests/fixtures/example-company.html` only.
- `normalize.mjs`: proposes changes with source id, source URL and captured date on every change, anomaly flags (fee change over 25%, value to null, disappeared company, unknown area), suppression rejections (by id, domain, name), and a validation run on the proposed data. Scraped changes are always `unverified`.
- `health.mjs`: per-source run history (`reports/scraper/history.json`), success rate, parse failures, schema failures, facts changed; a source is stale after two failed runs in a row.
- Run: `SCRAPER_CONTACT_URL=https://... npm run scraper:run -- --source src_x --adapter name --url https://... ` then review `reports/scraper/<run>/diff-report.md`.
