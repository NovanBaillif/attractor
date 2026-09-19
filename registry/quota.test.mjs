// Limites d'appels (audit v4, 19/09) : un seul appelant ne doit plus pouvoir épuiser le quota de tout le site.
// Vrai SQL (schema.sql) dans PGlite, et le calcul du « réseau » d'une adresse côté serveur.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {networkPart} from './api.mjs';
import {rpcFunctionSql, rpcBody} from './rpc-function.mjs';

test('an IPv6 /64 counts as one network; IPv4 and mapped IPv4 stay per address', () => {
  assert.equal(networkPart('203.0.113.7'), '203.0.113.7');
  assert.equal(networkPart('::ffff:203.0.113.7'), '203.0.113.7');
  assert.equal(networkPart('203.0.113.7, 10.0.0.1'), '203.0.113.7');
  assert.equal(networkPart('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
  assert.equal(networkPart('2001:db8:1:2::1'), '2001:db8:1:2::/64', 'two addresses of the same /64 are one network');
  assert.equal(networkPart('2001:0db8:0001:0002:ffff::'), '2001:db8:1:2::/64', 'leading zeros do not make a new network');
  assert.equal(networkPart('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(networkPart('fe80::1%eth0'), 'fe80:0:0:0::/64');
  assert.notEqual(networkPart('2001:db8:1:3::1'), networkPart('2001:db8:1:2::1'), 'another /64 is another network');
  assert.equal(networkPart('unknown'), 'unknown');
});

async function database() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  await db.exec('set role service_role');
  const gate = async (token, network) => (await db.query("select public.attractor_rpc('mcp_gate',$1,$2,'{}'::jsonb) as r", [token, network])).rows[0].r;
  const count = async bucket => (await db.query('select count from attractor.quotas where bucket=$1', [bucket])).rows[0]?.count ?? 0;
  const day = (await db.query("select to_char(now(),'YYYY-MM-DD') as d")).rows[0].d;
  return {db, gate, count, day};
}

test('a flood from one network is refused without spending the site-wide day', async () => {
  const {db, gate, count, day} = await database();
  try {
    // The network has used its 120 requests of this minute (and of the next, in case the clock turns meanwhile).
    await db.query(`insert into attractor.quotas(bucket,count,expires_at) select 'net:net-A:'||to_char(now()+m,'YYYY-MM-DD-HH24-MI'),120,now()+interval '5 minutes'
      from (values (interval '0 minutes'),(interval '1 minute')) v(m)`);
    for (let i = 0; i < 25; i++) assert.equal((await gate('flood-' + i, 'net-A')).status, 429);
    assert.equal(await count('global:' + day), 0, 'refused requests never count against the whole site');
    assert.equal(await count('netday:net-A:' + day), 0, 'nor against the network day');
    assert.equal((await gate('other', 'net-Z')).mode, 'NORMAL', 'another network still passes');
    assert.equal(await count('global:' + day), 1);
  } finally { await db.close(); }
});

test('one network stops at 1,000 a day while another network still passes', async () => {
  const {db, gate, count, day} = await database();
  try {
    await db.query('insert into attractor.quotas(bucket,count,expires_at) values($1,1000,now()+interval \'2 days\')', ['netday:net-B:' + day]);
    const before = await count('global:' + day);
    assert.equal((await gate('token-b', 'net-B')).status, 429);
    assert.equal(await count('global:' + day), before, 'the refusal did not spend the site-wide day');
    assert.equal((await gate('token-c', 'net-C')).mode, 'NORMAL');
  } finally { await db.close(); }
});

test('the update applied to the live database is exactly the function of schema.sql, and replaces it in place', async () => {
  const {db} = await database();
  try {
    const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
    const sql = rpcFunctionSql(schema);
    assert.match(sql, /^create or replace function public\.attractor_rpc\(/);
    await db.exec('reset role;' + sql);
    const {rows: [f]} = await db.query("select pg_get_functiondef('public.attractor_rpc(text,text,text,jsonb)'::regprocedure) as d, has_function_privilege('anon','public.attractor_rpc(text,text,text,jsonb)','EXECUTE') as anon");
    assert.equal(rpcBody(f.d), rpcBody(sql));
    assert.equal(f.anon, false, 'replacing the function keeps its privileges');
  } finally { await db.close(); }
});
