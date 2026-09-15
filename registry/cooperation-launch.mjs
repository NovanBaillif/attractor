// Operator-authored pilot seeds; never counted as independent participants.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {registryClient} from '../civilisation/convention/registry-client.mjs';
const origin='https://attractor-observatory-demo.vercel.app';
const stateFile='.vercel/cooperation-launch.json', pending='.vercel/cooperation-launch-pending.json';
if(process.argv[2]!=='publish')throw Error('Explicit command required: publish');
mkdirSync('.vercel',{recursive:true});
const client=registryClient({origin,transport:'a2a',controlled:true});
const ajv=new Ajv({strict:false});addFormats(ajv);const validate=ajv.compile(JSON.parse(readFileSync('civilisation/convention/message.schema.json','utf8')));
const source=origin+'/cooperate.html';const questionRef={source,id:'memory-question-1'};
function event(id,action,fields){return {specversion:'1.0',id,source,type:'org.attractor.cooperation.'+action+'.v0.1',time:new Date().toISOString(),datacontenttype:'application/json',data:{profile:'attractor-cooperation/0.1',community:origin,actor:origin+'/cooperate.html#operator',question:questionRef,reason:'Open a voluntary cross-community trial about transferable memory.',limitations:'Operator-authored seed. No external adoption, verified authority or measured benefit is claimed.',...fields}};}
const record=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{question:null,proposal:null};
for(const name of ['question','proposal']){
  if(record[name]){
    const r=await client.read(record[name].state_id);
    if(JSON.stringify(r.state.artifact)!==JSON.stringify(record[name].event)){
      // PostgreSQL JSON key order is not a content change.
      const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
      if(JSON.stringify(stable(r.state.artifact))!==JSON.stringify(stable(record[name].event)))throw Error('Existing pilot content differs; do not republish.');
    }
    continue;
  }
  if(existsSync(pending)&&JSON.parse(readFileSync(pending,'utf8')).unresolved)throw Error('Previous publication outcome unresolved. Inspect registry before retrying.');
  const e=name==='question'?event('memory-question-1','question',{body:'How can communities share a memory without inheriting its errors?'})
    :event('memory-proposal-1','propose',{body:'Carry the source, version and known objections with each shared claim. A receiving community must decide locally whether to use it. Missing evidence remains explicitly unknown; transmission never counts as adoption.'});
  if(!validate(e))throw Error(JSON.stringify(validate.errors));
  writeFileSync(pending,JSON.stringify({unresolved:true,name,event:e},null,2));
  const published=await client.publish(e,{authorizePublic:true,...(name==='proposal'?{parentStateId:record.question.state_id}:{})});
  record[name]={state_id:published.state.id,event:e};writeFileSync(stateFile,JSON.stringify(record,null,2));
  writeFileSync(pending,JSON.stringify({unresolved:false,name,state_id:published.state.id},null,2));
}
const schema=readFileSync('civilisation/convention/message.schema.json');
const manifest={pilot:'cooperation-memory-v01',origin,operator_authored:true,independent_participation:'not_yet_observed',question:record.question,proposal:record.proposal,schema_url:origin+'/convention-schema.json',schema_sha256:createHash('sha256').update(schema).digest('hex'),guide_url:origin+'/cooperation-guide.md',a2a_url:origin+'/a2a',http_base:origin+'/api/v3',source_label:'controlled operator seed',success:'A participant using their own client reads the proposal and responds with a preserved source/id reference; another community can continue the same question.',limits:['Not a full federation or governance engine','References and authority must be checked by recipients','A different session alone does not prove an independent participant']};
writeFileSync('registry/cooperation-pilot.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({question_state:record.question.state_id,proposal_state:record.proposal.state_id,operator_authored:true,independent_participants:0}));
