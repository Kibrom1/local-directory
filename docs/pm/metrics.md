# Metrics, thresholds and weekly check

Date: 2026-11-11. Thresholds are from `docs/researcher/thresholds.md`. "Month N" = N months after T0 (first indexable pages live, sitemap submitted). Traffic numbers are rough by design.

## 1. Threshold to data source
| Threshold (revised) | Value | Data source | Exact definition | Status today |
|---|---|---|---|---|
| Combined monthly searches, widened cluster (property management + landlord topics, Columbus metro) | 3,000 | Google Ads Keyword Planner | Sum of monthly ranges for the deduplicated query list (do not add close variants; Google groups them, per `demand.md`); use midpoint of range; record pull date | Not measured. Research estimate 3,800-19,600, low confidence (`demand.md`) |
| Distinct companies with confirmed local office | 40 | Source registry plus `data/companies.json` (thresholds.md names the source registry; the registry holds sources, so the count comes from companies whose `source_id` is `use_allowed` and whose address is in Phase 1 geography) | Count of Tier A companies; build report to emit it | 13 (`supply-summary.md`) |
| Pages at launch | 30-60, growing | Build report (`reports/build-report.json`) | `indexable_count` excluding noindex and placeholder pages (field to be added) | About 20-30 estimated (`supply-summary.md`), plus guides in the plan |
| Month-3 organic impressions per month | 1,000 | Search Console, Performance, Web, Search type: Web, last 28 days at month 3 | Total impressions, all queries | Not started |
| Month-6 organic impressions per month | 5,000 | Search Console | Same | Not started |
| Month-6 organic visits per month | 300 | GA4 | Sessions with Default channel group = Organic Search, owner traffic filtered, last 28-30 days | Not started |
| Month-12 organic visits per month | 700 | GA4 | Same | Not started |

Note on month 3: `thresholds.md` says 1,000 is plausible only with 100+ pages indexed. A 30-60 page launch is below that by design, so a month-3 miss with fewer than 100 indexed pages is a "review", not a kill (see section 5).

## 2. Supporting metrics
| Metric | Source | Target or use |
|---|---|---|
| Indexed vs submitted URLs | Search Console, Pages report | At least 70% indexed 6 weeks after submission (proposed); stop rule if over 50% "not indexed" at 8 weeks |
| Indexable pages by type | Build report | Track against stage budget |
| Companies with published fees; per-fee-type counts (management %, flat, leasing, renewal) | Build report (to add) | Gates for fee-guide pages need 5+ |
| Pages skipped or noindex and reasons | Build report `skipped` | Review each week; shrinking list means supply growth |
| Top queries and pages; queries with impressions but no page | Search Console | Feeds landlord-topic reprioritization |
| Average position of fee-guide and comparison pages | Search Console | Directional only |
| Guide-to-fee-comparison and search/filter use | GA4 events | Whether guides feed the directory |
| Outbound clicks to company sites | GA4 event (plain link) | Directional usefulness; not a revenue metric |
| Corrections received, median days to resolve, removals | Private request log | SLA: ack 3 business days, apply 14 days, removal 5 business days |
| Non-US share of sessions | GA4 | Consent banner revisit trigger at over 5% EU/UK |

## 3. Data freshness metrics (from build report and registry)
| Metric | Definition | Target (proposed) |
|---|---|---|
| Median age of facts | Today minus `last_verified_date`, all published facts | Under 120 days |
| Share of facts verified within 180 days | Facts with age at most 180 days / all | At least 90% |
| Fee rows older than 120 days | Count | 0 at each quarter end |
| Facts past 365 days | Count (dropped from comparison and ranking) | 0 |
| Source check age | Days since robots and ToS check per source | Under 90 days |
| Companies with a verified license | Count / Tier A count | Rising; today 0 of 13 |

## 4. Scraper-health metrics (per source, per run; written to a run report)
| Metric | Alert rule (proposed) |
|---|---|
| Last successful run date | Over 45 days for a monthly source |
| URLs attempted vs fetched OK | Success rate under 90% |
| Parse failures | Any increase over the previous run |
| Schema validation failures on candidate output | Any (blocks merge) |
| Facts changed per run; fee changes over 25%; value-to-null changes; disappeared companies | Any flagged item needs manual review |
| robots.txt or ToS change detected | Source paused until re-reviewed |
| Suppression-list rejections | Logged; none may reach data/ |
| Sources marked stale (2 failed runs) | Listed in the weekly check |

## 5. Weekly check (15 minutes; one row in the metrics sheet)
Columns: week of; indexable pages; indexed pages (GSC); impressions last 7 days; organic sessions last 7 days (GA4); clicks; top 3 queries; companies Tier A; companies with fees; facts older than 180 days; scraper runs and failures; corrections opened/closed; removals; notes/actions.
Steps:
1. Search Console: Pages report (new "not indexed" reasons), Performance (7-day impressions, clicks, new queries).
2. GA4: organic sessions, top landing pages, search/filter and outbound events.
3. Build report: indexable count, skipped reasons, freshness counts.
4. Scraper report: any alert from section 4.
5. Correction queue: anything near its SLA.
6. Record one action for the week (page to improve, source to re-check, company to add).

## 6. Kill and review triggers (from `thresholds.md` decision rule)
| Checkpoint | Condition | Action |
|---|---|---|
| Before content plan is final (P0) | Keyword Planner combined cluster under 3,000 | Do not finalize the landlord content plan; revisit scope or topic mix; escalate to owner |
| T0 + 3 months | Impressions under 1,000/month | If indexable pages are 100 or more: revisit page quality and taxonomy before building more (rule in thresholds.md). If under 100: review only; check indexing status first |
| T0 + 6 months | Impressions under 5,000/month, or organic visits under 300/month | Revisit page quality and taxonomy; no new page types until fixed |
| T0 + 6 months (proposed timing) | Fewer than 40 Tier A companies | Reassess supply strategy; keep pages at the bar |
| T0 + 12 months | Organic visits under 700/month | Reassess niche (home services or other) before further investment |
| Any time | More than 50% of submitted URLs not indexed at 8 weeks | Pause new pages; review quality (proposed) |
| Any time | A source's ToS or robots prohibits automated access | Stop use, remove its data, log in registry |
| Any time | Search Console manual action or security issue | Stop publishing; fix before next deploy |
The 40-company timing and the 50% indexing rule are PM proposals, not in `thresholds.md`; owner to confirm.

## 7. Caveats
- Traffic estimates in `demand.md` give about 150-650 organic visits per month at maturity for the original cluster; 700 at month 12 therefore depends on the landlord widening and fee guides performing. Treat early misses as information about indexing and page quality first.
- GA4 and Search Console numbers differ; use GA4 for visits, Search Console for impressions, as the thresholds specify.
