# Project brief (shared by all agents)

Project: a free, standalone directory of property management companies for the Columbus, Ohio metro. Searchers are rental owners choosing a manager. Goal: organic traffic (no revenue in the current plan).

## Hard rules
- No payments of any kind: no paid listings, featured placement, pay-per-lead, % of fee or rent, inquiry routing, accounts or billing.
- Not a rental-listings site and not a tenant-referral service.
- Data comes only from publicly available sources, collected by scraping/API/bulk download. Before using any source, check its terms of service and robots.txt and record the decision. Skip sources that prohibit automated access.
- Collect facts (fees, services, areas, license status), not copied prose or images. Never collect personal data about individuals beyond a business's published public contact details.
- No fabricated data. Every fee, license status and count needs a source URL and a capture date. Unknown stays blank (empty), never guessed.
- No templated filler pages: a page is publishable only if it has unique structured data.
- No attorney involvement; no legal advice needed. Keep free safeguards: source provenance, correction/removal flow, suppression list.

## Stack (start small, zero database)
- Data: plain JSON files in the repo (CSV converted at build time), validated by JSON schemas. Stable IDs on every record.
- Site: Astro static output on Vercel, own domain. Client-side search (Pagefind). Google Analytics 4 + Search Console.
- No backend, database, accounts or admin UI.

## Geography (phase 1)
Franklin County (Columbus, Dublin, Hilliard, Gahanna, Grove City, Groveport, Canal Winchester, Bexley, Grandview Heights, New Albany, Westerville in part), Delaware County (Delaware, Powell, Westerville, Dublin), Fairfield County (Canal Winchester, Lancaster, Pickerington), Licking County (Newark, Heath, Pataskala).

## Page types (target 150-300 indexable pages)
City/suburb x service; school district x service (Olentangy, Dublin, Upper Arlington, Gahanna-Jefferson, Canal Winchester, Lancaster, Big Walnut); property type x metro (single-family, small multifamily 2-4 units, HOA/community, short-term rental); company profile; fee guides.

## Data model (files)
companies, fee-schedules, service-areas, property-types, sources, geography, suppression list. Each fee row: company, property type, management %, flat fee, leasing fee, renewal fee, minimums, source URL, captured date, last verified date.

## Shared folder
All agents write deliverables under `/home/claude/directory-site/docs/<agent>/` (researcher, pm, ux, developer). Final answer to the orchestrator: a short summary of what you produced, file paths, and any gaps or blockers. Do not pad.
