# Supply summary (captured 2026-11-11)

Files: `companies-seed.csv` (21 rows), `source-registry.csv` (12 sources).

## Headline
- Counted companies (Tier A, local office or HQ confirmed in Phase 1 geography): **13**.
- Tier B (says it serves the area, no local office confirmed): 5. Leads (unverified): 3. Not counted.
- Threshold is 60 distinct licensed companies. **13 counted (21 including B and leads) is below it.** This is not yet a fair test: the one source that could scale the count (the Division's licensee file) was not reachable here.
- **No company's license is confirmed against the state record.** Three state a license on their own site (RL Property Management, I Heart Real Estate PM with license no. Rec. 2023000049, Housepitality). "Licensed" is therefore unverified for all rows.

## Counts by city (Tier A, by office/HQ city)
| City | County | Companies |
|---|---|---|
| Columbus | Franklin | 4 (RL, All County NEO, Housepitality, RPM Midwest) |
| Newark | Licking | 2 (Maier-Hoey, Knoll Group) |
| Reynoldsburg | Franklin/Fairfield/Licking | 1 (Oakwood) |
| Hilliard | Franklin | 1 (SBS, HOA only) |
| Dublin | Franklin/Delaware/Union | 1 (I Heart RE PM) |
| Upper Arlington | Franklin | 1 (Evernest) |
| Westerville | Franklin/Delaware | 1 (Westerville Realty) |
| Pataskala | Licking | 1 (Wallick, large multifamily) |
| Lancaster | Fairfield | 1 (Focus Realty) |
| Gahanna, Grove City, Groveport, Canal Winchester, Bexley, Grandview Heights, New Albany, Delaware, Powell, Pickerington, Heath | various | 0 by office |

## Counts by stated service area (Tier A only, from each company's own stated areas)
Columbus 8, Dublin 4, Westerville 4, Delaware 4, Hilliard 4, Gahanna 2, Powell 2, Upper Arlington 2, Newark 3 (2 by office, 1 county-level), Grove City 1, Bexley 1, Grandview Heights 1, New Albany 1, Reynoldsburg 1, Pataskala 1, Lancaster 1. Pickerington, Canal Winchester, Groveport, Heath: 0 (Tier B PMI and NorthPoint claim some of these).

## Source findings that affect the plan
- eLicense was retired 2025-10-16; new LPI portal lookup is incomplete until licensees claim licenses (per Ohio REALTORS FAQ). The Division reportedly publishes a daily licensee database (old plus new records); I could not locate its URL. This is the only route to a real license count and needs a manual locate-and-read-terms step.
- Ohio has no separate property management license. Managing rentals for others for a fee requires a real estate broker license (Division guidance, REPL_PropertyManagement.pdf). The licensee file therefore cannot list "property managers"; it lists all brokerages. Counting "licensed management companies" requires matching a website-based candidate list to the file, so the candidate list (company sites) is the real bottleneck.
- Most candidate discovery had to come from third-party directories and listicles whose terms are unchecked, so those were used only as manual leads. Five Tier A rows still cite a directory page and must be re-sourced.
- Shell had no network to target sites; everything was read through the web tool, so robots.txt for individual company sites was not checked yet.

## Page-capacity estimate (unique structured data required per page)
Basis: 13 counted companies, 2 with published fees (I Heart RE PM, Evernest), 0 verified licenses.
- Company profiles: 13 at most (fewer if thin; realistically 6-10 with areas, services and a verified fact).
- City/suburb x service: cities with 3+ companies: Columbus, Dublin, Westerville, Delaware, Hilliard = 5 cities, and 1-2 service types each = roughly 5-10 pages.
- Property type pages (single-family, HOA, STR, multifamily): 3-4 (HOA has 1 company, STR 1).
- Fee guide: 1 (only 2 fee schedules; thin).
- School-district pages: 0 supportable.
- **Estimated publishable pages now: about 20-30, versus the 150 minimum and 150-300 target.**
- Rough scaling: pages grow roughly with company count. Reaching 150 likely needs 60-80 verified companies with area and fee data. At the current rate of discovery from public sources this is not close; the licensee file plus a systematic own-website pass is the next step, and fee data per company is the main limiter (2 of 13 so far).

## Threshold sanity check
- 60 companies: reasonable as a minimum, but define it as "distinct companies with a published address in Phase 1 geography whose license is confirmed", since the license file cannot filter for management activity.
- 150 pages: not supportable by current supply; do not treat as met.
- Recommend: complete the licensee-file lookup and an own-site pass before deciding on widen/pivot. Monthly search volume was not measured here (no keyword tool).

## Gaps
Licensee file URL and terms; Secretary of State terms; NARPM, Columbus REIA, CAI Central Ohio member pages; robots.txt of each company site; fee data for 11 of 13 companies; Fairfield and Licking suburbs nearly empty (Pickerington, Canal Winchester, Heath, Groveport); unverified leads (Swiss PMG, 10X, Fairfield Homes, Towne).
