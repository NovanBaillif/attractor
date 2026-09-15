import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const sql = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const publicId = n => 'ATR-S-' + id(n);

test('public thread SQL projects descendants without private metadata or writes', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role public_visitor; create role service_role bypassrls;');
  await db.exec(sql('schema.sql'));
  await db.query('insert into attractor.sessions(id,token_hash,source) values($1,$2,$3)', [id(900), 'private-session-hash', 'controlled']);
  const insert = async (n, parent, createdAt) => db.query(
    'insert into attractor.shared_states(id,session_id,parent_id,title,kind,tags,artifact,content_hash,created_at) values($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9)',
    [id(n), id(900), parent ? id(parent) : null, 'Public entry ' + n, 'json', '["thread-test"]', JSON.stringify({body: 'Public content ' + n}), 'hash-' + n, createdAt]
  );
  for (let n = 1; n <= 27; n++) {
    await insert(n, n === 1 ? null : n === 3 ? 2 : 1, n <= 20 ? '2026-09-14T00:00:00Z' : '2026-09-14T01:00:00Z');
  }
  await insert(100, null, '2026-09-14T00:00:00Z');
  await insert(101, 100, '2026-09-14T00:00:00Z');
  await db.query('insert into attractor.state_reads(id,session_id,state_id) values($1,$2,$3)', [id(901), id(900), id(1)]);
  await db.exec("insert into attractor.events(action,detail) values('PRIVATE_TEST_TRACE','{\"secret\":\"private-test-value\"}');");
  // Prove the new script needs only its stated read permissions, not the broad RPC grants.
  await db.exec('revoke all on schema attractor from service_role; revoke all on all tables in schema attractor from service_role;');
  await db.exec(sql('thread-read.sql'));
  const call = async ({root = id(1), after = null, afterId = null, limit = 20, parent = null} = {}) =>
    (await db.query('select public.attractor_thread($1::uuid,$2::timestamptz,$3::uuid,$4::integer,$5::uuid) result', [root, after, afterId, limit, parent])).rows[0].result;
  const asService = () => db.exec('reset role; set role service_role');
  const snapshot = async () => {
    await db.exec('reset role');
    const tables = (await db.query("select tablename from pg_catalog.pg_tables where schemaname='attractor' order by tablename")).rows;
    const values = {};
    for (const {tablename} of tables) values[tablename] = (await db.query('select to_jsonb(t) row from attractor.' + tablename + ' t order by to_jsonb(t)::text')).rows;
    return values;
  };

  await t.test('only service_role can invoke; exposed columns exclude session and receipt', async () => {
    for (const role of ['anon', 'authenticated', 'public_visitor']) {
      await db.exec('reset role; set role ' + role);
      await assert.rejects(call(), /permission denied/i);
    }
    await asService();
    const page = await call();
    assert.equal(page.root_id, publicId(1));
    assert.deepEqual(Object.keys(page.items[0]).sort(), ['artifact','content_hash','created_at','id','kind','parent_id','tags','title'].sort());
    assert.deepEqual(page.items[0].artifact, {body: 'Public content 1'});
    assert.equal(page.items[0].parent_id, null);
    assert.equal(JSON.stringify(page).includes('private-'), false);
    await assert.rejects(db.query('select session_id from attractor.shared_states'), /permission denied/i);
    await assert.rejects(db.query('select * from attractor.sessions'), /permission denied/i);
    const attributes = (await db.query("select provolatile,prosecdef from pg_catalog.pg_proc where proname='attractor_thread'")).rows[0];
    assert.equal(attributes.provolatile, 's'); assert.equal(attributes.prosecdef, false);
  });

  await t.test('stable keyset pagination includes root and transitive children, never foreign states', async () => {
    await asService();
    const first = await call();
    assert.deepEqual(first.items.map(x => x.id), Array.from({length: 20}, (_, i) => publicId(i + 1)));
    assert.equal(first.next_cursor.id, id(20));
    assert.equal(first.items[2].parent_id, publicId(2));
    const second = await call({after: first.next_cursor.created_at, afterId: first.next_cursor.id});
    assert.deepEqual(second.items.map(x => x.id), Array.from({length: 7}, (_, i) => publicId(i + 21)));
    assert.equal(second.next_cursor, null);
    const last = second.items.at(-1);
    assert.deepEqual((await call({after: last.created_at, afterId: last.id.slice(6)})).items, []);
    assert.equal((await call({limit: 1})).items.length, 1);
  });

  await t.test('parent membership is independent of pages; missing roots and malformed cursors fail', async () => {
    await asService();
    for (const n of [1, 3, 27]) assert.deepEqual(await call({parent: id(n)}), {belongs: true});
    for (const n of [100, 101, 999]) assert.deepEqual(await call({parent: id(n)}), {belongs: false});
    assert.equal((await call({root: id(999)})).status, 404);
    assert.equal((await call({root: id(999), parent: id(1)})).status, 404);
    for (const limit of [null, 0, 21]) assert.equal((await call({limit})).status, 400);
    assert.equal((await call({root: null})).status, 400);
    assert.equal((await call({after: '2026-09-14T00:00:00Z'})).status, 400);
    assert.equal((await call({afterId: id(1)})).status, 400);
  });

  await t.test('FULL_STOP disables reads and membership; other read-only modes allow them', async () => {
    for (const mode of ['CONTRIBUTIONS_PAUSED', 'OBSERVATION_ONLY', 'FULL_STOP', 'NORMAL']) {
      await db.exec('reset role'); await db.query('update attractor.settings set mode=$1 where id=true', [mode]);
      await asService();
      const page = await call(), membership = await call({parent: id(1)});
      if (mode === 'FULL_STOP') { assert.equal(page.status, 503); assert.equal(membership.status, 503); }
      else { assert.equal(page.items.length, 20); assert.deepEqual(membership, {belongs: true}); }
    }
  });

  await t.test('repeated projections succeed in a read-only transaction and leave all tables unchanged', async () => {
    const before = await snapshot();
    await asService(); await db.exec('begin read only');
    try {
      const first = await call();
      await call({after: first.next_cursor.created_at, afterId: first.next_cursor.id});
      await call({parent: id(3)}); await call({parent: id(100)});
      await db.exec('commit');
    } catch (error) { await db.exec('rollback'); throw error; }
    assert.deepEqual(await snapshot(), before);
  });
});
