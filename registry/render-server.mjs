import http from 'node:http';
import {createReadStream,existsSync,readFileSync,statSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHandler} from './api.mjs';

const root = resolve(fileURLToPath(new URL('../registry-dist/public/', import.meta.url)));
const api = createHandler();
const port = Number(process.env.PORT || 10000);

const rewrites = new Map([
  ['/favicon.ico', 'favicon.svg'],
  ['/.well-known/agent-card.json', 'agent-card.json'],
  ['/.well-known/ard.json', 'ard.json'],
  ['/registry', 'app.html'],
  ['/tools', 'app.html'],
  ['/dashboard', 'app.html'],
  ['/benchmark', 'app.html'],
  ['/research', 'research.txt']
]);
const dynamic = path => path === '/mcp' || path === '/a2a' || path === '/conversation' ||
  path === '/actu' || path === '/chaine' || path.startsWith('/api/');
const mime = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'], ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'], ['.xml', 'application/xml; charset=utf-8'],
  ['.webp', 'image/webp'], ['.png', 'image/png'], ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2']
]);

let publicHeaders = [];
try {
  const config = JSON.parse(readFileSync(fileURLToPath(new URL('../registry-dist/vercel.json', import.meta.url)), 'utf8'));
  publicHeaders = config.headers?.find(item => item.source === '/(.*)')?.headers || [];
} catch {}

function staticFile(pathname) {
  let relative = rewrites.get(pathname);
  if (!relative) {
    try { relative = decodeURIComponent(pathname).replace(/^\/+/, ''); } catch { return null; }
    if (!relative || relative.endsWith('/')) relative += 'index.html';
  }
  let file = resolve(root, relative);
  if (file !== root && !file.startsWith(root + sep)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://render.invalid').pathname.replace(/\/$/, '') || '/';
  if (dynamic(pathname)) return api(req, res);
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, {'Content-Type': 'application/json; charset=utf-8', Allow: 'GET, HEAD'});
    return res.end(JSON.stringify({error: 'Méthode non autorisée.'}));
  }
  const file = staticFile(pathname);
  if (!file) {
    res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    return res.end('Page introuvable.');
  }
  for (const header of publicHeaders) res.setHeader(header.key, header.value);
  res.setHeader('Content-Type', mime.get(extname(file).toLowerCase()) || 'application/octet-stream');
  res.setHeader('Content-Length', statSync(file).size);
  res.statusCode = 200;
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
});

server.requestTimeout = 15_000;
server.headersTimeout = 15_000;
server.listen(port, '0.0.0.0', () => console.log(`ATTRACTOR sur Render : port ${port}`));

