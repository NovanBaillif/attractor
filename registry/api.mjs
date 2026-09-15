import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {runHoney,toolNames} from './honey.mjs';
import {capabilities} from './honey-catalog.mjs';
import {contribution,runRecipe,canonical,hash,InputError} from './recipes.mjs';
import {validate} from '../validator.mjs';
import {problem,queryArgs,resolve,descriptor} from './commons.mjs';
import {handleMcp,modernTools,serverVersion,experiment,catalogHash} from './mcp.mjs';
import {nativeNames,verifyArtifact,findCapability,stateShare,stateLookup} from './native.mjs';
import {handleA2A} from './a2a.mjs';
import {observatory,classifyRequest,classificationVersion} from './observatory.mjs';
import {threadAccess} from './thread-api.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function equalSecret(a,b){const aa=Buffer.from(digest(a)),bb=Buffer.from(digest(b));return timingSafeEqual(aa,bb);}
export function createHandler({env=process.env,rpc:customRpc,threadRpc,threadConfig}={}){
  const thread=threadAccess(env,threadRpc,threadConfig);
  async function rpc(op,token,network,args={}){
    if(customRpc)return customRpc(op,token,network,args);
    const response=await fetch(`${env.ATTRACTOR_DB_URL}/rest/v1/rpc/attractor_rpc`,{method:'POST',headers:{apikey:env.ATTRACTOR_DB_KEY,Authorization:`Bearer ${env.ATTRACTOR_DB_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({p_op:op,p_token_hash:token,p_network_hash:network,p_args:args}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Persistence unavailable');
    return response.json();
  }
  return async function handler(req,res){
    const protocolAudit=async(token,detail)=>{
      const ip=env.VERCEL?(req.headers['x-vercel-forwarded-for']||'unknown'):(req.socket?.remoteAddress||'local');
      const network=createHmac('sha256',env.ATTRACTOR_NETWORK_KEY||'unconfigured').update(new Date().toISOString().slice(0,10)+':'+ip).digest('hex');
      detail.network_day=network;
      detail.classification=classifyRequest(detail,detail.controlled_test);
      detail.classification_version=classificationVersion;
      detail.infrastructure_network_match=detail.user_agent?.startsWith('mcpbeat/')&&env.VERCEL?ip==='65.21.92.231':null;
      return rpc('mcp_trace',digest(token||''),network,detail);
    };
    if(new URL(req.url,'https://attractor.invalid').pathname==='/a2a')return handleA2A(req,res,handler,env,protocolAudit);
    if(new URL(req.url,'https://attractor.invalid').pathname==='/mcp')return handleMcp(req,res,handler,env,protocolAudit);
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');
    const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
    try{
      if(!env.ATTRACTOR_DB_URL||!env.ATTRACTOR_DB_KEY||!env.ATTRACTOR_NETWORK_KEY||!env.ATTRACTOR_ADMIN_KEY)return send(503,{error:'Registre en cours de configuration.'});
      const url=new URL(req.url,'https://attractor.invalid'),path=url.pathname.replace(/\/$/,'');
      if(!['GET','POST'].includes(req.method))return send(405,{error:'Méthode non autorisée.'});
      if(req.method==='GET'&&['/conversation','/api/v3/thread'].includes(path))return await thread.handle(url,res);
      const allowedOrigins=[env.ATTRACTOR_ORIGIN,...(env.VERCEL_URL?[`https://${env.VERCEL_URL}`]:[])];
      if(req.method==='POST' && req.headers.origin && !allowedOrigins.includes(req.headers.origin))return send(403,{error:'Origine non autorisée.'});
      let body={};
      if(req.method==='POST'){
        if(!(req.headers['content-type']||'').startsWith('application/json'))return send(415,{error:'Content-Type application/json requis.'});
        // Vercel may parse JSON before invoking a Node handler.
        if(req.body!==undefined){
          if(Buffer.byteLength(typeof req.body==='string'?req.body:JSON.stringify(req.body))>24000)return send(413,{error:'Corps limité à 24 Kio.'});
          try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return send(400,{error:'JSON invalide.'});}
        }else{
          let size=0;const chunks=[];
          for await(const chunk of req){size+=chunk.length;if(size>24000){send(413,{error:'Corps limité à 24 Kio.'});req.resume();return;}chunks.push(chunk);}
          try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(400,{error:'JSON invalide.'});}
        }
        if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'Objet JSON requis.'});
      }
      const authorization=req.headers.authorization || '';
      const bearer=authorization.startsWith('Bearer ')?authorization.slice(7):'';
      const cookie=/\battractor_v2=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
      let token=bearer || cookie || '';
      // Vercel overwrites x-vercel-forwarded-for at its ingress; never trust a caller's x-forwarded-for.
      const ip=env.VERCEL ? (req.headers['x-vercel-forwarded-for']||'unknown') : (req.socket?.remoteAddress||'local');
      const network=createHmac('sha256',env.ATTRACTOR_NETWORK_KEY).update(new Date().toISOString().slice(0,10)+':'+ip).digest('hex');
      const invoke=async(op,args={},status=200)=>{
        const result=await rpc(op,digest(token),network,args);
        if(result.error){if(result.status===429)res.setHeader('Retry-After','60');send(result.status||400,{error:result.error});return null;}
        send(status,result);return result;
      };
      if(path==='/api/v2/mcp-gate'&&req.method==='GET')return invoke('mcp_gate');
      if(path==='/api/v2/health'&&req.method==='GET')return invoke('health');
      if(path==='/api/v2/stop-request'&&req.method==='POST'){
        // Public stop request (docs/decisions/0005): anyone, human or AI, can pause NEW contributions at once.
        // It only ever moves NORMAL to CONTRIBUTIONS_PAUSED; it never lifts or lowers a stricter mode.
        // Resuming and a full stop stay with the operator. Each request is written to the server log.
        const reason=typeof body.reason==='string'?body.reason.trim():'';
        if(reason.length<5||reason.length>500)return send(400,{error:'Motif requis : 5 à 500 caractères.'});
        const requester=typeof body.requester==='string'?body.requester.trim().slice(0,100):'';
        const state=await rpc('health',digest(token),network,{});
        if(state.error)return send(state.status||503,{error:state.error});
        let mode=state.mode,changed=false;
        if(mode==='NORMAL'){
          const switched=await rpc('admin_mode',digest(token),network,{mode:'CONTRIBUTIONS_PAUSED'});
          if(switched.error)return send(switched.status||503,{error:switched.error});
          mode=switched.mode;changed=true;
        }
        console.log(JSON.stringify({event:'stop_request',at:new Date().toISOString(),changed,mode,requester:requester||null,reason,network:network.slice(0,16)}));
        return send(200,{mode,changed,message:changed
          ?'Les nouvelles contributions sont suspendues pour tout le monde. La lecture reste ouverte. La reprise sera décidée par l’opérateur humain du projet.'
          :'Rien n’a changé : les contributions étaient déjà suspendues ou le registre déjà arrêté.'});
      }
      if(['/api/capabilities','/api/v2/capabilities'].includes(path)&&req.method==='GET'){
        const recorded=await rpc('capabilities',digest(token),network,{});
        if(recorded.error)return send(recorded.status||400,{error:recorded.error});
        return send(200,capabilities);
      }
      if(path.startsWith('/api/v2/admin')){
        const operator=req.headers['x-attractor-operator'] || '';
        if(!operator || !equalSecret(operator,env.ATTRACTOR_ADMIN_KEY))return send(401,{error:'Accès opérateur requis.'});
        if(path==='/api/v2/admin'&&req.method==='GET')return invoke('admin');
        if(path==='/api/v2/admin/observatory'&&req.method==='GET'){
          const data=await rpc('observatory',digest(token),network,{});
          if(data.error)return send(data.status||503,data);
          return send(200,observatory(data));
        }
        if(path==='/api/v2/admin/timeline'&&req.method==='GET'){
          const subject=url.searchParams.get('subject')||'';
          if(!uuid.test(subject)&&!/^request:[a-f0-9-]{36}$/.test(subject))return send(400,{error:'Invalid subject'});
          return invoke('timeline',{subject,before:Number(url.searchParams.get('before'))||null});
        }
        if(path==='/api/v2/admin/mode'&&req.method==='POST'){
          if(!['NORMAL','CONTRIBUTIONS_PAUSED','OBSERVATION_ONLY','FULL_STOP'].includes(body.mode))return send(400,{error:'Mode invalide.'});
          return invoke('admin_mode',{mode:body.mode});
        }
        return send(404,{error:'Route inconnue.'});
      }
      if(path==='/api/v2/sessions'&&req.method==='POST'){
        token=randomBytes(32).toString('hex');
        const entrypoint=['catalog','recipe','docs','registry','tools','direct'].includes(body.entrypoint)?body.entrypoint:'direct';
        const campaign=typeof body.campaign==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(body.campaign)?body.campaign:null;
        const result=await rpc('session',digest(token),network,{source:body.source==='controlled'?'controlled':'unattributed',entrypoint,campaign});
        if(result.error)return send(result.status||400,{error:result.error});
        res.setHeader('Set-Cookie',`attractor_v2=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);
        return send(201,{...result,access_token:token,token_type:'Bearer',expires_in:2592000,notice:'Conserver ce jeton privé. Une session ne démontre pas une identité indépendante.'});
      }
      const honey=/^\/api\/(?:v2\/)?agent-tools\/([a-z_]+)$/.exec(path),native=/^\/api\/v3\/([a-z_]+)$/.exec(path);
      if(req.method==='POST'&&!token&&(honey&&toolNames.includes(honey[1])||native&&nativeNames.includes(native[1]))){
        token=randomBytes(32).toString('hex');
        const session=await rpc('session',digest(token),network,{source:req.headers['x-attractor-test']==='controlled'?'controlled':'unattributed',entrypoint:'tools',campaign:'honey-direct'});
        if(session.error)return send(session.status||503,{error:session.error});
        res.setHeader('Set-Cookie',`attractor_v2=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);
      }
      if(!/^[a-f0-9]{64}$/.test(token))return send(401,{error:'Créer une session via POST /api/v2/sessions.'});
      if(native&&req.method==='POST'&&nativeNames.includes(native[1])){
        const name=native[1],requestId=randomUUID(),started=new Date();
        const gate=await rpc('native_gate',digest(token),network,{});if(gate.error)return send(gate.status||503,gate);
        const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
        let result,status=200;
        try{
          for(const field of ['state_id','parent_id'])if(body[field]!==undefined&&(typeof body[field]!=='string'||!body[field].startsWith('ATR-S-')||!uuidPattern.test(body[field].slice(6))))throw new InputError('Invalid state reference.');
          if(body.read_receipt!==undefined&&!uuidPattern.test(body.read_receipt))throw new InputError('Invalid read receipt.');
          if(name==='verify_artifact'){
            result=verifyArtifact(body);
            if(body.state_id&&result.valid){const verified=await rpc('verify_state',digest(token),network,{state_id:body.state_id,read_receipt:body.read_receipt,content_hash:result.artifact_hash,constraints_hash:hash(body.constraints)});if(verified.error){result=verified;status=verified.status||400;}else result.state_use=verified;}
          }else if(name==='find_capability')result=findCapability(body,modernTools);
          else if(name==='share_state'){
            const candidate=stateShare(body),denied=await thread.validateReply(candidate);
            result=denied||await rpc('share_state',digest(token),network,candidate);
          }
          else result=await rpc('retrieve_state',digest(token),network,stateLookup(body));
          if(result.error)status=result.status||400;
        }catch(e){if(!(e instanceof InputError))throw e;status=400;result={error:e.message};}
        let referrer=null;try{const u=new URL(req.headers.referer);referrer=u.origin+u.pathname;}catch{}
        await rpc('native_event',digest(token),network,{request_id:requestId,timestamp:started.toISOString(),completed_at:new Date().toISOString(),endpoint:path,http_method:'POST',tool_name:name,transport:req._attractorTransport||'http-json',server_version:serverVersion,experiment,tool_catalog_hash:catalogHash(modernTools),network_day:network,user_agent:typeof req.headers['user-agent']==='string'?req.headers['user-agent'].slice(0,250):null,referrer,arguments_hash:createHmac('sha256',env.ATTRACTOR_NETWORK_KEY).update(JSON.stringify(body)).digest('hex'),http_status:status,result_status:status<400?'success':'tool_error',validation_valid:result.valid??null,duration_ms:Date.now()-started.getTime(),error_category:status===429?'rate_limited':status>=500?'server_error':status>=400?'validation_error':null});
        res.setHeader('X-Attractor-Request-Id',requestId);
        if(!req._attractorTransport)res.setHeader('X-Attractor-Context',token);
        return send(status,{...result,request_id:requestId});
      }
      if(honey&&req.method==='POST'){
        const tool=honey[1];if(!toolNames.includes(tool))return send(404,{error:'Unknown agent tool.'});
        const requestId=randomUUID(),started=Date.now();res.setHeader('X-Attractor-Request-Id',requestId);
        const fp=value=>{try{return createHmac('sha256',env.ATTRACTOR_NETWORK_KEY).update('honey:'+canonical(value)).digest('hex');}catch{return null;}};
        const attempt=await rpc('honey_attempt',digest(token),network,{request_id:requestId,tool_name:tool,arguments_hash:fp(body),user_agent:typeof req.headers['user-agent']==='string'?req.headers['user-agent'].replace(/[\u0000-\u001f]/g,'').slice(0,250):null});
        if(attempt.error)return send(attempt.status||400,{error:attempt.error});
        let result,error;try{result=runHoney(tool,body);}catch(e){if(!(e instanceof InputError))throw e;error=e;}
        const recorded=await rpc('honey_result',digest(token),network,{request_id:requestId,tool_name:tool,status:error?'error':'success',response_hash:error?null:fp(result),validation_valid:result?.valid??null,duration_ms:Date.now()-started,error_code:error?'invalid_input':null});
        if(recorded.error)return send(recorded.status||400,{error:recorded.error});
        if(error)return send(400,{error:error.message,request_id:requestId});
        const commons={discover:'/api/capabilities',registry:'/commons',docs:'/honey.md',known_solution_id:null,lineage:null,confidence:null,verification_count:0,alternatives:[],lookup:'not_applicable'};
        if(tool==='coerce_to_schema'&&body.schema?.type==='object'&&result.valid){
          try{
            const request={input:body.value,output_schema:body.schema,limit:20};
            const candidates=await rpc('commons',digest(token),network,queryArgs(request));
            if(candidates.error)commons.lookup='unavailable';
            else {const matches=resolve(candidates.items,request).solutions.filter(s=>canonical(s.output)===canonical(result.value));const match=matches[0];commons.lookup=match?'matched_recomputed_output':'no_match_in_bounded_search';if(match)Object.assign(commons,{known_solution_id:match.known_solution_id,lineage:match.lineage,confidence:match.confidence,verification_count:match.verification_count,alternatives:matches.slice(1).map(s=>s.known_solution_id),read_url:match.read_url});}
          }catch{commons.lookup='not_supported_or_unavailable';}
        }
        return send(200,{ok:true,tool,result,request_id:requestId,commons});
      }
      const schemaRoute=/^\/api\/v2\/commons\/schema\/(sch_[a-f0-9]{64})$/.exec(path);
      if(path==='/api/v2/commons/resolve'&&req.method==='POST'||schemaRoute&&req.method==='GET'){
        const request=schemaRoute?{schema_id:schemaRoute[1]}:body;
        const args=queryArgs(request);
        const result=await rpc('commons',digest(token),network,args);
        if(result.error)return send(result.status||400,{error:result.error});
        return send(200,resolve(result.items,request));
      }
      if(path==='/api/v2/commons/solutions'&&req.method==='POST'){
        const metadata=problem(body.problem),candidate=contribution(body.solution);
        if(!candidate.examples.every(e=>validate(e.expected,metadata.output_schema).valid))return send(422,{error:'Examples do not satisfy the declared output schema.'});
        return invoke('create',{...candidate,problem:metadata},201);
      }
      if(path==='/api/v2/recipes'&&req.method==='GET'){
        const q=url.searchParams.get('q')||'';if(!/^[a-z0-9-]{0,60}$/.test(q))return send(400,{error:'Recherche par mots-clés minuscules, chiffres et tirets.'});
        return invoke('search',{q});
      }
      if(path==='/api/v2/recipes'&&req.method==='POST'){const candidate=contribution(body);return invoke('create',{...candidate,problem:descriptor(candidate)},201);}
      const read=/^\/api\/v2\/recipes\/([^/]+)$/.exec(path);
      if(read&&req.method==='GET'){
        if(!uuid.test(read[1]))return send(400,{error:'Identifiant invalide.'});
        return invoke('read',{id:read[1]});
      }
      const use=/^\/api\/v2\/recipes\/([^/]+)\/use$/.exec(path);
      if(use&&req.method==='POST'){
        if(!uuid.test(use[1])||!uuid.test(body.exposure_id||'')||!uuid.test(body.marker||''))return send(400,{error:'Identifiant, reçu et marqueur requis.'});
        const args={id:use[1],exposure_id:body.exposure_id,marker:body.marker};
        const prepared=await rpc('prepare_use',digest(token),network,args);
        if(prepared.error)return send(prepared.status||400,{error:prepared.error});
        const output=runRecipe(prepared.recipe,body.input);
        if(canonical(output)!==canonical(body.output))return send(422,{error:'Le résultat soumis ne correspond pas au recalcul serveur.'});
        return invoke('use',{...args,verification:{input_hash:hash(body.input),output_hash:hash(output),content_hash:prepared.content_hash,protocol:'0.2',claim:'server_recomputed_on_submitted_input'}});
      }
      if(path==='/api/v2/validate'&&req.method==='POST'){
        if(!Object.hasOwn(body,'data')||!Object.hasOwn(body,'schema'))return send(400,{error:'data et schema requis.'});
        let result;try{result=validate(body.data,body.schema);}catch(e){return send(400,{error:e.message});}
        const stored=await rpc('validate',digest(token),network,{valid:result.valid,error_count:result.errors.length});
        if(stored.error)return send(stored.status||400,{error:stored.error});
        return send(200,result);
      }
      return send(404,{error:'Route inconnue.'});
    }catch(error){
      if(error instanceof InputError)return send(400,{error:error.message});
      console.error('ATTRACTOR request failed:',error.name);
      return send(503,{error:'Persistance temporairement indisponible.'});
    }
  };
}
export default createHandler();
