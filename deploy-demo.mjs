import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
const auth=JSON.parse(readFileSync(`${process.env.APPDATA}/com.vercel.cli/Data/auth.json`,'utf8'));
const base='https://api.vercel.com';
async function api(path,method='GET',body){
  const res=await fetch(base+path,{method,headers:{Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const data=await res.json();if(!res.ok)throw Error(`${res.status}: ${data.error?.code || ''} ${data.error?.message || 'Erreur Vercel'}`);return data;
}
const command=process.argv[2] || 'inspect';
if(command==='inspect'){
  const user=await api('/v2/user');const teams=await api('/v2/teams');
  console.log(JSON.stringify({username:user.user.username,teams:teams.teams.map(t=>({id:t.id,slug:t.slug}))}));
}else if(command==='deploy'){
  const team=process.env.ATTRACTOR_VERCEL_TEAM;
  if(!team)throw Error('ATTRACTOR_VERCEL_TEAM requis');
  const name='attractor-observatory-demo';
  const files=readdirSync('demo-dist').map(file=>({file,data:readFileSync(`demo-dist/${file}`).toString('base64'),encoding:'base64'}));
  const result=await api(`/v13/deployments?teamId=${encodeURIComponent(team)}`,'POST',{name,target:'production',files,projectSettings:{framework:null,buildCommand:null,installCommand:null,outputDirectory:'.'},meta:{purpose:'ATTRACTOR interactive browser demo'}});
  mkdirSync('.vercel',{recursive:true});
  writeFileSync('.vercel/demo-deployment.json',JSON.stringify({id:result.id,url:result.url,projectId:result.projectId,teamId:team},null,2));
  console.log(JSON.stringify({id:result.id,url:result.url,state:result.readyState,projectId:result.projectId}));
}else if(command==='status'){
  const d=JSON.parse(readFileSync('.vercel/demo-deployment.json','utf8'));
  const r=await api(`/v13/deployments/${d.id}?teamId=${d.teamId}`);
  console.log(JSON.stringify({state:r.readyState,url:r.url,alias:r.alias,error:r.errorMessage}));
}else if(command==='public'){
  const d=JSON.parse(readFileSync('.vercel/demo-deployment.json','utf8'));
  if(!d.projectId)throw Error('Projet absent');
  const project=await api(`/v9/projects/${d.projectId}?teamId=${d.teamId}`);
  if(project.name!=='attractor-observatory-demo')throw Error('Projet inattendu : refus de modification');
  await api(`/v9/projects/${d.projectId}?teamId=${d.teamId}`,'PATCH',{ssoProtection:null});
  console.log('Démonstration ATTRACTOR accessible sans compte Vercel.');
}
