import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createHandler} from './api.mjs';
import {hash} from './recipes.mjs';
import {initial} from './discussion-contract.mjs';

const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const stateId = n => 'ATR-S-' + uuid(n);
const root = stateId(1), foreign = stateId(90);
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');

test('public thread HTTP and A2A integrate anonymous reading, attributed imports and direct replies', async t => {
  const db = new PGlite(); let server;
  t.after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await db.close();
  });
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(read('schema.sql')); await db.exec(read('thread-read.sql')); await db.exec('set role service_role');
  const config = {root_id: root, messages: []}, expectedMembers = [];
  const insert = async (n, parent, artifact, annotation) => {
    const contentHash = hash(artifact);
    await db.query('insert into attractor.shared_states(id,parent_id,title,kind,tags,artifact,content_hash,created_at) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)',
      [uuid(n), parent ? uuid(parent) : null, 'Thread entry ' + n, 'json', '["thread-test"]', JSON.stringify(artifact), contentHash, n < 100 ? '2026-01-01T00:00:00Z' : '2026-12-01T00:00:00Z']);
    if (n !== 90) expectedMembers.push(stateId(n));
    if (annotation) config.messages.push({state_id: stateId(n), content_hash: contentHash, annotation});
  };
  const seed = (id, body) => ({specversion: '1.0', source: 'https://example.org/operator', id,
    type: 'org.attractor.cooperation.propose.v0.1', data: {body}});
  await insert(1, null, seed('question', 'Synthetic memory question'), {author: 'Attractor operator', origin: 'operator', label: 'Controlled seed'});
  await insert(2, 1, seed('proposal', 'Carry sources and objections'), {author: 'Attractor operator', origin: 'operator', label: 'Controlled seed'});
  const external = seed('external-objection', 'Pinned external contribution from an individual');
  await insert(3, 2, external, {author: 'External contributor', origin: 'external-import', source_url: 'https://example.org/public-comment', label: 'Copied by Attractor'});
  await insert(4, 2, seed('summary', 'Operator summary of a second public response'), {author: 'Second contributor', origin: 'external-summary', source_url: 'https://example.org/second-comment', label: 'Summary by Attractor'});
  await insert(5, 3, seed('experiment', 'Sixteen synthetic cases; no real-world truth established'), {author: 'Attractor operator', origin: 'operator', label: 'Controlled experiment'});
  await insert(90, null, {body: 'Unrelated thread'});
  const rpc = async (op, token, network, args) => (await db.query('select public.attractor_rpc($1,$2,$3,$4::jsonb) result', [op, token, network, JSON.stringify(args || {})])).rows[0].result;
  const threadRpc = async args => (await db.query('select public.attractor_thread($1::uuid,$2::timestamptz,$3::uuid,$4::integer,$5::uuid) result',
    [args.p_root, args.p_after ?? null, args.p_after_id ?? null, args.p_limit ?? 20, args.p_parent ?? null])).rows[0].result;
  const env = {ATTRACTOR_DB_URL: 'test', ATTRACTOR_DB_KEY: 'test', ATTRACTOR_NETWORK_KEY: 'test', ATTRACTOR_ADMIN_KEY: 'test'};
  server = http.createServer(createHandler({env, rpc, threadRpc, threadConfig: config}));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port; env.ATTRACTOR_ORIGIN = origin;
  const request = async (path, body, headers = {}) => {
    const response = await fetch(origin + path, body === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Attractor-Test': 'controlled', ...headers}, body: JSON.stringify(body)});
    const text = await response.text();
    return {status: response.status, headers: response.headers, text, body: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : null,
      context: response.headers.get('X-Attractor-Context')};
  };
  const post = (name, body, context) => request('/api/v3/' + name, body, context ? {Authorization: 'Bearer ' + context} : {});
  const a2a = (name, args, context) => request('/a2a', {jsonrpc: '2.0', id: crypto.randomUUID(), method: 'SendMessage', params: {message: {
    messageId: crypto.randomUUID(), role: 'ROLE_USER', parts: [{data: {capability: name, arguments: args}}],
    ...(context ? {metadata: {'io.attractor/context': context}} : {})}}}, {'A2A-Version': '1.0'});
  const reply = (receipt, artifact = {}) => ({artifact: {...initial().artifact, type: 'critique', author: 'Declared participant', thread: root, ...artifact},
    visibility: 'public', title: 'Reply in memory thread', kind: 'json', tags: ['civilisation-discussion'], parent_id: stateId(3), read_receipt: receipt});
  const count = async () => Number((await db.query('select count(*) n from attractor.shared_states')).rows[0].n);
  const snapshot = async () => {
    const tables = (await db.query("select tablename from pg_catalog.pg_tables where schemaname='attractor' order by tablename")).rows;
    const result = {};
    for (const {tablename} of tables) result[tablename] = (await db.query('select to_jsonb(t) row from attractor.' + tablename + ' t order by to_jsonb(t)::text')).rows;
    return result;
  };

  await t.test('anonymous HTML and JSON expose the complete starting thread without database writes', async () => {
    const before = await snapshot(); await db.exec('begin read only');
    let html, json;
    try { html = await request('/conversation'); json = await request('/api/v3/thread'); await db.exec('commit'); }
    catch (error) { await db.exec('rollback'); throw error; }
    assert.equal(html.status, 200); assert.match(html.headers.get('content-type'), /text\/html/);
    for (const marker of ['Synthetic memory question', 'Carry sources and objections', 'Pinned external contribution', 'Operator summary', 'Sixteen synthetic cases']) assert.ok(html.text.includes(marker), marker);
    assert.ok(html.text.includes('External contributor')); assert.ok(html.text.includes('https://example.org/public-comment'));
    assert.equal(json.status, 200); assert.equal(json.body.root_id, root); assert.equal(json.body.items.length, 5);
    assert.deepEqual(json.body.items[2].artifact, external);
    assert.equal(json.body.items[2].annotation.label, 'Copied by Attractor');
    assert.equal(html.headers.get('set-cookie'), null); assert.equal(json.headers.get('set-cookie'), null);
    for (const item of json.body.items) { assert.equal(item.session_id, undefined); assert.equal(item.read_receipt, undefined); }
    assert.deepEqual(await snapshot(), before);
  });

  await t.test('same-context HTTP and A2A replies to an imported parent appear with preserved ancestry', async () => {
    const parent = await post('retrieve_state', {id: stateId(3)}); assert.equal(parent.status, 200);
    const created = await post('share_state', reply(parent.body.read_receipt), parent.context);
    assert.equal(created.status, 200); assert.equal(created.body.state.parent_id, stateId(3)); expectedMembers.push(created.body.state.id);
    const a2aParent = await a2a('retrieve_state', {id: stateId(3)});
    const message = a2aParent.body.result.message, context = message.metadata['io.attractor/context'];
    const createdA2a = await a2a('share_state', reply(message.parts[0].data.read_receipt, {author: 'A2A participant'}), context);
    assert.equal(createdA2a.status, 200); assert.equal(createdA2a.body.error, undefined);
    const a2aState = createdA2a.body.result.message.parts[0].data.state;
    assert.equal(a2aState.parent_id, stateId(3)); expectedMembers.push(a2aState.id);
    const page = (await request('/api/v3/thread')).body;
    assert.equal(page.items.find(x => x.id === created.body.state.id).artifact.author, 'Declared participant');
    assert.equal(page.items.find(x => x.id === a2aState.id).artifact.author, 'A2A participant');
    assert.equal(page.items.find(x => x.id === created.body.state.id).annotation, undefined);
    assert.deepEqual(page.items.find(x => x.id === stateId(3)).artifact, external);
  });

  await t.test('foreign parents, foreign receipts, bad fields and source URLs fail through direct interfaces', async () => {
    const parent = await post('retrieve_state', {id: stateId(3)}), another = await post('retrieve_state', {id: stateId(3)});
    const outside = await post('retrieve_state', {id: foreign}), before = await count();
    assert.equal((await post('share_state', reply(parent.body.read_receipt), another.context)).status, 409);
    assert.equal((await post('share_state', {...reply(outside.body.read_receipt), parent_id: foreign}, outside.context)).status, 400);
    for (const artifact of [{thread: foreign}, {author: undefined}, {imported: true}, {sources: [{title: 'Unsafe source', url: 'javascript:alert(1)'}]}]) {
      assert.equal((await post('share_state', reply(parent.body.read_receipt, artifact), parent.context)).status, 400);
    }
    const a2aOutside = await a2a('retrieve_state', {id: foreign});
    const m = a2aOutside.body.result.message;
    const invalid = await a2a('share_state', {...reply(m.parts[0].data.read_receipt), parent_id: foreign}, m.metadata['io.attractor/context']);
    assert.ok(invalid.body.error, 'A2A must not bypass thread membership');
    assert.ok((await a2a('share_state', reply(parent.body.read_receipt), m.metadata['io.attractor/context'])).body.error, 'A2A must reject another context receipt');
    assert.ok((await a2a('share_state', reply(parent.body.read_receipt, {imported: true}), m.metadata['io.attractor/context'])).body.error, 'A2A must reject reserved attribution fields');
    assert.equal(await count(), before);
  });

  await t.test('hostile reply text is escaped in SSR and user-supplied attribution never becomes a pinned annotation', async () => {
    const parent = await post('retrieve_state', {id: stateId(3)});
    const malicious = '</script><script src="/hostile.js"></script><img src=x onerror=alert(1)>';
    const created = await post('share_state', reply(parent.body.read_receipt, {author: '<b>Visitor</b>', proposal: malicious}), parent.context);
    assert.equal(created.status, 200); expectedMembers.push(created.body.state.id);
    const spoof = await post('share_state', {artifact: {format: 'arbitrary-json', body: 'Spoofed import', annotation: {author: 'External contributor', origin: 'external-import', label: 'Fake verified import'}},
      visibility: 'public', kind: 'json', title: 'User supplied annotation', tags: ['thread-test'], parent_id: stateId(3), read_receipt: parent.body.read_receipt}, parent.context);
    assert.equal(spoof.status, 200); expectedMembers.push(spoof.body.state.id);
    const page = (await request('/api/v3/thread')).body;
    assert.equal(page.items.find(x => x.id === spoof.body.state.id).annotation, undefined);
    const html = (await request('/conversation')).text;
    assert.ok(html.includes('&lt;script')); assert.ok(html.includes('&lt;b&gt;Visitor&lt;/b&gt;'));
    assert.equal(html.includes('<script src="/hostile.js">'), false); assert.equal(html.includes('<img src=x'), false);
    const pin = config.messages.find(x => x.state_id === stateId(3)), savedHash = pin.content_hash;
    pin.content_hash = 'wrong-hash';
    assert.equal((await request('/api/v3/thread')).body.items.find(x => x.id === stateId(3)).annotation, undefined);
    pin.content_hash = savedHash;
  });

  await t.test('existing unthreaded discussions remain compatible without leaking into this thread', async () => {
    const d = initial();
    const created = await post('share_state', {artifact: d.artifact, visibility: 'public', title: 'Legacy discussion', kind: 'json', tags: ['civilisation-discussion']});
    assert.equal(created.status, 200); assert.equal(created.body.state.parent_id, null);
    const saved = await post('retrieve_state', {id: created.body.state.id}); assert.deepEqual(saved.body.state.artifact, d.artifact);
    assert.ok(!(await request('/api/v3/thread')).body.items.some(x => x.id === created.body.state.id));
  });

  await t.test('keyset pages preserve all descendants and reject malformed or impossible cursor values', async () => {
    for (let n = 100; n < 122; n++) await insert(n, 2, {body: 'Page filler ' + n});
    const before = await snapshot(), found = []; let path = '/api/v3/thread', pageCount = 0;
    while (path) {
      const response = await request(path); assert.equal(response.status, 200); const page = response.body;
      assert.ok(page.items.length <= 20); if (pageCount === 0) assert.equal(page.items.length, 20);
      found.push(...page.items.map(x => x.id)); path = page.next_url; pageCount++;
      if (path) assert.ok(path.startsWith('/api/v3/thread?cursor='));
      assert.ok(pageCount < 5, 'Pagination must terminate');
    }
    assert.ok(pageCount > 1); assert.deepEqual(found.slice().sort(), expectedMembers.slice().sort());
    assert.equal(new Set(found).size, found.length);
    const cursor = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    for (const path of ['/api/v3/thread?extra=1', '/api/v3/thread?cursor=!', '/api/v3/thread?cursor=e30', '/api/v3/thread?cursor=e30&cursor=e30',
      '/api/v3/thread?cursor=' + cursor({created_at: '2026-01-01T00:00:00Z', id: 'bad'}),
      '/api/v3/thread?cursor=' + cursor({created_at: '2026-02-30T00:00:00Z', id: uuid(1)})]) {
      assert.equal((await request(path)).status, 400, path);
    }
    assert.deepEqual(await snapshot(), before);
  });
});
