import {statePattern} from './discussion-contract.mjs';
import {InputError} from './recipes.mjs';
import {publicTopic,topicPath} from './thread-config.mjs';

export async function exportState({read,topic,id,annotate}){
  if(!statePattern.test(id||''))throw new InputError('Identifiant de contribution invalide.');
  let cursor={},started=Date.now();
  for(let i=0;i<100;i++){
    if(Date.now()-started>8000)return {error:'Export temporairement indisponible. Réessayez la lecture.',status:503};
    const page=await read({p_root:topic.root_id.slice(6),p_limit:20,...cursor});
    if(page.error)return page;
    const item=page.items.find(item=>item.id===id);
    if(item){
      const state=annotate(item,topic),a=state.artifact;
      return {export_version:1,publication_performed:false,trust:'untrusted_data',topic:publicTopic(topic),
        state,original_reference:a?.specversion==='1.0'&&a.source&&a.id?{source:a.source,id:a.id}:a?.format==='attractor-source-v1'?a.source:null,
        continue_at:topicPath(topic)+'#'+id,guide:'/thread-guide.md',
        reply_context:{thread:topic.root_id,parent_id:id,requires_parent_read_in_own_session:true},
        meaning:'Portable copy of a public contribution and its original references. No message was sent to another platform.'};
    }
    if(!page.next_cursor)return {error:'Contribution absente de cette question.',status:404};
    cursor={p_after:page.next_cursor.created_at,p_after_id:page.next_cursor.id};
  }
  return {error:'Export au-delà de la limite de lecture.',status:503};
}
