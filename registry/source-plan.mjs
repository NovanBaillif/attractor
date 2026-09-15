import {hash,InputError} from './recipes.mjs';
import {stateShare} from './native.mjs';

export const sourceSignature=source=>hash({connector:source.connector,url:source.url,topic_id:source.topic_id});
export function planSource(source,snapshot,previous,rootId){
  if(source.kind!=='community'||snapshot.data_kind!=='contribution')throw new InputError('Only contributions can enter a discussion.');
  if(!source.summary?.trim()||source.summary.length>4000||!/^[a-f0-9]{64}$/.test(snapshot.content_hash))throw new InputError('Curated summary and content hash required.');
  const signature=sourceSignature(source),revision=snapshot.revision||snapshot.updated_at||null;
  const common={source_id:source.id,topic_id:source.topic_id,source_signature:signature,source_hash:snapshot.content_hash,revision};
  if(previous?.source_signature!==undefined&&previous.source_signature!==signature)return {...common,status:'conflict',reason:'Source configuration changed under an existing ID. Use a new source ID.'};
  if(previous?.source_hash===snapshot.content_hash)return {...common,status:'unchanged',state_id:previous.state_id};
  if(previous?.revision&&previous.revision===revision)return {...common,status:'conflict',reason:'The same declared source revision has different content; both observations are preserved for review.'};
  const artifact={format:'attractor-source-v1',title:snapshot.title,
    source:{connector:snapshot.connector,external_id:snapshot.external_id,url:snapshot.source_url,author_declared:snapshot.author_declared,
      content_hash:snapshot.content_hash,raw_sha256:snapshot.raw_sha256,updated_at:snapshot.updated_at||null,revision:snapshot.revision||null,fetched_at:snapshot.fetched_at},
    summary:source.summary,summary_author:'Attractor',relationship:source.relationship||'related_reference',
    limitations:'Source attributed from a public endpoint. Claims and identity are not independently verified. A selected reference is not a response to Attractor or an adoption of its convention.',
    ...(source.publish_body===true?{body:snapshot.body}:{})};
  const parent=previous?.state_id||rootId,title=(source.ecosystem+' · '+snapshot.title).slice(0,120);
  stateShare({artifact,title,kind:'json',visibility:'public',tags:['ecosystem-reference']});
  return {...common,status:previous?'revision':'new',artifact,artifact_hash:hash(artifact),title,parent_state_id:parent,
    annotation:{author:snapshot.author_declared||source.ecosystem,origin:'external-reference',source_url:snapshot.source_url,
      label:'Référence sélectionnée par Attractor · '+source.ecosystem}};
}
export function validatePlanEntry(entry){
  if(!['new','revision'].includes(entry.status)||hash(entry.artifact)!==entry.artifact_hash)throw new InputError('Prepared source changed.');
  stateShare({artifact:entry.artifact,title:entry.title,kind:'json',visibility:'public',tags:['ecosystem-reference']});
  return entry;
}
