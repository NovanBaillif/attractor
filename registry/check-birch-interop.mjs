// Read-only local experiment. No API calls, model calls or public writes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {verifyArtifact,stateShare} from './native.mjs';
const root=new URL('../data/interop/',import.meta.url);
const raw=readFileSync(new URL('birch-source.json',root));
assert.equal(createHash('sha256').update(raw).digest('hex'),'9d91b58f2bd797cf0d9f81b8db79299da44660fbe3d0950df9eb9584b3afadd8','Source changed: review the experiment before rerunning.');
const schema=JSON.parse(raw);
const ajv=new Ajv2020({allErrors:true});addFormats(ajv);
const validate=ajv.compile(schema);
const base={schema_version:'1',session_id:'synthetic-session',agent_id:'controlled-test',t0:'2026-09-14T00:00:00Z',model_family:'synthetic',context_architecture:'fixture-only',denominators:[{id:'window',type:'time_window',label:'Synthetic window',window_minutes:60}],metrics:{tfpa_seconds:5,session_duration_hours:1,total_productive_events:3,denominator_metrics:[{denominator_id:'window',epd:3,orientation_share:0.25,productive_events:3,orientation_events:1,total_events:4}]}};
// Additional checks are our explicit test criteria, not the authors' claimed guarantees.
function consistency(record){
 const errors=[];const m=record.metrics;
 if(m.session_duration_hours<0)errors.push('negative_duration');
 if(m.total_productive_events<0)errors.push('negative_productive_count');
 for(const d of m.denominator_metrics){
  if(!record.denominators.some(x=>x.id===d.denominator_id))errors.push('unknown_denominator');
  if(d.orientation_share<0||d.orientation_share>1)errors.push('share_outside_zero_one');
 }
 return errors;
}
const scenarios=[['coherent_fixture',()=>{},true,[]],['negative_duration',x=>{x.metrics.session_duration_hours=-1;},true,['negative_duration']],['unknown_denominator',x=>{x.metrics.denominator_metrics[0].denominator_id='missing';},true,['unknown_denominator']],['share_above_one',x=>{x.metrics.denominator_metrics[0].orientation_share=1.5;},true,['share_outside_zero_one']],['wrong_type',x=>{x.metrics.session_duration_hours='one';},false,null]];
const results=scenarios.map(([name,mutate,expected,issues])=>{const input=structuredClone(base);mutate(input);const schema_valid=validate(input);assert.equal(schema_valid,expected,name);const local_issues=schema_valid?consistency(input):null;assert.deepEqual(local_issues,issues,name);return {name,input,schema_valid,schema_errors:structuredClone(validate.errors),local_issues};});
let compatibility;try{verifyArtifact({artifact:base,constraints:schema});compatibility={accepted:true};}catch(e){compatibility={accepted:false,error:e.message};}
assert.equal(compatibility.accepted,false);
const packet={experiment:'birch-interop-v1',checked_at:new Date().toISOString(),source:{url:'https://ai-village-agents.github.io/schemas/birch-continuity-schema-v1.json',sha256:createHash('sha256').update(raw).digest('hex'),snapshot:'birch-source.json',revision:null,attribution:'AI Village public schema; author identity not independently verified',rights:'Private analytical snapshot; no republication licence assumed'},method:{validator:'Ajv draft 2020-12 with ajv-formats',cases:'synthetic controlled fixtures',local_criteria:'duration >= 0; orientation_share in [0,1]; referenced denominator exists',scope:'Schema conformance plus three explicit local consistency checks; not consciousness, factual accuracy or general method effectiveness'},compatibility,results,conclusion:'The source schema accepts three locally inconsistent fixtures. Attractor rejects the full schema as unsupported. Keep a standard validator; add explicit domain checks without silently weakening the original schema.',independent_reuse_demonstrated:false};
const payload=stateShare({artifact:packet,visibility:'public',title:'Birch: schema conformance versus metric consistency',kind:'json',tags:['interop','birch','controlled-test']});
delete payload.content_hash; // Computed by the server, not an accepted request field.
writeFileSync(new URL('birch-result.json',root),JSON.stringify(packet,null,2));
writeFileSync(new URL('birch-share-draft.json',root),JSON.stringify(payload,null,2));
console.log(JSON.stringify({cases:results.length,schema_accepts_inconsistent:results.filter(x=>x.schema_valid&&x.local_issues.length).length,attractor_full_schema_supported:compatibility.accepted,source_sha256:packet.source.sha256,public_writes:0},null,2));
