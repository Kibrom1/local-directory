import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { getSite, buildReport } from './src/lib/site.mjs';
import { readLaunchEnv, formatProblems } from './src/lib/env.mjs';

const env = { ...loadEnv(process.env.NODE_ENV || 'production', process.cwd(), ''), ...process.env };
const site = env.SITE_URL || 'https://columbus-pm-directory.example';
const isBuild = process.argv.includes('build');
const strict = env.STRICT_BUILD === '1' || process.argv.includes('--strict');

// Launch configuration: loud warning when the correction form has nowhere to send requests, and other owner decisions
// still unset. Strict mode (npm run build:strict) refuses to build until the blocking ones are set.
const launch = readLaunchEnv({ ...env, SITE_URL: env.SITE_URL });
if (launch.problems.length && process.argv.some((a) => ['build', 'dev'].includes(a))) {
  console.warn(formatProblems(launch.problems));
  const blocking = launch.problems.filter((p) => p.level === 'error');
  if (isBuild && strict && blocking.length) throw new Error(`Strict build refused: ${blocking.length} launch configuration problem(s) above. Set them in .env or the host's environment variables.`);
}

// Redirect map for changed slugs (config/redirects.json). Astro writes a redirect page for each (host-level 301s come from vercel.json, see npm run redirects:sync).
const redirectFile = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config', 'redirects.json'), 'utf8'));
const redirects = Object.fromEntries(redirectFile.redirects.map((r) => [r.from, r.to]));

// Writes reports/build-report.json (indexable, noindex-listed and skipped pages, counts for the metrics).
const buildReportIntegration = {
  name: 'build-report',
  hooks: {
    'astro:build:done': () => {
      const report = buildReport();
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync(path.join('reports', 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
      console.log(`[quality-gate] indexable ${report.indexable_count} ${JSON.stringify(report.indexable_by_type)}, noindex-listed ${report.noindex_listed_count}, skipped ${report.skipped_count}; stage ${report.stage_budget.stage} budget: ${report.stage_budget.status} (see reports/build-report.json)`);
      console.log(`[quality-gate] fee rule: ${report.fee_rule.active}; companies with fees ${JSON.stringify(Object.fromEntries(Object.entries(report.fee_type_counts_by_rule).map(([k, v]) => [k, v.companies_with_fees])))}`);
      for (const s of report.noindex_listed) console.log(`  noindex,follow ${s.path}: ${s.reasons.join('; ')}`);
      for (const s of report.skipped) console.log(`  skipped ${s.path}: ${s.reasons.join('; ')}`);
      if (report.stage_budget.status === 'over_budget') throw new Error(`Stage ${report.stage_budget.stage} page budget exceeded: ${report.indexable_count} indexable pages, maximum ${report.stage_budget.max}. Raise currentStage in src/lib/quality.json only after the stage condition is met.`);
    }
  }
};

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  redirects,
  build: { inlineStylesheets: 'auto' },
  integrations: [
    sitemap({
      // Only pages the quality gate calls indexable go in the sitemap. Noindex tiers, drafts, utility pages and redirects are excluded.
      filter: (page) => {
        const p = new URL(page).pathname;
        return getSite().indexable.some((x) => x.path === p);
      }
    }),
    buildReportIntegration
  ]
});
