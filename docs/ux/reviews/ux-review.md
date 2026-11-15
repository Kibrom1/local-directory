# UX review: Columbus PM Guide

Date: 2026-11-14 | Role: principal UX (research, IA, interaction, content) | Scope: whole experience, read from the PRD, UX spec, templates, scripts, guide drafts, data and the build report. Companion docs: `ux-revamp-spec.md` (what to build), `ux-wireframes/index.html` (layouts).

## 0. How this was evidenced (and its limits)
- Read: `docs/pm/prd.md`, `docs/ux/ux-spec.md`, `accessibility-checklist.md`, every file in `src/pages`, `src/components`, `src/scripts`, `src/layouts/Base.astro`, `src/lib/{site,fees,estimate,quality}`, `content/guides/*.md`, `data/*.json`, `reports/build-report.json` (as of 2026-11-14).
- Prototype: the Browser pane would not render the prototype with its stylesheet (a `file://` page cannot load sibling CSS, and a styled copy was not interactive). I therefore used the designer's saved screenshots at 375px (`docs/ux/reviews/screenshots/proto-*-375.png`, viewed: home and fees) plus the prototype HTML/CSS source. **No click-through on a live Astro build and no user testing happened.** Findings marked "inferred" come from reading code; "observed" from screenshots; "data" from `data/` or the build report. The cognitive walkthroughs below are expert walkthroughs, not research.
- Not touched: anything outside `docs/ux/reviews/`.

## 1. What the site actually has to work with (the biggest UX fact)
The UX spec was designed for a fuller dataset than the launch will have. Numbers from `data/` and `reports/build-report.json`:

| Fact | Value | UX consequence |
|---|---|---|
| Company records | 25; 18 own-site-confirmed; 5 third-party-only and 2 leads never published | Few real profiles |
| Indexable pages now | 17 of the 30-45 Stage 1 target (`below_stage_minimum`) | Thin site; design must read as "early and careful", not "empty" |
| Indexable companies / cities / fee guides | 6 / **1 (Columbus)** / **1** (leasing fee; management 4 of 5, renewal 4 of 5, flat 2 of 5) | Most city pickers, filters and guide hubs have one item |
| Companies with verified fees | 6 under the conservative rule (9 under liberal) | The fee table has 6-7 rows |
| Fee rows verified by | `verification_method: agent_read` on all 10; `human_verified_date: null` | No fact has been checked by a person |
| Verified licenses | 0 of 25; 3 self-stated | License badge is "not checked" almost everywhere |
| Companies with any services listed | 2 of 25 (HOA, short-term rental) | "Services" section is empty almost everywhere |
| Companies with property types | 9 of 25 | The property-type filter drops 16 companies |
| Phone numbers | **0 of 25** | Contact is "website" only |
| Landlord guides published | **0** (6 drafts, `status: draft`, unpublished in production) | P2 has nothing to read and the "Landlord guides" nav item does not exist |
| Cities with 3+ companies (own-site) | Columbus 13, Dublin 5, Westerville 5, Hilliard 4, Delaware 4... but only Columbus has any fee-publishing company (6); Dublin 0, Westerville 1 | A city page can be real but fee-less |

Design implication: the site's honest pitch at launch is **"a careful, sourced start"**, not "the directory". Every template must work with 1 city, 6 profiles, 6 fee rows and mostly "Not published" cells, and must grow without redesign.

## 2. Heuristic evaluation (Nielsen's 10, plus trust and WCAG 2.2)
| # | Heuristic | Verdict | Notes |
|---|---|---|---|
| 1 | Visibility of system status | Mixed | Freshness badges and counts are good. Filter result count in `role=status` is good. Compare mode has a counter. Missing: what "verified" means (F2), what is not yet covered (F5) |
| 2 | Match with real world | Weak spots | "PM", "Leasing fee vs Renewal fee", "Minimums", "Basis" are jargon for a first-time owner; ISO dates (`2026-11-11`); "Not checked yet" reads as our to-do list |
| 3 | User control and freedom | Good | Plain GET links, back button works, no dark patterns. Compare mode has "Show all" |
| 4 | Consistency | Good | Same four facts in card and table, same chips. Gap: "Verified" used for agent-read and (future) human-read |
| 5 | Error prevention | Mixed | Correction form requires an evidence URL even where PRD allows "Provided by the company" (F8); estimator accepts any number |
| 6 | Recognition over recall | Mixed | 8-column table needs recall across columns on mobile; no "questions to ask" on profiles |
| 7 | Flexibility and efficiency | Weak | One path (city then card). No "see all companies" list, no sort, no shortlist or print |
| 8 | Aesthetic, minimal | Mixed | Scope banner repeated on every page and badges on every card (license "not checked" x 17) add noise; value cards on home are generic |
| 9 | Error recovery | Good | Error summary with focus, field errors, zero-result state with exits |
| 10 | Help and documentation | Mixed | Methodology is complete but is a wall of policy; no glossary, no "how to read this" for people who are not fee-literate |
| T | Trust (domain-specific) | Strong foundation, wording gaps | Visible sources and dates, no endorsement cues. Gaps: agent vs human check (F2), unnamed operator until env var set (F10), "Not published" used where we simply did not look (F3) |
| A | WCAG 2.2 AA | Good plan, some gaps | See F12-F14 |

## 3. Findings (ranked)
Format: ID, evidence type, problem, fix. Fixes are specified in `ux-revamp-spec.md`; section refs in brackets.

### P0: fix before launch (trust or a dead end)

**F1. The home page can have no way in.** *Inferred + data.* The find form is `js-only` (`site.css:145` hides it without JS) and has no `action`; `find.js` does the redirect. Without JS there is no form. Only 1 city is indexable now, and "Browse by city" lists only indexable cities, so a no-JS visitor sees one city link, a Pagefind search that needs JS, and the text "City pages appear once...". The spec promised "a GET form that works without JS" (ux-spec 4.1); the code does not deliver it.
Fix: replace the home find form with plain links first (city chips, "See all companies we list", "Compare fees"), and make the form a real GET form to `/companies/` with no JS dependency. Home must never show a picker with fewer than 2 options. [spec 3.1, 3.2]

**F2. "Verified" overstates what a program did.** *Data + inferred.* All fee rows are `verification_method: agent_read`, `human_verified_date: null`, status `verified_own_site`, but nothing in `src/` reads `verification_method` (grep: zero hits). Cards say "Verified 2026-11-11", the profile says "Verified", and the License badge family uses the same word. A rental owner will read "verified" as "a person confirmed this", which is the strongest trust claim the site could make and it is not true yet.
Fix: a two-level vocabulary used everywhere: **"Read from the company's website by our tool on <date>"** (agent-read) and **"Checked by a person on <date>"** (human). Never the bare word "verified" for fees. License: "License matches the Ohio state record (checked <date>)" only for state-record checks. Show the level in the source note and as the freshness badge text. Add a one-paragraph "What 'read by our tool' means" under Methodology. [spec 6.2, 6.3]

**F3. "Not published" is used where we did not look.** *Inferred.* `Unknown.astro` defaults to `not_published`; `company/[slug].astro` uses it for phone, website, address and minimums. Phone is null for all 25 companies, so every profile would say "Phone: Not published", which accuses the company of hiding a number that we never captured. PRD s9 and UX spec 6.3 define four distinct states; the data model has no per-field "we checked" marker. The owner's rule is "unknown stays Not published", so the label stays but must be used only when a check is recorded.
Fix: keep "Not published" as the single visible label for a checked-and-absent fact; for fields we never captured, use a neutral "Not recorded" with a link "Check the company's website" (no accusation), and track per-field check state in data. Open question Q3. [spec 5.4]

**F4. Landlord guides are absent and the site's second audience (P2) has no landing.** *Data.* `guides.published: 0`; six drafts exist. Fee guide pages carry only one live page (leasing). Nav shows no "Landlord guides". P2 arrives from informational queries and has nothing to read; the leasing guide is the only live content. The drafts are good, but two overlap the data-driven fee guides (`property-management-cost-columbus`, `leasing-fee-vs-renewal-fee` are `type: fee-guide` in `/guides/` while `/fee-guide/leasing-fee/` is generated), which would give two URLs for one question.
Fix: publish the four drafts that need no legal review first (what a manager does, how to choose, agreement checklist, cost); merge the leasing-vs-renewal draft into `/fee-guide/leasing-fee/` + `/fee-guide/renewal-fee/` and 301 nothing (they were never live); hold deposits. One IA rule: **Fee guides = what companies publish (data-driven). Guides = how to decide (editorial).** [spec 2, 7]

**F5. The site does not say what it does not cover.** *Inferred.* With 6 profiles, 1 city and 6 fee rows, the home, city and fee pages state coverage only inside a "scope" banner worded defensively. A visitor in Dublin (5 companies in our data, 0 with fees) or Powell lands on pages that do not exist, and the footer implies four counties are covered. This is both a trust risk (looks abandoned or evasive) and a conversion dead end.
Fix: a **coverage panel** on home and city pages: "We list N companies. M publish fees. Cities with a page: ... Cities we have companies for but not enough checked data to publish: Dublin (5), Westerville (5)..." and a "Tell us about a company we missed" link to Corrections (no email capture, no "notify me"). Honest and finite. Sparse-state designs: spec 8.

### P1: fix in launch window (strongly affects task success or trust)

**F6. The fee comparison does not answer "what will I pay in year one?"** *Inferred.* `estimate.mjs` covers management % or monthly flat only; leasing and renewal fees are excluded. For a 1-4 unit owner the leasing fee (often 50-100% of a month) dominates year one. Rows with greater-of or unclear per-home flat fees show "Not enough published data". The estimator is JS-only except for a baked-in $1,500 default.
Fix: a rent-based **first-year cost range** per company with an explicit component list ("management + leasing + one renewal; excludes: maintenance markup, setup fees, anything not published"). Components missing from a company's page are named, never zero. Works without JS using a static $1,000/$1,500/$2,000 table. [spec 5.3]

**F7. "Companies we reviewed, not a market average" is correct but delivered as a repeated banner.** *Observed in prototype.* The same blue banner opens every city, fee, guide and card page. Repetition trains people to ignore it and the tone is defensive ("not a survey").
Fix: say it once per page in a positive, specific line next to the number it governs ("6 of the 14 companies we list publish fees online. These are their numbers, as published."), put the longer scope explanation in a "How to read this table" disclosure, and show what the sample can and cannot support: "Use this to see how companies price things, not to decide what is normal." Never say average, typical, going rate. [spec 5.2]

**F8. P3 (property manager) flow requires a public source even when the company is the source.** *Inferred.* `corrections.js` makes `evidence` mandatory (except for remove); PRD s7 allows "Provided by the company, <date>" when no public page exists. A small manager with a PDF fee sheet is blocked at the form. Also the spec promises a success state with a request ID, which a hosted form cannot give without a backend. No way to see status; no "what will be published" preview; typed fields offer no way to say *which* profile section.
Fix: evidence = link OR "I will email documents" option; "request ID" replaced by the form tool's confirmation plus an email receipt; a public **Corrections log** page (date, company, what changed, no requester data); per-section "Correct this" links on profiles that prefill `?section=fees`. [spec 8]

**F9. Profile lacks what an owner needs to decide.** *Inferred.* The profile shows fees, license, areas, services, contact. Missing: what is included in the management fee (services bundle), contract terms to ask about (term length, termination fee, deposit handling, maintenance markup, vendor markup, who holds owner funds), how to reach (phone is null everywhere), and a "what to ask this company" list tailored to what is *not* published for it. Most of this is not in our data, but the **questions** can be generated from the gaps: each "Not published" cell becomes a question to ask.
Fix: add "What the company publishes about what the fee covers" (verbatim facts only), "Terms we have not seen" and **"Questions to ask [company]"** built from missing facts plus the fee-guide question bank, printable. No prose about the company. [spec 4.5]

**F10. About does not name an operator by default.** *Inferred.* `about.astro` renders "Who runs this site" and "Related businesses" only if env vars exist; the build can ship without them. The PRD's disclosure is a stated trust requirement (owner runs Gashana, which sells to property managers).
Fix: make operator and disclosure required at build (fail), written as a plain sentence on About and a one-line footer link. Open question Q1.

**F11. Type filter silently hides companies that have not stated a type.** *Data + inferred.* `filters.js` hides any card whose `data-types` lacks the chosen type; 16 of 25 companies have no types. Choosing "Single-family" on a city page hides most companies and the empty state says "We list only companies with a sourced fact for that property type", which is accurate but the owner reads it as "no one serves me".
Fix: filter becomes a **grouping**: "Say they serve single-family (n)", "Type not stated (n)". Nothing is hidden. [spec 4.2]

**F12. Mobile: the fee card and banners clip at 375px.** *Observed.* In `proto-fees-375.png` and `proto-index-375.png` the right edge cuts off banner text, values ("N", "50°"), range tags and headings. If this is real overflow (not screenshot cropping) it breaks WCAG 1.4.10 Reflow and the central comparison task on phones. Verify at 375/320 in a real build; likely causes: right-aligned `.v` with `min-width`, fixed `min-width:10rem` on row headers, un-wrapped inline-flex badges.
Fix: card layout becomes label-above-value (stacked), no right-aligned values under 40rem; add a CI test that asserts `document.documentElement.scrollWidth <= innerWidth` at 320 and 375. [spec 5.1]

**F13. Table semantics on mobile and link purpose.** *Inferred.* Mobile cards use generated `data-label` content (spec s14 item 2: known gap), but the template already emits visible `<span class="lbl">` text so this is partly addressed; the region `aria-label` still says "Scrolls sideways on small screens", which is false once it becomes cards. "Open source" repeats up to 40 times per page with no name (2.4.4 Link Purpose).
Fix: emit `aria-label="Open source for <company> <fee>"` or visually hidden suffix; correct the region label; keep the table in a scroll region only at 48rem+.

**F14. Search is a dead end without JS and has no result ranking story.** *Inferred.* `/search/` needs `pagefind-ui.js`; the fallback is a city list. A no-JS or failed-load visitor cannot search; the home search form posts to a page that does nothing for them.
Fix: hide the home search box unless JS and the index are available (feature-detect); give the no-JS fallback a plain A-Z list of everything (a "Site map" page), which also helps crawlers. [spec 3.4]

### P2: improve after launch

**F15. Result cards are mostly "Not checked yet".** *Data.* A city list of 13 companies would show four fee facts of "Not checked yet" for most, which reads as broken. Fix: compact card variant when a company has no fee row: name, areas, "No fee data recorded yet" in one line, link to the company's own pricing page if known.

**F16. Dates are ISO strings.** Fix: "Nov 11, 2026" in text with `<time datetime>`; "3 days ago" never (stale on a static site).

**F17. Home page value cards are generic.** "Fees side by side / Sources and dates / No pay to play" are brand claims, not tasks. Fix: replace with three task cards ("See what companies charge", "Find companies near you", "Learn what to ask") that carry live counts.

**F18. Brand reads "PM Guide".** "PM" is jargon and Search shows it. Fix: tagline "Columbus property management directory" in the header on mobile; domain still pending.

**F19. No glossary.** Leasing fee, renewal fee, tenant placement, "gross rents collected" are explained only inside fee guides. Fix: inline `<abbr>`-style "What is this?" disclosure on the first use of each term in table headers, linking to the fee guide. No tooltips (hover-only fails 1.4.13).

**F20. No analytics events defined.** `Base.astro` configures GA4 but no events exist. Fix: the event plan in spec 12 (no personal data, no free-text values, no company-name-in-URL beyond the path).

**F21. Outbound link attribution.** `rel="nofollow noopener"` good; add `noreferrer`? Not required; leave. But the label "Website: liveoakwood.com" should state it opens the company's own site: "Visit company website".

**F22. Method and privacy pages long.** Methodology mixes policy with thresholds (page-existence thresholds are builder detail). Fix: split into "How to read this site" (owners) and "Rules and change log" (everyone).

## 4. Cognitive walkthroughs
Format per step: *Will the user try the right action? Will they notice it? Will they link it to their goal? Will they see progress?* Y/N with evidence. "Today" = what the templates do now; "After" = revamp.

### P1: owner of a Westerville duplex, first time hiring a manager
Goal: shortlist 2-3 companies and know roughly what year one costs.
1. Lands on `/` from a search for "property management Westerville". Right action: choose city. Notice: today a select that only exists with JS and lists 1 city (Columbus). **N**: Westerville is not offered; no explanation. After: coverage panel names Westerville (5 companies, none publish fees yet) with a link to a "Companies serving Westerville" noindex list and the Columbus fee table.
2. Wants fees. Right action: "Compare fees". Notice Y (nav). Link to goal Y.
3. Fee page. 6 rows, 8 columns; on mobile each company is a card. Understands "Not published"? Banner and legend explain Y. Compares percent vs flat? Needs estimate: JS-only, management only, rent default 1500. **Partial**: leasing fee unknown cost until reading. After: first-year range with named exclusions.
4. Opens a profile. Looks for "what do I get for 8%". **N**: no services (23 of 25 empty), nothing on inclusions. After: "What the fee covers (as published)", "Terms we have not seen", questions to ask.
5. Wants to call. **N**: phone null; only the website. After: "Visit company website" plus "Phone: Not recorded" and the questions list printable.
6. Trusts? "Verified 2026-11-11" misleads (F2). After: "Read by our tool Nov 11; not yet checked by a person".

### P2: landlord asking "what does a property manager do / what is a leasing fee"
1. Arrives from search on a guide URL. **Today: none published** (F4). Lands on leasing fee guide only if it indexes. After: guide with data block ("In the 8 fee rows we read, leasing fees are...") and next-step.
2. Next step card: "Compare fees" and the *first* indexable city regardless of the reader's location (code: `cityPages.find(indexable)`). **N** for a Delaware reader. After: city picker in the card and a link to the matching fee guide.
3. Return path: guide hub absent from nav. After: hub with topic groups.

### P3: Dublin company owner whose listing has a wrong renewal fee
1. Finds the profile (searches own name). Sees "Correct or remove this listing" top and bottom. Y.
2. Form: choose "Correct a fact". Y. Evidence link required: **N** if the fact is only in a PDF. After: link or attach-by-email option.
3. Submits (hosted tool). Expects a receipt and timing. Today: promise of 3 business days; no ID. After: email receipt text and public corrections log with expected dates.
4. Sees the change: no status page. After: corrections log + "Corrected by the company, <date>" source note.
5. Worry: "Does claiming change ranking?" Answered in three places. Y.

## 5. Open questions for the owner
Ordered by how much they change the design.
1. **Operator and disclosure wording (Gashana).** Named individual or business? Plain sentence on About; linked from footer. Required for trust (F10).
2. **Which wording for agent-read facts?** Recommend "Read from the company's website by our tool on <date>; not yet checked by a person" and a plan: human-check the 6 fee-publishing companies first. Do you accept showing that on every fee? (F2)
3. **"Not published" vs "Not recorded".** You asked that unknown stays "Not published". Accept a distinct "Not recorded" only for fields we never looked at (phone, address), or add per-field check state to the data? (F3)
4. **Listed (noindex) tier.** `publishListedTier: false` hides 11 companies and 10 cities in production. Showing them as a plain list at `/companies/` (noindex) would let an owner see "all companies we know" at the cost of publishing thin identity data. Publish the list?
5. **Contact detail policy.** All phones are null. OK to record the phone number printed on the company's own contact page (public business data), with source?
6. **Guide publishing.** Who does the human legal read (ORC 5321.16) before "deposits" ships? Is the merge of the two fee drafts into the fee guides approved?
7. **Counting rule.** Conservative (6 fee companies) vs liberal (9). The user-facing page must state which. Which is the launch rule?
8. **Estimator default rent and unit count.** Use $1,500 labelled "example", or ask the owner to type their rent (empty default)? Recommend empty with three preset buttons.
9. **Corrections tool and public log.** Is a public corrections log (no requester data) acceptable?
10. **Launch size.** 17 indexable pages vs 30-45 target: launch anyway as a "first edition" with visible coverage page?

## 6. Priority summary for the developer
P0: F1, F2, F3, F4, F5. P1: F6-F14. P2: F15-F22. A phased plan with files is in `ux-revamp-spec.md` section 13.
