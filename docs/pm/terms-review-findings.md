# Terms and robots first pass: the nine sources that feed fee rows (2026-11-14)

A quick read by the developer, not a legal review and not a recorded decision. Nothing in `data/sources.json` was changed. A person should read the cited section before recording `tos_decision`. Quotes are short phrases from each site's own terms.

| Source | Terms page | What it says about automated access or copying | robots.txt | Suggested decision |
|---|---|---|---|---|
| Mynd (`src_site_mynd`) | mynd.co/terms-of-use | **Prohibits.** Bans "spiders, robots, crawlers, data mining tools" and mirroring or framing the site. Content for "personal and non-commercial purposes" only. | Redirects; real file not read | `prohibits_automated_access` |
| HomeRiver (`src_site_purehomeriver`) | purehomeriver.com/terms-of-use/ | **Prohibits.** Bans "any robot, spider, or other automatic device" and "any manual process to monitor or copy" material. | Has content signals; search allowed | `prohibits_automated_access` |
| ROOST (`src_site_roostrealestateco`) | roostrealestateco.com/terms-conditions/ | **Prohibits.** Bans "systematic or automated data collection", including scraping and data mining, without written consent. | Allows all except wp-admin | `prohibits_automated_access` |
| Swiss PMG (`src_site_swisspmg`) | swisspmg.com/terms-of-use/ | Copying or reuse of content needs written consent. Does not mention scraping or robots. | Redirects; real file not read | Judgement call: `silent` on automated access, but reuse of content is restricted |
| Evernest (`src_site_evernest_columbus`) | None found (privacy policy only) | Nothing to read | Allows all except system paths | `silent` |
| RPM Midwest (`src_site_rpmmidwest`) | None found | Nothing to read | Not retrieved | `silent` (robots still to read) |
| 10X (`src_site_10xpropertymanagers`) | None found | Nothing to read | Allows all | `silent` |
| NorthPoint (`src_site_northpointam`) | None of its own (only Google's reCAPTCHA terms) | Nothing to read | Allows all | `silent` |
| Reafco (`src_site_reafco_ohio_elite`) | Google Sites; no own terms | Nothing to read | Blocks only /feeds and internal paths | `silent` |

## What excluding the three that prohibit automation would do
Excluding Mynd, HomeRiver and ROOST (set `use_allowed: false`) takes the published pages from 22 to 14. With only four companies left with counted fees, the fee comparison needs five, so **the fee comparison, all fee guides and the fee guide hub disappear**, and company pages lose their fee data. Excluding Mynd alone leaves 20 pages and keeps the comparison.

## Choices
1. Exclude all three now (cleanest for the rule "exclude only if the terms prohibit automated access"; the fee comparison goes away until more companies publish fees).
2. Exclude them, then add companies whose terms are silent until the comparison returns.
3. Keep them published and answer any objection quickly (higher risk; the terms are explicit).

Note: the fee data was captured by an automated read ("read by our tool"), which is the kind of access these three terms mention. The remaining nine sources in the registry have not been read.

## Draft note for 10X (not sent)
Subject: Unrelated text on your pricing page

Hello, while reading your pricing page (https://www.10xpropertymanagers.com/pricing) we noticed unrelated text about online casinos in other languages. It looks like spam inserted into the page, possibly by a plugin or a compromised account. You may want to have your web provider check the site. We have not changed anything. This is the only reason for this message.
