# Roadmap: widened, staged launch

Date: 2026-11-11. T0 = the day the first indexable pages are live and the sitemap is submitted. All month-based thresholds count from T0, not from today. No calendar dates are promised; durations are rough and depend on supply work.

## Phases
| Phase | Goal | Exit criteria |
|---|---|---|
| P0. Gates (before build is finalized) | Confirm demand and pick the name | Keyword Planner pull done and combined widened cluster compared to 3,000; domain chosen and registered; owner answers on ads, consent banner, form tool, Vercel plan (`open-questions.md`) |
| P1. Build and Stage 1 launch (30-45 indexable pages) | Ship the data-backed core | Backlog P1 Musts done; `npm run validate` and build pass; build report shows 30+ indexable pages (or owner accepts fewer); no placeholder data; ToS read for every published source; privacy, About, Corrections final; GA4 and Search Console live; sitemap submitted |
| P2. Stabilize and Stage 2 (up to 60 pages) | Prove indexing, fix quality, grow supply | At least 70% of submitted URLs indexed after 6 weeks (proposed); first correction round trip done; Tier A companies growing toward 40; landlord guides in P2 added only with sourcing; weekly metrics sheet maintained |
| P3. Expansion (60-100 pages) | Add pages only where data supports them | 40 companies with confirmed local office (threshold); month-6 gate reviewed; property-type and per-fee-type pages added when their counts hit the bars in PRD section 10; Search Console queries drive topic list |
| P4. Reassess (month 12) | Continue, narrow or pivot | Month-12 organic visits vs 700; if below, reassess niche per `thresholds.md` decision rule (home services is the researched alternative, with the monetization conflict noted in `recommendation.md`) |

## Staged-launch plan (indexable page budget)
| Stage | Pages | What is added | Condition to move on |
|---|---|---|---|
| 1 (launch) | 30-45 | 6 trust/static, fee comparison, 4 fee guides, up to 13 profiles, ~5 city pages, 1-2 property types, ~6 guides | Launch checklist signed |
| 2 | up to 60 | New profiles and fee rows from new companies; P2 guides with official sources; per-type fee guide if 5+ rows | 70% of Stage 1 URLs indexed after 6 weeks; stop rule not triggered; new pages clear the bar |
| 3 | 60-100 | Suburb pages as companies appear (Pickerington, Canal Winchester, Powell, Upper Arlington, etc.), property-type pages at 3+ companies | 40 companies; Search Console shows impressions on the existing set |
| 4 | 100+ | No target; only if unique data exists | Evidence from Search Console and supply |
School-district pages are not on the roadmap (0 supportable per `supply-summary.md`).

Build-quality-gate work needed to make the stages enforceable is in `backlog.csv` (epic "Quality gate and build report"); rules in `prd.md` section 10.

## Cadence (proposed)
- Weekly: metrics check (`metrics.md`), correction queue, scraper health report.
- Monthly: re-run scraper on approved sources; review diff; deploy; update `last_verified_date` only for facts actually re-checked.
- Quarterly: re-verify all fee rows; re-check robots/ToS for every source (90-day rule).

## Migration triggers: static files to a database
Baseline: ADR-001 (JSON files, Astro static, Pagefind, git as audit log). Current scale is about 13-60 companies and under 100 pages, far below any trigger. Triggers from ADR-001 plus PM-specific measurements:
| # | Trigger | Measured by | First response |
|---|---|---|---|
| 1 | More than ~5,000 records, or build over ~5 minutes or memory-bound (ADR-001) | Build report, Vercel build logs | Load JSON into SQLite at build time |
| 2 | User-submitted data must be stored without manual review (violates current rules; would need an owner rule change) | Product decision | Do not build; manual review stays |
| 3 | Accounts or logins needed (banned today) | Product decision | Not applicable unless brief changes |
| 4 | Multiple concurrent writers (scraper runs and manual edits colliding on the same files) | Merge conflicts per month on data/ (proposed trigger: more than 3 a month for 2 months) | First fix is process: scraper writes separate files or branches; DB only if that fails |
| 5 | Server-side filtering or geospatial queries Pagefind cannot do | Feature request | Build-time SQLite first |
| 6 | Fee history over time becomes a product feature (price-change tracking across many captures) | Product decision | Keep dated snapshots as files; DB only if queries become slow |
| 7 | Correction volume too high for manual JSON edits (proposed: more than 10 verified corrections a week for 4 weeks) | Private request log | Automate the diff-from-form step with a script; a DB is not the first step |
Not triggers: more pages, more companies up to the ~5,000-record range, more guides, more traffic (static CDN scales).
