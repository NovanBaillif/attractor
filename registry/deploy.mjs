// Allowlist-only deployment. Credentials stay in ignored .vercel/ files and Vercel encrypted env.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const config=JSON.parse(readFileSync('.vercel/demo-deployment.json','utf8'));
const auth=JSON.parse(readFileSync(`${process.env.APPDATA}/com.vercel.cli/Data/auth.json`,'utf8'));
async function vercel(path,method='GET',body){const r=await fetch('https://api.vercel.com'+path,{method,headers:{Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(`${r.status} ${data.error?.message || 'Vercel request failed'}`);return data;}
const command=process.argv[2];
if(command==='configure'){
  const db=JSON.parse(readFileSync('.vercel/registry-database.json','utf8'));
  if(!db.project_id||!db.url||!db.secret_key)throw Error('Configuration de la base dédiée incomplète.');
  if(db.project_id==='vdubcxgertlnvculrrzw')throw Error('Refus : projet métier Kreol factory.');
  const project=await vercel(`/v9/projects/${config.projectId}?teamId=${config.teamId}`);
  if(project.name!=='attractor-observatory-demo')throw Error('Projet inattendu.');
  let privateConfig;
  try{privateConfig=JSON.parse(readFileSync('.vercel/registry-private.json','utf8'));}catch{privateConfig={admin:randomBytes(32).toString('hex'),network:randomBytes(32).toString('hex')};writeFileSync('.vercel/registry-private.json',JSON.stringify(privateConfig,null,2));}
  const vars={ATTRACTOR_DB_URL:db.url,ATTRACTOR_DB_KEY:db.secret_key,ATTRACTOR_ADMIN_KEY:privateConfig.admin,ATTRACTOR_NETWORK_KEY:privateConfig.network,ATTRACTOR_ORIGIN:'https://attractor-observatory-demo.vercel.app'};
  for(const [key,value] of Object.entries(vars))await vercel(`/v10/projects/${config.projectId}/env?teamId=${config.teamId}&upsert=true`,'POST',{key,value,type:'encrypted',target:['production','preview']});
  console.log('Secrets configurés côté serveur. Clé opérateur : .vercel/registry-private.json (fichier local privé).');
}else if(command==='deploy'){
  const names=JSON.parse(readFileSync('registry-dist/deploy-manifest.json','utf8'));
  const serverFiles=['package.json','vercel.json','api/index.mjs','registry/api.mjs','registry/derniers.mjs','registry/recipes.mjs','registry/commons.mjs','registry/mcp.mjs','registry/honey.mjs','registry/honey-catalog.mjs','registry/observatory.mjs','registry/native.mjs','registry/evidence.mjs','registry/cooperation-reference/canonical.mjs','registry/cooperation-reference/derivation.mjs','registry/cooperation-reference/dispute.mjs','registry/cooperation-reference/drift.mjs','registry/cooperation-reference/hop.mjs','registry/cooperation-reference/index.mjs','registry/cooperation-reference/lineage.mjs','registry/cooperation-reference/provenance.mjs','registry/cooperation-reference/record.mjs','registry/cooperation-reference/replay.mjs','registry/cooperation-reference/reveal.mjs','registry/discussion-contract.mjs','registry/a2a.mjs','registry/thread-api.mjs','registry/thread-page.mjs','registry/thread-config.json','registry/actu-page.mjs','registry/actu.json','registry/replay-e15.mjs','registry/chaine.mjs','registry/chaine-page.mjs','registry/chaine-ancrages.json','civilisation/experiment-task.mjs','civilisation/experiments/e14-taches-dures/tasks.mjs','civilisation/experiments/e15-archive-fausse/archives.mjs','validator.mjs'];
  if(!Array.isArray(names)||names.some(n=>typeof n!=='string'||(!serverFiles.includes(n)&&!/^public\/(?:(?:recipes|agent-tools)\/)?[a-z0-9-]+\.(?:html|json|mjs|js|css|md|txt|xml|svg)$/.test(n)&&!/^public\/(?:[a-z0-9-]+\/){1,3}index\.html$/.test(n)&&!/^public\/_astro\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:css|js|svg|woff2?)$/.test(n)&&!/^public\/og\/(?:[a-z0-9-]+\/){0,2}[a-z0-9-]+\.png$/.test(n))))throw Error('Manifeste de publication invalide.');
  const files=names.map(file=>({file,data:readFileSync(`registry-dist/${file}`).toString('base64'),encoding:'base64'}));
  const result=await vercel(`/v13/deployments?teamId=${config.teamId}`,'POST',{name:'attractor-observatory-demo',project:config.projectId,target:process.env.ATTRACTOR_DEPLOY_PRODUCTION==='yes'?'production':undefined,files,projectSettings:{framework:null,buildCommand:null,installCommand:null,outputDirectory:'public',nodeVersion:'24.x'},meta:{purpose:'ATTRACTOR '+readFileSync('VERSION','utf8').trim()}});
  writeFileSync('.vercel/registry-deployment.json',JSON.stringify({id:result.id,url:result.url,projectId:config.projectId,teamId:config.teamId},null,2));console.log(JSON.stringify({id:result.id,url:result.url,state:result.readyState}));
}else if(command==='status'){
  const d=JSON.parse(readFileSync('.vercel/registry-deployment.json','utf8'));const r=await vercel(`/v13/deployments/${d.id}?teamId=${config.teamId}`);console.log(JSON.stringify({state:r.readyState,url:r.url,alias:r.alias,error:r.errorMessage}));
}else throw Error('Commandes : configure, deploy, status.');
