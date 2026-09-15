const $ = s => document.querySelector(s);
const page = {'/':'home','/tools':'tools','/benchmark':'benchmark','/dashboard':'dashboard'}[location.pathname] || 'home';
document.querySelectorAll('main > section').forEach(s => s.hidden = s.id !== page);
document.querySelectorAll('nav a').forEach(a => {if(a.pathname===location.pathname)a.setAttribute('aria-current','page');});
async function api(path, body) {
  const response = await fetch(path,body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data = await response.json(); if (!response.ok) throw Error(data.error || 'Erreur serveur.'); return data;
}
const show = (selector,value) => $(selector).textContent = typeof value === 'string' ? value : JSON.stringify(value,null,2);
$('#validator').addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{show('#validation',await api('/api/v1/validate',{data:JSON.parse($('#data').value),schema:JSON.parse($('#schema').value)}));}catch(e){show('#validation',e.message);}finally{button.disabled=false;}});
let task;
document.querySelectorAll('[data-task]').forEach(button=>button.addEventListener('click',async()=>{
  const buttons=document.querySelectorAll('[data-task]');buttons.forEach(b=>b.disabled=true);task=null;$('#task-panel').hidden=true;
  try{const next=await api('/api/v1/benchmark/task',{kind:button.dataset.task});const resource=await api(next.resource);task=next;show('#resource',resource);$('#answer').value='';$('#task-panel').hidden=false;show('#task-result',`Tâche ${task.task_id} · trace enregistrée`);$('#answer').focus();}catch(e){show('#task-result',e.message);}finally{buttons.forEach(b=>b.disabled=false);}
}));
$('#submit-task').addEventListener('submit',async e=>{e.preventDefault();if(!task)return;const button=e.submitter;button.disabled=true;try{const result=await api(task.submit,{trace_token:task.trace_token,answer:JSON.parse($('#answer').value)});show('#task-result',result);if(result.instruction)show('#resource',result.instruction);if(result.complete){task=null;$('#task-panel').hidden=true;}}catch(e){show('#task-result',e.message);}finally{button.disabled=false;}});
async function dashboard(){
  try{const data=await api('/api/v1/dashboard');show('#sessions-count',String(data.total_sessions));show('#events-count',String(data.total_events));show('#solved-count',String(data.solved));show('#dashboard-status',`Mode ${data.mode} · 100 dernières sessions maximum · actualisé à ${new Date().toLocaleTimeString('fr-FR')}`);$('#sessions').replaceChildren();
    if(!data.sessions.length)$('#sessions').textContent='Aucune session enregistrée.';
    for(const s of data.sessions){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent=`${s.id.slice(0,8)} · ${s.source} · Indice ${s.score}/100 · ${s.evidence} · ${s.solved} réussite(s)`;pre.textContent=s.events.map(e=>`${e.at}  ${e.action}  ${JSON.stringify(e.detail)}`).join('\n');details.append(summary,pre);$('#sessions').append(details);}
  }catch(e){show('#dashboard-status',e.message);}
}
$('#refresh').addEventListener('click',dashboard);if(page==='dashboard')dashboard();
