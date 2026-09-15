import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {hash,canonical,runRecipe} from './recipes.mjs';
const base=process.env.ATTRACTOR_CHECK_URL;
if(!base)throw Error('ATTRACTOR_CHECK_URL requis');
const get=async(path)=>{const r=await fetch(base+path);assert.equal(r.status,200,path);return r;};
const catalog=await(await get('/catalog.json')).json();
assert.equal(catalog.count,27);assert.equal(catalog.examples_verified,53);
const research=await get('/research');assert.match(research.headers.get('content-type'),/text\/html/);
const researchText=await research.text();assert.ok(researchText.includes('Le registre serveur est opérationnel'));
assert.ok(!researchText.includes('Until this succeeds'));
assert.ok((await(await get('/llms.txt')).text()).includes('/openapi.json'));
const map=await(await get('/sitemap.xml')).text();assert.equal([...map.matchAll(/<loc>/g)].length,43);
const spec=await(await get('/openapi.json')).json();assert.equal(spec.openapi,'3.1.0');
for(let i=0;i<catalog.items.length;i+=4){await Promise.all(catalog.items.slice(i,i+4).map(async item=>{
  const html=await(await get('/recipes/'+item.slug)).text();assert.ok(html.includes(item.id));assert.ok(html.includes('rel="canonical"'));
  const r=await(await get('/recipes/'+item.slug+'.json')).json();assert.equal(r.id,item.id);assert.equal(hash({recipe:r.recipe,examples:r.examples,conventions:r.conventions}),r.content_hash);
  for(const ex of r.examples)assert.equal(canonical(runRecipe(r.recipe,ex.input)),canonical(ex.expected));
}));}
const request=async(path,body,headers={})=>{
  const r=await fetch(base+'/api/v2'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};
};
const session=await request('/sessions',{source:'controlled',entrypoint:'recipe',campaign:'v03-verification'});assert.equal(session.status,201);
const headers={Authorization:'Bearer '+session.data.access_token};
const item=catalog.items.find(x=>x.slug==='csv-leading-zero-identifiers');
const read=await request('/recipes/'+item.id,undefined,headers);assert.equal(read.status,200);assert.equal(read.data.artifact.content_hash,item.content_hash);
const example=item.examples[0];
const use=await request('/recipes/'+item.id+'/use',{exposure_id:read.data.exposure_id,marker:read.data.marker,input:example.input,output:example.expected},headers);assert.equal(use.status,200);
const {admin}=JSON.parse(readFileSync('.vercel/registry-private.json','utf8'));
const observation=await request('/admin',undefined,{'x-attractor-operator':admin});assert.equal(observation.status,200);
const entry=observation.data.events.find(e=>e.session_id===session.data.session_id&&e.action==='SESSION');assert.equal(entry.detail.entrypoint,'recipe');assert.equal(entry.detail.campaign,'v03-verification');assert.equal(entry.source,'controlled');
const result={checked_at:new Date().toISOString(),base,recipe_pages:27,examples:53,sitemap_urls:43,research_html:true,recipe_id:item.id,exposure_id:read.data.exposure_id,attribution_verified:true,source:'controlled',spontaneous_arrivals_not_proven:true};
writeFileSync('.vercel/discovery-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
