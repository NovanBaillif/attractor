import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.ATTRACTOR_CHECK_URL;
if(!base)throw Error('ATTRACTOR_CHECK_URL requis');
const {admin}=JSON.parse(readFileSync('../.vercel/registry-private.json','utf8'));
async function request(path,body,operator=false){const r=await fetch(base+'/api/v2'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(operator?{'x-attractor-operator':admin}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
const initial=await request('/health');assert.equal(initial.body.mode,'NORMAL');
try{
  assert.equal((await request('/admin/mode',{mode:'OBSERVATION_ONLY'},true)).status,200);
  assert.equal((await request('/health')).body.mode,'OBSERVATION_ONLY');
  assert.equal((await request('/admin/mode',{mode:'FULL_STOP'},true)).status,200);
  assert.equal((await request('/sessions',{})).status,503);
  assert.equal((await request('/health')).body.mode,'FULL_STOP');
}finally{
  assert.equal((await request('/admin/mode',{mode:'NORMAL'},true)).status,200);
}
assert.equal((await request('/health')).body.mode,'NORMAL');console.log('PASS: persistent observation/full-stop modes and verified NORMAL restoration.');
