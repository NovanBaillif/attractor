// Closed-fixture conformance checks, not a production governance engine.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import Ajv from '../../registry/node_modules/ajv/dist/2020.js';
import addFormats from '../../registry/node_modules/ajv-formats/dist/index.js';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url),'utf8'));
const ajv=new Ajv({strict:false,allErrors:true});addFormats(ajv);
const valid=ajv.compile(read('message.schema.json'));
const sample=read('example.json');
const key=r=>JSON.stringify([r.source,r.id]);
const action=e=>e.type.slice('org.attractor.cooperation.'.length,-'.v0.1'.length);
const equalRef=(a,b)=>key(a)===key(b);
// Fixture-only trust anchor; real receivers must authenticate independently.
const authorities=new Map(['alpha','beta','gamma'].map(c=>['https://example.org/'+c,'https://example.org/'+c+'/delegate']));
function inspect(events){
 const byId=new Map();
 for(const e of events){
  assert.ok(valid(e),JSON.stringify(valid.errors));
  if(byId.has(key(e)))assert.deepEqual(e,byId.get(key(e)),'identity collision');
  else byId.set(key(e),e);
 }
 for(const e of byId.values()){
  const a=action(e),d=e.data,q=byId.get(key(d.question));
  assert.ok(q&&action(q)==='question','missing question');
  if(a==='question')assert.ok(equalRef(e,d.question));
  if(d.target){
   const target=byId.get(key(d.target));assert.ok(target,'missing target');
   assert.ok(equalRef(target.data.question,d.question),'cross-question reference');
   assert.ok(!equalRef(e,d.target),'self reference');
   if(a==='withdraw'){
    assert.ok(['adopt','reject'].includes(action(target)));
    assert.equal(target.data.community,d.community,'foreign withdrawal');
   }else assert.equal(action(target),'propose','target must be a proposal');
  }
  if(['adopt','reject','withdraw'].includes(a)){
   assert.equal(authorities.get(d.community),d.actor,'unauthorized local decision');
   if(d.supersedes){const previous=byId.get(key(d.supersedes));assert.ok(previous&&['adopt','reject'].includes(action(previous)));assert.equal(previous.data.community,d.community);assert.ok(equalRef(previous.data.question,d.question));}
  }
 }
 return byId;
}
const index=inspect(sample);
assert.equal(index.size,10);
assert.equal(inspect([...sample,...sample]).size,10,'retry must not add events');
assert.equal(inspect([...sample].reverse()).size,10,'complete graph independent of receipt order');
const mutate=(i,fn)=>{const copy=structuredClone(sample);fn(copy[i]);return copy;};
assert.throws(()=>inspect(mutate(5,e=>{e.data.actor='https://example.org/beta/delegate';})));
assert.throws(()=>inspect(mutate(9,e=>{e.data.target={source:'https://example.org/beta',id:'r1'};})));
assert.throws(()=>inspect(mutate(5,e=>{delete e.data.scope;})));
assert.throws(()=>inspect(mutate(7,e=>{e.data.global_adoption=true;})));
assert.throws(()=>inspect(sample.filter(e=>e.id!=='p2')));
const collision=structuredClone(sample[0]);collision.data.body='Changed content';assert.throws(()=>inspect([...sample,collision]));
// Illustrative result for this closed graph, with no supersession conflicts.
const withdrawn=new Set(sample.filter(e=>action(e)==='withdraw').map(e=>key(e.data.target)));
const active=sample.filter(e=>['adopt','reject'].includes(action(e))&&!withdrawn.has(key(e)));
assert.equal(active.length,1);assert.equal(action(active[0]),'reject');assert.equal(active[0].data.community,'https://example.org/beta');
assert.equal(sample.filter(e=>action(e)==='contest').length,2,'objections retained');
console.log('PASS: 10 fixture events; schema, references, replay, receipt order, local authority, foreign withdrawal, missing scope, forbidden global adoption and preserved objections. No independent implementations or real authorities tested.');
