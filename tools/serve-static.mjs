// Tiny static server for e2e. Serves dist/ under a sub-path (default
// /pawns-of-olympus/) to mimic a GitHub Pages project site, which also proves
// every asset path is relative. Usage: node tools/serve-static.mjs [port] [base]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.argv[2] ?? 4180);
const base = process.argv[3] ?? '/pawns-of-olympus/';
const root = resolve(import.meta.dirname, '..', 'dist');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/') {
    res.writeHead(302, { location: base });
    res.end();
    return;
  }
  if (!url.pathname.startsWith(base)) {
    res.writeHead(404);
    res.end('not under base');
    return;
  }
  const rel = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const s = await stat(file);
    const target = s.isDirectory() ? join(file, 'index.html') : file;
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': types[extname(target)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(port, () => console.log(`serving dist at http://localhost:${port}${base}`));
