# Demand and competition findings (Researcher A)

Date of research: 2026-11-11. No keyword tool (Keyword Planner, Ahrefs, Semrush) and no Google Trends access was available. Semrush returned an empty JS shell. **There is no measured Columbus-specific search volume in this report.** Everything labelled "estimate" is a proxy built from a measured analog plus household counts. Row-level detail: `keywords.csv`, `competitors.csv`.

## 1. Demand

### Measured data points (and what they are)
| Figure | Value | Source | Date | Notes |
|---|---|---|---|---|
| "fresno property managers" cluster (close variants rolled up) | 6,600/mo | https://www.seodata.dev/keyword/fresno-property-managers (Google Ads API monthly averages) | page updated 2026-06-24 | Non-Columbus analog. Google Ads returns one bucket for many variants, so variants must not be summed |
| "property management fresno" | 5,400/mo | same | same | |
| "property management companies in fresno california" | 170/mo | same | same | Shows long variants sit in the low hundreds |
| "property management" US head term | ~110,000/mo | https://www.rankhero.com/keywords/property-management | updated 2026-09-24 | National, not local |
| "what does a property manager do" / "what is property management" | 3,600 / 2,400 | https://www.seodata.dev/keyword/what-is-property-management-company | undated, source not stated | National informational, relevant to a landlord-topics widening |
| Columbus MSA | 2,225,377 pop; 880,121 households | https://censusreporter.org/profiles/31000US18140-columbus-oh-metro-area/ | ACS 2024 1-yr, retrieved 2026-11-11 | |
| Fresno MSA | 1,189,557 pop; 379,101 households | https://censusreporter.org/profiles/31000US23420-fresno-ca-metro-area/ | ACS 2024 1-yr | |
| Columbus city renter share | 56% (owner 44%); median gross rent $1,295 | https://yourcityresource.com/city/columbus-city-oh/topics/housing | 2024 data, retrieved 2026-11-11 | Aggregator, with internal inconsistencies flagged by the fetch; verify against Census before publishing |
| CPC for the Fresno cluster | about $3.2-3.3 | seodata Fresno page | 2026-06-24 | Indicates commercial intent and that advertisers bid on the vertical |

### Estimate method (all unmeasured)
1. Analog: Fresno cluster 6,600 / 379k households = 17.4 searches per 1,000 households.
2. Scaling to Columbus (880k households) gives ~15,300 as an upper bound. Columbus is 56% renter in the city, but Fresno's rental share and market structure are unknown here, so I take 20% of the scaled figure as a floor. **Head cluster range 3,000-15,000, central ~7,500. Confidence: low.**
3. Suburb terms (about 18 suburbs): bucketed at 50-260 for the five largest, 20-140 for eight mid-size, 10-50 for five small ones, anchored on the Fresno long-variant figure of 170. Total 460-2,670. Unmeasured.
4. School-district x service: 0-200 combined. The SERP for the Olentangy query returned only rental listings, so property-management intent is likely tiny.
5. Property type and fee queries: 350-1,750 combined (STR and HOA largest).

| Component | Low | High |
|---|---|---|
| Columbus head cluster | 3,000 | 15,000 |
| Suburbs | 460 | 2,670 |
| School districts | 0 | 200 |
| Property types + fees | 350 | 1,750 |
| **Total** | **~3,800** | **~19,600** (central ~9,800) |
| **Total excluding head cluster** | **~800** | **~4,600** (central ~2,300) |

### Versus the 3,000 threshold
- Combined cluster including the head terms: **likely met** on the estimate (floor 3,800 > 3,000) but with low confidence, since the whole floor rests on one head cluster.
- Excluding head terms (the part a new domain can realistically contest): central ~2,300, **below 3,000**; only the high case clears it.
- Recommendation: keep 3,000 but define it as the combined cluster, and **verify with Keyword Planner (typically available with a Google Ads account without running ads; confirm) before build**. A Google Ads account lets you pull real ranges for the ~35 queries in keywords.csv in minutes. Treat the Keyword Planner pull as the real gate.

### Reachable traffic (estimate, uses CTR benchmarks)
CTR by position, https://seobuddy.com/blog/?p=10431 (2026-09-09, aggregating First Page Sage, Backlinko, SISTRIX): pos 5 ~5.1%, pos 8 ~2.1%, pos 10 ~1.6%. Page 2 not covered.
- Head cluster, central 7,500, at positions 8-10: ~120-160 visits/mo; at position 5: ~380.
- Long-tail central 2,300 at positions 3-8: ~50-250.
- Plausible mature total from this cluster: **~150-650 organic visits/mo**. The month-6 threshold (300 visits) is borderline; **the month-12 threshold (2,000 visits) is not reachable from this cluster alone** (would need ~20% of all central demand). Propose lowering month-12 to ~600-800, or widening to landlord topics (fee guides, lease/eviction explainers, national informational volumes in the thousands as above).

## 2. Competitors (top results, ~15 queries)
Caveat: ranks in `competitors.csv` are the order returned by the search tool, not live Google SERPs (no location or personalization, no rank tracker). Domain strength is a qualitative estimate; no DR/DA tool was available. Fee data flags are "verified" only where I fetched the page (2026-11-11); otherwise "unverified".

Findings:
- **Head SERPs are crowded with three types:** (a) national marketplaces/directories (Zillow, Thumbtack, BiggerPockets, BBB, Apartments.com), very high authority; (b) company city-landing pages and franchises (All County, Mynd, HomeRiver, Northpoint, Hemlane, Awning, PMI), medium to high; (c) self-promotional listicles (Mynd 2025-08-26, Oakwood 2026-04-06, Awning 2023-07-28, Evernest), medium.
- **No result I checked offers a structured, multi-company fee comparison for Columbus.**
  - Mynd listicle: 7 companies with a consistent set of labels, but mixed formats and many "contact for info" values.
  - Awning: itemised fees in prose for 4 of 5 companies, dated 2023.
  - BiggerPockets Columbus directory: only 6 managers, no fee fields.
  - propertymanagement.com Columbus: inconsistent counts (5 vs 20), no fee data, "Get verified" and lead-form monetisation.
  - Thumbtack: prose range $69-$225.
  This is the real differentiator: sourced, structured, comparable fee rows.
- **Suburb queries** (Dublin, Westerville, Hilliard, Gahanna, Grove City, Pickerington, Upper Arlington) return near-identical sets: Zillow, Thumbtack, Hemlane, Awning city pages, Northpoint, BBB category pages. Thin templated city pages from lead-gen sites; a page with real per-suburb company and fee data can be better, but see risk below.
- **School district query:** SERP is rental listings; no PM page ranks. Open but probably low intent. Don't invest heavily in 7 district pages without Keyword Planner evidence.
- **Property-type queries:** small multifamily SERP is BiggerPockets forum threads (clear unmet need); STR SERP is lead-gen sites (Awning, Red Awning statewide directory); HOA SERP is franchise sites and HOA-specific directories (hoamanagement.com).
- **Realism for a new domain:** Head terms ("property management Columbus OH") are unrealistic for months; expect page 2+ at best in year 1. Suburb/type/fee long-tail with unique data is the plausible entry. Time to impressions: sources conflict and are weak (Ahrefs 2018 article collects anecdotes from "a week" for brand terms to "about a month" for very-low-competition long-tail to years for competitive terms; Google's Mueller said in 2018 there is no "traditional sandbox", https://ahrefs.com/blog/google-sandbox/). My estimate: first impressions within weeks of indexing, meaningful non-brand impressions at 3-6 months. The month-3 target of 1,000 impressions is plausible only if 100+ pages are indexed; the 10,000 at month 6 is optimistic.
- **Programmatic-page risk:** Google's John Mueller said (Bluesky, 2026-09-07, reported https://www.techwyse.com/news/search-seo/google-john-mueller-programmatic-seo-site-trust-recovery) that programmatic sites are often spam or borderline and that site-wide trust, once lost, takes significant time to recover. This supports the brief's "no templated filler" rule: publish only pages with unique structured data, and stage rollout.

## 3. Gaps
- No measured Columbus or suburb volumes; Keyword Planner pull needed.
- No Google Trends comparison (not fetchable).
- No authority metrics; no live SERP positions.
- Fee-data flags unverified for most competitor rows.
- ToS/robots for these competitor sites were not reviewed (not scraped; viewed through the fetch tool only). Do not scrape them without the registry check.
