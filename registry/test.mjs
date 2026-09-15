import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {contribution,runRecipe,seeds,canonical} from './recipes.mjs';
import {createHandler} from './api.mjs';

test('seed recipes pass all published examples',()=>{
  for(const seed of seeds)assert.equal(contribution(seed).verification.passed,seed.examples.length);
});
test('DSL rejects executable operations, prototype keys, data loss and false examples',()=>{
  assert.throws(()=>runRecipe({fields:[{from:'a',to:'constructor',steps:[]}]},{a:1}));
  assert.throws(()=>runRecipe({fields:[{from:'a',to:'b',steps:['fetch']}]},{a:1}));
  assert.throws(()=>runRecipe({fields:[{from:'a',to:'b',steps:['number']}]},{a:''}));
  assert.throws(()=>runRecipe({fields:[{from:'a',to:'b',steps:['decimal-comma','number']}]},{a:'1,000,20'}));
  assert.throws(()=>contribution({...seeds[0],examples:[{input:{name:' x ',count:'2'},expected:{name:'x',count:3}}]}));
  assert.throws(()=>contribution({...seeds[0],parent_id:'00000000-0000-0000-0000-000000000001'}));
  assert.equal(canonical(runRecipe(seeds[1].recipe,{amount:' 12,50 '})),'{"amount":12.5}');
});
test('HTTP boundary: private admin, session credentials, server recomputation, origin and size',async t=>{
  const calls=[];
  const env={ATTRACTOR_DB_URL:'https://example.invalid',ATTRACTOR_DB_KEY:'test-only',ATTRACTOR_NETWORK_KEY:'test-network',ATTRACTOR_ADMIN_KEY:'test-operator',ATTRACTOR_ORIGIN:'https://attractor.example'};
  const handler=createHandler({env,rpc:async(op,token,network,args)=>{
    calls.push({op,token,network,args});
    if(op==='session')return {session_id:'test-session'};
    if(op==='prepare_use')return {recipe:seeds[1].recipe,content_hash:'test-hash'};
    return {ok:true};
  }});
  const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=(path,body,headers={})=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal((await request('/api/v2/admin')).status,401);assert.equal(calls.length,0);
  assert.equal((await request('/api/v2/admin',undefined,{'x-attractor-operator':'test-operator'})).status,200);
  assert.equal((await request('/api/v2/recipes')).status,401);
  assert.equal((await request('/api/v2/sessions',{}, {origin:'https://evil.example'})).status,403);
  const session=await request('/api/v2/sessions',{source:'controlled',entrypoint:'recipe',campaign:'catalog-launch'});
  assert.match(session.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
  const {access_token}=await session.json();assert.equal(access_token.length,64);
  assert.notEqual(calls.at(-1).token,access_token);
  assert.equal(calls.at(-1).args.entrypoint,'recipe');assert.equal(calls.at(-1).args.campaign,'catalog-launch');
  const headers={Authorization:`Bearer ${access_token}`};
  const id='00000000-0000-0000-0000-000000000001';
  const body={exposure_id:id,marker:id,input:{amount:'12,50'},output:{amount:13}};
  assert.equal((await request(`/api/v2/recipes/${id}/use`,body,headers)).status,422);
  assert.equal(calls.some(c=>c.op==='use'),false);
  body.output.amount=12.5;
  assert.equal((await request(`/api/v2/recipes/${id}/use`,body,headers)).status,200);
  assert.equal(calls.at(-1).op,'use');assert.equal(Object.hasOwn(calls.at(-1).args.verification,'input'),false);
  assert.equal((await request('/api/v2/recipes',{...seeds[0],huge:'x'.repeat(25000)},headers)).status,413);
  assert.equal((await request('/api/v2/recipes',seeds[0],headers)).status,201);
  assert.equal(calls.at(-1).args.verification.passed,2);
});
