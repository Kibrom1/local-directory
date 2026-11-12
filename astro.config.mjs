import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { getSite, buildReport } from './src/lib/site.mjs';

const site = process.env.SITE_URL || 'https://columbus-pm-directory.example';

// Writes reports/build-report.json (indexable, noindex-listed and skipped pages, counts for the metrics).
const buildReportIntegration = {
  name: 'build-report',
  hooks: {
    'astro:build:done': () => {
      const report = buildReport();
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync(path.join('reports', 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
      console.log(`[quality-gate] indexable ${report.indexable_count}, noindex-listed ${report.noindex_listed_count}, skipped ${report.skipped_count}; stage ${report.stage_budget.stage} budget: ${report.stage_budget.status} (see reports/build-report.json)`);
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
  integrations: [
    sitemap({
      // Only indexable pages go in the sitemap: placeholder and noindex-listed pages are excluded.
      filter: (page) => {
        const site = getSite();
        const p = new URL(page).pathname;
        return !site.placeholderPaths.has(p) && !site.noindexListed.some((x) => x.path === p);
      }
    }),
    buildReportIntegration
  ]
});
