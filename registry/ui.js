const $=s=>document.querySelector(s);
const page=({'/':'home','/registry':'registry','/benchmark':'registry','/tools':'tools','/dashboard':'dashboard'})[location.pathname]||'home';
document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!==page);
document.querySelectorAll('nav a').forEach(a=>{if(a.pathname===location.pathname)a.setAttribute('aria-current','page');});
const show=(s,v)=>$(s).textContent=typeof v==='string'?v:JSON.stringify(v,null,2);
const params=new URLSearchParams(location.search);
const entrypoint=params.get('entry')||(['registry','tools'].includes(page)?page:'direct');
const campaign=params.get('utm_campaign');
let sessionPromise=null,selected=null,operatorKey='';
async function api(path,body,admin=false,retry=true){
  const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(admin?{'x-attractor-operator':operatorKey}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json();
  if(response.status===401&&!admin&&retry){
    if(!sessionPromise)sessionPromise=fetch('/api/v2/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entrypoint,campaign})}).then(async r=>{if(!r.ok)throw Error((await r.json()).error);}).finally(()=>sessionPromise=null);
    await sessionPromise;return api(path,body,false,false);
  }
  if(!response.ok)throw Error(data.error||'Requête impossible.');return data;
}
const sample={slug:'trim-count-example',recipe:{fields:[{from:'count',to:'count',steps:['trim','number']}]},examples:[{input:{count:' 3 '},expected:{count:3}}],conventions:{naming:'snake_case'}};
$('#contribution').value=JSON.stringify(sample,null,2);
async function search(){
  try{const data=await api('/api/v2/recipes?q='+encodeURIComponent($('#query').value));$('#recipe-list').replaceChildren();show('#registry-status',`${data.items.length} version(s) trouvée(s).`);
    for(const a of data.items){const card=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p'),b=document.createElement('button');h.textContent=a.slug;p.textContent=`Version ${a.revision} · ${a.origin==='seed'?'exemple initial':'contribution'} · ${a.verification.passed} exemple(s) vérifié(s)`;b.textContent='Lire la recette →';b.addEventListener('click',()=>read(a.id));card.append(h,p,b);$('#recipe-list').append(card);}
  }catch(e){show('#registry-status',e.message);}
}
async function read(id){try{selected=await api('/api/v2/recipes/'+id);$('#selected').hidden=false;show('#recipe-title',selected.artifact.slug);show('#recipe-detail',selected.artifact);$('#use-input').value=JSON.stringify(selected.artifact.examples[0].input,null,2);$('#use-output').value='';show('#use-status','Lecture enregistrée. La vérification suivante exige un résultat correct.');}catch(e){show('#registry-status',e.message);}}
$('#search').addEventListener('submit',e=>{e.preventDefault();search();});
$('#revise').addEventListener('click',()=>{const a=selected.artifact;$('#contribution').value=JSON.stringify({slug:a.slug,recipe:a.recipe,examples:a.examples,conventions:a.conventions,parent_id:a.id,exposure_id:selected.exposure_id},null,2);$('#contribution').focus();});
$('#use-form').addEventListener('submit',async e=>{e.preventDefault();e.submitter.disabled=true;try{show('#use-status',await api(`/api/v2/recipes/${selected.artifact.id}/use`,{exposure_id:selected.exposure_id,marker:selected.marker,input:JSON.parse($('#use-input').value),output:JSON.parse($('#use-output').value)}));}catch(e){show('#use-status',e.message);}finally{e.submitter.disabled=false;}});
$('#contribute').addEventListener('submit',async e=>{e.preventDefault();e.submitter.disabled=true;try{const r=await api('/api/v2/recipes',JSON.parse($('#contribution').value));show('#contribute-status',`Version publiée : ${r.artifact.id}`);await search();await read(r.artifact.id);}catch(e){show('#contribute-status',e.message);}finally{e.submitter.disabled=false;}});
$('#validator').addEventListener('submit',async e=>{e.preventDefault();e.submitter.disabled=true;try{show('#validation',await api('/api/v2/validate',{data:JSON.parse($('#data').value),schema:JSON.parse($('#schema').value)}));}catch(e){show('#validation',e.message);}finally{e.submitter.disabled=false;}});
async function dashboard(){
  try{
    const d=await api('/api/v2/admin',undefined,true);
    $('#admin-content').hidden=false;show('#admin-status',`Mode ${d.mode}`);
    show('#sessions-count',String(d.sessions));show('#artifacts-count',String(d.artifacts));show('#exposures-count',String(d.exposures));
    show('#lineage-count',`${d.cross_session_revisions} révision(s) entre sessions distinctes.`);
    show('#honey-count',d.honey?`Outils JSON : ${d.honey.controlled_success} exécutions contrôlées ; ${d.honey.unattributed_success} exécutions non attribuées ; ${d.honey.unknown_source_success} sources expirées/inconnues ; ${d.honey.errors} erreurs. Une réussite mesure une exécution, pas une identité.`:'');
    show('#events',d.events);
    await window.renderObservatory(await api('/api/v2/admin/observatory',undefined,true),api);
  }catch(e){$('#admin-content').hidden=true;show('#admin-status',e.message);}
}
$('#operator').addEventListener('submit',e=>{e.preventDefault();operatorKey=$('#operator-key').value;$('#operator-key').value='';dashboard();});$('#refresh').addEventListener('click',dashboard);
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',async()=>{try{await api('/api/v2/admin/mode',{mode:b.dataset.mode},true);await dashboard();}catch(e){show('#admin-status',e.message);}}));
if(page==='registry'){
  if(params.has('q'))$('#query').value=params.get('q');
  search();
  if(/^[a-f0-9-]{36}$/.test(params.get('recipe')||''))read(params.get('recipe'));
}
