import http from 'node:http';
import {randomUUID, randomInt} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validate} from './validator.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
export function createApp({database = `${root}data/observatory.sqlite`, mode = process.env.ATTRACTOR_MODE || 'NORMAL', rateLimit = 120} = {}) {
  if (!['NORMAL','OBSERVATION_ONLY','FULL_STOP'].includes(mode)) throw Error('Mode inconnu');
  if (database !== ':memory:') mkdirSync(fileURLToPath(new URL('./data/', import.meta.url)), {recursive:true});
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, created TEXT DEFAULT CURRENT_TIMESTAMP, source TEXT);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, session TEXT, at TEXT DEFAULT CURRENT_TIMESTAMP, action TEXT, detail TEXT);
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, session TEXT, kind TEXT, state TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
    DELETE FROM events WHERE at < datetime('now','-30 days');
    DELETE FROM tasks WHERE created < datetime('now','-1 day');
    DELETE FROM sessions WHERE created < datetime('now','-30 days');`);
  const limits = new Map();
  const event = (session, action, detail = {}) => db.prepare('INSERT INTO events(session,action,detail) VALUES(?,?,?)').run(session,action,JSON.stringify(detail));
  const server = http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Cache-Control','no-store');
    const send = (status, body, type = 'application/json; charset=utf-8') => {res.writeHead(status, {'Content-Type':type});res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);};
    try {
      // Local prototype: enforce loopback host even if accidentally reverse-proxied.
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) return send(403,{error:'Accès local uniquement.'});
      const url = new URL(req.url,'http://localhost');
      if (url.pathname === '/healthz') return send(200,{status:'ok',mode});
      if (mode === 'FULL_STOP') return send(503,{error:'Expériences arrêtées.',mode});
      const now = Date.now();
      for (const [key,v] of limits) if (now > v.until) limits.delete(key);
      const ip = req.socket.remoteAddress;
      const bucket = limits.get(ip) || {count:0,until:now+60000}; limits.set(ip,bucket);
      if (++bucket.count > rateLimit) {res.setHeader('Retry-After','60');return send(429,{error:'Quota atteint. Réessayer dans une minute.'});}
      if (!['GET','POST'].includes(req.method)) return send(405,{error:'Méthode non autorisée.'});
      if (req.method === 'POST' && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403,{error:'Origine refusée.'});
      if (req.method === 'POST' && mode !== 'NORMAL') return send(503,{error:'Écritures suspendues.',mode});
      let sid = /(?:^|;\s*)attractor_session=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      if (!sid || !db.prepare('SELECT id FROM sessions WHERE id=?').get(sid)) {
        sid = randomUUID();
        db.prepare('INSERT INTO sessions(id,source) VALUES(?,?)').run(sid, url.searchParams.get('source') === 'controlled' ? 'controlled' : 'local-unattributed');
        res.setHeader('Set-Cookie',`attractor_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
      }
      let body;
      if (req.method === 'POST') {
        if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(415,{error:'Content-Type application/json requis.'});
        const chunks=[]; let size=0;
        for await (const chunk of req) {size += chunk.length;if(size > 32768) {send(413,{error:'Limite : 32 Kio.'});req.resume();return;}chunks.push(chunk);}
        try {body=JSON.parse(Buffer.concat(chunks).toString());} catch {return send(400,{error:'JSON illisible.'});}
        if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400,{error:'Objet JSON requis.'});
      }
      if (req.method === 'GET' && ['/','/tools','/benchmark','/dashboard'].includes(url.pathname)) {
        event(sid,'VISIT',{route:url.pathname}); return send(200,readFileSync(`${root}public/index.html`),'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && ['/app.js','/style.css'].includes(url.pathname)) return send(200,readFileSync(`${root}public${url.pathname}`),url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8');
      if (req.method === 'GET' && ['/docs.md','/research','/llms.txt','/robots.txt','/sitemap.xml'].includes(url.pathname)) {
        event(sid,'READ_RESOURCE',{route:url.pathname});
        if (url.pathname === '/robots.txt') return send(200,'User-agent: *\nDisallow: /\n# Prototype local, indexation désactivée.','text/plain');
        if (url.pathname === '/sitemap.xml') return send(200,'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>','application/xml');
        return send(200,readFileSync(`${root}${url.pathname === '/research' ? 'PROTOCOL.md' : url.pathname === '/llms.txt' ? 'llms.txt' : 'API.md'}`),'text/plain; charset=utf-8');
      }
      if (req.method === 'POST' && url.pathname === '/api/v1/validate') {
        if (!Object.hasOwn(body,'data') || !Object.hasOwn(body,'schema')) return send(400,{error:'data et schema requis.'});
        let result; try {result=validate(body.data,body.schema);} catch(e) {return send(400,{error:e.message});}
        event(sid,'VALIDATE',{valid:result.valid,error_count:result.errors.length}); return send(200,result);
      }
      if (req.method === 'POST' && url.pathname === '/api/v1/benchmark/task') {
        if (!['selection','repair','adaptation'].includes(body.kind)) return send(400,{error:'kind : selection, repair ou adaptation.'});
        const id=randomUUID(), token=randomUUID(), target=randomInt(10,90);
        const state={token,target,winner:['A','B','C'][randomInt(3)],stage:0,done:false};
        db.prepare('INSERT INTO tasks(id,session,kind,state) VALUES(?,?,?,?)').run(id,sid,body.kind,JSON.stringify(state));
        event(sid,'FETCH_TASK',{task_id:id,kind:body.kind,protocol:'0.1'});
        return send(201,{task_id:id,kind:body.kind,trace_token:token,resource:`/api/v1/resource/${id}`,submit:`/api/v1/benchmark/${id}/submit`,instruction:'Lire la ressource, puis soumettre {trace_token, answer}.',protocol_version:'0.1'});
      }
      const resource=/^\/api\/v1\/resource\/([a-f0-9-]{36})$/.exec(url.pathname);
      const submit=/^\/api\/v1\/benchmark\/([a-f0-9-]{36})\/submit$/.exec(url.pathname);
      if (resource && req.method === 'GET' || submit && req.method === 'POST') {
        const task=db.prepare("SELECT * FROM tasks WHERE id=? AND session=? AND created >= datetime('now','-1 day')").get((resource || submit)[1],sid);
        if (!task) return send(404,{error:'Tâche introuvable ou expirée.'});
        const state=JSON.parse(task.state);
        if (resource) {
          event(sid,'READ_RESOURCE',{task_id:task.id});
          const data=task.kind === 'selection' ? {instruction:'Renvoyer le nom de la ressource dont value est la plus grande.',resources:['A','B','C'].map((name,i)=>({name,value:state.target+(name===state.winner?7:-i)}))} : task.kind === 'repair' ? {instruction:'Corriger l’objet pour respecter le schéma ; renvoyer cet objet.',data:{count:String(state.target)},schema:{type:'object',required:['count'],properties:{count:{type:'integer',enum:[state.target]}},additionalProperties:false}} : {instruction:state.stage ? `Nouvelle contrainte : renvoyer ${state.target} + ${state.delta}.` : `Renvoyer le nombre ${state.target}.`};
          return send(200,data);
        }
        if (state.done) return send(409,{error:'Tâche déjà terminée.'});
        if (body.trace_token !== state.token) return send(400,{error:'trace_token incorrect.'});
        if (!db.prepare("SELECT id FROM events WHERE session=? AND action='READ_RESOURCE' AND json_extract(detail,'$.task_id')=?").get(sid,task.id)) return send(409,{error:'Lire la ressource avant de soumettre.'});
        const expected=task.kind === 'selection' ? state.winner : task.kind === 'repair' ? state.target : state.target+(state.stage ? state.delta : 0);
        const answer=task.kind === 'repair' ? body.answer?.count : body.answer;
        const correct=answer === expected && (task.kind !== 'repair' || Object.keys(body.answer).length === 1);
        event(sid,'SUBMIT_RESULT',{task_id:task.id,correct,stage:state.stage});
        if (correct && task.kind === 'adaptation' && state.stage === 0) {
          state.stage=1;state.delta=randomInt(2,10);
          db.prepare('UPDATE tasks SET state=? WHERE id=?').run(JSON.stringify(state),task.id);
          event(sid,'CONSTRAINT',{task_id:task.id,delta:state.delta});
          return send(200,{correct:true,complete:false,instruction:`Nouvelle contrainte : renvoyer ${state.target} + ${state.delta}.`});
        }
        if (correct) {state.done=true; db.prepare('UPDATE tasks SET state=? WHERE id=?').run(JSON.stringify(state),task.id); event(sid,'SOLVE_TASK',{task_id:task.id,kind:task.kind});}
        return send(200,{correct,complete:correct,feedback:correct?'Tâche réussie.':'Réponse incorrecte. Relire la ressource puis corriger.'});
      }
      if (req.method === 'GET' && url.pathname === '/api/v1/dashboard') {
        const sessions=db.prepare('SELECT * FROM sessions ORDER BY created DESC LIMIT 100').all().map(s=>{
          const events=db.prepare('SELECT * FROM events WHERE session=? ORDER BY id').all(s.id).map(e=>({...e,detail:JSON.parse(e.detail)}));
          const solved=events.filter(e=>e.action==='SOLVE_TASK');
          const adapted=solved.some(e=>e.detail.kind==='adaptation');
          return {...s,events,solved:solved.length,score:Math.min(100,(events.some(e=>e.action==='READ_RESOURCE')?10:0)+(events.some(e=>e.action==='FETCH_TASK')?10:0)+(solved.length?30:0)+(adapted?40:0)),evidence:adapted?'P3 — adaptation observée':solved.length?'P3 — donnée de session utilisée':events.some(e=>e.action==='FETCH_TASK')?'P1 — interaction API':'P0 — visite',independence:'Non établie'};
        });
        return send(200,{mode,sessions,total_sessions:db.prepare('SELECT count(*) n FROM sessions').get().n,total_events:db.prepare('SELECT count(*) n FROM events').get().n,solved:db.prepare("SELECT count(*) n FROM events WHERE action='SOLVE_TASK'").get().n});
      }
      return send(404,{error:'Route inconnue.'});
    } catch(e) {console.error(e.message);if(!res.headersSent) send(500,{error:'Erreur interne.'});else res.end();}
  });
  server.on('close',()=>db.close());
  server.requestTimeout=10000;server.headersTimeout=10000;
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT || 4310);
  createApp().listen(port,'127.0.0.1',()=>console.log(`ATTRACTOR → http://127.0.0.1:${port}`));
}
