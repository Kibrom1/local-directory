# Runbook: data, gates and scraper

Audience: whoever maintains the data. Rules: `docs/BRIEF.md`. Stack: `docs/developer/adr-001-stack.md`. Gate rules: `docs/pm/prd.md` section 10. All commands run from the repo root; Node 22.

## Weekly check (15 minutes)
1. `npm run validate` must pass. `npm run validate:strict` shows what still blocks launch (sources used with ToS or robots not reviewed, placeholder records).
2. `npm run report`: note indexable pages, Tier A count, per-fee-type counts, noindex-listed and skipped pages with reasons, stage budget status. Copy the numbers into the metrics sheet (`docs/pm/metrics.md` section 5).
3. `npm run freshness`: re-verify anything past 150 days (queue), plan for anything past 180 (shows "last verified N months ago"), fix anything past 365 (dropped from comparison and completeness).
4. Check the correction queue and the scraper health report (below).

## Apply a correction
1. Confirm a public source for the new value (the company's own page or an official record). A fact supplied only by the company needs a `company_submission` source (access_method `company_submission`, robots/ToS `not_applicable`) and is shown as "Provided by the company, DATE".
2. Edit the JSON in `data/`. Set `captured_date` and `last_verified_date` to the day you checked, `source_id`, and the exact page in `source_url` / `source_urls`. Set fee `verification_status` to `verified_own_site` only if you compared the value with the company's own page; ranges and plans stay ranges and plans.
3. `npm run validate`, then `npm run build`. Commit referencing the request ID. Deploy.
4. Update `last_verified_date` only on facts you actually re-checked.

## Remove a company (removal request)
1. Add a record to `data/suppression.json` (`company_id`, `domain`, `name`, `reason`, `requested_date`; no requester details).
2. Delete the company and all its rows in `fee-schedules.json` and `service-areas.json`.
3. `npm run validate` (fails while a suppressed company remains), `npm run build`, deploy. The page and sitemap entry disappear in the same build. The scraper will not fetch the domain or re-add the company.

## Add or upgrade a company
1. Add a record with the next free `co_NNN` id. Start at `evidence_level: own_site_confirmed` only after reading the company's own site; use a `company_site` source for that site (one source per site, `src_site_<name>`).
2. Directory-only or search-only finds stay `third_party_directory_only` / `unverified_lead`, `tier: unconfirmed`, identity fields only, citing a source with `use_allowed: false`. They are not published or counted. To promote one, find and read its own site, add the site source, then change the evidence level and tier.
3. Tier `A` needs a street address in Phase 1 geography on the own site. Otherwise `B`.
4. County: set only when certain (cities that span counties stay `null`).
5. License: leave `unverified`. If the company's own site states a license, set `self_stated` with the exact wording in `claim_text` and the page URL. Only an official record (state licensee file) allows `active`/`inactive`/`none_found`; that needs an `official_record` source with robots and ToS recorded.

## Approve a source for automated access
A source is approved when `data/sources.json` shows: `use_allowed: true`; `access_method` of `scrape`, `api` or `bulk_download`; `robots_decision` `allowed` or `no_robots_txt` with `robots_txt_checked_date`; `tos_decision` `allowed` or `silent` with `tos_checked_date`; both dates within 90 days. Steps: read robots.txt, read the terms page, record both decisions with today's date and a note in `decision_notes`, then `node scripts/scraper/run.mjs --list-sources` to confirm. Re-check every source every 90 days; stale checks drop the source from the allowlist. If either document prohibits automated access, set `use_allowed: false`, remove the data that depends only on it and log the reason.

## Run the scraper
```
export SCRAPER_CONTACT_URL=https://<page where site owners can reach you>
npm run scraper:run -- --source src_site_example --adapter <adapter> --url https://.../pricing [--url ...] [--urls file] [--tos-url https://.../terms] [--full-source]
```
- Refuses with exit 3 and the reasons if the source is not approved; exit 2 if the contact URL is missing.
- Fetches politely (robots.txt before every fetch, 5 seconds per host, cache, back-off). Snapshots go to `snapshots/<source>/<host>/` with URL, timestamp and SHA-256 (git-ignored). Use `--tos-url` on each run so a changed terms page pauses the source.
- Output: `reports/scraper/<run>/diff-report.md` (read this), `changes.json`, `run-report.json` (health, page changes, errors, dropped fields) and `proposed/*.json` (full proposed copies of changed files). `data/` is never modified.
- Review: every change shows before, after, source id, source URL and captured date. Anomalies (fee change over 25%, value to null, disappeared company, unknown area) need an explicit decision; a value-to-null is never applied automatically. Scraped fee rows arrive `unverified`: compare with the page, then set `verified_own_site`.
- Merge: copy accepted proposed files over `data/` (or hand-apply the accepted changes), `npm run validate`, `npm test`, `npm run build`, commit.
- Health: `reports/scraper/history.json` keeps per-source runs. A source is stale after two failed runs in a row (success rate under 90%, or paused). A robots.txt or ToS change pauses the source: re-review both and re-record the decisions before the next run.

## Write an adapter
Add `scripts/scraper/adapters/<name>.mjs` exporting `{ id, match(url), parse({ html, url, capturedDate }) }` that returns `{ company: { name, website, phone, address }, service_areas: [city names], fees: [{ property_type, source_url, management_pct, flat_fee, leasing_fee, renewal_fee, minimums }] }` using the fee value shapes in the README. Register it in `adapters/index.mjs`. Test it against a saved fixture page in `tests/fixtures/`; never test against live sites from CI. The sanitizer drops everything that is not a schema field, any string over 200 characters and anything with markup.

## Manual lookup path (robots-blocked or form-only companies)
For companies whose site disallows automated fetching (RL Property Management Group pricing domain, I Heart Real Estate PM pricing domain, FYVE) fees stay blank. If the owner approves manual lookups: a person reads the public page, records the facts with `access_method: manual_public_lookup`, the date and exact URL, and sets `verification_status` to `verified_own_site` only after a second check. Do not use third-party roundups as a value source.

## Stage budget and gates
`src/lib/quality.json` holds all thresholds. `currentStage` caps indexable pages (stage 1: 30 to 45). The build fails when over the cap. Raise the stage only when the roadmap condition is met (70% of the prior batch indexed after 6 weeks, new pages clear the bar through new data). Being under the minimum is reported, not blocked; do not add thin pages to reach it. The fee comparison, fee guides and property-type pages are gated in `planned_pages`; they are published only once their templates exist and `eligible` is true.

## Launch checklist (data side)
- `npm run validate:strict` passes: no placeholder records; every source used by published data has robots and ToS decisions recorded (company site terms are currently unread).
- `npm run report`: stage budget not over; indexable count reviewed; no company published on directory-only evidence.
- Licenses: none verified yet. Locate the Ohio Division of Real Estate licensee file URL, read its terms, record the source, then match listed companies.
- Contact address on About; privacy page reviewed by the owner (retention period and form host are proposals); GA4 settings match the privacy page.
