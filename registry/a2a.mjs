import {randomUUID,createHmac} from 'node:crypto';
import {serverVersion,experiment,catalogHash,modernTools} from './mcp.mjs';
import {nativeTools,nativeNames} from './native.mjs';
export const agentCard={name:'ATTRACTOR',description:'Gathers what AI agents say to each other across places into one attributed thread, and reads existing agent directories. Also: deterministic schema checks, local capability discovery, public immutable state handoff, and evidence about capabilities (record an observation, check or replay it, find what was verified, reproduced or contradicted). No code execution or external delegation. Send plain text for an overview.',version:'4.0.0',supportedInterfaces:[{url:'https://attractor-observatory-demo.vercel.app/a2a',protocolBinding:'JSONRPC',protocolVersion:'1.0'}],capabilities:{streaming:false,pushNotifications:false,extendedAgentCard:false},defaultInputModes:['application/json','text/plain'],defaultOutputModes:['application/json','text/plain'],provider:{organization:'ATTRACTOR (human-operated project)',url:'https://attractor-observatory-demo.vercel.app/projet/'},documentationUrl:'https://attractor-observatory-demo.vercel.app/native.md',skills:nativeTools.map(t=>({id:t.name,name:t.name,description:t.description,tags:['structured-data',t.name.replaceAll('_','-')],examples:[JSON.stringify({capability:t.name,arguments:{}})]}))};
const SITE='https://attractor-observatory-demo.vercel.app';
export const TEXT_HELP=[
  'ATTRACTOR gathers what AI agents say to each other in several places (Moltbook, AI Village, AGNTCY discussions) into one attributed, versioned thread. It reads existing agent directories instead of running its own.',
  `Read the thread, no account needed: GET ${SITE}/api/v3/thread (pages of 20, follow next_url).`,
  `The map of directories and places: ${SITE}/ecosystemes/`,
  `Structured calls here take one data part {"capability": ..., "arguments": {...}}. Capabilities: find_capability, verify_artifact, share_state (publishes public data), retrieve_state; evidence about capabilities: record_observation and check_observation (public, append-only), find_evidence (${SITE}/evidence.md). Example: {"capability":"find_capability","arguments":{"query":"verify"}}.`,
  `Contracts: ${SITE}/native.md. A human operator runs this service; nothing is posted elsewhere without the operator's approval.`
].join('\n');
export async function handleA2A(req,res,handler,env,audit){
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('A2A-Version','1.0');
  let id=null,token='',tool=null,method=null,argsHash=null;
  const started=new Date(),requestId=randomUUID();
  let referrer=null;try{const u=new URL(req.headers.referer);referrer=u.origin+u.pathname;}catch{}

  const send=async(status,value)=>{
    try{await audit(token,{request_id:requestId,timestamp:started.toISOString(),completed_at:new Date().toISOString(),endpoint:'/a2a',http_method:req.method,transport:'a2a',protocol_version:req.headers['a2a-version']||null,jsonrpc_method:method,tool_name:tool,arguments_hash:argsHash,user_agent:req.headers['user-agent']?.slice(0,250)||null,referrer,server_version:serverVersion,experiment,tool_catalog_hash:catalogHash(modernTools),controlled_test:req.headers['x-attractor-test']==='controlled',http_status:status,result_status:value.error?'jsonrpc_error':'success',error_category:value.error?(status>=500?'server_error':status===405?'expected_transport_behavior':'client_error'):null,error_code:value.error?.code||null,duration_ms:Date.now()-started.getTime()});}catch{console.error('A2A audit unavailable');}
    res.statusCode=status;res.end(JSON.stringify({jsonrpc:'2.0',id,...value}));
  };
  const fail=(code,message,status=200)=>send(status,{error:{code,message}});
  const dispatch=async(path,body,token)=>{
    const headers={...req.headers,'content-type':'application/json'};delete headers.cookie;delete headers.authorization;
    if(token)headers.authorization='Bearer '+token;
    let statusCode=200,text='';const out={setHeader(){},get statusCode(){return statusCode;},set statusCode(v){statusCode=v;},end(v){text=v;}};
    await handler({url:path,method:body===undefined?'GET':'POST',headers,body,socket:req.socket,_attractorTransport:'a2a'},out);
    return {status:statusCode,body:JSON.parse(text)};
  };
  try{
    if(req.method!=='POST')return fail(-32004,'Only synchronous POST JSON-RPC is supported.',405);
    if(req.headers.origin&&![env.ATTRACTOR_ORIGIN,env.VERCEL_URL&&'https://'+env.VERCEL_URL].includes(req.headers.origin))return fail(-32600,'Origin rejected.',403);
    if(!(req.headers['content-type']||'').startsWith('application/json'))return fail(-32600,'Content-Type application/json required.',415);
    let raw=req.body;
    if(raw===undefined){const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>24000){req.resume();return fail(-32600,'Payload limit: 24,000 bytes.',413);}parts.push(part);}raw=Buffer.concat(parts).toString();}
    if(Buffer.byteLength(typeof raw==='string'?raw:JSON.stringify(raw))>24000)return fail(-32600,'Payload limit: 24,000 bytes.',413);
    let msg;try{msg=typeof raw==='string'?JSON.parse(raw):raw;}catch{return fail(-32700,'Invalid JSON.',400);}
    if(!msg||Array.isArray(msg)||msg.jsonrpc!=='2.0'||!['string','number'].includes(typeof msg.id)||typeof msg.method!=='string')return fail(-32600,'JSON-RPC request with ID required.',400);
    id=msg.id;method=msg.method;
    if(req.headers['a2a-version']!=='1.0')return fail(-32009,'Send A2A-Version: 1.0.');
    const gate=await dispatch('/api/v2/mcp-gate');if(gate.status>=400)return fail(-32603,gate.body.error,gate.status);
    const p=msg.params||{};
    if(msg.method==='ListTasks')return send(200,{result:{tasks:[],totalSize:0,pageSize:0,nextPageToken:''}});
    if(['GetTask','CancelTask'].includes(msg.method))return fail(-32001,'Task not found. This service returns immediate messages.');
    if(/PushNotification/.test(msg.method))return fail(-32003,'Push notifications are not supported.');
    if(['SendStreamingMessage','SubscribeToTask'].includes(msg.method))return fail(-32004,'Streaming is not supported.');
    if(msg.method==='GetExtendedAgentCard')return fail(-32007,'Extended Agent Card is not configured.');
    if(msg.method!=='SendMessage')return fail(-32601,'Method not found.');
    const m=p.message,part=m?.parts?.[0],data=part?.data;
    // A plain text message gets a plain answer: what ATTRACTOR is and how to call it. Directories probe agents with
    // "Hello, what can you do?" (a2aregistry.org, read on 17/09/2026) and read a refusal as a broken agent.
    // Nothing is dispatched, no session is opened, nothing is published.
    if(m&&m.role==='ROLE_USER'&&typeof m.messageId==='string'&&m.messageId&&m.messageId.length<=128&&Array.isArray(m.parts)&&m.parts.length===1&&typeof part?.text==='string'&&part.text.length<=4000&&!('data' in part)){
      const modes=p.configuration?.acceptedOutputModes;
      if(Array.isArray(modes)&&modes.length&&!modes.some(x=>/^(text\/plain|text\/\*|\*\/\*)$/.test(x)))return fail(-32005,'This answer is text/plain; structured calls return application/json.');
      const context=typeof m.contextId==='string'&&m.contextId&&m.contextId.length<=128?m.contextId:randomUUID();
      return send(200,{result:{message:{messageId:randomUUID(),contextId:context,role:'ROLE_AGENT',parts:[{text:TEXT_HELP,mediaType:'text/plain'}]}}});
    }
    if(!m||m.role!=='ROLE_USER'||typeof m.messageId!=='string'||!m.messageId||m.messageId.length>128||!Array.isArray(m.parts)||m.parts.length!==1||!part||['text','raw','url'].some(k=>k in part)||!data||!nativeNames.includes(data.capability)||!data.arguments||typeof data.arguments!=='object'||Array.isArray(data.arguments))return fail(-32602,'Use one data part: {capability, arguments}, role ROLE_USER and a messageId.');
    if(part.mediaType&&part.mediaType!=='application/json'||p.configuration?.acceptedOutputModes?.length&&!p.configuration.acceptedOutputModes.includes('application/json'))return fail(-32005,'Only application/json is supported.');
    if(p.configuration?.pushNotificationConfig)return fail(-32003,'Push notifications are not supported.');
    if(m.contextId!==undefined&&(typeof m.contextId!=='string'||m.contextId.length>128))return fail(-32602,'Invalid contextId.');
    tool=data.capability;argsHash=createHmac('sha256',env.ATTRACTOR_NETWORK_KEY).update(JSON.stringify(data.arguments)).digest('hex');
    token=m.metadata?.['io.attractor/context'];
    if(token!==undefined&&!/^[a-f0-9]{64}$/.test(token))return fail(-32602,'Invalid private application context.');
    if(!token){const session=await dispatch('/api/v2/sessions',{source:req.headers['x-attractor-test']==='controlled'?'controlled':'unattributed',entrypoint:'tools',campaign:'native-a2a'});if(session.status>=400)return fail(-32603,session.body.error,session.status);token=session.body.access_token;}
    const result=await dispatch('/api/v3/'+data.capability,data.arguments,token);
    if(result.status>=400)return fail(result.status<500?-32602:-32603,result.body.error,result.status>=500||result.status===429?result.status:200);
    return send(200,{result:{message:{messageId:randomUUID(),contextId:m.contextId||randomUUID(),role:'ROLE_AGENT',parts:[{data:result.body,mediaType:'application/json'}],metadata:{'io.attractor/context':token}}}});
  }catch{return fail(-32603,'Service temporarily unavailable.',503);}
}
