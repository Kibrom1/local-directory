# Next to do (2026-11-14)

The site is live at https://centralohiopmguide.com. The build, tests and launch settings are done. What is left needs a person.

## Do first
- [ ] **Search Console.** Add `centralohiopmguide.com` and submit `https://centralohiopmguide.com/sitemap-index.xml`. This is how Google finds the pages.
- [ ] **Redirect the old address.** In Vercel, Settings, Domains: make `local-directory-livid.vercel.app` redirect to `centralohiopmguide.com`.
- [ ] **Check the corrections inbox.** Send a test message to brightstepsdigitalllc@gmail.com from the corrections page's email link, and confirm someone reads that inbox.

## Source risk (biggest open item)
- [ ] **Find sources that prohibit automated access.** The terms gate is off, so a source stays published until someone finds a prohibition. Work through `docs/pm/terms-review-checklist.md`, most fee rows first. For each: read the terms and `robots.txt`, then set `tos_decision`, `tos_checked_date`, `robots_decision` and `robots_txt_checked_date` in `data/sources.json`. A source that prohibits automated access gets `use_allowed: false` and drops off the site. Only a person who has read the terms sets `tos_decision`.

## Data work
- [ ] **Human comparison of fee rows** against the company pages (the 7 indexable profiles first).
- [ ] **Service areas for 10X and Reafco.** Do not guess; record only what the company states.
- [ ] **Re-read stale facts.** Facts older than 150 days go on the re-verify queue (`npm run` report lists them).

## Decisions (made by the developer on 2026-11-14, owner can reverse)
- [x] **Serif headings: keep.** The designer recommended them, every text pair passes contrast, and they cost nothing in weight (system fonts). To revert, change `--serif` in `src/styles/site.css`.
- [x] **Removal log: keep the default.** A removal is logged as "a listing was removed" without the company's name, so the log never reveals who asked or who was removed. The log still shows that and when a removal happened.
- [x] **Analytics: leave off for now.** Do not set `PUBLIC_GA_ID` yet. Search Console gives aggregate search data with no cookies. The four counted events are wired and stay dormant until an ID is set; the Privacy page already describes them. Revisit when there is traffic worth measuring.

## Later
- [ ] **Keep the domain renewing.** Turn on auto-renew for `centralohiopmguide.com`.
- [ ] **If Bright Steps Digital starts a product for property managers,** update the related-business disclosure in `src/lib/env.mjs` before it goes live.
- [ ] **CSS budget.** The stylesheet is within a few bytes of its 15 KB limit. The next styling change has to remove something first.
