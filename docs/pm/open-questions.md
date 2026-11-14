# Open questions for the owner

Date: 2026-11-11. Ordered by what blocks the most work. PM recommendation in each line; none of these are decided.

## Blocking launch or the content plan
1. **Domain choice.** Top candidates (`domain-shortlist.md`): columbuspmguide.com, centralohiopropertymanagers.com, columbuspmdirectory.com. PM recommends columbuspmguide.com (fits guide + directory scope) with centralohiopropertymanagers.com as alternative. Needs registrar check (availability via RDAP is "consistent with not registered", not proven), aftermarket price, trademark web screen, social handles. Site name, About text and the placeholder "Columbus PM Directory" depend on it.
2. **Keyword Planner pull.** Need a Google Ads account (free, no ads required; the researcher marked this "confirm") to pull monthly ranges for the ~35 queries in `keywords.csv` plus the landlord topics. Without it the 3,000 threshold is an estimate (3,800-19,600, low confidence) and the landlord-topic priority is unmeasured except the three national informational queries. Who does it and by when?
3. **Display ads: yes/no.** Estimated $1.50-$75/month (`traffic-value.md`); ads would show competitors' ads next to listings and add Vercel and consent implications. PM recommends no ads at launch and revisit after the month-6 gate; if ever yes, block real-estate and property-management categories and disclose.
4. **Consent banner.** PM recommends none at launch (US audience, no ads, GA4 aggregate only, no Google signals), revisit at ads, remarketing, or over 5% EU/UK sessions. This is a product recommendation, not legal advice; owner decides.
5. **Vercel plan.** The free Hobby plan is, to my knowledge, limited to non-commercial use; this site has no revenue today but is a business-adjacent project and would turn commercial with ads. Verify current Vercel terms and choose Hobby or Pro before launch. Cost impact unknown here.
6. **Correction/claim form tool and contact email.** Hosted form (free third-party tool; it stores requester name, role, email) plus email fallback, or email only. Which tool, and which address on the new domain? Who answers within the SLA (ack 3 business days, apply 14 days)?
7. **Operating entity and About-page identity.** Who is named as the operator (individual or an existing business)? Public contact details to show?
8. **Related-business disclosure wording (Gashana).** PM recommends plain disclosure on About, no link or promotion elsewhere, no ranking effect, and disclosure on a profile if a Gashana customer is ever listed. Confirm wording, and list any other related business to disclose.

## Content and risk
9. **Legal-process guides (eviction, security deposits, screening).** These are the highest-demand landlord topics in principle but the highest risk without attorney review. PM proposes Stage 2, process description only, every statement cited to statute or court pages, no advice. Approve, defer, or drop?
10. **Launch size.** If fewer than 30 pages clear the unique-data bar at launch, launch anyway (record deviation) or wait for more guides and companies?
11. **Index bar tightening.** PM proposes company profiles are indexable only with verified fees or license (current gate allows areas + services + contact). This reduces launch pages but protects site trust. Approve?
12. **Fee-guide framing.** Dataset is 9 companies who publish fees, a self-selected sample. PM requires "companies we reviewed, not a market average" on every table. Acceptable, or hold the fee guide until more companies are added?
13. **Third-party benchmarks.** Several are vendor-written (Awning, Hemlane, Evernest, Thumbtack). Show them with vendor labels (PM proposal), or limit to non-vendor sources?

## Operations
14. **Who runs the weekly metrics check and the monthly scraper review?** PM drafted the process (`metrics.md`); a named owner and day are needed.
15. **ToS review for the 9 fee-source sites and the Division licensee file.** Currently robots-allowed, ToS unreviewed. Owner or Researcher to read terms before publish; any prohibition removes the data.
16. **Companies whose robots.txt blocked fetching** (RL Property Management Group, I Heart Real Estate PM, FYVE unconfirmed): list them with fees blank, or omit? PM recommends list with facts from approved sources and fees blank, and invite them to supply fees via the correction form.
17. **Month-count baseline.** Confirm T0 = first indexable pages live plus sitemap submitted, and that the 40-company timing (T0 + 6 months) and the 50% non-indexing stop rule are acceptable additions to `thresholds.md`.
18. **Schema changes.** Fee ranges/plans and company-supplied-fact sources are not in the current schema (`backlog.csv`, Data model epic). Approve Developer work before launch?

## Added by the developer (see `findings-status.md`)
19. **Terms and robots reviews for 18 company-site sources.** Owner: person reading the terms. Unblocks 13 indexable pages through the terms gate.
20. **Human comparison of the 10 fee rows.** Owner: reviewer. Until then every row reads "Read on the company's site ... Confirm with the company".
21. **Fee scope.** NorthPoint (network-wide page) and 10X (unconfirmed plan mapping) are shown with a caveat and not counted. Owner decides: find better pages, or add the scope to `feeScopesCountingTowardGates`.
22. **Service area for 10X and Reafco.** Company must state it on its site or submit it. Do not infer.
23. **Listed pages.** `publishListedTier` is false in production (28 pages unpublished). Owner decides if and when to publish them.
24. **License lookups.** Do manual Ohio eLicense lookups (runbook), or keep "stated by company, not verified".
25. **Stray `/Users/Kb/Desktop/tsconfig.json`.** Owner: remove or move it so the build runs in this folder.

## Resolved by the user (2026-11-14, via the PM session)
- Site name: Central Ohio Property Management Guide.
- Fee badge wording: UX designer's wording adopted ("Read from the company's website by our tool on DATE"). Owner decision 2026-11-14: the label no longer says "not yet checked by a person"; "Checked by a person, DATE" still appears where a person compared the row..
- "Not recorded" added; "Not published" only where a check is recorded (`fields_checked`).
- First-year cost range approved with named gaps.
- Corrections: documents-by-email option and a public corrections log approved. Open detail: removals are logged without the company's name (developer default); PM to confirm.
- Terms gate stays on; launch small until a person reads the 18 sites' terms. Full license badge wording kept.
