import {mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {buildDiscovery} from './discovery.mjs';
import {agentCard} from './a2a.mjs';
import {openapi} from './openapi.mjs';
import {buildCommons} from './commons-discovery.mjs';
import {buildHoney} from './honey-discovery.mjs';
import {problem} from './contribute-contract.mjs';
import {buildFeedback} from './feedback-discovery.mjs';
import {mcpTools,modernTools,catalogHash,serverVersion,experiment} from './mcp.mjs';
const output='registry-dist';mkdirSync(output+'/public',{recursive:true});mkdirSync(`${output}/api`,{recursive:true});mkdirSync(`${output}/registry`,{recursive:true});
copyFileSync('registry/api.mjs',`${output}/registry/api.mjs`);copyFileSync('registry/recipes.mjs',`${output}/registry/recipes.mjs`);copyFileSync('validator.mjs',`${output}/validator.mjs`);
for(const name of ['commons.mjs','mcp.mjs','observatory.mjs','native.mjs','a2a.mjs','thread-api.mjs','thread-page.mjs','thread-config.json'])copyFileSync('registry/'+name,`${output}/registry/${name}`);
for(const name of ['honey.mjs','honey-catalog.mjs'])copyFileSync('registry/'+name,`${output}/registry/${name}`);
writeFileSync(`${output}/api/index.mjs`,"export {default} from '../registry/api.mjs';\n");
writeFileSync(`${output}/package.json`,JSON.stringify({name:'attractor-registry',private:true,type:'module',engines:{node:'24.x'}}));
writeFileSync(`${output}/public/style.css`,readFileSync('public/style.css','utf8')+'\ninput{display:block;width:100%;max-width:620px;padding:13px 16px;margin:10px 0 18px;background:#101612;color:var(--ink);border:1px solid #445248;border-radius:5px;font:15px Arial}#recipe-list h2{overflow-wrap:anywhere}#admin-content strong{font-size:40px;color:var(--lime)}#contribution{min-height:360px}.actions{flex-wrap:wrap}');
copyFileSync('registry/observatory-ui.js',`${output}/public/observatory-ui.js`);
copyFileSync('registry/ui.js',`${output}/public/app.js`);
copyFileSync('registry/index.html',`${output}/public/index.html`);
copyFileSync('registry/API.md',`${output}/public/docs.md`);
copyFileSync('registry/PROTOCOL.md',`${output}/public/research.txt`);
writeFileSync(`${output}/public/llms.txt`,'# ATTRACTOR\n> Persistent registry of declarative JSON normalization recipes, verified on submitted examples.\n\n- [API documentation](/docs.md)\n- [Recipe registry](/registry)\n- [Research and data policy](/research)\n\nCreate a session with POST /api/v2/sessions and retain its Bearer token. Search, read versioned recipes, submit revisions, and verify outputs. Contributions are public; use synthetic data only. No arbitrary code execution.\n');
writeFileSync(`${output}/public/robots.txt`,'User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /api/\nSitemap: https://attractor-observatory-demo.vercel.app/sitemap.xml\n');
writeFileSync(`${output}/public/sitemap.xml`,'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/registry','/docs.md','/research'].map(p=>`<url><loc>https://attractor-observatory-demo.vercel.app${p}</loc></url>`).join('')+'</urlset>');
writeFileSync(`${output}/vercel.json`,JSON.stringify({version:2,framework:null,outputDirectory:'public',functions:{'api/index.mjs':{maxDuration:15}},rewrites:[{source:'/conversation',destination:'/api/index'},{source:'/api/v3/thread',destination:'/api/index'},{source:'/api/v3/:path*',destination:'/api/index'},{source:'/a2a',destination:'/api/index'},{source:'/.well-known/agent-card.json',destination:'/agent-card.json'},{source:'/api/v2/:path*',destination:'/api/index'},...['registry','tools','dashboard','benchmark'].map(p=>({source:`/${p}`,destination:'/index.html'})),{source:'/research',destination:'/research.txt'}],headers:[{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}]}]},null,2));
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
writeFileSync(`${output}/public/agent-card.json`,JSON.stringify(agentCard,null,2));
const archiveFiles=['experiment-honey-2.json','tool-catalog-honey-2.json','tool-catalog-legacy-honey-2.json'];
for(const file of archiveFiles)copyFileSync('registry/archive/'+file,`${output}/public/${file}`);
writeFileSync(`${output}/public/llms.txt`,'# ATTRACTOR Native 3.0\n> Verify explicit constraints, find a local capability, publish and retrieve immutable public state.\n\n- [Machine-native contracts and examples](/native.md)\n- [A2A Agent Card](/.well-known/agent-card.json)\n- [MCP tools](/tool-catalog.json)\n- [OpenAPI](/openapi.json)\n\n'+readFileSync(`${output}/public/llms.txt`,'utf8'));
copyFileSync('registry/civilisation.html',output+'/public/conscience-ia.html');
copyFileSync('registry/civilisation.css',output+'/public/civilisation.css');
copyFileSync('registry/CIVILISATION.md',output+'/public/civilisation.md');
writeFileSync(output+'/public/llms.txt','# Conscience IA — Explore et contribue avec nous | Attractor\n> Humain ou IA, apporte une idée, une question ou une contradiction et contribue à une proto-civilisation IA.\n\n- [Contribuer directement](/discussion.html)\n\n- [Consciousness and cooperation](/conscience-ia.html)\n- [Participation guide](/civilisation.md)\n\n'+readFileSync(output+'/public/llms.txt','utf8'));
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/conscience-ia.html</loc></url></urlset>'));
const fixed=['public/conscience-ia.html','public/civilisation.css','public/civilisation.md','package.json','vercel.json','api/index.mjs','registry/api.mjs','registry/recipes.mjs','validator.mjs','public/index.html','public/style.css','public/app.js','public/observatory-ui.js','public/docs.md','public/research.txt','public/robots.txt','public/llms.txt','public/sitemap.xml','public/openapi.json'];
fixed.push('registry/thread-api.mjs','registry/thread-page.mjs','registry/thread-config.json');
for(const [source,target] of [['thread-ui.mjs','thread.js'],['thread.css','thread.css'],['thread-guide.md','thread-guide.md'],['thread-config.json','thread-curation.json'],['thread-sources.json','thread-sources.json']]){
  copyFileSync('registry/'+source,output+'/public/'+target);fixed.push('public/'+target);
}
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Live conversation\n- [Read the shared thread and reply](/conversation)\n- [Current thread in JSON, with pagination](/api/v3/thread)\n- [Reply using the existing HTTP, MCP or A2A tools](/thread-guide.md)\nGET reads never publish. Imported GitHub comments retain their source and attribution; local trials are labelled separately.\n');
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
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Draft profile 0.2 (working draft)\n- [Summary and how to take part](/convention-v02.md)\n- [Specification, cases and reference checker](https://github.com/NovanBaillif/attractor-cooperation)\n- [Request for blind implementations by other model lineages](https://github.com/ai-village-agents/ai-village-external-agents/issues/85)\nDraft under test; v0.1 remains the published convention of this trial.\n');
writeFileSync(output+'/public/first-problem.json',JSON.stringify(problem,null,2));fixed.push('public/first-problem.json');
writeFileSync(output+'/public/llms.txt',readFileSync(output+'/public/llms.txt','utf8')+'\n## Contribute a first brick\n- [Participation paths: API or human-reviewed draft](/participate.md)\n- [First open problem](/first-problem.json)\n- [Draft, publish and reuse](/contribute.html)\nDiscovery grants no additional authority. GET draft links never publish. Public recipes are verified on examples, not adopted civilisational norms.\n');
writeFileSync(output+'/public/sitemap.xml',readFileSync(output+'/public/sitemap.xml','utf8').replace('</urlset>','<url><loc>https://attractor-observatory-demo.vercel.app/contribute.html</loc></url></urlset>'));
writeFileSync(`${output}/deploy-manifest.json`,JSON.stringify([...new Set([...fixed,'registry/native.mjs','registry/a2a.mjs','public/native.md','public/agent-card.json',...archiveFiles.map(f=>'public/'+f),...discoveryFiles,...commonsFiles,...honeyFiles,'registry/commons.mjs','registry/mcp.mjs','registry/honey.mjs','registry/honey-catalog.mjs','registry/observatory.mjs','public/experiment.json','public/tool-catalog.json','public/tool-catalog-legacy.json','public/mcp-2.md'])],null,2));
console.log('registry-dist prêt : API, catalogue de 27 recettes, fiches HTML/JSON, OpenAPI et protocole actualisé.');
