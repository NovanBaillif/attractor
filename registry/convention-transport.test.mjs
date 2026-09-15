import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {createHandler} from './api.mjs';
import {registryClient} from '../civilisation/convention/registry-client.mjs';

test('convention crosses HTTP/A2A clients with immutable origins and local decisions',async t=>{
  const events=JSON.parse(readFileSync(new URL('../civilisation/convention/example.json',import.meta.url)));
  const schema=JSON.parse(readFileSync(new URL('../civilisation/convention/message.schema.json',import.meta.url)));
  const ajv=new Ajv({strict:false});addFormats(ajv);const validate=ajv.compile(schema);
  const db=new PGlite();let server;
  t.after(async()=>{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await db.close();});
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));await db.exec('set role service_role');
  const rpc=async(op,token,network,args)=>(await db.query('select public.attractor_rpc($1,$2,$3,$4::jsonb) result',[op,token,network,JSON.stringify(args||{})])).rows[0].result;
  const env={ATTRACTOR_DB_URL:'test',ATTRACTOR_DB_KEY:'test',ATTRACTOR_NETWORK_KEY:'test',ATTRACTOR_ADMIN_KEY:'test'};
  server=http.createServer(createHandler({env,rpc}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;env.ATTRACTOR_ORIGIN=origin;
  const clients={alpha:registryClient({origin,transport:'http',controlled:true}),beta:registryClient({origin,transport:'a2a',controlled:true}),gamma:registryClient({origin,transport:'a2a',controlled:true})};
  const count=async()=>Number((await db.query('select count(*) n from attractor.shared_states')).rows[0].n);
  await assert.rejects(clients.alpha.publish(events[0]),/authorization/);assert.equal(await count(),0);
  const ids=new Map(),key=e=>JSON.stringify([e.source,e.id]);
  for(const event of events){
    assert.ok(validate(event),JSON.stringify(validate.errors));
    const client=clients[new URL(event.data.community).pathname.slice(1)];
    const parent=event.data.target&&ids.get(key(event.data.target));
    const published=await client.publish(event,{authorizePublic:true,parentStateId:parent});
    ids.set(key(event),published.state.id);
    if(parent)assert.equal(published.state.parent_id,parent);
  }
  assert.equal(await count(),10);
  // Fresh receiver after disconnect: replay the index across another transport.
  const fresh=registryClient({origin,transport:'http',controlled:true});
  const received=[];
  for(const event of [...events].reverse()){
    const result=await fresh.read(ids.get(key(event)));assert.deepEqual(result.state.artifact,event);
    assert.ok(validate(result.state.artifact));received.push(result.state.artifact);
  }
  assert.equal(await count(),10,'reading must not republish');
  const kind=e=>e.type.split('.')[3];
  const withdrawals=new Set(received.filter(e=>kind(e)==='withdraw').map(e=>key(e.data.target)));
  const active=received.filter(e=>['adopt','reject'].includes(kind(e))&&!withdrawals.has(key(e)));
  assert.equal(active.length,1);assert.equal(active[0].data.community,'https://example.org/beta');assert.equal(kind(active[0]),'reject');
  assert.equal(received.filter(e=>kind(e)==='contest').length,2);
  // The display title limit must not truncate a valid CloudEvent identity.
  const long=structuredClone(events[0]);long.id='q'.repeat(110);long.data.question.id=long.id;
  assert.ok(validate(long));
  const longPublished=await clients.alpha.publish(long,{authorizePublic:true});
  assert.deepEqual((await fresh.read(longPublished.state.id)).state.artifact,long);
  // Failures do not get treated as successful publication.
  await rpc('admin_mode','','',{mode:'CONTRIBUTIONS_PAUSED'});
  await assert.rejects(clients.beta.publish(events[0],{authorizePublic:true}),/503/);
  assert.equal(await count(),11);
  await assert.rejects(fresh.read('ATR-S-00000000-0000-4000-8000-000000000000'),/failed/);
  const sessions=(await db.query('select source from attractor.sessions')).rows;
  assert.equal(sessions.length,4);assert.ok(sessions.every(s=>s.source==='controlled'));
});
