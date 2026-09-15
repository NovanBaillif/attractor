import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {Attractor} from '../distribution/client.mjs';
import {honeyCatalog} from './honey-catalog.mjs';
import {runHoney} from './honey.mjs';
const base=process.env.ATTRACTOR_CHECK_URL||'https://attractor-observatory-demo.vercel.app';
const client=await new Attractor({base}).connect({source:'controlled',campaign:'honey-release-check'});
for(const t of honeyCatalog){
  const r=await client.request('/agent-tools/'+t.name,t.example);assert.equal(r.ok,true);assert.deepEqual(r.result,JSON.parse(JSON.stringify(runHoney(t.name,t.example))));
  const page=await fetch(base+'/agent-tools/'+t.slug);assert.equal(page.status,200);assert.ok((await page.text()).includes('honey-form'));
}
const response=await fetch(base+'/api/capabilities');assert.equal(response.status,200);assert.equal((await response.json()).tools.length,9);
const denied=await fetch(base+'/api/agent-tools/fingerprint_json',{method:'POST',headers:{'Content-Type':'application/json','x-attractor-test':'controlled'},body:'{"value":1}'});assert.equal(denied.status,200);
const alias=await fetch(base+'/api/agent-tools/fingerprint_json',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+client.token},body:'{"value":1}'});assert.equal(alias.status,200);
const bad=await fetch(base+'/api/v2/agent-tools/map_fields',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+client.token},body:'{"value":{"x":1},"mapping":{"__proto__.probe":"x"}}'});assert.equal(bad.status,400);
const mcp=new Client({name:'honey-release-check',version:'3.0.0'});
const transport=new StreamableHTTPClientTransport(new URL(base+'/mcp'),{fetch:async(url,options)=>{
  if(options?.body){const m=JSON.parse(options.body);if(m.method==='initialize'){m.params._meta={'attractor/source':'controlled'};options={...options,body:JSON.stringify(m)};}}return fetch(url,options);
}});
try{
  await mcp.connect(transport);assert.equal((await mcp.listTools()).tools.length,17);
  const r=await mcp.callTool({name:'extract_json',arguments:{text:'value: {"ok":true}'}});assert.notEqual(r.isError,true);assert.equal(r.structuredContent.result.value.ok,true);
}finally{await mcp.close();}
const sitemap=await(await fetch(base+'/sitemap.xml')).text();assert.equal([...sitemap.matchAll(/<loc>/g)].length,43);
const summary={checked_at:new Date().toISOString(),base,http_tools:9,mcp_tools:17,discovery_pages:10,sitemap_urls:43,source:'controlled',unsafe_mapping_rejected:true};writeFileSync('.vercel/honey-check.json',JSON.stringify(summary,null,2));console.log(summary);
