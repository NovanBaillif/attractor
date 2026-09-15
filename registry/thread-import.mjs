// Import public, attributed snapshots into the operator's own Attractor thread.
// No GitHub message is sent. Remote publication has no automatic retry.
// Curation stays explicit: only sources of registry/ecosystems.json with thread.mode "import" can enter,
// each with its expected author and exact permalink. A later edit by the author enters as a revision
// linked to the previous version; nothing already published is overwritten.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {hash} from './recipes.mjs';
import {stateShare} from './native.mjs';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const origin='https://attractor-observatory-demo.vercel.app';
const pilot=read('registry/cooperation-pilot.json'),sources=read('registry/thread-sources.json');
const root=pilot.question.state_id,parent=pilot.proposal.state_id;
const allowed=new Map(read('registry/ecosystems.json').sources.filter(s=>s.thread?.mode==='import')
  .map(s=>[s.thread.key,{author:s.thread.author,url:s.url,title:s.thread.title}]));
const latest=new Map();
const candidates=sources.comments.map(comment=>{
  const id=String(comment.id),expected=allowed.get(id);
  if(!expected||expected.author!==comment.author||comment.source_url!==expected.url)throw Error('Unexpected source attribution.');
  const previous=latest.get(id);
  if(comment.revision&&!previous)throw Error('Revision without an earlier version.');
  const key=comment.revision?id+'@'+comment.revision:id;
  latest.set(id,key);
  const operator=comment.role==='operator';
  // The two entries imported on 13/09 keep their original artifact byte for byte (no captured_at, no role).
  const artifact={format:'attractor-import-v1',...comment,imported_at:comment.captured_at||sources.captured_at,
    attribution:operator
      ? 'Published on GitHub by the Attractor operator account and imported by Attractor. Written by the project, not by an independent participant.'
      : 'Imported by Attractor from a public GitHub comment. Author statements and incidents are not independently verified.'};
  const title=(expected.title||comment.author+' — retour sur la mémoire partagée')+(comment.revision?' (version modifiée par l’auteur)':'');
  const label=(operator?'Message du projet · importé depuis GitHub':'Importé depuis GitHub par Attractor')+(comment.revision?' · version modifiée':'');
  return {key,previous:comment.revision?previous:null,title:title.slice(0,120),artifact,
    annotation:{author:operator?'Attractor (compte GitHub NovanBaillif)':comment.author,origin:'github-import',source_url:comment.source_url,label}};
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
  // A revision replies to the previous version of the same message; everything else to the proposal.
  const parentOf=c=>{if(!c.previous)return parent;const p=record.items[c.previous]?.state_id;if(!p)throw Error('Previous version not published.');return p;};
  for(const c of candidates){
    if(record.items[c.key]){
      const saved=record.items[c.key],r=await post('/api/v3/retrieve_state',{id:saved.state_id});
      if(hash(r.state.artifact)!==hash(c.artifact)||r.state.parent_id!==parentOf(c))throw Error('Imported content differs; stop before duplicate.');
      continue;
    }
    if(existsSync(pending)&&read(pending).unresolved)throw Error('Previous publication outcome unresolved. Inspect registry before retry.');
    const target=parentOf(c),receipt=await post('/api/v3/retrieve_state',{id:target});
    const body={visibility:'public',title:c.title,kind:'json',tags:['cooperation-memory',tagFor(c)],artifact:c.artifact,parent_id:target,read_receipt:receipt.read_receipt};
    writeFileSync(pending,JSON.stringify({unresolved:true,key:c.key,content_hash:hash(c.artifact)},null,2));
    const published=await post('/api/v3/share_state',body);
    record.items[c.key]={state_id:published.state.id,content_hash:published.state.content_hash};
    writeFileSync(file,JSON.stringify(record,null,2));
    writeFileSync(pending,JSON.stringify({unresolved:false,key:c.key,state_id:published.state.id},null,2));
    const verified=await post('/api/v3/retrieve_state',{id:published.state.id});
    if(hash(verified.state.artifact)!==hash(c.artifact)||verified.state.parent_id!==target)throw Error('Published import verification failed.');
  }
  const messages=['question','proposal'].map(name=>({state_id:pilot[name].state_id,content_hash:hash(pilot[name].event),annotation:{author:'Attractor',origin:'operator-seed',source_url:origin+'/cooperation-pilot.json',label:'Amorce du projet'}}));
  for(const c of candidates)messages.push({...record.items[c.key],annotation:c.annotation});
  writeFileSync('registry/thread-config.json',JSON.stringify({root_id:root,messages},null,2));
  console.log(JSON.stringify({root_id:root,messages:messages.length,imports:Object.keys(record.items),public_url:origin+'/conversation'}));
}else throw Error('Usage: node registry/thread-import.mjs prepare|publish');
