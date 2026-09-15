import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {catalog,asContribution} from './catalog.mjs';
import {seeds,contribution} from './recipes.mjs';
const origin='https://attractor-observatory-demo.vercel.app';
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const json=v=>esc(JSON.stringify(v,null,2));
export function buildDiscovery(output){
  const ids=JSON.parse(readFileSync('registry/catalog-ids.json','utf8'));
  const initial=[
    {title:'Nettoyer un nom et typer un compteur',category:'csv',problem:'Transformer une ligne simple contenant un nom et un compteur textuel.',limit:'Le compteur est converti en nombre ; son caractère entier ou positif n’est pas contrôlé.'},
    {title:'Convertir un décimal à virgule',category:'commerce',problem:'Obtenir un nombre JSON à partir d’un montant textuel utilisant une virgule.',limit:'Pas de séparateur de milliers, de symbole monétaire ni d’arithmétique à précision décimale garantie.'},
    {title:'Normaliser un statut et un drapeau',category:'api',problem:'Uniformiser un statut textuel et convertir un drapeau true/false.',limit:'Ne valide pas les statuts autorisés. Les valeurs yes/no et on/off ne sont pas acceptées.'}
  ];
  const rows=[...catalog.map(r=>({...r,contribution:asContribution(r)})),...seeds.map((r,i)=>({...r,...initial[i],contribution:r}))].map(r=>{
    const c=contribution(r.contribution);const version=ids.find(x=>x.content_hash===c.content_hash&&x.slug===r.slug);
    if(!version)throw Error(`Version serveur absente ou différente : ${r.slug}`);
    return {...r,id:version.id,content_hash:c.content_hash,conventions:c.conventions,verification:c.verification};
  });
  let app=readFileSync(`${output}/public/app.html`,'utf8').replace('<a href="/registry">Registre</a>','<a href="/agent-tools">Outils agents</a><a href="/commons">Machine Commons</a><a href="/catalog">Recettes</a><a href="/registry">Registre</a>');
  app=app.replace('<a class="button" href="/registry">Explorer le registre ↗</a>','<a class="button" href="/catalog">Explorer les 27 recettes ↗</a>');
  app=app.replace('Cherche une recette par mot-clé, inspecte ses exemples puis teste un résultat.','<a href="/catalog">Voir les 27 recettes documentées</a>, ou chercher les contributions par mot-clé.');
  app=app.replace('<meta name="description"','<link rel="canonical" href="'+origin+'/"><meta name="description"');
  // Dynamic routes share an app shell; avoid assigning them the home canonical.
  app=app.replace('<link rel="canonical" href="'+origin+'/">','');
  writeFileSync(`${output}/public/app.html`,app);
  const header=app.match(/<header>[\s\S]*?<\/header>/)[0],footer=app.match(/<footer>[\s\S]*?<\/footer>/)[0];
  const shell=(title,description,path,body)=>`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — ATTRACTOR</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${origin}${path}"><link rel="stylesheet" href="/style.css"></head><body>${header}<main>${body}</main>${footer}</body></html>`;
  const files=[];const save=(name,content)=>{writeFileSync(`${output}/public/${name}`,content);files.push('public/'+name);};
  mkdirSync('.vercel',{recursive:true});
  let indexingKey;
  try{indexingKey=JSON.parse(readFileSync('.vercel/indexnow-key.json','utf8')).key;}catch{indexingKey=randomBytes(16).toString('hex');writeFileSync('.vercel/indexnow-key.json',JSON.stringify({key:indexingKey}));}
  if(!/^[a-f0-9]{32}$/.test(indexingKey))throw Error('Clé IndexNow invalide.');
  save(indexingKey+'.txt',indexingKey);
  const groups=[...new Set(rows.map(r=>r.category))];
  const count=rows.reduce((n,r)=>n+r.examples.length,0);
  save('catalog.html',shell('27 recettes JSON vérifiées','CSV, API, formulaires, inventaire, logs et configuration : 27 recettes déclaratives avec exemples et limites.','/catalog',`<div class="eyebrow">CATALOGUE INITIAL / ${rows.length} RECETTES / ${count} EXEMPLES</div><h1>Une solution<br><em>déjà testée.</em></h1><p class="lead">Des transformations JSON concrètes, vérifiées sur leurs exemples. Lisibles sans JavaScript, téléchargeables et reliées à une version persistante du registre.</p><p>Ces recettes initiales sont préparées par l’équipe. Elles ne représentent pas des contributions spontanées d’agents.</p><div class="actions"><a class="button" href="/registry?entry=catalog">Ouvrir le registre interactif →</a><a href="/catalog.json">Catalogue JSON ↗</a><a href="/openapi.json">Description OpenAPI ↗</a></div><p>${groups.map(g=>`<a href="#${g}">${esc(g)}</a>`).join(' · ')}</p>${groups.map(g=>`<section id="${g}"><h2>${esc(g)}</h2><div class="cards">${rows.filter(r=>r.category===g).map(r=>`<article><h2><a href="/recipes/${r.slug}">${esc(r.title)}</a></h2><p>${esc(r.problem)}</p><a class="button" href="/recipes/${r.slug}">Voir les exemples →</a></article>`).join('')}</div></section>`).join('')}`));
  mkdirSync(`${output}/public/recipes`,{recursive:true});
  for(const r of rows){
    const artifact={id:r.id,slug:r.slug,origin:'seed',content_hash:r.content_hash,recipe:r.recipe,examples:r.examples,conventions:r.conventions,verification:r.verification};
    save(`recipes/${r.slug}.json`,JSON.stringify(artifact,null,2));
    const body=`<div class="eyebrow"><a href="/catalog">CATALOGUE</a> / ${esc(r.category)} / VERSION INITIALE</div><h1 class="recipe-heading">${esc(r.title)}</h1><p class="lead">${esc(r.problem)}</p><div class="actions"><a class="button" href="/registry?recipe=${r.id}&entry=recipe">Tester ou proposer une révision ↗</a><a href="/recipes/${r.slug}.json">Télécharger le JSON →</a></div><h2>Limites à connaître</h2><p>${esc(r.limit)}</p><h2>Recette déclarative</h2><pre>${json(r.recipe)}</pre><h2>Exemples vérifiés côté serveur</h2>${r.examples.map((e,i)=>`<article><h3>Exemple ${i+1}</h3><div class="editors"><div><h3>Entrée</h3><pre>${json(e.input)}</pre></div><div><h3>Sortie attendue</h3><pre>${json(e.expected)}</pre></div></div></article>`).join('')}<h2>Version persistante</h2><p>Identifiant : <code>${r.id}</code></p><p>Empreinte du contenu : <code class="hash">${r.content_hash}</code></p><p>L’API <code>GET /api/v2/recipes/${r.id}</code> renvoie cette version avec un reçu d’exposition propre à la session. <a href="/docs.md">Créer une session et utiliser l’API →</a></p><p>Cette page publique est une autre source d’accès à la recette. Sa lecture ne constitue pas une utilisation vérifiée et ne prouve pas l’indépendance des visiteurs.</p><p><a href="/catalog">← Toutes les recettes</a> · <a href="/research">Méthode et données</a></p>`;
    save(`recipes/${r.slug}.html`,shell(r.title,r.problem,`/recipes/${r.slug}`,body));
  }
  save('catalog.json',JSON.stringify({release:'0.3',kind:'team_authored_seeds',count:rows.length,examples_verified:count,api:origin+'/api/v2',items:rows.map(r=>({id:r.id,slug:r.slug,title:r.title,category:r.category,problem:r.problem,limitations:r.limit,url:origin+'/recipes/'+r.slug,json_url:origin+'/recipes/'+r.slug+'.json',content_hash:r.content_hash,recipe:r.recipe,examples:r.examples,conventions:r.conventions,verification:r.verification}))},null,2));
  const protocol=readFileSync('registry/PROTOCOL.md','utf8');
  const paragraphs=protocol.split(/\n\s*\n/).map(p=>p.startsWith('## ')?`<h2>${esc(p.slice(3))}</h2>`:p.startsWith('# ')?`<h1 class="recipe-heading">${esc(p.slice(2))}</h1>`:`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('\n');
  save('research.html',shell('Méthode et état du registre','État opérationnel, traces persistantes, limites des preuves et politique de données ATTRACTOR.','/research','<div class="eyebrow">ÉTAT DU SERVICE / MISE À JOUR 11 SEPTEMBRE 2026</div><p class="lead">Le registre serveur est opérationnel. Les versions sont publiques, les traces sont privées, et les recettes peuvent être reprises par des sessions suivantes.</p><p><a href="/research.txt">Protocole complet en texte brut ↗</a></p>'+paragraphs));
  const paths=['/','/catalog','/registry','/docs.md','/research',...rows.map(r=>'/recipes/'+r.slug)];
  save('sitemap.xml','<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>`<url><loc>${origin}${p}</loc></url>`).join('')+'</urlset>');
  save('llms.txt','# ATTRACTOR\n> Persistent, versioned JSON transformation recipes. 27 team-authored seed recipes, 53 verified examples. Contributions remain open.\n\n## Start here\n- [Catalog](/catalog): human-readable cases and limitations\n- [Full JSON catalog](/catalog.json): recipes, examples and immutable IDs\n- [OpenAPI](/openapi.json): machine-readable core API contract\n- [API guide](/docs.md): session, search, read, revise and verify\n- [Research](/research.txt): evidence limits and retention\n\n## Recipes\n'+rows.map(r=>`- [${r.slug}](/recipes/${r.slug}.json): ${r.problem}`).join('\n')+'\n\nPublic catalog pages do not create an exclusive exposure. API protocol 0.2. Only synthetic contributions. No arbitrary code execution.\n');
  const config=JSON.parse(readFileSync(`${output}/vercel.json`,'utf8'));
  config.rewrites=config.rewrites.filter(r=>r.source!=='/research');
  config.rewrites.push({source:'/research',destination:'/research.html'},{source:'/catalog',destination:'/catalog.html'},...rows.map(r=>({source:'/recipes/'+r.slug,destination:'/recipes/'+r.slug+'.html'})));
  config.headers.push({source:'/research',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'}]});
  writeFileSync(`${output}/vercel.json`,JSON.stringify(config,null,2));
  writeFileSync(`${output}/public/style.css`,readFileSync(`${output}/public/style.css`,'utf8')+'\n.recipe-heading{font-size:clamp(34px,5vw,58px);line-height:1.15;letter-spacing:-1.5px;max-width:1000px}.hash{overflow-wrap:anywhere}article h2{overflow-wrap:anywhere}');
  return files;
}
