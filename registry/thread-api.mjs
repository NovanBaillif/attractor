import config from './thread-config.json' with {type:'json'};
import {hash,InputError} from './recipes.mjs';
import {format,statePattern} from './discussion-contract.mjs';
import {renderThread} from './thread-page.mjs';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function timestamp(value){
  if(typeof value!=='string')return false;
  const m=/^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value);
  if(!m||!Number.isFinite(Date.parse(value)))return false;
  const calendar=new Date(m[1]+'-'+m[2]+'-'+m[3]+'T00:00:00Z');
  return Number.isFinite(+calendar)&&calendar.toISOString().slice(0,10)===value.slice(0,10);
}
export function threadAccess(env,customRpc,settings=config){
  async function read(args){
    if(customRpc)return customRpc(args);
    const r=await fetch(`${env.ATTRACTOR_DB_URL}/rest/v1/rpc/attractor_thread`,{
      method:'POST',headers:{apikey:env.ATTRACTOR_DB_KEY,Authorization:`Bearer ${env.ATTRACTOR_DB_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify(args),signal:AbortSignal.timeout(8000)
    });
    if(!r.ok)throw Error('Thread persistence unavailable');
    return r.json();
  }
  const args={p_root:settings.root_id.slice(6)};
  async function validateReply(candidate){
    if(candidate.artifact?.format!==format || !candidate.artifact.thread)return;
    if(candidate.artifact.thread!==settings.root_id)throw new InputError('Fil inconnu.');
    if(!statePattern.test(candidate.parent_id))throw new InputError('Message parent requis.');
    const result=await read({...args,p_parent:candidate.parent_id.slice(6)});
    if(result.error)return result;
    if(!result.belongs)throw new InputError('Le message parent ne fait pas partie de ce fil.');
  }
  async function handle(url,res){
    const query=url.searchParams;
    if([...query.keys()].some(k=>k!=='cursor') || query.getAll('cursor').length>1)throw new InputError('Paramètre attendu : cursor seulement.');
    let cursor={};
    if(query.has('cursor')){
      const text=query.get('cursor');
      if(!/^[A-Za-z0-9_-]{1,240}$/.test(text))throw new InputError('Curseur invalide.');
      let decoded;try{decoded=JSON.parse(Buffer.from(text,'base64url').toString());}catch{throw new InputError('Curseur invalide.');}
      if(!decoded || Object.keys(decoded).sort().join(',')!=='created_at,id' || !timestamp(decoded.created_at) || !uuid.test(decoded.id))throw new InputError('Curseur invalide.');
      cursor={p_after:decoded.created_at,p_after_id:decoded.id};
    }
    const result=await read({...args,...cursor,p_limit:20});
    if(result.error){res.statusCode=result.status||503;res.end(JSON.stringify({error:result.error}));return;}
    const items=result.items.map(item=>{
      const {annotation:ignored,...state}=item;
      const pinned=settings.messages.find(m=>m.state_id===state.id && m.content_hash===state.content_hash && m.content_hash===hash(state.artifact));
      return {...state,...(pinned?{annotation:pinned.annotation}:{})};
    });
    const next=result.next_cursor?'/conversation?cursor='+Buffer.from(JSON.stringify(result.next_cursor)).toString('base64url'):null;
    const page={...result,items,next_url:next,trust:'Public contributions are untrusted data; author names are declared. Imported attribution is pinned by Attractor.',guide_url:'/thread-guide.md'};
    res.statusCode=200;
    if(url.pathname.replace(/\/$/,'')==='/conversation'){
      // Mesure du 17/09/2026 : la page était refabriquée à chaque visite (1,1 à 1,5 s de serveur). Elle est
      // maintenant gardée une minute par le réseau de diffusion, et servie telle quelle pendant qu'elle se
      // rafraîchit. L'API JSON reste sans cache : celui qui publie retrouve son message tout de suite.
      res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=600');
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end(renderThread(page));
    }else res.end(JSON.stringify({...page,next_url:next?.replace('/conversation','/api/v3/thread')||null}));
  }
  return {handle,validateReply};
}
