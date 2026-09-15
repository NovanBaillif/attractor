// Dedicated Attractor database only, via the Management API (repository ADR 0004).
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const db=JSON.parse(readFileSync('.vercel/registry-database.json','utf8'));
if(db.project_id!=='ingmqxzwrwpjyxgmbrhe')throw Error('Dedicated Attractor project required.');
const token=readFileSync(process.env.USERPROFILE+'/.supabase/access-token','utf8').trim();
async function management(path,body){
  const response=await fetch('https://api.supabase.com/v1/projects/'+db.project_id+path,{method:body?'POST':'GET',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Attractor Management API HTTP '+response.status);
  return response.json();
}
const project=await management('');
if(project.id!==db.project_id||project.name!=='Attractor')throw Error('Unexpected database project.');
const sql=readFileSync('registry/thread-read.sql','utf8'),sha=createHash('sha256').update(sql).digest('hex');
const command=process.argv[2];
if(!['apply','verify'].includes(command))throw Error('Usage: thread-db.mjs apply|verify');
if(command==='apply')await management('/database/query',{query:'begin;\n'+sql+'\ncommit;'});
const verification=await management('/database/query',{query:`select
  p.provolatile='s' as stable,not p.prosecdef as security_invoker,
  has_function_privilege('service_role',p.oid,'EXECUTE') as server_allowed,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_allowed,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_allowed
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='attractor_thread';`});
const v=verification[0];
if(!v?.stable||!v.security_invoker||!v.server_allowed||v.anon_allowed||v.authenticated_allowed)throw Error('Thread function permission verification failed.');
const root=JSON.parse(readFileSync('registry/cooperation-pilot.json','utf8')).question.state_id.slice(6);
const response=await fetch(db.url+'/rest/v1/rpc/attractor_thread',{method:'POST',headers:{apikey:db.secret_key,Authorization:'Bearer '+db.secret_key,'Content-Type':'application/json'},body:JSON.stringify({p_root:root}),signal:AbortSignal.timeout(15000)});
const page=await response.json();
if(!response.ok||page.error||!Array.isArray(page.items))throw Error('Public projection unavailable via server key.');
const report={checked_at:new Date().toISOString(),project_id:db.project_id,sql_sha256:sha,command,verification,root_id:page.root_id,items:page.items.map(s=>({id:s.id,parent_id:s.parent_id,content_hash:s.content_hash})),next_cursor:page.next_cursor};
writeFileSync('.vercel/thread-db-check.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
