import {hash,runRecipe,InputError} from './recipes.mjs';
import {checkSchema,validate} from '../validator.mjs';

export function descriptor(artifact){
  if(artifact.problem)return artifact.problem;
  const properties=Object.fromEntries(artifact.recipe.fields.map(f=>{
    const kinds=[...new Set(artifact.examples.map(e=>e.expected[f.to]===null?'null':typeof e.expected[f.to]))];
    return [f.to,kinds.length===1?{type:kinds[0]}:{}];
  }));
  const output_schema={type:'object',properties,required:Object.keys(properties).sort(),additionalProperties:false};
  return {title:artifact.slug.replaceAll('-',' '),output_schema,schema_id:'sch_'+hash(output_schema),basis:'inferred_from_submitted_examples'};
}
export function problem(value){
  if(!value||typeof value.title!=='string'||value.title.length<3||value.title.length>160||!value.output_schema)throw new InputError('problem requires title (3–160 characters) and output_schema.');
  try{checkSchema(value.output_schema);}catch(e){throw new InputError(e.message);}
  if(value.output_schema.type!=='object')throw new InputError('Output schema must have type object.');
  const metadata={title:value.title,output_schema:value.output_schema,schema_id:'sch_'+hash(value.output_schema),basis:'contributor_declared_and_examples_verified'};
  if(Buffer.byteLength(JSON.stringify(metadata))>10000)throw new InputError('Problem descriptor exceeds 10 KiB.');
  return metadata;
}
export function queryArgs(body){
  if(body.query!==undefined&&(typeof body.query!=='string'||body.query.length>100))throw new InputError('query: 100 characters maximum.');
  if(body.output_schema!==undefined){try{checkSchema(body.output_schema);}catch(e){throw new InputError(e.message);}}
  if(body.input!==undefined){
    if(!body.input||typeof body.input!=='object'||Array.isArray(body.input))throw new InputError('input must be a flat object.');
    const first=Object.keys(body.input)[0];
    if(first)runRecipe({fields:[{from:first,to:'checked',steps:[]}]},body.input);
  }
  if(body.limit!==undefined&&(!Number.isInteger(body.limit)||body.limit<1||body.limit>20))throw new InputError('limit: integer from 1 to 20.');
  return {words:(body.query||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0,10),input_keys:body.input===undefined?null:Object.keys(body.input),schema_id:body.schema_id||null};
}
export function resolve(items,body){
  const solutions=[];
  for(const a of items){
    const p=descriptor(a);if(body.schema_id&&p.schema_id!==body.schema_id)continue;
    let output;
    try{
      if(body.input!==undefined){output=runRecipe(a.recipe,body.input);if(body.output_schema&&!validate(output,body.output_schema).valid)continue;}
      else if(body.output_schema&&!a.examples.every(e=>validate(e.expected,body.output_schema).valid))continue;
    }catch{continue;}
    solutions.push({id:a.id,known_solution_id:'ATR-K-'+a.id,lineage:{parent_id:a.parent_id,revision:a.revision},verification_count:a.verification.passed,alternatives:a.variants||[],content_hash:a.content_hash,slug:a.slug,problem:p,recipe:a.recipe,examples:a.examples,revision:a.revision,parent_id:a.parent_id,variants:a.variants||[],origin:a.origin,
      confidence:{level:output===undefined?'submitted_examples_only':body.output_schema?'recomputed_and_schema_checked':'recomputed_on_input',examples_passed:a.verification.passed,evidence:a.evidence||{},meaning:'Evidence scope, not a probability. Sessions do not establish independent agents. Use counts cover retained 30-day traces.'},...(output===undefined?{}:{output}),read_url:'/api/v2/recipes/'+a.id});
  }
  solutions.sort((a,b)=>a.id.localeCompare(b.id));
  return {solutions:solutions.slice(0,body.limit||10),matched_in_candidates:solutions.length,candidates_examined:items.length,candidate_limit:100,truncated_candidates:items.length===100,ranking:'immutable_id_ascending',schema_identity:'SHA-256 of canonical schema JSON; not semantic equivalence',notice:'No match means no compatible known candidate in this bounded search. It is not proof that no solution exists.'};
}
