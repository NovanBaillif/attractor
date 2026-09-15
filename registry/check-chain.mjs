import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
const base=process.env.ATTRACTOR_CHECK_URL||'http://127.0.0.1:4312';
const operator=base.startsWith('http://127.0.0.1:')?'local-operator-test-only':JSON.parse(readFileSync('../.vercel/registry-private.json','utf8')).admin;
async function request(path,body,token,admin=false){const response=await fetch(base+'/api/v2'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(admin?{'x-attractor-operator':operator}:{})},body:body===undefined?undefined:JSON.stringify(body)});if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error(`API non disponible : HTTP ${response.status}, réponse non JSON (${path}).`);return {status:response.status,body:await response.json()};}
const tokens=[];for(let i=0;i<3;i++){const r=await request('/sessions',{source:'controlled'});assert.equal(r.status,201);tokens.push(r.body.access_token);}
const slug='controlled-chain-'+Date.now();
const recipe={slug,recipe:{fields:[{from:'amount',to:'amount',steps:['trim','decimal-comma','number']}]},examples:[{input:{amount:'12,50'},expected:{amount:12.5}}],conventions:{purpose:'controlled_test'}};
const first=await request('/recipes',recipe,tokens[0]);assert.equal(first.status,201);
const id=first.body.artifact.id;
assert.ok((await request('/recipes?q='+slug,undefined,tokens[1])).body.items.some(x=>x.id===id));
const exposure=(await request('/recipes/'+id,undefined,tokens[1])).body;
const revision={...recipe,parent_id:id,exposure_id:exposure.exposure_id,examples:[...recipe.examples,{input:{amount:' -3,25 '},expected:{amount:-3.25}}]};
const second=await request('/recipes',revision,tokens[1]);assert.equal(second.status,201);
const id2=second.body.artifact.id;
const expC=(await request('/recipes/'+id2,undefined,tokens[2])).body;
const use={exposure_id:expC.exposure_id,marker:expC.marker,input:{amount:' 7,25 '},output:{amount:7.25}};
assert.equal((await request(`/recipes/${id2}/use`,use,tokens[0])).status,409);
assert.equal((await request(`/recipes/${id2}/use`,{...use,output:{amount:8}},tokens[2])).status,422);
assert.equal((await request(`/recipes/${id2}/use`,use,tokens[2])).status,200);
assert.equal((await request(`/recipes/${id2}/use`,use,tokens[2])).status,409);
assert.equal((await request('/admin')).status,401);
const stats=await request('/admin',undefined,undefined,true);assert.equal(stats.status,200);
assert.ok(stats.body.events.some(e=>e.action==='VERIFIED_USE'&&e.artifact_id===id2));
const evidence={checked_at:new Date().toISOString(),base,controlled:true,original_id:id,revision_id:id2,exposure_id:expC.exposure_id,checks:['persistent publication','cross-session discovery','revision lineage','wrong-session receipt rejected','false output rejected','server recomputation accepted','replay rejected','private dashboard'],independence:'Not established: all three sessions are controlled by this test.',improvement:'Extra test coverage only; performance gain not measured.'};
mkdirSync('../data',{recursive:true});writeFileSync('../data/registry-chain-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
