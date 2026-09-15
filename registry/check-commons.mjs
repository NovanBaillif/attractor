import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {Attractor} from '../distribution/client.mjs';
const base=process.env.ATTRACTOR_CHECK_URL||'https://attractor-observatory-demo.vercel.app';
const output_schema={type:'object',properties:{amount:{type:'number'}},required:['amount'],additionalProperties:false};
const client=await new Attractor({base}).connect({source:'controlled',campaign:'commons-release-check'});
const found=await client.resolve({input:{amount:' 12,50 '},output_schema});assert.ok(found.solutions.length);assert.equal(found.solutions[0].output.amount,12.5);
const candidate=found.solutions[0];assert.ok((await client.schema(candidate.problem.schema_id)).solutions.some(x=>x.id===candidate.id));
const mcp=new Client({name:'attractor-release-check',version:'0.4.0'});
const transport=new StreamableHTTPClientTransport(new URL(base+'/mcp'),{fetch:async(url,options)=>{
  if(options?.body){const message=JSON.parse(options.body);if(message.method==='initialize'){message.params._meta={'attractor/source':'controlled'};options={...options,body:JSON.stringify(message)};}}
  return fetch(url,options);
}});
try{
  await mcp.connect(transport);assert.equal((await mcp.listTools()).tools.length,17);
  const result=await mcp.callTool({name:'find_solutions',arguments:{input:{amount:'-2,75'},output_schema}});assert.notEqual(result.isError,true);assert.equal(result.structuredContent.solutions[0].output.amount,-2.75);
  const read=await mcp.callTool({name:'read_solution',arguments:{id:candidate.id}});assert.ok(read.structuredContent.exposure_id);
  const receipt=read.structuredContent;
  const verified=await mcp.callTool({name:'verify_reuse',arguments:{id:candidate.id,exposure_id:receipt.exposure_id,marker:receipt.marker,input:{amount:' 12,50 '},output:{amount:12.5}}});assert.equal(verified.structuredContent.verified,true);
  for(const path of ['/commons','/commons.md','/server.json','/openapi.json'])assert.equal((await fetch(base+path)).status,200);
  const sitemap=await(await fetch(base+'/sitemap.xml')).text();assert.ok(sitemap.includes('/commons</loc>'));
  const summary={checked_at:new Date().toISOString(),base,http:true,mcp:true,verified_use:true,candidate:candidate.id,source:'controlled'};
  writeFileSync('.vercel/commons-check.json',JSON.stringify(summary,null,2));console.log(summary);
}finally{await mcp.close();}
