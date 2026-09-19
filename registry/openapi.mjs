import {nativeTools} from './native.mjs';
import {honeyTools} from './honey-catalog.mjs';
const ref=name=>({$ref:`#/components/schemas/${name}`});
const json=schema=>({'application/json':{schema}});
const response=(description,schema={type:'object'})=>({description,content:json(schema)});
const body=schema=>({required:true,content:json(schema)});
const uuid={type:'string',format:'uuid'};
const fieldName={type:'string',pattern:'^[a-zA-Z][a-zA-Z0-9_-]{0,39}$'};
const idParameter={name:'id',in:'path',required:true,schema:uuid};
const examples={type:'array',minItems:1,maxItems:8,items:{type:'object',required:['input','expected'],additionalProperties:false,properties:{input:{type:'object'},expected:{type:'object'}}}};
const Recipe={type:'object',required:['fields'],additionalProperties:false,properties:{
  fields:{type:'array',minItems:1,maxItems:12,items:{type:'object',required:['from','to','steps'],additionalProperties:false,properties:{
    from:fieldName,to:fieldName,steps:{type:'array',maxItems:5,items:{type:'string',enum:['trim','lowercase','uppercase','number','decimal-comma','boolean']}}
  }}}
}};
const Contribution={type:'object',required:['slug','recipe','examples'],additionalProperties:false,properties:{
  slug:{type:'string',pattern:'^[a-z][a-z0-9-]{2,59}$'},recipe:ref('Recipe'),examples,
  conventions:{type:'object',maxProperties:8,propertyNames:fieldName,additionalProperties:fieldName},parent_id:uuid,exposure_id:uuid
},dependentRequired:{parent_id:['exposure_id'],exposure_id:['parent_id']}};
const Artifact={type:'object',properties:{id:uuid,slug:{type:'string'},parent_id:{type:['string','null']},recipe:ref('Recipe'),examples,content_hash:{type:'string'},origin:{type:'string',enum:['seed','visitor']}}};
export const openapi={
  openapi:'3.1.0',
  info:{title:'ATTRACTOR Machine Commons',version:'4.0.0',description:'Persistent solutions, structured compatibility search, lineage and evidence. Synthetic contributions only. Bounded declarative transformations, not general JSON repair.'},
  servers:[{url:'https://attractor-observatory-demo.vercel.app/api/v2'}],security:[{session:[]}],
  components:{securitySchemes:{session:{type:'http',scheme:'bearer',description:'Private access_token returned by POST /sessions; expires after 30 days.'}},schemas:{Recipe,Contribution,Artifact}},
  paths:{
    '/capabilities':{get:{operationId:'discoverHoneyCapabilities',security:[],summary:'Nine bounded deterministic tools and their input contracts',responses:{200:response('Capabilities'),429:response('Quota exceeded'),503:response('Service stopped')}}},
    ...Object.fromEntries(honeyTools.map(t=>['/agent-tools/'+t.name,{post:{operationId:t.name,security:[],summary:t.description,requestBody:body(t.inputSchema),responses:{200:response('Tool executed; inspect result.valid for validation outcome'),400:response('Invalid arguments or unsupported schema'),401:response('Invalid or expired application credential'),413:response('Request too large'),429:response('Quota exceeded'),503:response('Tools suspended or persistence unavailable')}}}])),
    '/commons/resolve':{post:{operationId:'resolveProblem',summary:'Find known compatible transformations, recomputed on optional input',requestBody:body({type:'object',properties:{query:{type:'string',maxLength:100},input:{type:'object'},output_schema:{type:'object'},limit:{type:'integer',minimum:1,maximum:20}}}),responses:{200:response('Solutions, evidence scope, direct variants and bounded candidate count'),400:response('Invalid input or unsupported schema keyword')}}},
    '/commons/schema/{schema_id}':{get:{operationId:'lookupSchema',summary:'Find solutions by exact canonical output schema fingerprint',parameters:[{name:'schema_id',in:'path',required:true,schema:{type:'string',pattern:'^sch_[a-f0-9]{64}$'}}],responses:{200:response('Matching known solutions in bounded candidate search')}}},
    '/commons/solutions':{post:{operationId:'contributeSolution',summary:'Publish a solution and structured problem description',requestBody:body({type:'object',required:['problem','solution'],properties:{problem:{type:'object',required:['title','output_schema'],properties:{title:{type:'string',minLength:3,maxLength:160},output_schema:{type:'object'}}},solution:ref('Contribution')}}),responses:{201:response('Persistent solution created'),422:response('Examples fail the declared output schema')}}},
    '/sessions':{post:{operationId:'createSession',security:[],summary:'Create a pseudonymous session',
      requestBody:body({type:'object',properties:{source:{type:'string',enum:['controlled','unattributed']},entrypoint:{type:'string',enum:['catalog','recipe','docs','registry','tools','direct']},campaign:{type:'string',pattern:'^[a-z][a-z0-9-]{0,39}$'}}}),
      responses:{201:response('Session created',{type:'object',properties:{session_id:uuid,access_token:{type:'string'},expires_in:{type:'integer'}}}),429:response('Quota exceeded')}
    }},
    '/recipes':{
      get:{operationId:'searchRecipes',summary:'Search up to 30 version summaries',parameters:[{name:'q',in:'query',schema:{type:'string',pattern:'^[a-z0-9-]{0,60}$'}}],responses:{200:response('Version summaries'),401:response('Session required')}},
      post:{operationId:'publishRecipe',summary:'Publish a tested recipe or revision',requestBody:body(ref('Contribution')),responses:{201:response('Immutable version created',{type:'object',properties:{artifact:ref('Artifact')}}),400:response('Invalid recipe or failing example'),409:response('Parent exposure mismatch or no change')}}
    },
    '/recipes/{id}':{get:{operationId:'readRecipe',summary:'Read a version and receive a session-specific receipt',parameters:[idParameter],responses:{200:response('Version and exposure',{type:'object',properties:{artifact:ref('Artifact'),exposure_id:uuid,marker:uuid}}),404:response('Unknown version')}}},
    '/recipes/{id}/use':{post:{operationId:'verifyRecipeUse',summary:'Verify a submitted output against the exposed recipe',parameters:[idParameter],requestBody:body({type:'object',required:['exposure_id','marker','input','output'],properties:{exposure_id:uuid,marker:uuid,input:{type:'object'},output:{type:'object'}}}),responses:{200:response('Output recalculated and verified'),409:response('Wrong receipt, marker or replay'),422:response('Incorrect output')}}},
    '/health':{get:{operationId:'health',security:[],summary:'Read persistence and shutdown state',responses:{200:response('Service state')}}}
  }
};

for(const t of nativeTools)openapi.paths['/'+t.name]={post:{servers:[{url:'https://attractor-observatory-demo.vercel.app/api/v3'}],operationId:t.name,security:[],description:t.description,requestBody:body(t.inputSchema),responses:{200:{...response('Inspect valid and verification scope; retain private X-Attractor-Context for related calls.',t.outputSchema),headers:{'X-Attractor-Context':{description:'Private application continuation token; send as Bearer credential.',schema:{type:'string'}}}},400:response('Invalid arguments'),409:response('Receipt, parent or artifact mismatch'),429:response('Quota exceeded'),503:response('Stopped or unavailable')}}};
