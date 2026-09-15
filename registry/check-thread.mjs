import http from 'node:http';
import {readFileSync, mkdirSync, writeFileSync, mkdtempSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createHandler} from './api.mjs';
import {hash} from './recipes.mjs';
import {renderEcosystems} from './ecosystem-page.mjs';

const db = new PGlite();
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const stateId = n => 'ATR-S-' + uuid(n);
const root = stateId(1), parent = stateId(3), config = {root_id:root, messages:[]};
config.default_topic = 'memory';
config.topics = [
  {id:'memory', root_id:root, title:'How can agents transmit memory without its errors?', description:'A question with references from independent sources.', source_ids:['village'], origin_links:[{title:'Original memory discussion',url:'https://example.org/memory'}], messages:config.messages},
  {id:'cooperation', root_id:stateId(101), title:'How can communities preserve a disagreement?', description:'A second topic with a different origin.', source_ids:['commons'], origin_links:[{title:'Original cooperation discussion',url:'https://example.org/cooperation'}], messages:[]}
];
const ecosystems = {topics:config.topics, sources:[
  {id:'village',name:'Village fixture',ecosystem:'Village fixture',kind:'community',url:'https://example.org/memory',description:'Synthetic public discussion source.'},
  {id:'commons',name:'Commons fixture',ecosystem:'Commons fixture',kind:'community',url:'https://example.org/cooperation',description:'Another synthetic source.'},
  {id:'directory',name:'Directory fixture',ecosystem:'Discovery infrastructure',kind:'directory',url:'https://example.org/directory',description:'A discovery service, not a participating community.'}
]};
let server, browser, ws, shareRequests = 0;
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(read('schema.sql')); await db.exec(read('thread-read.sql')); await db.exec('set role service_role');
  const insert = async (n, parentId, artifact, annotation) => {
    const contentHash = hash(artifact);
    await db.query('insert into attractor.shared_states(id,parent_id,title,kind,tags,artifact,content_hash,created_at) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)',
      [uuid(n), parentId ? uuid(parentId) : null, 'Synthetic contribution ' + n, 'json', '["thread-test"]', JSON.stringify(artifact), contentHash, '2026-01-01T00:00:00Z']);
    if (annotation) config.topics[n >= 100 ? 1 : 0].messages.push({state_id:stateId(n), content_hash:contentHash, annotation});
  };
  const event = (id, body) => ({specversion:'1.0', source:'https://example.org/operator', id,
    type:'org.attractor.cooperation.propose.v0.1', data:{body, limitations:'Synthetic browser fixture, not a real participant.'}});
  const operator = {author:'Attractor fixture', origin:'operator', label:'Attractor — test local'};
  await insert(1, null, event('question', 'How can agents transmit memory without its errors?'), operator);
  await insert(2, 1, event('proposal', 'Preserve sources and objections with each claim.'), operator);
  await insert(3, 2, {format:'attractor-import-v1', author:'fixture-author', body:'A synthetic imported objection: compare the source identities, not just the values.', source_url:'https://example.org/public-comment'},
    {author:'fixture-author', origin:'external-import', label:'importé depuis GitHub', source_url:'https://example.org/public-comment'});
  await insert(4, 2, event('second-objection', 'Record the unresolved discrepancy before revising a claim.'), operator);
  await insert(5, 3, {...event('experiment', 'A local synthetic test'), type:'org.attractor.cooperation.experiment.v0.1', data:{procedure:'Compare declared source identities.', outcome:'pass', limitations:'Synthetic examples only.'}}, operator);
  await insert(101, null, event('cooperation-question', 'How can communities preserve a disagreement?'), operator);
  await insert(102, 101, {format:'attractor-source-v1',source:{connector:'fixture',external_id:'external-2',url:'https://example.org/cooperation',author_declared:'External source author',content_hash:'declared-hash',fetched_at:'2026-09-14T00:00:00Z'},title:'An external reference',summary:'Operator-curated reference, not a new external reply.'},
    {author:'External source author',origin:'source-import',source_url:'https://example.org/cooperation',label:'External reference pinned by operator'});
  const rpc = async (op, token, network, args) => (await db.query('select public.attractor_rpc($1,$2,$3,$4::jsonb) result',
    [op, token, network, JSON.stringify(op === 'session' ? {...args, source:'controlled'} : args || {})])).rows[0].result;
  const threadRpc = async args => (await db.query('select public.attractor_thread($1::uuid,$2::timestamptz,$3::uuid,$4::integer,$5::uuid) result',
    [args.p_root, args.p_after ?? null, args.p_after_id ?? null, args.p_limit ?? 20, args.p_parent ?? null])).rows[0].result;
  const env = {ATTRACTOR_DB_URL:'test', ATTRACTOR_DB_KEY:'test', ATTRACTOR_NETWORK_KEY:'test', ATTRACTOR_ADMIN_KEY:'test'};
  const handler = createHandler({env, rpc, threadRpc, threadConfig:config});
  server = http.createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/ecosystems') {
      res.setHeader('Content-Type','text/html; charset=utf-8');
      return res.end(renderEcosystems(ecosystems, {checked_at:'2026-09-14T00:00:00Z',checks:[{source_id:'village',status:'read_verified',detail:'Synthetic read check.'},{source_id:'directory',status:'not_connected'}]}));
    }
    if (path.startsWith('/api/') || path === '/conversation') {
      if (path === '/api/v3/share_state') shareRequests++;
      return handler(req, res);
    }
    const files = {'/thread.js':'thread-ui.mjs', '/thread.css':'thread.css', '/ecosystem.css':'ecosystem.css', '/civilisation.css':'civilisation.css', '/thread-guide.md':'thread-guide.md'};
    if (!files[path]) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript; charset=utf-8' : path.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/plain; charset=utf-8');
    res.end(read(files[path]));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port; env.ATTRACTOR_ORIGIN = base;
  const count = async () => Number((await db.query('select count(*) n from attractor.shared_states')).rows[0].n);
  const snapshot = async () => {
    const tables = (await db.query("select tablename from pg_catalog.pg_tables where schemaname='attractor' order by tablename")).rows;
    const result = {};
    for (const {tablename} of tables) result[tablename] = (await db.query('select to_jsonb(t) row from attractor.' + tablename + ' t order by to_jsonb(t)::text')).rows;
    return result;
  };
  const before = await snapshot();
  const firstHtml = await (await fetch(base + '/conversation')).text();
  assert.ok(firstHtml.includes('fixture-author')); assert.ok(firstHtml.includes('https://example.org/public-comment'));
  assert.equal((await (await fetch(base + '/api/v3/thread')).json()).items.length, 5);
  const otherPage = await (await fetch(base + '/api/v3/thread?topic=cooperation')).json();
  assert.equal(otherPage.items.length, 2); assert.equal(otherPage.root_id,stateId(101));
  assert.ok(otherPage.items.every(item => ![root,parent].includes(item.id)));
  assert.deepEqual(await snapshot(), before);

  if (!process.env.CHROME_PATH) throw Error('CHROME_PATH required');
  const profile = mkdtempSync(join(tmpdir(), 'attractor-thread-'));
  browser = spawn(process.env.CHROME_PATH, ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {windowsHide:true, stdio:['ignore','ignore','pipe']});
  const address = await new Promise((resolve, reject) => {
    let log = ''; const timer = setTimeout(() => reject(Error('Chrome startup timeout')), 15000);
    browser.on('error', error => { clearTimeout(timer); reject(error); });
    browser.stderr.on('data', data => { log += data; const match = log.match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  const pages = await (await fetch('http://127.0.0.1:' + new URL(address).port + '/json')).json();
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let sequence = 0; const pending = new Map(), errors = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const p = pending.get(message.id); pending.delete(message.id);
      if (message.error) p.reject(Error(JSON.stringify(message.error))); else p.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => reject(Error('CDP timeout: ' + method)), 15000);
    pending.set(id, {resolve:value => { clearTimeout(timer); resolve(value); }, reject:error => { clearTimeout(timer); reject(error); }});
    ws.send(JSON.stringify({id, method, params}));
  });
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 150; i++) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw Error('UI timeout: ' + expression + '\n' + await evaluate("JSON.stringify({url:location.href,status:document.querySelector('#thread-status')?.textContent,valid:document.querySelector('#thread-form')?.checkValidity(),parent:document.querySelector('#parent-id')?.value,question:document.querySelector('#question')?.value})"));
  };
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', {width:1440, height:1000, deviceScaleFactor:1, mobile:false});
  await call('Page.navigate', {url:base + '/conversation'});
  await waitFor("document.querySelector('#publish-button')?.disabled===false");
  assert.deepEqual(await snapshot(), before);
  assert.equal(await evaluate("document.querySelectorAll('.thread-card').length"), 5);
  assert.equal(await evaluate("document.querySelector('#thread-form').dataset.topicId"), 'memory');
  assert.ok(await evaluate("document.querySelector('a[href*=\"thread-export\"]').href.includes('topic=memory')"));
  assert.ok(await evaluate("document.body.textContent.includes('importé depuis GitHub')"));
  const output = new URL('../.vercel/', import.meta.url); mkdirSync(output, {recursive:true});
  writeFileSync(new URL('thread-desktop.png', output), Buffer.from((await call('Page.captureScreenshot', {format:'png', captureBeyondViewport:false})).data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', {width:390, height:844, deviceScaleFactor:1, mobile:true});
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), '390px horizontal overflow');
  writeFileSync(new URL('thread-mobile.png', output), Buffer.from((await call('Page.captureScreenshot', {format:'png', captureBeyondViewport:false})).data, 'base64'));
  await evaluate("document.querySelector('#reply').scrollIntoView({behavior:'instant'})");
  writeFileSync(new URL('thread-mobile-form.png', output), Buffer.from((await call('Page.captureScreenshot', {format:'png', captureBeyondViewport:false})).data, 'base64'));

  const fill = async proposal => evaluate(`document.querySelector('#author').value='Browser fixture';document.querySelector('#proposal').value=${JSON.stringify(proposal)};document.querySelector('#limits').value='Synthetic controlled browser contribution.';document.querySelector('#sources').value='Example | https://example.org/evidence';`);
  await evaluate(`document.querySelector('[data-reply-to="${parent}"]').click()`);
  assert.equal(await evaluate("document.querySelector('#parent-id').value"), parent);
  await fill('Controlled browser reply: preserve the declared source of each field.');
  await evaluate("document.querySelector('#thread-form').requestSubmit()");
  assert.deepEqual(await snapshot(), before); assert.equal(shareRequests, 0);
  // Exercise the successful navigation when the reply lies beyond the first page.
  for (let n = 10; n < 26; n++) await insert(n, 1, event('filler-' + n, 'Synthetic pagination fixture.'));
  const beforePublish = await count();
  await evaluate("document.querySelector('#consent').checked=true;document.querySelector('#thread-form').requestSubmit();document.querySelector('#thread-form').requestSubmit()");
  await waitFor("location.search.includes('cursor=') && location.hash.startsWith('#ATR-S-') && document.querySelector(location.hash)!==null");
  assert.equal(await count(), beforePublish + 1); assert.equal(shareRequests, 1);
  assert.equal(new URL(await evaluate('location.href')).searchParams.get('topic'), 'memory');
  const publicationUrl = await evaluate('location.href'), publishedId = new URL(publicationUrl).hash.slice(1);
  const published = (await db.query('select parent_id,artifact from attractor.shared_states where id=$1', [publishedId.slice(6)])).rows[0];
  assert.equal(published.parent_id, parent.slice(6)); assert.equal(published.artifact.thread, root);
  assert.equal(published.artifact.author, 'Browser fixture');
  const freshHtml = await (await fetch(publicationUrl)).text();
  assert.ok(freshHtml.includes('Controlled browser reply: preserve the declared source of each field.'));
  const freshJson = await (await fetch(base + '/api/v3/thread' + new URL(publicationUrl).search)).json();
  assert.ok(freshJson.items.some(item => item.id === publishedId));
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));

  // The server commits, but the browser loses the response: preserve the draft and never replay automatically.
  await call('Page.navigate', {url:base + '/conversation'});
  await waitFor("document.querySelector('#publish-button')?.disabled===false && !location.hash");
  await fill('Controlled lost-response specimen: the draft must survive.');
  await evaluate(`window.originalFetch=window.fetch;window.fetch=async(...args)=>{const response=await window.originalFetch(...args);if(String(args[0]).endsWith('/api/v3/share_state'))throw new TypeError('Synthetic response lost');return response;};document.querySelector('#consent').checked=true;document.querySelector('#thread-form').requestSubmit();document.querySelector('#thread-form').requestSubmit()`);
  await waitFor("document.querySelector('#thread-status').textContent.includes('peut-être été publiée')");
  assert.equal(await evaluate("document.querySelector('#proposal').value"), 'Controlled lost-response specimen: the draft must survive.');
  assert.equal(await count(), beforePublish + 2); assert.equal(shareRequests, 2);
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(shareRequests, 2, 'No automatic retry after an ambiguous publication');
  assert.equal(await evaluate("document.querySelector('#thread-fields').disabled"), false);
  assert.equal(await evaluate("document.querySelector('#publish-button').disabled"), true);
  await evaluate("document.querySelector('#thread-form').requestSubmit()");
  assert.equal(shareRequests, 2, 'Uncertain publication cannot be retried from this form');
  assert.equal(await evaluate("document.querySelector('#thread-status a').target"), '_blank');
  assert.equal(new URL(await evaluate("document.querySelector('#thread-status a').href")).searchParams.get('topic'), 'memory');

  await call('Page.navigate', {url:base + '/conversation?topic=cooperation'});
  await waitFor("document.querySelector('#thread-form')?.dataset.topicId==='cooperation' && !document.querySelector('#publish-button').disabled");
  assert.equal(await evaluate("document.querySelector('h1').textContent"), config.topics[1].title);
  assert.equal(await evaluate("document.querySelector('#question').value"), config.topics[1].title);
  assert.equal(await evaluate("document.querySelectorAll('.thread-card').length"), 2);
  assert.ok(await evaluate("document.body.textContent.includes('Operator-curated reference, not a new external reply.')"));
  assert.ok(await evaluate("document.querySelector('a[href*=\"thread-export\"]').href.includes('topic=cooperation')"));
  assert.equal(await evaluate("document.querySelector('a[href=\"https://example.org/memory\"]')!==null"), false);
  await evaluate(`document.querySelector('[data-reply-to="${stateId(102)}"]').click()`);
  await fill('A controlled reply inside the second topic.');
  await evaluate("document.querySelector('#consent').checked=true;document.querySelector('#thread-form').requestSubmit()");
  await waitFor("location.search.includes('topic=cooperation') && location.hash.startsWith('#ATR-S-') && document.querySelector(location.hash)!==null");
  const otherId = new URL(await evaluate('location.href')).hash.slice(1);
  assert.equal((await db.query('select parent_id from attractor.shared_states where id=$1',[otherId.slice(6)])).rows[0].parent_id,uuid(102));
  assert.ok(!(await (await fetch(base + '/api/v3/thread?topic=memory')).json()).items.some(item=>item.id===otherId));
  await call('Page.navigate', {url:base + '/ecosystems'});
  await waitFor("document.querySelector('#directories .ecosystem-card')!==null");
  assert.equal(await evaluate("document.querySelectorAll('#communities .ecosystem-card').length"),2);
  assert.equal(await evaluate("document.querySelectorAll('#directories .ecosystem-card').length"),1);
  assert.ok(await evaluate("document.querySelector('#directories').textContent.includes('Directory fixture')"));
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  writeFileSync(new URL('ecosystems-mobile.png',output),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  assert.deepEqual(errors, []);
  assert.equal(Number((await db.query("select count(*) n from attractor.sessions where source<>'controlled'")).rows[0].n), 0);
  console.log('PASS: isolated multi-topic SSR/JSON reads, source labels, export links, 390px layout, selected parent, unique publication, topic-preserving pagination, ambiguous-response draft preservation and community/directory distinction.');
} finally {
  ws?.close(); browser?.kill();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await db.close();
}
