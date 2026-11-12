# ADR-001: Static-file stack, no database

Status: accepted (provisional, pending owner sign-off) | Date: 2026-11-11

## Context
Free directory of Columbus-area property managers. Goal is organic traffic; no revenue, accounts or user input. Data is collected by one pipeline from public sources and reviewed before publishing. Target 150-300 indexable pages, likely under 1,000 records.

## Decision
- Site: Astro, static output (`output: 'static'`), hosted on Vercel with the own domain.
- Data: JSON files in the repo (`data/`), validated by JSON Schema (`schemas/`) with ajv. Stable IDs and provenance (source_id, captured_date, last_verified_date) on every fact. Git history is the audit log.
- Search: Pagefind, built after Astro and queried client-side. No search server.
- Analytics: GA4 (tag loaded only if `PUBLIC_GA_ID` is set) and Google Search Console.
- Quality gate: at build time, pages below a content threshold (`src/lib/quality.json`) are not generated. A report of published vs skipped pages is written to `reports/build-report.json`.
- `npm run build` runs `npm run validate` first; invalid data stops the build.

## Why no database
- Single writer, batch updates, read-only public site: nothing needs transactions or concurrent writes.
- Data volume is tiny; the whole dataset fits in memory during build.
- Zero hosting cost and no runtime to secure, patch or back up. The site is plain files on a CDN.
- Schema validation plus git diffs give review, rollback and provenance without extra tooling.
- Suppression is a file checked at validation, so a removal cannot be shipped around by mistake.

## Consequences
- Every data change needs a rebuild and deploy (minutes). Acceptable for weekly-or-slower refreshes.
- No server-side features: forms, accounts, personalization.
- Corrections arrive by email/manual process, applied by editing JSON.

## Migration triggers (revisit this ADR when any occurs)
1. More than ~5,000 records, or builds become slow (for example over ~5 minutes) or memory-bound.
2. User-submitted data must be stored without manual review.
3. Accounts or logins are needed.
4. Multiple concurrent writers (people or jobs) editing data.
5. Features the static index cannot do: server-side filtering/ranking over large result sets, geospatial queries, real-time data.

First step if triggered: keep JSON as the source of truth, load into SQLite or Postgres at build time, and only add a runtime database when (2)-(5) require it.

## Alternatives considered
- Next.js + Postgres: more moving parts and cost, no benefit at this scale.
- Hosted search (Algolia): paid/third-party dependency; Pagefind is free and sufficient.
