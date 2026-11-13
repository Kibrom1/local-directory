# Fee data: source decisions and caveats (captured 2026-11-11)

Rule applied: a value goes in fee-data.csv only if it is stated on the company's OWN public page. Third-party roundups (Awning, Mynd/Belong/Evernest "best of" blogs) were used only to find leads, never as the value source, because they conflict with each other and with company pages.

## Recorded (9 companies, 10 rows) - robots.txt / access decision
| Company | robots.txt | Decision |
|---|---|---|
| Mynd | allows all (Allow: /) | used |
| Evernest Columbus (columbuspropertymanagement.co) | disallows only /cdn-cgi/, /_system/ | used |
| HomeRiver Group (purehomeriver.com; homeriver.com redirects there) | only /wp-admin/ disallowed; Content-Signal ai-train=no (no training use; we are not training a model) | used for fact extraction only |
| ROOST (roostrealestateco.com / roostpropertymanagementohio.com) | roostpropertymanagementohio.com allows all; roostrealestateco.com robots.txt not checked separately | used; re-check roostrealestateco.com robots before bulk scraping |
| 10X Property Management | allows all | used |
| Reafco Ohio Elite (Google Sites) | sites.google.com disallows only /feeds and /_/ paths | used |
| Northpoint Asset Management | allows all | used |
| Swiss Property Management Group | only calendar/events paths | used |
| RPM Midwest | empty Disallow | used |
Terms of service pages were NOT read for these sites (not reachable as separate fetches in this pass). Treat as "robots allowed, ToS unreviewed" in the source registry until checked.

## Skipped: robots disallowed fetch
- RL Property Management Group (rlpropertymanagementgroup.com/pricing): fetch refused, robots_disallowed. Not recorded.
- I Heart Real Estate PM (iheartrealestatepm.com/pricing): robots_disallowed. Not recorded.
- FYVE (fyve.com/pricing): fetch failed (client_error); not recorded. Not confirmed robots-blocked.
Their fees appear only in third-party roundups (RL flat $109-$184/mo with plan variations across sources; IHREPM $99/mo flat; FYVE $99/$149/$229). Sources disagree with each other, so nothing is recorded. Leads for owner-requested manual verification only.

## Checked, no fee amounts published (company has listing value, no fee row)
ROOST via roostpropertymanagementohio.com (flat-rate only, amounts on separate page, captured on roostrealestateco.com instead), PMI Columbus (no fees), Northpoint Columbus page (fees on /pricing, recorded), Intempus Property Management (says flat monthly fee, no amount), All County Property Management NEO/Columbus (no amounts), Roost on propertymanagement.com (no amounts), Reafco common-questions page (no management %).

## Excluded as out of area or unreliable
- True Home Ohio: pricing page lists Cincinnati, Dayton, Middletown, Hamilton, Canton, Akron; no Columbus. Excluded.
- EquityTeam, Progressive Urban, Cleveland PM Group: Cincinnati/Dayton/Cleveland markets.
- Real Property Management Unity (rpmunity.com): Virginia franchise.
- Belong: its Columbus and Lancaster pages show unlabeled two-column values (Belong vs. comparison column) so single-value rows cannot be attributed; its blog table says $199 flat/$1,699 placement/$699 renewal, which conflicts with the 8-12% on its city pages. Excluded pending clarification.
- Hemlane, Thumbtack, HomeGuide, Awning, Tidy: software or lead-gen marketplaces, not property managers (Awning is a short-term-rental manager and lead-gen; not a Columbus long-term manager).

## Conflicts and ambiguities to resolve before publishing
- Evernest: its Columbus /pricing page says 6% (single-family), 50% leasing ($500 min), $250 renewal. Other pages (Awning roundup: Prime 10%, Plus 9%, Pro 8%; Mynd roundup: 8-10%) show different numbers. Only the Columbus page is recorded; verify before a company profile goes live.
- 10X: the pricing page lists a 5th unlabeled column and a standalone $75 management fee / $125 renewal that conflict with plan tables. Leasing and renewal are recorded as ranges, plan mapping not asserted; flat plan prices ($85/$95/$145) mapped by the order of the plan columns as extracted. Confirm plan labels by eye.
- Reafco: monthly-fee and leasing pages read separately; property types and renewal rule were read from the leasing page.
- Northpoint: pricing page is network-wide (25+ markets), not Columbus-specific; property types come from the Columbus services page.
- Swiss PMG: the page lists the higher-percentage plan (Signature, 10%) with the lower leasing fee; recorded as published.
- HomeRiver Group: Columbus page shows 7-10% and 50%; awning roundup claims Ohio offices do not publish fees. Own page wins.
- Evernest/Mynd/HomeRiver/ROOST Columbus pages are marketing pages that can change at any time; last_verified_date should equal captured_date until re-checked.

## Coverage
9 companies / 10 rows with published own-page fee data. Management % published by 6 (Evernest, HomeRiver, Reafco, Northpoint, Swiss PMG, RPM Midwest); flat fees by 3 (Mynd, ROOST, 10X); leasing by 8; renewal by 7; minimums by 4; property type by 8 (partly). This is far below the 20-40 target: in Columbus most local managers hide fees behind a quote form.
