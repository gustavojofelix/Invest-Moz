// Minimal static server that mimics the Netlify setup:
// prerendered files first, then `/` -> `/pt`, then SPA fallback to index.csr.html.
// Usage: node scripts/serve-dist.mjs [--port 4310]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist/invest-moz/browser');
const portArg = process.argv.indexOf('--port');
const port = portArg > -1 ? Number(process.argv[portArg + 1]) : 4310;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

// Apply the generated _headers (CSP) like Netlify does.
let extraHeaders = {};
try {
  const raw = await readFile(join(root, '_headers'), 'utf8');
  for (const line of raw.split(/\r?\n/).slice(1)) {
    const i = line.indexOf(':');
    if (i > 0) extraHeaders[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
} catch {
  extraHeaders = {};
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') {
    res.writeHead(302, { Location: '/pt' });
    return res.end();
  }
  const safe = normalize(pathname).replace(/^[/\\]+/, '');
  const candidates = [join(root, safe), join(root, safe, 'index.html')];
  let file = null;
  for (const c of candidates) {
    if (c.startsWith(root) && (await isFile(c))) {
      file = c;
      break;
    }
  }
  file ??= join(root, 'index.csr.html');
  const body = await readFile(file);
  res.writeHead(200, { ...extraHeaders, 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(body);
}).listen(port, () => {
  console.log(`Invest Moz preview: http://localhost:${port}`);
});
