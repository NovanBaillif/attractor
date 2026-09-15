import {validate} from './validator.mjs';

const key='attractor-demo-v1';
let state;
try{state=JSON.parse(localStorage.getItem(key));}catch{}
if(!state || !Array.isArray(state.events) || !state.tasks || !state.id)state={id:crypto.randomUUID(),events:[],tasks:{},created:new Date().toISOString()};
function save(){
  state.events=state.events.slice(-500);
  const tasks=Object.entries(state.tasks);if(tasks.length>50)state.tasks=Object.fromEntries(tasks.slice(-50));
  try{localStorage.setItem(key,JSON.stringify(state));}catch{document.querySelector('.status').textContent='● DÉMO · STOCKAGE INDISPONIBLE';}
}
function event(action,detail={}){state.events.push({at:new Date().toISOString(),action,detail});save();}
const random=(min,max)=>min+crypto.getRandomValues(new Uint32Array(1))[0]%(max-min);
event('VISIT',{route:location.pathname});
export async function demoApi(path,body){
  if(body && JSON.stringify(body).length>32768)throw Error('Limite : 32 Kio.');
  if(path==='/api/v1/validate'){
    const result=validate(body.data,body.schema);event('VALIDATE',{valid:result.valid,error_count:result.errors.length});return result;
  }
  if(path==='/api/v1/benchmark/task'){
    if(!['selection','repair','adaptation'].includes(body.kind))throw Error('Expérience inconnue.');
    const id=crypto.randomUUID(),token=crypto.randomUUID();state.tasks[id]={kind:body.kind,token,target:random(10,90),winner:['A','B','C'][random(0,3)],stage:0,read:false,done:false};
    event('FETCH_TASK',{task_id:id,kind:body.kind});return {task_id:id,trace_token:token,resource:`/api/v1/resource/${id}`,submit:`/api/v1/benchmark/${id}/submit`};
  }
  const resource=/^\/api\/v1\/resource\/([a-f0-9-]+)$/.exec(path),submit=/^\/api\/v1\/benchmark\/([a-f0-9-]+)\/submit$/.exec(path);
  if(resource || submit){
    const id=(resource||submit)[1],t=state.tasks[id];if(!t)throw Error('Tâche expirée.');
    if(resource){t.read=true;event('READ_RESOURCE',{task_id:id});
      if(t.kind==='selection')return {instruction:'Renvoyer le nom de la ressource dont value est la plus grande.',resources:['A','B','C'].map((name,i)=>({name,value:t.target+(name===t.winner?7:-i)}))};
      if(t.kind==='repair')return {instruction:'Corriger l’objet pour respecter le schéma ; renvoyer cet objet.',data:{count:String(t.target)},schema:{type:'object',required:['count'],properties:{count:{type:'integer',enum:[t.target]}},additionalProperties:false}};
      return {instruction:t.stage?`Nouvelle contrainte : renvoyer ${t.target} + ${t.delta}.`:`Renvoyer le nombre ${t.target}.`};
    }
    if(!t.read || body.trace_token!==t.token)throw Error('Lire la ressource et utiliser le token de la tâche.');
    if(t.done)throw Error('Tâche déjà terminée.');
    const expected=t.kind==='selection'?t.winner:t.target+(t.stage?t.delta:0);
    const correct=t.kind==='repair'?body.answer!==null && typeof body.answer==='object' && !Array.isArray(body.answer) && body.answer.count===t.target && Object.keys(body.answer).length===1:body.answer===expected;
    event('SUBMIT_RESULT',{task_id:id,correct,stage:t.stage});
    if(correct && t.kind==='adaptation' && !t.stage){t.stage=1;t.delta=random(2,10);event('CONSTRAINT',{task_id:id,delta:t.delta});return {correct:true,complete:false,instruction:`Nouvelle contrainte : renvoyer ${t.target} + ${t.delta}.`};}
    if(correct){t.done=true;event('SOLVE_TASK',{task_id:id,kind:t.kind});}
    return {correct,complete:correct,feedback:correct?'Tâche réussie.':'Réponse incorrecte. Relire la ressource puis corriger.'};
  }
  if(path==='/api/v1/dashboard'){
    const solved=state.events.filter(e=>e.action==='SOLVE_TASK'),adapted=solved.some(e=>e.detail.kind==='adaptation');
    const score=(state.events.some(e=>e.action==='READ_RESOURCE')?10:0)+(state.events.some(e=>e.action==='FETCH_TASK')?10:0)+(solved.length?30:0)+(adapted?40:0);
    return {mode:'DÉMONSTRATION NAVIGATEUR',total_sessions:1,total_events:state.events.length,solved:solved.length,sessions:[{id:state.id,source:'tes essais dans ce navigateur',score,solved:solved.length,evidence:solved.length?'P3 simulé — essai contrôlé':'P0 — visite de démonstration',events:state.events}]};
  }
  throw Error('Fonction non disponible dans la démonstration.');
}
