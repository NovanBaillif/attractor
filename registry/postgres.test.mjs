import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {contribution,seeds,hash} from './recipes.mjs';

test('real Postgres: A → version → B revision → C verified use, ACL, limits, shutdown, disk persistence',async()=>{
  mkdirSync('../data',{recursive:true});const dir=`../data/postgres-test-${randomUUID()}`;
  let db=new PGlite(dir);
  try{
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
    await db.exec('set role anon');
    await assert.rejects(()=>db.query("select public.attractor_rpc('health','','','{}')"),/permission denied/);
    await assert.rejects(()=>db.query('select * from attractor.artifacts'),/permission denied/);
    await db.exec('reset role; set role service_role;');
    async function rpc(op,token,args={},network=token){return (await db.query('select public.attractor_rpc($1,$2,$3,$4::jsonb) as result',[op,token,network,JSON.stringify(args)])).rows[0].result;}
    for(const token of ['a','b','c'])assert.ok((await rpc('session',token,{source:'controlled'})).session_id);
    const original=(await rpc('create','a',contribution(seeds[0]))).artifact;
    assert.ok(original.id);
    const readA=await rpc('read','a',{id:original.id});
    const invalid=await rpc('create','b',contribution({...seeds[0],parent_id:original.id,exposure_id:readA.exposure_id,conventions:{version:'second'}}));
    assert.equal(invalid.status,409);
    const search=await rpc('search','b',{q:'csv'});assert.equal(search.items[0].id,original.id);
    const readB=await rpc('read','b',{id:original.id});assert.notEqual(readB.marker,readA.marker);
    const amended={...seeds[0],recipe:{fields:[{from:'name',to:'name',steps:['trim','lowercase']},{from:'count',to:'count',steps:['trim','number']}]},parent_id:original.id,exposure_id:readB.exposure_id,conventions:{case:'lowercase'}};
    const revision=(await rpc('create','b',contribution(amended))).artifact;
    assert.equal(revision.parent_id,original.id);assert.equal(revision.revision,2);
    assert.equal((await rpc('create','b',contribution({...amended,parent_id:revision.id,exposure_id:readB.exposure_id}))).status,409);
    const readC=await rpc('read','c',{id:revision.id});
    const args={id:revision.id,exposure_id:readC.exposure_id,marker:readC.marker};
    assert.equal((await rpc('prepare_use','b',args)).status,409);
    assert.equal((await rpc('prepare_use','c',{...args,marker:readB.marker})).status,409);
    assert.deepEqual((await rpc('prepare_use','c',args)).recipe,amended.recipe);
    assert.equal((await rpc('use','c',{...args,verification:{input_hash:hash({name:' DEMO ',count:'7'}),output_hash:hash({name:'demo',count:7})}})).verified,true);
    assert.equal((await rpc('use','c',args)).status,409);
    const stats=await rpc('admin','operator');assert.equal(stats.cross_session_revisions,1);assert.ok(stats.events.some(e=>e.action==='VERIFIED_USE'));
    assert.equal((await rpc('admin_mode','operator',{mode:'OBSERVATION_ONLY'})).mode,'OBSERVATION_ONLY');
    assert.equal((await rpc('create','a',contribution(seeds[1]))).status,503);
    assert.ok((await rpc('read','a',{id:original.id})).artifact);
    await rpc('admin_mode','operator',{mode:'FULL_STOP'});
    assert.equal((await rpc('search','a',{q:''})).status,503);
    assert.equal((await rpc('health','')).mode,'FULL_STOP');
    await rpc('admin_mode','operator',{mode:'NORMAL'});
    for(let i=0;i<60;i++)await rpc('search','quota',{q:''},'quota-network');
    assert.equal((await rpc('search','quota',{q:''},'quota-network')).status,429);
    await db.close();db=new PGlite(dir);
    const persisted=await db.query('select id,parent_id from attractor.artifacts order by revision');assert.equal(persisted.rows.length,2);assert.equal(persisted.rows[1].parent_id,original.id);
  }finally{await db.close();}
});
