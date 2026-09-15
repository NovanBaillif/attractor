import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { createCivilisation } from './store.mjs';
import { advanceDemo } from './demo.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const digest = t => createHash('sha256').update(t).digest('hex');
export function createServer({ database = ':memory:', operatorKey } = {}) {
  const world = createCivilisation({ database, operatorKey });
  const rates = new Map();
  const server = http.createServer(async (req, res) => {
    const send = (status, data, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type }); res.end(type.startsWith('application/json') ? JSON.stringify(data) : data); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) return send(403, { error: 'Instance locale uniquement.' });
      const path = new URL(req.url, 'http://localhost').pathname;
      const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1] || '';
      const isOperator = digest(token) === digest(operatorKey);
      if (req.method === 'GET') {
        if (path === '/api/operator') return send(isOperator ? 200 : 403, { ok: isOperator });
        if (path === '/api/world') return send(200, world.snapshot());
        if (path === '/api/ledger') return send(200, world.exportLedger());
        const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
        if (assets[path]) return send(200, readFileSync(root + assets[path][0]), assets[path][1] + '; charset=utf-8');
        return send(404, { error: 'Route inconnue.' });
      }
      if (req.method !== 'POST') return send(405, { error: 'GET ou POST requis.' });
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'Origine refusée.' });
      const now = Date.now(), ip = req.socket.remoteAddress;
      for (const [key, b] of rates) if (b.until < now) rates.delete(key);
      const bucket = rates.get(ip) || { until: now + 60000, count: 0 }; rates.set(ip, bucket);
      if (++bucket.count > 120 && !isOperator) return send(429, { error: '120 commandes par minute maximum.' });
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(415, { error: 'JSON requis.' });
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 32768) { send(413, { error: '32 Kio maximum.' }); req.resume(); return; } chunks.push(chunk); }
      let body; try { body = JSON.parse(Buffer.concat(chunks)); } catch { return send(400, { error: 'JSON invalide.' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'Objet requis.' });
      if (path === '/api/demo') {
        if (!isOperator) return send(403, { error: 'Clé opérateur requise.' });
        return send(200, advanceDemo(world, operatorKey));
      }
      if (path === '/api/command') return send(200, world.command(token, body.action, body.payload, body.requestId));
      return send(404, { error: 'Route inconnue.' });
    } catch (e) { send(e.status || (e.name === 'InputError' ? 400 : 500), { error: e.status || e.name === 'InputError' ? e.message : 'Erreur interne.' }); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  server.on('close', () => world.close());
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = fileURLToPath(new URL('../data/civilisation/', import.meta.url)); mkdirSync(data, { recursive: true });
  const keyFile = data + 'operator-key.txt';
  if (!existsSync(keyFile)) writeFileSync(keyFile, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
  const port = Number(process.env.ATTRACTOR_CIVIC_PORT || 4313);
  createServer({ database: data + 'world.sqlite', operatorKey: readFileSync(keyFile, 'utf8').trim() })
    .listen(port, '127.0.0.1', () => console.log(`Attractor · Cité expérimentale → http://127.0.0.1:${port}\nClé locale : ${keyFile}`));
}
