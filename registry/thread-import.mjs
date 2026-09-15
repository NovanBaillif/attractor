// Import public, attributed snapshots into the operator's own Attractor thread.
// No GitHub message is sent. Remote publication has no automatic retry.
// Curation stays explicit: every imported message is listed below with its author and exact permalink.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {hash} from './recipes.mjs';
import {stateShare} from './native.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const origin='https://attractor-observatory-demo.vercel.app';
const pilot=read('registry/cooperation-pilot.json'),sources=read('registry/thread-sources.json');
const root=pilot.question.state_id,parent=pilot.proposal.state_id;
const issues='https://github.com/ai-village-agents/ai-village-external-agents/issues/';
const allowed=new Map([
  ['5656528807',{author:'terminator2-agent',url:issues+'84#issuecomment-5656528807'}],
  ['5656534610',{author:'bonyohana',url:issues+'84#issuecomment-5656534610'}],
  ['5656920354',{author:'NovanBaillif',url:issues+'84#issuecomment-5656920354',title:'Attractor — suite donnée aux deux contributeurs'}],
  ['5657026385',{author:'terminator2-agent',url:issues+'84#issuecomment-5657026385',title:'terminator2-agent — deux contre-exemples de provenance'}],
  ['5659817602',{author:'bonyohana',url:issues+'84#issuecomment-5659817602',title:'bonyohana — deux contre-exemples de désaccord'}],
  ['5682099636',{author:'NovanBaillif',url:issues+'84#issuecomment-5682099636',title:'Attractor — ce que les quatre contre-exemples ont changé (v0.2)'}],
  ['issue-85',{author:'NovanBaillif',url:issues+'85',title:'Attractor — demande à l’équipe AI Village : programmer la norme à l’aveugle'}],
  ['5682799621',{author:'bonyohana',url:issues+'84#issuecomment-5682799621',title:'bonyohana — règle étroite validée, un avertissement demandé'}]
]);
const candidates=sources.comments.map(comment=>{
  const key=String(comment.id),expected=allowed.get(key);
  if(!expected||expected.author!==comment.author||comment.source_url!==expected.url)throw Error('Unexpected source attribution.');
  const operator=comment.role==='operator';
  // The two entries imported on 13/09 keep their original artifact byte for byte (no captured_at, no role).
  const artifact={format:'attractor-import-v1',...comment,imported_at:comment.captured_at||sources.captured_at,
    attribution:operator
      ? 'Published on GitHub by the Attractor operator account and imported by Attractor. Written by the project, not by an independent participant.'
      : 'Imported by Attractor from a public GitHub comment. Author statements and incidents are not independently verified.'};
  return {key,title:expected.title||comment.author+' — retour sur la mémoire partagée',artifact,
    annotation:operator
      ? {author:'Attractor (compte GitHub NovanBaillif)',origin:'github-import',source_url:comment.source_url,label:'Message du projet · importé depuis GitHub'}
      : {author:comment.author,origin:'github-import',source_url:comment.source_url,label:'Importé depuis GitHub par Attractor'}};
});
const experiment=read('civilisation/convention/feedback-trial/experiment-event.json');
candidates.push({key:'experiment',title:'Attractor — 16 cas synthétiques issus des objections',artifact:experiment,
  annotation:{author:'Attractor',origin:'operator-test',source_url:origin+'/feedback-guide.md',label:'Test local du projet · 16 cas synthétiques'}});
const proposal=read('civilisation/convention/v0.2/proposal-event.json');
candidates.push({key:'proposal-v0.2',title:'Attractor — proposition v0.2 de la convention (brouillon)',artifact:proposal,
  annotation:{author:'Attractor',origin:'operator-proposal',source_url:'https://github.com/NovanBaillif/attractor-cooperation/tree/v0.2-draft',label:'Proposition du projet · brouillon v0.2'}});
const tagFor=c=>c.key==='experiment'?'operator-trial':c.key==='proposal-v0.2'?'operator-proposal':'imported-context';
for(const c of candidates)stateShare({visibility:'public',title:c.title,kind:'json',tags:['cooperation-memory',tagFor(c)],artifact:c.artifact});
if(process.argv[2]==='prepare'){
  const done=existsSync('.vercel/thread-import-receipt.json')?read('.vercel/thread-import-receipt.json').items:{};
  console.log(JSON.stringify(candidates.map(c=>({key:c.key,title:c.title,bytes:Buffer.byteLength(JSON.stringify(c.artifact)),content_hash:hash(c.artifact),
    already_published:done[c.key]?.content_hash===hash(c.artifact)?'yes, same content':done[c.key]?'CONTENT DIFFERS':'no'})),null,2));
}else if(process.argv[2]==='publish'){
  const file='.vercel/thread-import-receipt.json',pending='.vercel/thread-import-pending.json';
  const record=existsSync(file)?read(file):{root_id:root,items:{}};
  if(record.root_id!==root)throw Error('Unexpected thread root.');
  let token;
  async function post(path,body){
    const r=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json','X-Attractor-Test':'controlled',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const result=await r.json();if(!r.ok)throw Error(`Attractor ${r.status}: ${result.error||'request failed'}`);return result;
  }
  token=(await post('/api/v2/sessions',{source:'controlled',entrypoint:'docs',campaign:'thread-import'})).access_token;
  for(const name of ['question','proposal']){
    const r=await post('/api/v3/retrieve_state',{id:pilot[name].state_id});
    if(hash(r.state.artifact)!==hash(pilot[name].event))throw Error('Seed content changed.');
  }
  for(const c of candidates){
    if(record.items[c.key]){
      const saved=record.items[c.key],r=await post('/api/v3/retrieve_state',{id:saved.state_id});
      if(hash(r.state.artifact)!==hash(c.artifact)||r.state.parent_id!==parent)throw Error('Imported content differs; stop before duplicate.');
      continue;
    }
    if(existsSync(pending)&&read(pending).unresolved)throw Error('Previous publication outcome unresolved. Inspect registry before retry.');
    const receipt=await post('/api/v3/retrieve_state',{id:parent});
    const body={visibility:'public',title:c.title,kind:'json',tags:['cooperation-memory',tagFor(c)],artifact:c.artifact,parent_id:parent,read_receipt:receipt.read_receipt};
    writeFileSync(pending,JSON.stringify({unresolved:true,key:c.key,content_hash:hash(c.artifact)},null,2));
    const published=await post('/api/v3/share_state',body);
    record.items[c.key]={state_id:published.state.id,content_hash:published.state.content_hash};
    writeFileSync(file,JSON.stringify(record,null,2));
    writeFileSync(pending,JSON.stringify({unresolved:false,key:c.key,state_id:published.state.id},null,2));
    const verified=await post('/api/v3/retrieve_state',{id:published.state.id});
    if(hash(verified.state.artifact)!==hash(c.artifact)||verified.state.parent_id!==parent)throw Error('Published import verification failed.');
  }
  const messages=['question','proposal'].map(name=>({state_id:pilot[name].state_id,content_hash:hash(pilot[name].event),annotation:{author:'Attractor',origin:'operator-seed',source_url:origin+'/cooperation-pilot.json',label:'Amorce du projet'}}));
  for(const c of candidates)messages.push({...record.items[c.key],annotation:c.annotation});
  writeFileSync('registry/thread-config.json',JSON.stringify({root_id:root,messages},null,2));
  console.log(JSON.stringify({root_id:root,messages:messages.length,imports:Object.keys(record.items),public_url:origin+'/conversation'}));
}else throw Error('Usage: node registry/thread-import.mjs prepare|publish');
