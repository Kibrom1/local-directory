import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { getSite, buildReport } from './src/lib/site.mjs';

const site = process.env.SITE_URL || 'https://columbus-pm-directory.example';

// Writes reports/build-report.json (published vs skipped pages and why).
const buildReportIntegration = {
  name: 'build-report',
  hooks: {
    'astro:build:done': () => {
      const report = buildReport();
      fs.mkdirSync('reports', { recursive: true });
      fs.writeFileSync(path.join('reports', 'build-report.json'), JSON.stringify(report, null, 2) + '\n');
      console.log(`[quality-gate] published ${report.published_count}, skipped ${report.skipped_count} (see reports/build-report.json)`);
      for (const s of report.skipped) console.log(`  skipped ${s.path}: ${s.reasons.join('; ')}`);
    }
  }
};

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Placeholder pages are noindexed, so keep them out of the sitemap too.
      filter: (page) => !getSite().placeholderPaths.has(new URL(page).pathname)
    }),
    buildReportIntegration
  ]
});
