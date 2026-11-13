// Redirect map for changed slugs. config/redirects.json is the source of truth; this script writes vercel.json
// (host-level 301s plus cache and security headers) from it. `--check` only verifies vercel.json is in sync.
// `--snapshot` records the current build's indexable paths in config/published-paths.json (run it right after a release).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

export function vercelConfig(redirectsFile) {
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    trailingSlash: true,
    redirects: redirectsFile.redirects.map((r) => ({ source: r.from, destination: r.to, permanent: true })),
    headers: [
      { source: '/_astro/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }] }
    ]
  };
}
export const vercelText = (redirectsFile) => JSON.stringify(vercelConfig(redirectsFile), null, 2) + '\n';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--snapshot')) {
    const report = read('reports/build-report.json');
    const paths = report.indexable.map((p) => p.path).sort();
    fs.writeFileSync(path.join(root, 'config', 'published-paths.json'), JSON.stringify({ $comment: read('config/published-paths.json').$comment, released: new Date().toISOString().slice(0, 10), paths }, null, 2) + '\n');
    console.log(`Recorded ${paths.length} published paths in config/published-paths.json. Commit it with the release.`);
  } else {
    const want = vercelText(read('config/redirects.json'));
    const file = path.join(root, 'vercel.json');
    if (args.includes('--check')) {
      const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (have !== want) { console.error('vercel.json is out of sync with config/redirects.json. Run: npm run redirects:sync'); process.exit(1); }
      console.log('vercel.json is in sync with config/redirects.json');
    } else { fs.writeFileSync(file, want); console.log(`Wrote vercel.json (${read('config/redirects.json').redirects.length} redirects).`); }
  }
}
