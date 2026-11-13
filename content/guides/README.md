# Guides (status: draft, written 2026-11-12)

| File | Type | Main sources |
|---|---|---|
| what-does-a-property-manager-do.md | guide | Ohio Dept. of Commerce landlord guide and property management/rental requirements pages; ORC 4735.01; company pricing pages (counts only) |
| property-management-cost-columbus.md | fee-guide | Nine company pricing pages (data/fee-schedules.json, captured 2026-11-11); HomeGuide; Flat Fee Landlord roundup (both fetched 2026-11-12, labelled third-party) |
| leasing-fee-vs-renewal-fee.md | fee-guide | Same company pages (leasing and renewal fields); HomeGuide; Flat Fee Landlord |
| how-to-choose-a-property-manager-columbus.md | guide | Ohio Dept. of Commerce landlord guide, property management page, news release; Ohio REALTORS LPI FAQ |
| management-agreement-checklist.md | guide | Ohio Dept. of Commerce landlord guide; ORC 5321.01; company pricing pages as examples of fee-term structure |
| ohio-security-deposits-process.md | landlord | ORC 5321.16 and 5321.01 (codes.ohio.gov); Commerce landlord guide |

All legal statements are limited to ORC 5321.16, 5321.01 and 4735.01 and Commerce pages, each fetched via WebFetch on 2026-11-12. ORC 5321.16 was fetched twice and the interest, 30-day, forwarding-address and remedy points were checked against near-verbatim excerpts.

## Could not verify / open items
- The License Lookup URL (https://elicense.lpi.ohio.gov/s/licenseshome) is taken from the link list of the Commerce landlord guide page. The lookup page itself was not fetched (interactive, and the shell cannot reach it). Check it opens before publishing; the Commerce page may drop the tracking parameters I removed.
- Commerce pages `.../notice-license-lookup` (daily licensee database) and the licensing landing page returned fetch errors. The daily database is mentioned nowhere in the guides; only the lookup tool is.
- Statement that the new lookup may be incomplete comes from Ohio REALTORS (trade association FAQ, secondary), not an official page. Re-check whether the state lookup is now complete.
- ORC text was read through WebFetch summaries and short excerpts, not a full verbatim copy (curl to codes.ohio.gov is blocked). A human should read ORC 5321.16 once before publishing.
- The "penalty up to $1,000 per day" for unlicensed management (Commerce news release) was deliberately not used.
- Fee guide limits: Mynd per-home vs total unclear; 10X plan names unconfirmed and leasing/renewal not mapped to plans; HomeRiver and RPM Midwest publish no renewal fee (RPM no leasing fee); percent basis (collected vs billed) often not stated. All noted in the text.
- HomeGuide is undated; Flat Fee Landlord is a vendor and a roundup. Both labelled as third-party. Newwestern ($248 Columbus average), Awning, Hemlane, Thumbtack and Evernest-blog figures from fee-benchmarks.md were not used because not fetched here.
- National search volumes in keywords.csv were not cited in any guide (source pages undated).
- "What does a manager do" cannot use service counts across companies: data/companies.json has services for only two companies (HOA, short-term rental). The guide uses the state checklist plus fee-line counts instead.
- Internal links are placeholders matching the UX spec; the UX spec names `/fee-guide/leasing-fee/`, but my links use `/guides/leasing-fee-vs-renewal-fee/`, `/guides/<slug>/` and `/fees/`. Developer should map slugs.
- Not written (backlog): rent pricing (needs Census source), eviction, tenant screening, hire-vs-self-manage, "does a PM need a license" as its own page (covered inside two guides).
