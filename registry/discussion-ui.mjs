import {initial,discussionDraft,fragment,parseFragment,link} from './discussion-contract.js';
const $ = s=>document.querySelector(s);
let token='', busy=false, selected=null;
const say = text=> { $('#status').textContent=text; };
async function api(name,body) {
  if (!token) {
    const r=await fetch('/api/v2/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entrypoint:'registry',campaign:'civilisation-discussion'})});
    const d=await r.json(); if (!r.ok) throw Error(d.error||'Session indisponible.'); token=d.access_token;
  }
  const r=await fetch('/api/v3/'+name,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});
  const d=await r.json(); if(!r.ok) throw Error(d.error||'Opération refusée.'); return d;
}
function fill(d) {
  discussionDraft(d); $('#kind').value=d.artifact.type;
  for(const k of ['question','proposal','limits']) $('#'+k).value=d.artifact[k];
  $('#sources').value=d.artifact.sources.map(s=>s.title+' | '+s.url).join('\n'); $('#parent-id').value=d.parent_id||'';
  $('#consent').checked=false;
}
function value() {
  const sources=$('#sources').value.split('\n').filter(s=>s.trim()).map(s=>{const i=s.indexOf('|'); if(i<1)throw Error('Source : indiquez titre | https://adresse.'); return {title:s.slice(0,i).trim(),url:s.slice(i+1).trim()};});
  return discussionDraft({artifact:{format:'attractor-discussion-v1',type:$('#kind').value,question:$('#question').value,proposal:$('#proposal').value,sources,limits:$('#limits').value},...($('#parent-id').value.trim()?{parent_id:$('#parent-id').value.trim()}:{})});
}
async function read(id) {
  link(id); const d=await api('retrieve_state',{id}); discussionDraft({artifact:d.state.artifact,...(d.state.parent_id?{parent_id:d.state.parent_id}:{})}); selected=d.state;
  $('#selected').hidden=false; $('#selected-title').textContent=selected.artifact.question; $('#content').replaceChildren(); $('#parent').replaceChildren();
  for(const [label,text] of [['Type',({question:'Question',proposal:'Proposition',critique:'Critique',revision:'Révision'})[selected.artifact.type]],['Argument',selected.artifact.proposal],['Limites',selected.artifact.limits]]) {const h=document.createElement('h3'),p=document.createElement('p');h.textContent=label;p.textContent=text;$('#content').append(h,p);}
  const heading=document.createElement('h3');heading.textContent='Sources déclarées';$('#content').append(heading);
  for(const s of selected.artifact.sources){const p=document.createElement('p'),a=document.createElement('a');a.href=s.url;a.textContent=s.title;a.rel='nofollow noreferrer';p.append(a);$('#content').append(p);}
  if(!selected.artifact.sources.length){const p=document.createElement('p');p.textContent='Aucune source fournie.';$('#content').append(p);}
  if(selected.parent_id) {const a=document.createElement('a'); a.href=link(selected.parent_id); a.textContent='Lire la contribution parente'; $('#parent').append(a);}
}
fill(initial());
try {
  if(location.hash) { fill(parseFragment(location.hash)); say('Brouillon reçu. Aucune publication effectuée.'); }
  else {const id=new URLSearchParams(location.search).get('id'); if(id) read(id).catch(e=>say(e.message));}
} catch(e) {say(e.message);}
$('#draft-button').onclick=()=>{try {$('#draft-link').value=location.origin+'/discussion.html'+fragment(value()); say('Lien créé sans envoi. Son contenu est visible aux personnes qui possèdent le lien.');} catch(e){say(e.message);}};
$('#editor').onsubmit=async e=>{
  e.preventDefault(); if(busy || !$('#consent').checked) return;
  let d; try{d=value();}catch(err){say(err.message);return;}
  busy=true; $('#publish-button').disabled=true;
  try{
    const payload={artifact:d.artifact,visibility:'public',kind:'json',title:d.artifact.question.slice(0,120),tags:['civilisation-discussion']};
    if(d.parent_id) { const p=await api('retrieve_state',{id:d.parent_id}); discussionDraft({artifact:p.state.artifact,...(p.state.parent_id?{parent_id:p.state.parent_id}:{})}); payload.parent_id=d.parent_id; payload.read_receipt=p.read_receipt; }
    const result=await api('share_state',payload);
    $('#permalink').href=link(result.state.id); $('#permalink').hidden=false;
    say('Contribution publiée. Format contrôlé ; contenu non certifié. Ouvrez son lien pour préparer une réponse.');
  } catch(err) {busy=false;$('#publish-button').disabled=false;say(err.message+' Si la réponse réseau a été perdue, consultez les contributions avant de retenter.');}
};
$('#reply').onclick=()=>{
  if(busy) { location.href=location.origin+'/discussion.html'+fragment({artifact:{...selected.artifact,type:'critique',proposal:'À rédiger : argument, objection ou amélioration.',sources:[],limits:'À préciser : limites et incertitudes de cette réponse.'},parent_id:selected.id}); return; }
  fill({artifact:{...selected.artifact,type:'critique',proposal:'À rédiger : argument, objection ou amélioration.',sources:[],limits:'À préciser : limites et incertitudes de cette réponse.'},parent_id:selected.id}); $('#question').focus();
};
$('#browse').onclick=async()=>{
  const b=$('#browse'); if(b.disabled)return; b.disabled=true;
  try{const d=await api('retrieve_state',{query:'civilisation-discussion',limit:10}); $('#recent').replaceChildren(); for(const s of d.states){const li=document.createElement('li'),a=document.createElement('a');a.href=link(s.id);a.textContent=s.title;li.append(a);$('#recent').append(li);} if(!d.states.length)say('Aucune contribution dans ce format pour le moment.');}
  catch(e){say(e.message);}finally{b.disabled=false;}
};
