# Traffic value: how comparable directories earn, ad eligibility, rule conflicts

Research date: 2026-11-11. Vendor-written sources are flagged; verify before relying on them.

## 1. How comparable directories earn (what I could verify)
| Model | Evidence | Source / date | Conflict with brief? |
|---|---|---|---|
| Lead-gen / quote forms | Awning city pages are lead forms ("free rental estimate"); Thumbtack is a quote marketplace; propertymanagement.com has "Find a Property Manager" form and a "Get verified" program. Who pays whom is not disclosed on these pages | pages fetched 2026-11-11 (awning.com/rental-property-management/dublin-oh; thumbtack.com/oh/columbus/property-management; propertymanagement.com/companies-in-columbus-oh/) | **Yes**: pay-per-lead and inquiry routing are banned |
| Affiliate commissions | Awning listicle states "When you buy or sign up through our links, we may earn a commission" and labels its own service "RECOMMENDED" | https://awning.com/post/columbus-property-management-companies (published 2023-07-28; fetched 2026-11-11) | **Yes**: referral commission on signups is effectively pay-per-lead or %-of-fee |
| Paid verification, tiers, featured placement | Vendor article lists tiered subscriptions, premium placement, badges, pay-per-lead ($30-$50 per commercial-roofing lead in Austin as an illustrative example) | https://www.edirectory.com/updates/how-directory-websites-make-money/ (2026-07-03; directory-software vendor, no independent data) | **Yes** |
| Sponsored content / self-promotional listicles | Mynd, Oakwood and Evernest publish "best of" lists ranking themselves first | pages fetched 2026-11-11 | **Yes** (paid or self-interested placement) |
| Display ads | Standard for content sites; no directory-specific revenue data found | see section 2 | **Not literally**; see gray areas |
| Marketplace/ads at scale | Zillow routes to agent advertising and mortgage products | zillow.com homepage fetched 2026-11-11 | Yes |

I found no independent revenue data for niche directories (all revenue-model articles are directory-software vendors). Treat all income claims as unverified.

## 2. Display ad eligibility (current thresholds, verified where possible)
| Network | Threshold | Source and date | Verification level |
|---|---|---|---|
| Google AdSense | No minimum traffic stated. Adult applicant, own the site (HTML access), content must be "high-quality, original, and attract an audience", comply with program policies | https://support.google.com/adsense/answer/9724?hl=en (fetched 2026-11-11, no page date) | Primary source |
| Mediavine "Journey" | Over 1,000 sessions (Tier 1 countries, within 30 days) | https://www.mediavine.com/?p=19304 (last modified 2026-10-06); https://help.mediavine.com/what-does-it-take-to-get-approved-by-mediavine (no date) | Primary (Mediavine-owned) |
| Mediavine "Official" | $5,000+ annual ad revenue; original content, clean human traffic, good AdSense/Ad Exchange standing, site experience | same | Primary. **Conflict:** a Newor Media article (2026-06-10, mod 2026-10-20) still says 50,000 monthly sessions; treat as outdated |
| Raptive | 25,000 monthly pageviews (cut from 100,000 on 2025-10-16) plus other eligibility and selectivity | https://raptive.com/blog/opening-the-door-to-more-creators-who-meet-raptive-quality-standards/ (2025-10-16) | Primary |
| Ezoic | 250,000 monthly users; sites before 2026-02-18/19 grandfathered; below threshold: Incubator (20 sites selected per month) | https://support.ezoic.com/kb/article/getting-started-ezoics-requirements ; https://www.ezoic.com/incubator (fetched 2026-11-11) | Primary. The two pages differ by a day on the cutoff date (Feb 18 vs 19) |

Not verified: Monumetric requirements (no primary source fetched).

Implication: at the estimated 150-650 visits per month, only AdSense (and possibly Journey at over 1,000 sessions) would be accessible. Raptive and Ezoic are out of range until traffic is 25k+ pageviews and 250k users respectively.

### Revenue size (estimate; RPM sources are vendor-biased)
RPM benchmarks from Newor Media (a managed ad network, 2026-07-30, mod 2026-10-20, https://newormedia.com/blog/best-adsense-alternatives/): AdSense $2-6, managed header bidding $8-25, finance/legal/B2B on premium networks $20-50; no real-estate figures, no methodology.
Assumption: 1.5 pageviews per session. At 500 sessions per month: 750 pageviews x $2-25 RPM = **~$1.50-$19 per month**. At 2,000 sessions: **~$6-$75 per month**. Ad revenue is not a material goal; it is also consistent with the brief's "no revenue in the current plan".

## 3. Conflicts with the no-payments / no-lead-gen rules
- **Conflicts (do not use):** paid listings, featured placement, verification badges for a fee, pay-per-lead, inquiry routing or "request a quote" forms, referral/affiliate commissions on company signups (including software like Hemlane/Awning-type referrals), sponsored "best of" content, accounts and billing.
- **Gray areas (need owner decision):**
  - Programmatic display ads (AdSense etc.): no company pays for placement on the site, but the ad auction will show property-management companies' ads (CPC ~$3.2 on the Fresno analog, 2026-06-24) next to organic listings. That can look like paid placement and undermines neutrality. If ads are ever used, block the real-estate/property-management ad categories and sellers in the ad network settings.
  - Non-affiliate tool or book ads, donations, or sponsorship of the whole site by a non-listed party: not paid placement, but still revenue; owner should decide.
  - Disclosure: any monetization should be stated on an editorial-policy page.
- **Safe:** no monetization in Phase 1; revisit AdSense only if it can be restricted to non-competing categories and only after the month-6 gate.
