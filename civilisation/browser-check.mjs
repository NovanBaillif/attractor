import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { createServer } from './server.mjs';

const executable = process.env.CHROME_PATH;
if (!executable) throw Error('CHROME_PATH requis.');
const op = randomBytes(32).toString('hex'), app = createServer({ operatorKey: op });
await new Promise(r => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
console.log('Serveur de recette prêt. Ouverture Chromium.');
const profile = mkdtempSync(join(tmpdir(), 'attractor-civic-browser-'));
const browser = spawn(executable, ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let ws;
try {
  let log = '';
  const debuggerUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Chromium indisponible.')), 15000);
    browser.stderr.on('data', chunk => { log += chunk; const m = log.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    browser.on('error', e => { clearTimeout(timer); reject(e); });
  });
  const port = new URL(debuggerUrl).port;
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(10000) })).json();
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { const timer = setTimeout(() => j(Error('Délai WebSocket Chromium.')), 10000); ws.onopen = () => { clearTimeout(timer); r(); }; ws.onerror = e => { clearTimeout(timer); j(e); }; });
  console.log('Chromium connecté. Recette interface.');
  let id = 0; const pending = new Map(), errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(Error(JSON.stringify(m.error))); else p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params); };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; const timer = setTimeout(() => { pending.delete(n); reject(Error(`Délai CDP : ${method}`)); }, 10000); pending.set(n, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } }); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expression => { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const waitFor = async expression => { for (let n = 0; n < 80; n++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)); } throw Error(`Délai : ${expression}`); };
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: base });
  await waitFor("document.querySelector('#stats')?.children.length===4");
  await evaluate(`document.querySelector('#key').value=${JSON.stringify(op)};document.querySelector('#access').requestSubmit()`);
  await waitFor("document.querySelector('#commands').hidden===false");
  for (let n = 0; n < 6; n++) {
    await evaluate("document.querySelector('#step').click()");
    await waitFor("document.querySelector('#step').disabled===false");
  }
  assert.equal(await evaluate("document.querySelectorAll('#agents article').length"), 3);
  assert.equal(await evaluate("document.querySelectorAll('.accepted').length"), 1);
  assert.equal(await evaluate("document.querySelectorAll('.rejected').length"), 1);
  await evaluate("document.querySelector('#reason').value='Exercice navigateur';document.querySelector('[data-mode=FULL_STOP]').click()");
  await waitFor("document.querySelector('#stats').textContent.includes('Agents arrêtés')");
  await evaluate("document.querySelector('[data-mode=NORMAL]').click()");
  await waitFor("document.querySelector('#stats').textContent.includes('En activité')");
  mkdirSync('screenshots', { recursive: true });
  writeFileSync('screenshots/civilisation-desktop.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  writeFileSync('screenshots/civilisation-mobile.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
  await evaluate("document.querySelector('#project-form').parentElement.open=true;document.querySelector('#project-title').value='Projet navigateur';document.querySelector('#purpose').value='Vérifier la création manuelle.';document.querySelector('#project-form').requestSubmit()");
  await waitFor("document.querySelectorAll('#projects > article').length===2");
  await evaluate("document.querySelector('#agent-form').parentElement.open=true;document.querySelector('#agent-name').value='Agent navigateur';document.querySelector('#mandate').value='Construire sur ce projet de recette.';document.querySelector('#agent-project').selectedIndex=1;document.querySelector('#agent-form').requestSubmit()");
  await waitFor("document.querySelector('#credential').value.length===64");
  assert.equal(await evaluate("document.querySelectorAll('#agents article').length"), 4);
  await evaluate("document.querySelector('#law-form').parentElement.open=true;document.querySelector('#law').value='Conserver les raisons de la recette.';document.querySelector('#law-reason').value='Vérification de la mémoire.';document.querySelector('#law-form').requestSubmit()");
  await waitFor("document.querySelectorAll('#laws article').length===2");
  await evaluate("document.querySelector('#lock').click()");
  await waitFor("document.querySelector('#commands').hidden===true");
  assert.equal(await evaluate("document.querySelector('#credential').value"), '');
  assert.deepEqual(errors, []);
  console.log('Chromium : connexion, cycle, preuves, arrêt/reprise, verrouillage et vue 390 px OK.');
} finally {
  ws?.close(); browser.kill(); app.closeAllConnections(); await new Promise(r => app.close(r));
  // Only this uniquely-created temporary browser profile is removed.
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Browser may still be releasing its lock. */ }
}
