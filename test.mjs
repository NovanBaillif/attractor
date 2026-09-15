import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './server.mjs';
import {validate} from './validator.mjs';

async function fixture(t, options={}) {
  const app=createApp({database:':memory:',rateLimit:1000,...options});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{app.close(resolve);app.closeAllConnections();}));
  const base=`http://127.0.0.1:${app.address().port}`;
  function client(){let cookie='';return async(path,body,headers={})=>{const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{cookie,...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});cookie=r.headers.get('set-cookie')?.split(';')[0] || cookie;return {status:r.status,data:await r.json()};};}
  return {client,base};
}
test('validator: useful errors, strict unsupported schema, enum structural equality',()=>{
  assert.equal(validate({count:'3'},{type:'object',properties:{count:{type:'integer'}}}).errors[0].path,'/count');
  assert.equal(validate({count:3},{type:'object',required:['count'],properties:{count:{type:'integer'}}}).valid,true);
  assert.throws(()=>validate('x',{pattern:'.*'}));
  assert.throws(()=>validate(1,{minimum:'bad'}));
  assert.equal(validate({b:2,a:1},{enum:[{a:1,b:2}]}).valid,true);
  assert.equal(validate('🟢',{type:'string',maxLength:1}).valid,true);
  assert.equal(validate(JSON.parse('{"__proto__":3}'),{type:'object',additionalProperties:false}).valid,false);
});
test('three task flows, ownership, read prerequisite, correction, adaptation, replay and telemetry',async t=>{
  const {client}=await fixture(t),a=client(),b=client();
  for(const kind of ['selection','repair','adaptation']) {
    const {data:task}=await a('/api/v1/benchmark/task',{kind});
    assert.equal((await b(task.resource)).status,404);
    assert.equal((await a(task.submit,{trace_token:task.trace_token,answer:0})).status,409);
    const {data:r}=await a(task.resource);
    assert.equal((await a(task.submit,{trace_token:'wrong',answer:0})).status,400);
    assert.equal((await a(task.submit,{trace_token:task.trace_token,answer:null})).data.correct,false);
    let answer=kind==='selection'?r.resources.reduce((a,b)=>a.value>b.value?a:b).name:kind==='repair'?{count:Number(r.data.count)}:Number(r.instruction.match(/\d+/)[0]);
    let result=await a(task.submit,{trace_token:task.trace_token,answer});
    assert.equal(result.data.correct,true);
    if(kind==='adaptation') {
      assert.equal(result.data.complete,false);
      const nums=result.data.instruction.match(/\d+/g).map(Number);
      assert.equal((await a(task.submit,{trace_token:task.trace_token,answer})).data.correct,false);
      result=await a(task.submit,{trace_token:task.trace_token,answer:nums[0]+nums[1]});
    }
    assert.equal(result.data.complete,true);
    assert.equal((await a(task.submit,{trace_token:task.trace_token,answer})).status,409);
  }
  const dash=(await a('/api/v1/dashboard')).data;
  assert.equal(dash.solved,3);
  assert.ok(dash.sessions.some(s=>s.score===90 && s.independence==='Non établie'));
});
test('limits, origin protection, schema rejection and payload minimization',async t=>{
  const {client,base}=await fixture(t),a=client();
  assert.equal((await a('/api/v1/validate',{data:1,schema:{$ref:'https://example.com'}})).status,400);
  assert.equal((await a('/api/v1/validate',{data:'private-example',schema:{type:'string'}})).status,200);
  assert.equal(JSON.stringify((await a('/api/v1/dashboard')).data).includes('private-example'),false);
  assert.equal((await a('/api/v1/validate',{data:1,schema:{}},{origin:'https://example.com'})).status,403);
  assert.equal((await a('/api/v1/validate',{data:'a'.repeat(40000),schema:{}})).status,413);
  assert.equal((await fetch(base+'/api/v1/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'})).status,400);
});
test('kill switch and quotas',async t=>{
  const {client}=await fixture(t,{mode:'OBSERVATION_ONLY'}),a=client();
  assert.equal((await a('/api/v1/benchmark/task',{kind:'selection'})).status,503);
  assert.equal((await a('/healthz')).data.mode,'OBSERVATION_ONLY');
  const stopped=await fixture(t,{mode:'FULL_STOP'});
  assert.equal((await stopped.client()('/api/v1/dashboard')).status,503);
  const limited=await fixture(t,{rateLimit:1}),b=limited.client();
  assert.equal((await b('/api/v1/dashboard')).status,200);
  assert.equal((await b('/api/v1/dashboard')).status,429);
});
