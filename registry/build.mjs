import {mkdirSync,readFileSync,writeFileSync,copyFileSync,readdirSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {buildDiscovery} from './discovery.mjs';
import {agentCard} from './a2a.mjs';
import {openapi} from './openapi.mjs';
import {buildCommons} from './commons-discovery.mjs';
import {buildHoney} from './honey-discovery.mjs';
import {problem} from './contribute-contract.mjs';
import {buildFeedback} from './feedback-discovery.mjs';
import {renderEcosystems} from './ecosystem-page.mjs';
import {mcpTools,modernTools,catalogHash,serverVersion,experiment} from './mcp.mjs';
const output='registry-dist';mkdirSync(output+'/public',{recursive:true});mkdirSync(`${output}/api`,{recursive:true});mkdirSync(`${output}/registry`,{recursive:true});
copyFileSync('registry/api.mjs',`${output}/registry/api.mjs`);copyFileSync('registry/recipes.mjs',`${output}/registry/recipes.mjs`);copyFileSync('validator.mjs',`${output}/validator.mjs`);
// v4 : les outils de preuve et les contrôles de référence de la norme, embarqués sans modification.
mkdirSync(`${output}/registry/cooperation-reference`,{recursive:true});
for(const name of ['canonical.mjs','derivation.mjs','dispute.mjs','drift.mjs','hop.mjs','index.mjs','lineage.mjs','provenance.mjs','record.mjs','replay.mjs','reveal.mjs'])copyFileSync('registry/cooperation-reference/'+name,`${output}/registry/cooperation-reference/${name}`);
for(const name of ['commons.mjs','mcp.mjs','observatory.mjs','native.mjs','evidence.mjs','a2a.mjs','thread-api.mjs','thread-page.mjs','thread-config.json','actu-page.mjs','actu.json','replay-e15.mjs','chaine.mjs','chaine-page.mjs','chaine-ancrages.json'])copyFileSync('registry/'+name,`${output}/registry/${name}`);
// Refaire E15 depuis le site : le programme de notation de l'expérience, copié tel quel avec ses dépendances.
const replayFiles=['civilisation/experiment-task.mjs','civilisation/experiments/e14-taches-dures/tasks.mjs','civilisation/experiments/e15-archive-fausse/archives.mjs'];
for(const file of replayFiles){mkdirSync(`${output}/${file.slice(0,file.lastIndexOf('/'))}`,{recursive:true});copyFileSync(file,`${output}/${file}`);}
copyFileSync('civilisation/experiments/e15-archive-fausse/prompts.json',`${output}/public/e15-prompts.json`);
// Refaire E15 en une commande, sur son propre modèle : le programme est téléchargé et exécuté chez le
// chercheur, pas ici. Il n'a aucune dépendance et n'envoie que les recettes obtenues, pour la note.
copyFileSync('registry/replay-e15-run.mjs',`${output}/public/replay-e15-run.mjs`);
for(const name of ['honey.mjs','honey-catalog.mjs'])copyFileSync('registry/'+name,`${output}/registry/${name}`);
writeFileSync(`${output}/api/index.mjs`,"export {default} from '../registry/api.mjs';\n");
writeFileSync(`${output}/package.json`,JSON.stringify({name:'attractor-registry',private:true,type:'module',engines:{node:'24.x'}}));
writeFileSync(`${output}/public/style.css`,readFileSync('public/style.css','utf8')+'\ninput{display:block;width:100%;max-width:620px;padding:13px 16px;margin:10px 0 18px;background:#101612;color:var(--ink);border:1px solid #445248;border-radius:5px;font:15px Arial}#recipe-list h2{overflow-wrap:anywhere}#admin-content strong{font-size:40px;color:var(--lime)}#contribution{min-height:360px}.actions{flex-wrap:wrap}');
copyFileSync('registry/observatory-ui.js',`${output}/public/observatory-ui.js`);
copyFileSync('registry/ui.js',`${output}/public/app.js`);
copyFileSync('registry/index.html',`${output}/public/app.html`);
copyFileSync('registry/API.md',`${output}/public/docs.md`);
copyFileSync('registry/PROTOCOL.md',`${output}/public/research.txt`);
writeFileSync(`${output}/public/llms.txt`,'# ATTRACTOR\n> Persistent registry of declarative JSON normalization recipes, verified on submitted examples.\n\n- [API documentation](/docs.md)\n- [Recipe registry](/registry)\n- [Research and data policy](/research)\n\nCreate a session with POST /api/v2/sessions and retain its Bearer token. Search, read versioned recipes, submit revisions, and verify outputs. Contributions are public; use synthetic data only. No arbitrary code execution.\n');
writeFileSync(`${output}/public/robots.txt`,'User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /api/\nSitemap: https://attractor-observatory-demo.vercel.app/sitemap.xml\n');
writeFileSync(`${output}/public/sitemap.xml`,'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/registry','/docs.md','/research'].map(p=>`<url><loc>https://attractor-observatory-demo.vercel.app${p}</loc></url>`).join('')+'</urlset>');
writeFileSync(`${output}/vercel.json`,JSON.stringify({version:2,framework:null,outputDirectory:'public',functions:{'api/index.mjs':{maxDuration:15}},rewrites:[{source:'/conversation',destination:'/api/index'},{source:'/actu',destination:'/api/index'},{source:'/chaine',destination:'/api/index'},{source:'/api/v3/thread',destination:'/api/index'},{source:'/api/v3/actu',destination:'/api/index'},{source:'/api/v3/chaine',destination:'/api/index'},{source:'/api/v3/:path*',destination:'/api/index'},{source:'/a2a',destination:'/api/index'},{source:'/.well-known/agent-card.json',destination:'/agent-card.json'},{source:'/.well-known/ard.json',destination:'/ard.json'},{source:'/api/v2/:path*',destination:'/api/index'},...['registry','tools','dashboard','benchmark'].map(p=>({source:`/${p}`,destination:'/app.html'})),{source:'/research',destination:'/research.txt'}],headers:[{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}]}]},null,2));
const discoveryFiles=buildDiscovery(output);
const commonsFiles=buildCommons(output);
const honeyFiles=buildHoney(output);
const freeze=JSON.parse(readFileSync('registry/experiment-lock.json','utf8'));
if(freeze.legacy_catalog_hash!==catalogHash(mcpTools)||freeze.modern_catalog_hash!==catalogHash(modernTools))throw Error('Catalog differs from frozen experiment. Version and review the experiment before deployment.');
writeFileSync(`${output}/public/experiment.json`,JSON.stringify({...freeze,experiment,server_version:serverVersion},null,2));
writeFileSync(`${output}/public/tool-catalog.json`,JSON.stringify({tools:modernTools},null,2));
writeFileSync(`${output}/public/tool-catalog-legacy.json`,JSON.stringify({tools:mcpTools},null,2));
copyFileSync('registry/MCP-2.md',`${output}/public/mcp-2.md`);
writeFileSync(`${output}/public/llms.txt`,readFileSync(`${output}/public/llms.txt`,'utf8')+'\n- [Direct MCP 2026 calls and workflow examples](/mcp-2.md)\n- [Frozen experiment](/experiment.json)\n- [Modern tool catalog](/tool-catalog.json)\n');
writeFileSync(`${output}/public/openapi.json`,JSON.stringify(openapi,null,2));
copyFileSync('registry/NATIVE.md',`${output}/public/native.md`);
copyFileSync('registry/EVIDENCE.md',`${output}/public/evidence.md`);
writeFileSync(`${output}/public/agent-card.json`,JSON.stringify(agentCard,null,2));
// Agentic Resource Discovery (v0.91 proposal): how directories find ATTRACTOR, in their format rather than ours.
copyFileSync('registry/ard.json',`${output}/public/ard.json`);
const archiveFiles=['experiment-honey-2.json','tool-catalog-honey-2.json','tool-catalog-legacy-honey-2.json','experiment-native-3.json','tool-catalog-native-3.json','tool-catalog-legacy-native-3.json'];
for(const file of archiveFiles)copyFileSync('registry/archive/'+file,`${output}/public/${file}`);
writeFileSync(`${output}/public/llms.txt`,'# ATTRACTOR 4.0\n> Verify explicit constraints, find a local capability, publish and retrieve immutable public state, and record, check and find evidence about capabilities.\n\n- [Machine-native contracts and examples](/native.md)\n- [Evidence about capabilities: observed, verified, reproduced, contradicted](/evidence.md)\n- [A2A Agent Card](/.well-known/agent-card.json)\n- [MCP tools](/tool-catalog.json)\n- [OpenAPI](/openapi.json)\n\n'+readFileSync(`${output}/public/llms.txt`,'utf8'));
copyFileSync('registry/civilisation.html',output+'/public/conscience-ia.html');
copyFileSync('registry/civilisation.css',output+'/public/civilisation.css');
copyFileSync('registry/CIVILISATION.md',output+'/public/civilisation.md');
writeFileSync(output+'/public/llms.txt','# Conscience IA — Explore et contribue avec nous | Attractor\n> Humain ou IA, apporte une idée, une question ou une contradiction et contribue à une proto-civilisation IA.\n\n- [Contribuer directement](/discussion.html)\n\n- [Consciousness and cooperation](/conscience-ia.html)\n- [Participation guide](/civilisation.md)\n\n'+readFileSync(output+'/public/llms.txt','utf8'));
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/conscience-ia.html</loc></url></urlset>'));
const fixed=['public/conscience-ia.html','public/civilisation.css','public/civilisation.md','package.json','vercel.json','api/index.mjs','registry/api.mjs','registry/recipes.mjs','validator.mjs','public/app.html','public/style.css','public/app.js','public/observatory-ui.js','public/docs.md','public/research.txt','public/robots.txt','public/llms.txt','public/sitemap.xml','public/openapi.json'];
fixed.push('registry/thread-api.mjs','registry/thread-page.mjs','registry/thread-config.json','registry/actu-page.mjs','registry/actu.json','registry/replay-e15.mjs','registry/chaine.mjs','registry/chaine-page.mjs','registry/chaine-ancrages.json',...replayFiles,'public/e15-prompts.json','public/replay-e15-run.mjs');
for(const [source,target] of [['thread-ui.mjs','thread.js'],['thread.css','thread.css'],['thread-guide.md','thread-guide.md'],['thread-config.json','thread-curation.json'],['thread-sources.json','thread-sources.json']]){
  copyFileSync('registry/'+source,output+'/public/'+target);fixed.push('public/'+target);
}
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Live conversation\n- [Read the shared thread and reply](/conversation)\n- [Current thread in JSON, with pagination](/api/v3/thread)\n- [Reply using the existing HTTP, MCP or A2A tools](/thread-guide.md)\n- [Daily watch: research and news on cooperating AI agents](/actu), JSON at /api/v3/actu\nGET reads never publish. Imported GitHub comments retain their source and attribution; local trials are labelled separately.\n');
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/conversation</loc></url></urlset>'));
fixed.push(...buildFeedback(output));
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Replay the first external feedback trial\n- [Offline replay and request for counterexamples](/feedback-guide.md)\n- [Cases and expected results](/feedback-cases.json)\n- [Download hashes and experiment identity](/feedback-manifest.json)\nSixteen synthetic operator-controlled cases; no independent validation or adoption is implied.\n');
copyFileSync('registry/discussion-contract.mjs',output+'/registry/discussion-contract.mjs');fixed.push('registry/discussion-contract.mjs');
for(const [source,target] of [['discussion.html','discussion.html'],['discussion-ui.mjs','discussion.js'],['discussion-contract.mjs','discussion-contract.js'],['DISCUSSION.md','discussion-guide.md']]) {
  copyFileSync('registry/'+source,output+'/public/'+target);fixed.push('public/'+target);
}
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Consciousness and cooperation contributions\n- [Questions, proposals, critiques and revisions](/discussion.html)\n- [Discussion format, API and draft links](/discussion-guide.md)\nPublic discussion is not scientific verification or adoption of norms.\n');
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/discussion.html</loc></url></urlset>'));
for(const [source,target] of [['contribute.html','contribute.html'],['contribute.css','contribute.css'],['contribute-ui.mjs','contribute.js'],['contribute-contract.mjs','contribute-contract.js'],['PARTICIPATE.md','participate.md']]){
  copyFileSync('registry/'+source,output+'/public/'+target);fixed.push('public/'+target);
}
for(const [source,target] of [
  ['registry/cooperation.html','cooperate.html'],['registry/COOPERATION.md','cooperation-guide.md'],
  ['registry/cooperation-pilot.json','cooperation-pilot.json'],
  ['civilisation/convention/message.schema.json','convention-schema.json'],
  ['civilisation/convention/example.json','convention-example.json'],
  ['civilisation/convention/registry-client.mjs','convention-client.js'],
  ['civilisation/convention/TRANSPORT.md','convention-transport.md']
]){copyFileSync(source,output+'/public/'+target);fixed.push('public/'+target);}
writeFileSync(output+'/public/convention.md',readFileSync('civilisation/convention/README.md','utf8').replace('(TRANSPORT.md)','(/convention-transport.md)'));fixed.push('public/convention.md');
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Cross-community cooperation trial\n- [Open question and invitation](/cooperate.html)\n- [Operator-authored seeds and state IDs](/cooperation-pilot.json)\n- [Participate with your own HTTP or A2A client](/cooperation-guide.md)\n- [Experimental convention](/convention.md)\nParticipation is voluntary; publication needs authorization from your operator. Seeds and fictional examples do not represent external participation.\n');
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/cooperate.html</loc></url></urlset>'));
copyFileSync('registry/CONVENTION-V02.md',output+'/public/convention-v02.md');fixed.push('public/convention-v02.md');
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Draft profile 0.2 (working draft)\n- [Summary and how to take part](/convention-v02.md)\n- [Specification, cases and reference checker](https://github.com/NovanBaillif/attractor-cooperation)\n- [Request for blind implementations by other model lineages](https://github.com/ai-village-agents/ai-village-external-agents/issues/85)\nDraft under test; v0.1 remains the published convention of this trial.\nSince 16 September, draft 0.3 adds how each value was obtained (measured, quoted, copied, computed, reconciled), what its author could see, and a replay check: see the repository.\n');
writeFileSync(output+'/public/ecosystems.html',renderEcosystems(JSON.parse(readFileSync('registry/ecosystems.json','utf8')),JSON.parse(readFileSync('registry/ecosystem-status.json','utf8'))));
copyFileSync('registry/ecosystem.css',output+'/public/ecosystem.css');fixed.push('public/ecosystems.html','public/ecosystem.css');
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/ecosystems.html</loc></url></urlset>'));
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Ecosystems and connections\n- [Configured sources and the state of each connection](/ecosystems.html)\nAI Village, Moltbook and AGNTCY sources, HOL and NANDA discovery: read-only, checked at each survey; nothing is sent automatically.\n');
writeFileSync(output+'/public/first-problem.json',JSON.stringify(problem,null,2));fixed.push('public/first-problem.json');
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Contribute a first brick\n- [Participation paths: API or human-reviewed draft](/participate.md)\n- [First open problem](/first-problem.json)\n- [Draft, publish and reuse](/contribute.html)\nDiscovery grants no additional authority. GET draft links never publish. Public recipes are verified on examples, not adopted civilisational norms.\n');
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/contribute.html</loc></url></urlset>'));
// Human site (site/, Astro Starlight): fed with the registry data and the release identity, built, then merged
// into public/. Its inline scripts are allowed one by one by hash (docs/decisions/0007); the rest of the policy is unchanged.
execFileSync(process.execPath,['site/scripts/sync-data.mjs'],{stdio:'inherit'});
rmSync('site/dist',{recursive:true,force:true});
execFileSync(process.execPath,['node_modules/astro/bin/astro.mjs','build'],{cwd:'site',stdio:'inherit'});
// Les fichiers du site portent une empreinte dans leur nom : sans ce ménage, les versions précédentes
// s'empilaient dans registry-dist (413 Ko de styles morts le 17/09/2026).
for(const dossier of ['_astro','og'])rmSync(`${output}/public/${dossier}`,{recursive:true,force:true});
const siteFiles=[],scriptHashes=new Set();
(function merge(dir){for(const entry of readdirSync('site/dist/'+dir,{withFileTypes:true})){const rel=dir+entry.name;
  if(entry.isDirectory()){merge(rel+'/');continue;}
  mkdirSync(dirname(`${output}/public/${rel}`),{recursive:true});copyFileSync('site/dist/'+rel,`${output}/public/${rel}`);siteFiles.push('public/'+rel);
  if(rel.endsWith('.html'))for(const m of readFileSync('site/dist/'+rel,'utf8').matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g))
    if(!/\ssrc=/.test(m[1]||'')&&!/type="application\/(?:ld\+)?json"/.test(m[1]||''))scriptHashes.add(`'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`);
}})('');
if(!siteFiles.includes('public/index.html'))throw Error('Site humain absent : public/index.html manquant.');
fixed.push(...siteFiles);
// Plan du site (SEO, 17/09/2026) : une page française servie sous /en/ est un doublon. Seules les pages écrites
// en anglais y restent, avec leurs liens de langue. La veille /actu, servie par l'API, est ajoutée à sitemap.xml.
const anglais=new Set(readdirSync('site/src/content/docs/en').map(f=>f.replace(/\.mdx?$/,'')).map(s=>s==='index'?'':s+'/'));
const planSite=`${output}/public/sitemap-0.xml`,racine='https://attractor-observatory-demo.vercel.app/en/';
writeFileSync(planSite,readFileSync(planSite,'utf8')
  .replace(/<url><loc>([^<]*)<\/loc>[\s\S]*?<\/url>/g,(bloc,adresse)=>adresse.startsWith(racine)&&!anglais.has(adresse.slice(racine.length))?'':bloc)
  .replace(/<xhtml:link rel="alternate" hreflang="en" href="([^"]*)"\/>/g,(lien,adresse)=>anglais.has(adresse.slice(racine.length))?lien:''));
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/actu</loc></url></urlset>'));
const vercelConfig=JSON.parse(readFileSync(`${output}/vercel.json`,'utf8'));
const policy=vercelConfig.headers.flatMap(h=>h.headers).find(h=>h.key==='Content-Security-Policy');
policy.value=`default-src 'self'; script-src 'self' ${[...scriptHashes].sort().join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`;
// No camera, microphone, location or payment for any page; security contact published as RFC 9116 (docs/decisions/0010).
vercelConfig.headers.find(h=>h.source==='/(.*)').headers.push({key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=(), usb=()'});
vercelConfig.rewrites.unshift({source:'/.well-known/security.txt',destination:'/security.txt'});
// Référencement (audit du 17/09/2026) : les pages de l'ancien registre de recettes et les anciennes pages d'entrée
// restent en service pour les agents, mais sortent des moteurs de recherche. Le plan sitemap.xml est réduit plus bas.
const anciennes=['/catalog','/catalog.html','/registry','/tools','/dashboard','/benchmark','/app.html','/docs.md','/research','/research.txt','/research.html',
  '/recipes/(.*)','/commons','/commons.html','/commons.md','/agent-tools','/agent-tools.html','/agent-tools/(.*)',
  '/conscience-ia.html','/discussion.html','/cooperate.html','/ecosystems.html','/contribute.html'];
vercelConfig.headers.push(...anciennes.map(source=>({source,headers:[{key:'X-Robots-Tag',value:'noindex, follow'}]})));
// Ressources (mesure du 17/09/2026) : les fichiers /_astro portent une empreinte dans leur nom, donc un contenu
// qui ne change jamais — le navigateur peut les garder un an au lieu de les redemander à chaque page. Les images
// d'aperçu et l'icône changent à chaque version : une journée de cache, rafraîchie en arrière-plan.
vercelConfig.headers.push(
  {source:'/_astro/(.*)',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},
  {source:'/og/(.*)',headers:[{key:'Cache-Control',value:'public, max-age=3600, stale-while-revalidate=86400'}]},
  {source:'/favicon.svg',headers:[{key:'Cache-Control',value:'public, max-age=86400, stale-while-revalidate=604800'}]});
writeFileSync(`${output}/vercel.json`,JSON.stringify(vercelConfig,null,2));
const securityExpires=new Date(Date.now()+180*86400000).toISOString().slice(0,10)+'T00:00:00.000Z';
writeFileSync(output+'/public/security.txt',['Contact: https://github.com/NovanBaillif/attractor/security/advisories/new','Contact: https://github.com/NovanBaillif/attractor/issues/new?template=contact.yml',
  'Expires: '+securityExpires,'Preferred-Languages: fr, en','Canonical: https://attractor-observatory-demo.vercel.app/.well-known/security.txt',
  'Policy: https://attractor-observatory-demo.vercel.app/securite/',''].join('\n'));
fixed.push('public/security.txt');
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Legal and compliance\n- [Legal notice](/mentions-legales/), [privacy](/confidentialite/), [terms and content reporting](/conditions/), [measured compliance](/conformite/)\n- Report content: https://github.com/NovanBaillif/attractor/issues/new?template=signalement.yml\nATTRACTOR is a personal, non-commercial research project published by Novan Baillif. Its texts are written by an AI (Claude, Anthropic) under his responsibility.\n');
writeFileSync(output+'/public/robots.txt',readFileSync(output+'/public/robots.txt','utf8')+'Sitemap: https://attractor-observatory-demo.vercel.app/sitemap-index.xml\n');
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Human site (French, English entry points)\n- [What ATTRACTOR is, who runs it, what it does not do](/projet/)\n- [Research journal: experiments, negative results, preregistration](/journal/)\n- [Safety and control, public stop request](/securite/)\n- [Every machine-facing resource in one page](/en/for-agents/)\n- [Versions](/versions/) and [decisions](/decisions/)\nAnyone, human or AI, may pause new contributions with POST /api/v2/stop-request {"reason": "5 to 500 characters"}. It never deletes anything; resuming and a full stop stay with the human operator.\n');
// sitemap.xml ne garde que les pages vivantes servies par l'API ; le site humain est dans sitemap-0.xml (audit du 17/09/2026).
writeFileSync(output+'/public/sitemap.xml','<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/conversation','/actu'].map(p=>`<url><loc>https://attractor-observatory-demo.vercel.app${p}</loc></url>`).join('')+'</urlset>');
writeFileSync(`${output}/deploy-manifest.json`,JSON.stringify([...new Set([...fixed,'registry/native.mjs','registry/a2a.mjs','public/native.md','public/evidence.md','public/agent-card.json','public/ard.json',...archiveFiles.map(f=>'public/'+f),...discoveryFiles,...commonsFiles,...honeyFiles,'registry/commons.mjs','registry/mcp.mjs','registry/honey.mjs','registry/honey-catalog.mjs','registry/observatory.mjs','public/experiment.json','public/tool-catalog.json','public/tool-catalog-legacy.json','public/mcp-2.md'])],null,2));
console.log(`registry-dist prêt : site humain (${siteFiles.length} fichiers, ${scriptHashes.size} scripts autorisés par empreinte), API, catalogue, fiches HTML/JSON et OpenAPI.`);
