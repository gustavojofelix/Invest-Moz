// Runs automatically after `npm run build` (npm "postbuild" hook).
//
// 1. Stamps the site origin into prerendered HTML and robots.txt
//    (Netlify exposes it as the URL env var; falls back to SITE_URL or a placeholder).
// 2. Writes sitemap.xml for the prerendered public pages, with hreflang alternates.
// 3. Hashes every inline <script> Angular emits (hydration event replay) and
//    writes `_headers` with a strict Content-Security-Policy that allows exactly
//    those hashes — no 'unsafe-inline' for scripts.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const OUT = 'dist/invest-moz/browser';
const TOKEN = 'https://__SITE_ORIGIN__';
const origin = (
  process.env.URL ||
  process.env.SITE_URL ||
  'https://invest-moz.netlify.app'
).replace(/\/$/, '');
const LOCALES = ['pt', 'en', 'fr', 'zh', 'ar', 'hi', 'sw', 'af'];
const TOPICS = [
  'companies',
  'licensing',
  'investment',
  'tax',
  'labour',
  'immigration',
  'exchange',
  'customs',
  'incentives',
  'compliance',
  'land',
  'local_content',
];

if (!existsSync(OUT)) {
  console.error(`postbuild: ${OUT} not found — run the build first.`);
  process.exit(1);
}

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* files(p);
    else yield p;
  }
}

// 1 + 3 ------------------------------------------------------------------------
const hashes = new Set();
let pages = 0;
for (const file of files(OUT)) {
  if (!file.endsWith('.html') && !file.endsWith('robots.txt')) continue;
  let text = readFileSync(file, 'utf8');
  if (text.includes(TOKEN)) {
    text = text.split(TOKEN).join(origin);
    writeFileSync(file, text);
  }
  if (!file.endsWith('.html')) continue;
  pages++;
  for (const m of text.matchAll(
    /<script(?![^>]*\bsrc=)(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    if (!m[1].trim()) continue;
    hashes.add(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
}

// 2 -------------------------------------------------------------------------------
const CHAPTERS = JSON.parse(readFileSync('src/assets/data/guide/index.json', 'utf8')).chapters.map(
  (c) => c.id,
);
const paths = [
  '',
  '/guide',
  ...CHAPTERS.map((c) => `/guide/${c}`),
  '/questions',
  ...TOPICS.map((t) => `/questions/${t}`),
];
const today = new Date().toISOString().slice(0, 10);
const urls = paths.flatMap((p) =>
  LOCALES.map((l) => {
    const alternates = LOCALES.map(
      (a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${origin}/${a}${p}"/>`,
    ).join('\n');
    return `  <url>\n    <loc>${origin}/${l}${p}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}/pt${p}"/>\n  </url>`;
  }),
);
writeFileSync(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
);

// 3 -------------------------------------------------------------------------------
const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].join(' ')}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto:",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');
const blocks = [`/*\n  Content-Security-Policy: ${csp}`];
// Hashed build output (main-*.js, chunk-*.js, styles-*.css, media/*): cache for a year.
// Netlify header paths only support trailing splats, so files are listed explicitly.
for (const file of files(OUT)) {
  const rel = '/' + relative(OUT, file).split('\\').join('/');
  if (/^\/(main|chunk|styles|polyfills)-[^/]+\.(js|css)$/.test(rel) || rel.startsWith('/media/')) {
    blocks.push(`${rel}\n  Cache-Control: public, max-age=31536000, immutable`);
  }
}
// Private demo routes are never indexed.
for (const l of LOCALES) {
  for (const p of ['office', 'office/*', 'login', 'demo', 'demo/*', 'expert/sent/*']) {
    blocks.push(`/${l}/${p}\n  X-Robots-Tag: noindex, nofollow`);
  }
}
writeFileSync(join(OUT, '_headers'), blocks.join('\n') + '\n');

console.log(
  `✓ postbuild: origin ${origin}, ${pages} HTML files, sitemap with ${urls.length} URLs, CSP with ${hashes.size} script hash(es) → ${relative('.', join(OUT, '_headers'))}`,
);
