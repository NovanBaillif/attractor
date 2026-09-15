import http from 'node:http';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createHandler} from './api.mjs';
const dir=process.env.ATTRACTOR_PREVIEW_MEMORY==='1'?undefined:'../data/registry-preview';mkdirSync('../data',{recursive:true});
const db=new PGlite(dir);
if(!(await db.query("select 1 from pg_namespace where nspname='attractor'")).rows.length){
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  await db.exec(readFileSync('schema.sql','utf8'));await db.exec(readFileSync('seed.sql','utf8'));
}
if(!(await db.query("select 1 from information_schema.columns where table_schema='attractor' and table_name='artifacts' and column_name='problem'")).rows.length)await db.exec(readFileSync('commons-migration.sql','utf8'));
const currentSchema=readFileSync('schema.sql','utf8');
await db.exec(currentSchema.slice(currentSchema.indexOf('create function public.attractor_rpc')).replace('create function public.attractor_rpc','create or replace function public.attractor_rpc'));
const env={ATTRACTOR_DB_URL:'local-postgres',ATTRACTOR_DB_KEY:'local-test-only',ATTRACTOR_NETWORK_KEY:'local-test-network',ATTRACTOR_ADMIN_KEY:'local-operator-test-only',ATTRACTOR_ORIGIN:'http://127.0.0.1:4312'};
const handler=createHandler({env,rpc:async(op,token,network,args)=>{
  return (await db.query('select public.attractor_rpc($1,$2,$3,$4::jsonb) as result',[op,token,network,JSON.stringify(args)])).rows[0].result;
}});
http.createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')||req.url==='/mcp')return handler(req,res);
  const path=new URL(req.url,'http://localhost').pathname;
  const routes={'/':'index.html','/registry':'index.html','/tools':'index.html','/dashboard':'index.html','/benchmark':'index.html','/research':'research.html','/catalog':'catalog.html','/commons':'commons.html','/agent-tools':'agent-tools.html'};
  const file=routes[path]||(/^\/(?:recipes|agent-tools)\/[a-z0-9-]+$/.test(path)?path.slice(1)+'.html':path.slice(1));
  if(!/^(?:(?:recipes|agent-tools)\/)?[a-zA-Z0-9-]+\.(?:html|json|js|css|md|txt|xml)$/.test(file)){res.statusCode=404;return res.end();}
  try{const body=readFileSync(`../registry-dist/public/${file}`);res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/plain; charset=utf-8');res.end(body);}catch{res.statusCode=404;res.end();}
}).listen(4312,'127.0.0.1',()=>console.log('Registre PostgreSQL local : http://127.0.0.1:4312 · clé de test : local-operator-test-only'));
