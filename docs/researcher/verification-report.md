# Verification report: researcher data pack (Columbus, OH property management directory)

Verifier: independent agent, did not produce the data. Date of checks: 2026-11-11.
Files audited: `fee-data.csv` (10 rows), `companies-seed.csv` (21 rows; 13 counted), `source-registry.csv` (read for consistency only, not audited).
Nothing in the CSVs was changed.

## Method

- Every cited `source_url` in `fee-data.csv` was re-fetched with WebFetch and each field was compared with the page text. All 10 rows were checked (more than the 6-row / 5-company minimum), including Evernest, 10X and Northpoint.
- Fields per fee row: property_type, management_pct, flat_fee, leasing_fee, renewal_fee, minimums = 6 fields x 10 rows = 60 field checks. A blank CSV cell is marked "match" only if the page does not state that value; a blank cell where the page does state a value is reported as an omission (not counted as an error, because blank means "not recorded" under the BRIEF rule, but listed below).
- Companies: 12 of the 13 counted (Tier A) rows were checked (co-011 not checked). For rows with an own website (co-001 to co-008) I fetched the site and checked office address/city, county, areas served, scope notes and any Ohio real estate license statement. For rows sourced only from a directory (co-009, 010, 012, 013) I re-fetched the cited directory page and also searched for an own site.
- Result codes: match / mismatch / not found / unreachable. Error rate = (mismatch + not found) / checked fields.
- Limits: single page reads through WebFetch (a summarising fetcher), no robots/ToS check by me beyond using the cited URLs, no check against the state licensee file. Pages can change after the capture date; all pages were read the same day as capture.

## Result summary

| Set | Fields checked | Match | Mismatch | Not found | Error rate | 10% tolerance |
|---|---|---|---|---|---|---|
| Fees | 60 (38 populated cells + 22 blank cells confirmed "not stated") | 60 | 0 | 0 | 0.0% (0.0% on populated cells only, 0/38) | PASS |
| Companies | 41 | 40 | 1 | 0 | 2.4% | PASS (see caveat) |

Caveat on companies: 5 of 13 counted companies (co-009 to co-013) are corroborated only by third-party directory pages that the source-registry marks "skip" (terms unchecked). The directory pages match the CSV, but I could not find an own website for co-010 and co-013 (search returned only directories), so their existence and office are not independently confirmed. If "no independent confirmation" is scored as "not found" for the four directory rows I checked (co-009, 010, 012, 013), the company error rate would be 5/45 = 11.1%, which would FAIL the 10% tolerance. The primary rate above follows the task definition (checked recorded fields).

## Fee checks (all fields)

| # | Company / row | Cited URL | property_type | management_pct | flat_fee | leasing_fee | renewal_fee | minimums |
|---|---|---|---|---|---|---|---|---|
| 1 | Mynd | https://mynd.co/locations/ohio/columbus-property-management | match (blank; page gives no breakdown) | match (blank) | match ($129 / $119 / $109 by 1 / 2 / 3-10 homes) | match (50% of one month) | match ($299) | match (blank; none stated) |
| 2 | Evernest (Columbus) | https://www.columbuspropertymanagement.co/pricing | match (6% for single-family only; other types not priced) | match (6%) | match (blank; none stated) | match (50% of one month's rent) | match ($250) | match ($500 minimum on leasing fee) |
| 3 | HomeRiver Group | https://purehomeriver.com/locations/ohio/columbus/ | match (single-family; condos and townhomes; multi-family) | match (7-10%) | match (blank) | match (50% of first month) | match (blank; not stated) | match (blank; not stated) |
| 4 | ROOST (single home) | https://roostrealestateco.com/monthly-property-management-fees-flat-vs-percentage-based/ | match | match (blank) | match (Columbus $105 / $100 / $90) | match (100% / 75% / 50% by tier) | match ($275) | match (blank; no monthly minimum stated) |
| 5 | ROOST (multi-unit) | same | match | match (blank) | match (Columbus $90 / $85 / $75 per unit) | match | match ($275) | match (blank) |
| 6 | 10X Property Management | https://www.10xpropertymanagers.com/pricing | match (blank; page states no property types) | match (blank; no % stated) | match ($85 / $95 / $145) | match (100% / 50% / 25% by plan; recorded as range) | match ($300 / $225 / $200 by plan = $200-$300) | match ($650 min on standalone 75% leasing fee) |
| 7 | Reafco Ohio Elite | .../fees/monthly-management-fee ; .../fees/leasing-fee | match (blank; neither page states types) | match (9% of gross rents) | match (blank) | match (1 month's rent for a vacant unit) | match ($150 flat) | match (greater of 9% or $75 per unit per month) |
| 8 | Northpoint Asset Management | https://northpointam.com/pricing ; .../columbusoh/columbus/services/property-management | match (single-family; small multifamily "typically 85 units or fewer"; build-to-rent, from the Columbus services page, not the pricing page) | match (10% of collected rent) | match (blank; but see omission O2) | match (75% of first month) | match (25% of one month's rent) | match (blank; none stated) |
| 9 | Swiss Property Management Group | https://www.swisspmg.com/pricing | match ("Apartments & Houses in OH" in service-area heading) | match (8% Core; 10% Signature) | match (blank) | match (Core greater of $800 or 3/4 month; Signature greater of $660 or 1/2 month) | match (Core greater of $500 or 1/3; Signature greater of $350 or 1/4) | match (fee minimum $100 / $120; onboarding $250) |
| 10 | Real Property Management Midwest | https://www.rpmmidwest.com/pricing/ | match (single and multi-family) | match (8.5% of rent collected) | match (blank) | match (blank; not stated) | match (blank; not stated) | match (blank; page says only "Minimums and Maximums may apply", no amounts) |

No page was unreachable. Flagged conflicts from `fee-data-notes.md`:
- Evernest: the Columbus /pricing page does state 6% (single-family), 50% leasing ($500 min), $250 renewal, so the recorded row is accurate. I did not re-verify the competing 8-10% figures from third-party roundups; the researcher already excluded them.
- 10X: confirmed the page shows unlabeled values and a separate standalone price block. The plan mapping of the monthly fee ($85/$95/$145) and the range for renewal ($200-$300) is consistent with the order of values on the page, but the fetcher itself said the labels are not explicitly paired. Treat as "match, with residual label risk". The standalone $75 monthly and $125 renewal on the page are not in the CSV (disclosed in the notes).
- Northpoint: confirmed the pricing page lists no property types or minimums and that the Columbus services page carries the property types. Office address on that page is Austin, TX (consistent with the Tier B note).

## Fee-data observations (omissions and note inconsistencies, not counted as errors)

| ID | Where | Cited URL | Found | Suggested correction |
|---|---|---|---|---|
| O1 | 10X row | https://www.10xpropertymanagers.com/pricing | Standalone monthly management $75 and standalone renewal $125 appear on the page and are not in the row | Add as a separate "standalone" row or note; flagged in notes already |
| O2 | Northpoint row | https://northpointam.com/pricing | Page also lists a $300 one-time onboarding/property setup fee and 10% of maintenance invoices; CSV flat_fee blank | Add onboarding fee to a notes/other-fees field if the schema has one; leave flat_fee (monthly) blank if it means recurring |
| O3 | Evernest row | https://www.columbuspropertymanagement.co/pricing | Page also states a $149 annual condition report and optional $200/yr eviction plan | Optional extras; no change needed |
| O4 | `fee-data-notes.md`, Reafco bullet | n/a | Notes say property types were read from the leasing page; the leasing page does not state property types. The CSV (blank) is correct | Correct the note |
| O5 | `companies-seed.csv` co-005 notes | https://www.ihrepm.com/ | Fee detail also includes leasing minimums ($750 on 75% tier, $500 on 50% tier) not mentioned in notes | Include minimums when this row moves to fee-data |
| O6 | `companies-seed.csv` co-014 notes | https://northpointam.com/property-management/columbusoh/westerville/services/property-management | Notes say "No fees shown" while fee-data.csv has Northpoint fees from /pricing (network-wide page) | Reword: "fees on network-wide /pricing page, not Columbus-specific" |
| O7 | fee-data.csv vs companies-seed.csv | n/a | Fee rows exist for Mynd, HomeRiver, ROOST, Reafco, 10X, Swiss, RPM Midwest. Of these only RPM Midwest (co-007) is a counted Tier A company; 10X and Swiss are "leads" (co-019, co-020) and Mynd, HomeRiver, ROOST, Reafco have no seed row. Fee rows cannot link to a company ID | Add seed rows or company IDs so each fee row maps to a company record |

## Company checks

| # | Row | Cited / checked URL | Field | Recorded | Found | Result |
|---|---|---|---|---|---|---|
| 1 | co-001 RL Property Management Group | https://rlpmg.com/about/ | city / address | Columbus; 750 Cross Pointe Rd, 43230 | "750 Cross Pointe Rd. STE B, Columbus, OH 43230" | match |
| 2 | co-001 | same | county | Franklin | Columbus address; Franklin County is consistent | match |
| 3 | co-001 | same | areas served | Columbus and Central Ohio; list on separate page | "serving Columbus and Central Ohio", links to separate Areas Served page | match |
| 4 | co-001 | same | Ohio license statement | self-stated licensed brokerage | "Licensed Real Estate Brokerage in the State of OH" (no license number) | match |
| 5 | co-002 Oakwood | https://www.liveoakwood.com/ | city / address | Reynoldsburg | "6950-B Americana Pkwy Reynoldsburg, OH 43068" | match |
| 6 | co-002 | same | areas served | 8 listed areas | Same 8 areas listed | match |
| 7 | co-002 | same | license | unverified | No license statement on page | match |
| 8 | co-003 All County NEO | https://allcountyprop.com/locations/ohio/columbus/ | city / address | Columbus | "1733 W. Lane Ave. Columbus, OH 43221" | match |
| 9 | co-003 | same | county | Franklin | consistent | match |
| 10 | co-003 | same | areas served | 11 areas | Same areas (site spells "Hillard") | match |
| 11 | co-003 | same | license | unverified | None stated; shows Realtor / NARPM logos only | match |
| 12 | co-004 SBS | https://sbs.management/ | city / address | Hilliard | "4872 Cemetery Rd, Hilliard, OH 43026" | match |
| 13 | co-004 | same | county | Franklin | consistent | match |
| 14 | co-004 | same | areas served | Greater Columbus, Cincinnati, Cleveland, Dayton, Marysville; Delaware and Central Ohio | Hero text and meta description (two differing descriptions) together match | match |
| 15 | co-004 | same | scope | HOA and condo associations only | "Condominium Associations and Homeowner Associations" only | match |
| 16 | co-004 | same | license | unverified | None stated | match |
| 17 | co-005 I Heart RE PM | https://www.ihrepm.com/ | city / address | Dublin | "6385 Shier Rings Road Suite 1, Dublin, OH 43016" | match |
| 18 | co-005 | same | license | "Rec. 2023000049" | Footer: "An Ohio Real Estate Brokerage ... License No. Rec. 2023000049" | match |
| 19 | co-005 | same | published fees | $99 / $139 / $199; leasing 75% / 50% / 0 | Flex Care $99 (75%, $750 min), Core Care $139 (50%, $500 min), Total Care $199 ($0) | match |
| 20 | co-006 Housepitality | https://www.housepitality.io/ | city / address | Columbus | "797 Busch Ct. Columbus, OH 43229" | match |
| 21 | co-006 | same | county | Franklin | consistent | match |
| 22 | co-006 | same | areas served | Columbus; Delaware; Westerville; Gahanna; Dublin | Same | match |
| 23 | co-006 | same | license | self-states fully licensed | "fully licensed property management company" | match |
| 24 | co-007 RPM Midwest | https://www.rpmmidwest.com/ (own site) | city | Columbus | Columbus office listed | match |
| 25 | co-007 | same | county | Franklin | consistent | match |
| 26 | co-007 | same | office address | 2720 Airport Dr, 43219 (from directory) | "261 W. Johnstown Rd Suite 207 Columbus, OH 43230" (home page; page does not list 2720 Airport Dr) | MISMATCH |
| 27 | co-007 | same | areas served | Cincinnati; Northern Kentucky; Columbus; Dayton | "Serving Cincinnati, Dayton, Columbus, & Louisville"; text also mentions Northern Kentucky | match (Louisville missing, minor) |
| 28 | co-008 Evernest | https://www.columbuspropertymanagement.co/ | city / address | Upper Arlington; 3040 Riverside Dr Suite 223 | "3040 Riverside Dr., Suite 223, Upper Arlington, OH 43221" | match |
| 29 | co-008 | same | county | Franklin | consistent | match |
| 30 | co-008 | same | license | unverified | No license statement; page mentions brokerage services only | match |
| 31 | co-008 | /pricing | published fees | 6%, 50% ($500 min), $250 | See fee check 2 | match |
| 32 | co-009 Wallick | https://www.simplifyem.com/property-management-companies/company/the-wallick-companies-pataskala-ohio | city / address | Pataskala; 7490 Blacks Rd SW | Same, 43062 | match (directory only) |
| 33 | co-009 | same | units | 11,000+ | "more than 11,000 residential units in more than 150 properties" | match |
| 34 | co-009 | same | county | Licking | Not stated on page; Pataskala is mainly Licking | match (inferred) |
| 35 | co-010 Maier-Hoey | simplifyem page | city / address | Newark; 25 E Church St | Same, 43055 | match (directory only; no own site found by search) |
| 36 | co-010 | same | county | Licking | Not on page; Newark is Licking | match (inferred) |
| 37 | co-012 Focus Realty | https://www.managemyproperty.com/companies/focus-realty-and-management-7826 | city / address | Lancaster; 117 W Main St Suite 207 | Same, 43130 | match (directory only) |
| 38 | co-012 | same | areas served | Central Ohio incl. Fairfield, Licking; Columbus | "Fairfield County, Licking County, and the surrounding areas"; lists Columbus | match |
| 39 | co-012 | same | county | Fairfield | Lancaster is Fairfield | match (inferred) |
| 40 | co-013 Westerville Realty | simplifyem page | city / address | Westerville; 168 Dorchester Sq, 43081 | Same | match (directory only; no own site found by search) |
| 41 | co-013 | same | keywords | residential, HOA, single-family, multifamily | Same keywords listed | match |

Not checked: co-011 Knoll Group (directory-only). Tier B and lead rows (co-014 to co-021) were not in scope, other than the cross-check of Northpoint notes above.

## Discrepancy list

| ID | Row | Cited URL | Found | Suggested correction |
|---|---|---|---|---|
| D1 | co-007 Real Property Management Midwest (office address, notes) | https://www.simplifyem.com/property-management-companies/company/real-property-management-midwest-llc-columbus-ohio (cited); own site https://www.rpmmidwest.com/ | Own site lists the Columbus office as 261 W. Johnstown Rd Suite 207, Columbus, OH 43230, not 2720 Airport Dr, 43219. I did not re-fetch the directory page, so the old address may be a stale directory entry or a former office | Replace the address with the own-site address, set `website` to https://www.rpmmidwest.com (fee-data.csv already uses it), and change `source_url` to the own site. Legal name "Real Property Management Midwest LLC (d.b.a. Midwest Realty)" was not confirmed on the own site and should stay marked unverified |
| D2 | co-007 vs fee-data.csv | https://rpmmidwest.com | Seed row says "Own website not captured" while the fee row for the same company cites its own site | Update the seed row (same fix as D1) |
| D3 | co-010, co-013 (and co-009, co-011, co-012) | directory pages above | Counted as Tier A on a third-party directory only; search found no own site for Maier-Hoey or Westerville Realty. The directory source is "skip" in `source-registry.csv` | Keep them out of the published count until each has an own-site or licensee-file confirmation; the researcher already notes this |
| D4 | `source-registry.csv` "Company websites" row vs `fee-data-notes.md` | n/a | Registry says robots.txt not yet checked for the sites read; fee-data-notes lists robots results for 9 of them | Update the registry row with the per-site robots results (and keep "ToS unreviewed") |
| D5 | co-002 Oakwood | https://www.liveoakwood.com/ | County is blank; Reynoldsburg spans Franklin, Fairfield and Licking counties and is not in the BRIEF's named Phase 1 city list (county coverage still applies) | Fill county (Franklin per the 43068 office) only after confirming from a county or Postal source; note the Phase 1 city-list gap |
| D6 | co-005 Dublin and others | https://www.ihrepm.com/ | County blank for a Dublin address (Dublin straddles Franklin, Delaware and Union) | Fill county from the parcel/Postal source, not by guess |

Items D5 and D6 are completeness gaps, not counted as errors (blank means unknown under the BRIEF).

## Pass / fail

- Fees: error rate 0.0% (0 of 60 checked fields; 0 of 38 populated). Tolerance 10%: PASS.
- Companies: error rate 2.4% (1 of 41 checked fields). Tolerance 10%: PASS on the stated definition.
- Conditional: the companies PASS is soft for 5 of 13 counted rows that rest on third-party directories only (see caveat, 11.1% if scored strictly). Resolve D1-D3 before the count of 13 is used for the supply-threshold decision.

## Summary

Fee data is accurate: all 10 rows re-checked against their cited pages with no mismatches. The main residual risk is 10X, whose page does not label plan columns, so the plan mapping is inferred. Company data is accurate where an own site exists (7 of 8 own-site rows have correct city and address; the exception is the RPM Midwest street address, D1). Licence self-statements for RL, I Heart RE PM and Housepitality are confirmed on their own sites; Oakwood, All County, SBS, Evernest and RPM Midwest state no Ohio licence on the pages read. The weak point is provenance: 5 counted companies are backed only by directory pages, so the Tier A count of 13 should be treated as an upper bound until own-site confirmation exists. I did not verify any licence against the state record and did not audit `source-registry.csv` beyond cross-checking it with the notes.
