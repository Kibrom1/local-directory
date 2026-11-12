# Columbus property management directory

Free static directory of property management companies in the Columbus, OH metro. Astro (static) + JSON data + Pagefind. No database, no backend. See `docs/BRIEF.md` for rules and `docs/developer/adr-001-stack.md` for the stack decision.

## Setup
```
npm install
cp .env.example .env     # optional: set PUBLIC_GA_ID and SITE_URL
npm run validate         # schema + referential integrity + suppression checks
npm run build            # validate, astro build, then pagefind index into dist/
npm run dev              # local dev server (search works only after a build)
```
Requires Node 22. Build output: `dist/`. Build report (published vs skipped pages and why): `reports/build-report.json`.

Environment variables: `PUBLIC_GA_ID` (GA4 ID; tag omitted when unset), `SITE_URL` (production origin for canonicals, sitemap, robots.txt).

## Layout
- `data/` JSON data files: companies, fee-schedules, service-areas, property-types, geography, sources, suppression
- `schemas/` one JSON Schema per data file, plus `common.schema.json`
- `scripts/validate.mjs` the validator (`DATA_DIR=/path` validates another folder)
- `src/lib/site.mjs` data loading and the quality gate; thresholds in `src/lib/quality.json`
- `src/pages/` home, `city/[slug]`, `company/[slug]`, about, privacy, robots.txt

## Data conventions
- Stable IDs: every record has a lowercase id with a type prefix (`co_`, `fee_`, `sa_`, `pt_`, `geo_`, `src_`, `sup_`). Never reuse or rename an ID; slugs may change, IDs may not.
- Provenance: every fact carries `source_id`, `captured_date`, `last_verified_date` (ISO dates). Every `source_id` must exist in `sources.json` and the source must have `use_allowed: true`. Record the robots.txt and terms-of-service decision on each source.
- Unknown stays `null` (or an empty array). Never guess, never use 0 for "unknown". The site shows "Not published" for nulls.
- Suppression: removal requests go in `suppression.json` (by company id, website domain or name). The company and its fee/area rows must be deleted from the data files; validation fails while a suppressed company is still present.
- Placeholder: records with `"placeholder": true` are fake test data. Their pages are `noindex` and excluded from the sitemap. Delete them when real data arrives.
- Quality gate: a page is generated only if it clears the thresholds in `src/lib/quality.json` (company: at least 3 populated fact groups including fees, license or service areas; city: at least 2 publishable companies). Skipped pages are listed in the build report.
- Only collect facts and public business contact details; no personal data about individuals, no copied prose or images.
