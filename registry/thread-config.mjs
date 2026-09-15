import {statePattern} from './discussion-contract.mjs';
import {InputError} from './recipes.mjs';
export const topicPattern=/^[a-z0-9][a-z0-9-]{0,63}$/;
export function topics(settings){
  // Legacy injected configurations and existing import receipts remain readable.
  return settings.topics||[{id:'memory',title:'Conversation',description:'',origin_links:[],...settings}];
}
export function topicFor(settings,id){
  const name=id??settings.default_topic??topics(settings)[0]?.id;
  if(typeof name!=='string'||!topicPattern.test(name))throw new InputError('Question inconnue.');
  const topic=topics(settings).find(t=>t.id===name);
  if(!topic||!statePattern.test(topic.root_id))throw new InputError('Question inconnue.');
  return topic;
}
export function topicForRoot(settings,root){
  const topic=topics(settings).find(t=>t.root_id===root);
  if(!topic)throw new InputError('Fil inconnu.');
  return topic;
}
export function topicPath(topic,api=false){return (api?'/api/v3/thread':'/conversation')+'?topic='+encodeURIComponent(topic.id);}
export function publicTopic(topic){
  const {id,title,description,origin_links=[],source_ids=[],question_ref}=topic;
  return {id,title,description,origin_links,source_ids,question_ref};
}
