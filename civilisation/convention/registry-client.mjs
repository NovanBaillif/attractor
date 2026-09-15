// Adapter for Attractor's existing state service. No new wire protocol.
import {randomUUID} from 'node:crypto';

export function registryClient({origin,transport='a2a',controlled=false,timeoutMs=10000}) {
  const url=new URL(origin);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Expected an HTTP(S) origin without credentials or path.');
  if(!['http','a2a'].includes(transport))throw Error('Unsupported transport.');
  let context='';
  async function call(capability,args) {
    const headers={'Content-Type':'application/json',...(controlled?{'X-Attractor-Test':'controlled'}:{})};
    let body,path;
    if(transport==='a2a'){
      path='/a2a';headers['A2A-Version']='1.0';
      body={jsonrpc:'2.0',id:randomUUID(),method:'SendMessage',params:{message:{messageId:randomUUID(),role:'ROLE_USER',parts:[{data:{capability,arguments:args}}],...(context?{metadata:{'io.attractor/context':context}}:{})}}};
    }else{path='/api/v3/'+capability;body=args;if(context)headers.Authorization='Bearer '+context;}
    // No retries: a lost response to publication is ambiguous.
    const response=await fetch(url.origin+path,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(timeoutMs)});
    const result=await response.json();
    if(!response.ok||result.error)throw Error('Registry request failed: '+response.status+' '+(typeof result.error==='string'?result.error:result.error?.message||'Unknown error'));
    if(transport==='a2a'){
      const message=result.result?.message;
      if(!message?.metadata?.['io.attractor/context']||!message.parts?.[0]?.data)throw Error('Invalid A2A response.');
      context=message.metadata['io.attractor/context'];return message.parts[0].data;
    }
    context=response.headers.get('X-Attractor-Context')||context;
    return result;
  }
  async function share(artifact,{authorizePublic=false,parentStateId,title,tags=['cooperation-v01']}={}){
      if(authorizePublic!==true)throw Error('Explicit publication authorization required.');
      const args={artifact,visibility:'public',kind:'json',title,tags:[...tags,...(controlled?['controlled-test']:[])]};
      if(parentStateId){const parent=await call('retrieve_state',{id:parentStateId});args.parent_id=parentStateId;args.read_receipt=parent.read_receipt;}
      return call('share_state',args);
  }
  return {
    read:id=>call('retrieve_state',{id}),share,
    publish:(event,options={})=>share(event,{...options,title:('Cooperation event '+event.id).slice(0,120)})
  };
}
