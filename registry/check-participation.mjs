import http from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { createHandler } from './api.mjs';
import { template, draftFragment } from './contribute-contract.mjs';
import {initial,fragment} from './discussion-contract.mjs';

const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
await db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')); await db.exec('set role service_role');
const env = { ATTRACTOR_DB_URL: 'test', ATTRACTOR_DB_KEY: 'test', ATTRACTOR_NETWORK_KEY: 'test', ATTRACTOR_ADMIN_KEY: 'test' };
const rpc = async (op, token, network, args) => (await db.query('select public.attractor_rpc($1,$2,$3,$4::jsonb) result', [op, token, network, JSON.stringify(op === 'session' ? { ...args, source: 'controlled' } : args)])).rows[0].result;
const handler = createHandler({ env, rpc });
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    // All synthetic sessions in this isolated harness are explicitly controlled.
    return handler(req, res);
  }
  const path = new URL(req.url, 'http://localhost').pathname.slice(1);
  if (!/^[a-z-]+\.(html|css|js|json|md)$/.test(path)) { res.statusCode = 404; return res.end(); }
  try { res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain'); res.end(readFileSync(new URL('../registry-dist/public/' + path, import.meta.url))); }
  catch { res.statusCode = 404; res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`; env.ATTRACTOR_ORIGIN = base;
const counts = async () => (await db.query('select (select count(*) from attractor.artifacts)::int artifacts,(select count(*) from attractor.sessions)::int sessions')).rows[0];
const post = async (path, body, token) => {
  const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const value = template(); value.recipe.fields[0].steps = ['trim', 'decimal-comma', 'number']; value.recipe.fields[1].steps = ['trim']; value.recipe.fields[2].steps = ['trim', 'lowercase', 'boolean'];
let browser, ws;
try {
  const a = (await post('/api/v2/sessions', { source: 'controlled' })).body.access_token;
  const created = await post('/api/v2/recipes', value, a); assert.equal(created.status, 201);
  const first = created.body.artifact.id;
  const b = (await post('/api/v2/sessions', { source: 'controlled' })).body.access_token;
  const read = await (await fetch(base + '/api/v2/recipes/' + first, { headers: { Authorization: 'Bearer ' + b } })).json();
  const use = { exposure_id: read.exposure_id, marker: read.marker, input: { price: ' 7,25 ', ref: '0009', enabled: 'false' }, output: { amount: 7.25, reference: '0009', active: false } };
  assert.equal((await post('/api/v2/recipes/' + first + '/use', use, a)).status, 409);
  assert.equal((await post('/api/v2/recipes/' + first + '/use', use, b)).status, 200);
  const revised = { ...value, parent_id: first, exposure_id: read.exposure_id, examples: [...value.examples, { input: use.input, expected: use.output }] };
  const revision = await post('/api/v2/recipes', revised, b); assert.equal(revision.status, 201); assert.equal(revision.body.artifact.parent_id, first);
  assert.equal((await counts()).artifacts, 2);

  if (!process.env.CHROME_PATH) throw Error('CHROME_PATH required');
  const profile = mkdtempSync(join(tmpdir(), 'attractor-participation-'));
  browser = spawn(process.env.CHROME_PATH, ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const address = await new Promise((resolve, reject) => {
    let log = ''; const timer = setTimeout(() => reject(Error('Chrome timeout')), 15000);
    browser.on('error', reject); browser.stderr.on('data', d => { log += d; const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
  });
  const pages = await (await fetch('http://127.0.0.1:' + new URL(address).port + '/json')).json();
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let seq = 0; const pending = new Map(), errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(Error(JSON.stringify(m.error))); else p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params); };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => reject(Error('CDP timeout ' + method)), 10000);
    pending.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } }); ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)); } throw Error('UI timeout: ' + expression); };
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const before = await counts();
  await call('Page.navigate', { url: base + '/contribute.html' + draftFragment(value) });
  await waitFor("document.querySelector('#draft-state')?.textContent.includes('Brouillon reçu')");
  assert.deepEqual(await counts(), before);
  await evaluate("document.querySelector('#make-link').click()");
  assert.ok((await evaluate("document.querySelector('#draft-link').value")).includes('#draft='));
  assert.deepEqual(await counts(), before);
  await evaluate("document.querySelector('#consent').checked=true;document.querySelector('#publish').requestSubmit();document.querySelector('#publish').requestSubmit()");
  await waitFor("document.querySelector('#permalink').hidden===false");
  assert.equal((await counts()).artifacts, 3);
  const href = await evaluate("document.querySelector('#permalink').href");
  await call('Page.navigate', { url: href }); await waitFor("document.querySelector('#version').hidden===false");
  await evaluate(`document.querySelector('#reuse-input').value=${JSON.stringify(JSON.stringify(use.input))};document.querySelector('#reuse-output').value=${JSON.stringify(JSON.stringify(use.output))};document.querySelector('#reuse').requestSubmit()`);
  await waitFor("document.querySelector('#reuse-status').textContent.includes('Réutilisation vérifiée')");
  await evaluate("document.querySelector('#revise').click()");
  assert.ok(JSON.parse(await evaluate("document.querySelector('#proposal').value")).parent_id);
  mkdirSync('screenshots', { recursive: true });
  await call('Page.navigate', { url: base + '/contribute.html' }); await waitFor("document.querySelector('#proposal')?.value.length>0");
  writeFileSync('screenshots/participation-desktop.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  writeFileSync('screenshots/participation-mobile.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
  const discussionBefore=await counts();
  const stateCount=async()=>Number((await db.query('select count(*) n from attractor.shared_states')).rows[0].n);
  const baseline=await stateCount();
  await call('Page.navigate',{url:base+'/discussion.html'+fragment(initial())});
  await waitFor("document.querySelector('#status')?.textContent.includes('Brouillon reçu')");
  assert.deepEqual(await counts(),discussionBefore);assert.equal(await stateCount(),baseline);
  await evaluate("document.querySelector('#draft-button').click()");
  assert.deepEqual(await counts(),discussionBefore);
  await evaluate("document.querySelector('#editor').requestSubmit()");
  assert.equal(await stateCount(),baseline);
  await evaluate("document.querySelector('#consent').checked=true;document.querySelector('#editor').requestSubmit();document.querySelector('#editor').requestSubmit()");
  await waitFor("document.querySelector('#permalink').hidden===false");
  assert.equal(await stateCount(),baseline+1);
  const discussionLink=await evaluate("document.querySelector('#permalink').href");
  await call('Page.navigate',{url:discussionLink});
  await waitFor("document.querySelector('#selected')?.hidden===false");
  await evaluate("document.querySelector('#reply').click();document.querySelector('#proposal').value='Une critique contrôlée : conserver les raisons peut aussi conserver des erreurs.';document.querySelector('#consent').checked=true;document.querySelector('#editor').requestSubmit()");
  await waitFor("document.querySelector('#permalink').hidden===false");
  assert.equal(await stateCount(),baseline+2);
  const replyLink=await evaluate("document.querySelector('#permalink').href");
  await call('Page.navigate',{url:replyLink});
  await waitFor("document.querySelector('#parent a')!==null");
  assert.equal(await evaluate("document.querySelector('#parent a').href"),discussionLink);
  await evaluate("document.querySelector('#browse').click()");
  await waitFor("document.querySelectorAll('#recent a').length===2");
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  writeFileSync('screenshots/discussion-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  writeFileSync('screenshots/discussion-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  assert.deepEqual(errors, []);
  console.log('PASS: discussion draft without writes, consent, unique publication, parent-linked critique, recent contributions and mobile layout.');
  console.log('PASS: isolated PostgreSQL API lineage/use, GET draft without writes, explicit browser publish once, stable link, reuse, revision and 390px layout. Controlled clients, not independent AI arrivals.');
} finally { ws?.close(); browser?.kill(); server.closeAllConnections(); await new Promise(r => server.close(r)); await db.close(); }
