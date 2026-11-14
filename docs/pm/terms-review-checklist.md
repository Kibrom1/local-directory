# Source review checklist: terms of service and robots.txt

Why this exists: `requireReviewedTermsForIndex` holds back every page built from a source whose terms nobody has read. These are the 18 sources that are marked `use_allowed` but still have `tos_decision: not_checked`. Reviewing them is a person's job; no script and no developer may set `tos_decision`.

## How to review one source

1. Open the site's terms or terms-of-use page (footer link). Read for anything about automated access, copying, scraping or reuse of content.
2. Open the robots.txt link below. Note whether our page reads (the public pages we cite) are disallowed.
3. Record the decision in `data/sources.json` for that source: `tos_decision` (`allowed`, `silent` if the terms do not mention it, or `prohibits_automated_access`), `tos_checked_date`, `robots_decision` (`allowed`, `disallowed` or `no_robots_txt`), `robots_txt_checked_date`, and a short line in `decision_notes` saying what you read.
4. If a source prohibits automated access, set `use_allowed` to false and tell the developer; its facts then drop out of the published pages.
5. Run `npm run validate`. The warning count for that source goes away and its pages appear on the next build if their other checks pass.

Do not guess. If a terms page cannot be found or read, leave `not_checked` and add a note.

Order: sources that feed the most fee rows first.

| Done | Source | Fee rows | Other data refs | robots.txt now | Open terms (start here) | robots.txt |
|---|---|---|---|---|---|---|
| [ ] | ROOST Real Estate Co. (roostrealestateco.com) (`src_site_roostrealestateco`) | 2 | 4 | not_checked | [site](https://roostrealestateco.com/) | [robots.txt](https://roostrealestateco.com/robots.txt) |
| [ ] | Swiss Property Management Group (swisspmg.com) (`src_site_swisspmg`) | 1 | 8 | allowed | [site](https://www.swisspmg.com/) | [robots.txt](https://www.swisspmg.com/robots.txt) |
| [ ] | Evernest Columbus (columbuspropertymanagement.co) (`src_site_evernest_columbus`) | 1 | 6 | allowed | [site](https://www.columbuspropertymanagement.co/) | [robots.txt](https://www.columbuspropertymanagement.co/robots.txt) |
| [ ] | HomeRiver Group (purehomeriver.com) (`src_site_purehomeriver`) | 1 | 5 | allowed | [site](https://purehomeriver.com/) | [robots.txt](https://purehomeriver.com/robots.txt) |
| [ ] | Northpoint Asset Management (northpointam.com) (`src_site_northpointam`) | 1 | 5 | allowed | [site](https://northpointam.com/) | [robots.txt](https://northpointam.com/robots.txt) |
| [ ] | Real Property Management Midwest (rpmmidwest.com) (`src_site_rpmmidwest`) | 1 | 5 | allowed | [site](https://www.rpmmidwest.com/) | [robots.txt](https://www.rpmmidwest.com/robots.txt) |
| [ ] | Mynd (mynd.co) (`src_site_mynd`) | 1 | 2 | allowed | [site](https://mynd.co/) | [robots.txt](https://mynd.co/robots.txt) |
| [ ] | 10X Property Management (10xpropertymanagers.com) (`src_site_10xpropertymanagers`) | 1 | 1 | allowed | [site](https://www.10xpropertymanagers.com/) | [robots.txt](https://www.10xpropertymanagers.com/robots.txt) |
| [ ] | Reafco Ohio Elite Management (Google Sites) (`src_site_reafco_ohio_elite`) | 1 | 1 | allowed | [site](https://sites.google.com/view/ohio-elite-management) | [robots.txt](https://sites.google.com/robots.txt) |
| [ ] | PMI Columbus (propertymanagementinc.com) (`src_site_pmi_columbus`) | 0 | 16 | not_checked | [site](https://www.propertymanagementinc.com/pmi-columbus/) | [robots.txt](https://www.propertymanagementinc.com/robots.txt) |
| [ ] | All County NEO Portfolio Property Management (allcountyprop.com) (`src_site_allcountyprop`) | 0 | 13 | not_checked | [site](https://allcountyprop.com/) | [robots.txt](https://allcountyprop.com/robots.txt) |
| [ ] | Oakwood Management Company (liveoakwood.com) (`src_site_liveoakwood`) | 0 | 12 | not_checked | [site](https://www.liveoakwood.com/) | [robots.txt](https://www.liveoakwood.com/robots.txt) |
| [ ] | Housepitality (housepitality.io) (`src_site_housepitality`) | 0 | 10 | not_checked | [site](https://www.housepitality.io/) | [robots.txt](https://www.housepitality.io/robots.txt) |
| [ ] | I Heart Real Estate Property Management (ihrepm.com) (`src_site_ihrepm`) | 0 | 9 | not_checked | [site](https://www.ihrepm.com/) | [robots.txt](https://www.ihrepm.com/robots.txt) |
| [ ] | SBS Property Management (sbs.management) (`src_site_sbs`) | 0 | 5 | not_checked | [site](https://sbs.management/) | [robots.txt](https://sbs.management/robots.txt) |
| [ ] | RL Property Management Group (rlpmg.com) (`src_site_rlpmg`) | 0 | 3 | not_checked | [site](https://rlpmg.com/) | [robots.txt](https://rlpmg.com/robots.txt) |
| [ ] | Real Solutions Rentals (realsolutionsrentals.com) (`src_site_realsolutionsrentals`) | 0 | 2 | not_checked | [site](https://realsolutionsrentals.com/) | [robots.txt](https://realsolutionsrentals.com/robots.txt) |
| [ ] | Intempus Property Management (intempuspropertymanagement.com) (`src_site_intempus`) | 0 | 1 | not_checked | [site](https://intempuspropertymanagement.com/) | [robots.txt](https://intempuspropertymanagement.com/robots.txt) |

## Notes recorded so far

- **src_site_roostrealestateco**: robots.txt of roostrealestateco.com not checked separately (roostpropertymanagementohio.com allows all); re-check before any automated use. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_swisspmg**: robots.txt blocks only calendar/events paths. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_evernest_columbus**: robots.txt disallows only /cdn-cgi/ and /_system/. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_purehomeriver**: robots.txt disallows only /wp-admin/; Content-Signal ai-train=no (we do not train a model; fact extraction only). Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_northpointam**: robots.txt allows all. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_rpmmidwest**: robots.txt: empty Disallow. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_mynd**: robots.txt allows all. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_10xpropertymanagers**: robots.txt allows all. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_reafco_ohio_elite**: sites.google.com robots.txt disallows only /feeds and /_/ paths. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_pmi_columbus**: robots.txt not checked. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_allcountyprop**: robots.txt not checked. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_liveoakwood**: robots.txt not checked. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_housepitality**: robots.txt not checked. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_ihrepm**: robots.txt not checked for ihrepm.com. The sister domain iheartrealestatepm.com disallowed fetching (see src_site_iheartrealestatepm), so fees are NOT recorded; identity and self-stated license only. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_sbs**: robots.txt not checked. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_rlpmg**: robots.txt not checked for this domain. The sister domain rlpropertymanagementgroup.com refused fetching (see src_site_rlpropertymanagementgroup). Identity facts only; fees stay blank. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_realsolutionsrentals**: robots.txt not checked. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
- **src_site_intempus**: robots.txt not checked. Terms of service not read. Single manual page reads only; no automated fetching until the terms are reviewed and tos_decision is set.
