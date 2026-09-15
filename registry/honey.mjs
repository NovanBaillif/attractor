// Adapted from the user-provided Honey Pack; bounded, explicit data semantics.
import {canonical,hash,InputError} from './recipes.mjs';
import {checkSchema,validate} from '../validator.mjs';
const forbidden=new Set(['__proto__','prototype','constructor']);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const pointer=k=>k.replaceAll('~','~0').replaceAll('/','~1');
export function bounded(value){
  let nodes=0;
  function walk(v,depth){
    if(++nodes>4000||depth>24)throw new InputError('JSON limit: 4,000 nodes and depth 24.');
    if(v===null||typeof v==='boolean'||typeof v==='string')return;
    if(typeof v==='number'){if(!Number.isFinite(v)||Number.isInteger(v)&&!Number.isSafeInteger(v))throw new InputError('Use finite numbers and safe integers; encode large identifiers as strings.');return;}
    if(!v||typeof v!=='object')throw new InputError('JSON values required.');
    for(const [k,x] of Object.entries(v)){if(forbidden.has(k))throw new InputError('Reserved object key rejected.');walk(x,depth+1);}
  }
  walk(value,0);return value;
}
function schema(s){try{checkSchema(s);}catch(e){throw new InputError(e.message);}return s;}
function fields(body,required,optional=[]){
  const contract='Required fields: '+required.join(', ')+(optional.length?'. Optional fields: '+optional.join(', '):'');
  if(!object(body))throw new InputError('Expected a JSON object. '+contract+'.');
  const missing=required.filter(k=>!Object.hasOwn(body,k));
  const unexpected=Object.keys(body).filter(k=>!required.includes(k)&&!optional.includes(k));
  if(missing.length||unexpected.length)throw new InputError((missing.length?'Missing required fields: '+missing.join(', ')+'. ':'')+(unexpected.length?'Unexpected fields are not accepted. ':'')+contract+'.');
}
function extract(text){
  if(typeof text!=='string'||!text.trim())throw new InputError('Nonempty text required.');
  const parse=s=>{try{return JSON.parse(s);}catch{throw new InputError('Candidate is not valid JSON; no repair or guessing performed.');}};
  try{return JSON.parse(text.trim());}catch{}
  const fences=[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  if(fences.length){if(fences.length!==1)throw new InputError('Multiple fenced candidates; select one explicitly.');return parse(fences[0][1]);}
  const candidates=[];let start=-1,stack=[],quoted=false,escaped=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(start<0){if(c==='{'||c==='['){start=i;stack=[c];}continue;}
    if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
    if(c==='"'){quoted=true;continue;}
    if(c==='{'||c==='['){stack.push(c);if(stack.length>24)throw new InputError('JSON nesting too deep.');}
    if(c==='}'||c===']'){
      if(stack.pop()!==(c==='}'?'{':'['))throw new InputError('Mismatched JSON delimiters.');
      if(!stack.length){candidates.push(text.slice(start,i+1));start=-1;}
    }
  }
  if(start>=0||candidates.length!==1)throw new InputError('Exactly one complete JSON object or array must be present.');
  return parse(candidates[0]);
}
function flatten(value){
  const output=Object.create(null);
  function walk(v,path){
    if(v===null||typeof v!=='object'||Object.keys(v).length===0){output[path]=v;return;}
    for(const k of Object.keys(v).sort())walk(v[k],path+'/'+pointer(k));
  }
  walk(value,'');return output;
}
function coerce(value,s,decimalComma){
  const changes=[];
  function walk(v,rule,path){
    let next=v;
    if(typeof v==='string'&&['number','integer'].includes(rule.type)){
      const text=v.trim(),normalized=decimalComma&&/^[+-]?\d+,\d+$/.test(text)?text.replace(',','.'):text;
      if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)){
        const n=Number(normalized);if(Number.isFinite(n)&&(!Number.isInteger(n)||Number.isSafeInteger(n))&&(rule.type!=='integer'||Number.isInteger(n)))next=n;
      }
    }else if(typeof v==='string'&&rule.type==='boolean'&&/^(true|false)$/i.test(v.trim()))next=v.trim().toLowerCase()==='true';
    else if(rule.type==='string'&&['number','boolean'].includes(typeof v))next=String(v);
    if(next!==v)changes.push({path,from_type:typeof v,to_type:typeof next});
    if(object(next))return Object.fromEntries(Object.entries(next).map(([k,x])=>[k,Object.hasOwn(rule.properties||{},k)?walk(x,rule.properties[k],path+'/'+pointer(k)):x]));
    if(Array.isArray(next)&&rule.items)return next.map((x,i)=>walk(x,rule.items,path+'/'+i));
    return next;
  }
  const result=walk(value,s,'');return {value:result,changes,...validate(result,s)};
}
function pathParts(path){
  if(typeof path!=='string'||path.length>200)throw new InputError('Mapping paths must be strings of at most 200 characters.');
  const parts=path.split('.');if(parts.length>16||parts.some(p=>!p||forbidden.has(p)))throw new InputError('Empty, reserved or over-deep path.');return parts;
}
function get(value,parts){let current=value;for(const part of parts){if(current===null||typeof current!=='object'||!Object.hasOwn(current,part))return {found:false};current=current[part];}return {found:true,value:current};}
function map(value,mapping,omit){
  if(!object(mapping)||!Object.keys(mapping).length||Object.keys(mapping).length>50)throw new InputError('mapping requires 1–50 target/source paths.');
  const targets=Object.keys(mapping).sort(),output=Object.create(null),omitted=[];
  for(let i=0;i<targets.length;i++){
    const target=targets[i],parts=pathParts(target),source=pathParts(mapping[target]);
    if(targets.some(t=>t!==target&&t.startsWith(target+'.')))throw new InputError('Overlapping mapping targets are rejected.');
    const result=get(value,source);if(!result.found){if(!omit)throw new InputError('A mapped source field is missing.');omitted.push(target);continue;}
    let cursor=output;for(const p of parts.slice(0,-1)){if(!Object.hasOwn(cursor,p))cursor[p]=Object.create(null);cursor=cursor[p];}cursor[parts.at(-1)]=result.value;
  }
  return {value:output,omitted,projection:true};
}
function dedupe(records,keys){
  if(!Array.isArray(records)||records.length>1000||!Array.isArray(keys)||!keys.length||keys.length>20)throw new InputError('Up to 1,000 records and 1–20 key paths required.');
  const paths=keys.map(pathParts),seen=new Set(),output=[];
  for(const row of records){
    if(!object(row))throw new InputError('Each record must be an object.');
    const values=paths.map(p=>{const x=get(row,p);if(!x.found)throw new InputError('A deduplication key is missing.');return x.value;});
    const signature=canonical(values);if(!seen.has(signature)){seen.add(signature);output.push(row);}
  }
  return {records:output,count:output.length,removed:records.length-output.length,kept:'first'};
}
function diff(before,after){
  const patch=[];
  function walk(a,b,path){
    if(canonical(a)===canonical(b))return;
    if(!object(a)||!object(b)){patch.push({op:'replace',path,value:b});return;}
    for(const k of Object.keys(a).sort())if(!Object.hasOwn(b,k))patch.push({op:'remove',path:path+'/'+pointer(k)});
    for(const k of Object.keys(b).sort()){const p=path+'/'+pointer(k);if(!Object.hasOwn(a,k))patch.push({op:'add',path:p,value:b[k]});else walk(a[k],b[k],p);}
  }
  walk(before,after,'');return {patch,array_strategy:'replace_whole_array'};
}
export const toolNames=['canonicalize_json','fingerprint_json','extract_json','flatten_json','validate_schema','coerce_to_schema','map_fields','dedupe_records','diff_json'];
export function runHoney(tool,body){
  bounded(body);let result;
  switch(tool){
    case 'canonicalize_json':fields(body,['value']);result={value:body.value,canonical:canonical(body.value),fingerprint:hash(body.value),canonicalization:'attractor-recursive-key-sort-v1'};break;
    case 'fingerprint_json':fields(body,['value']);result={fingerprint:hash(body.value),algorithm:'sha256',canonicalization:'attractor-recursive-key-sort-v1'};break;
    case 'extract_json':fields(body,['text']);{const value=bounded(extract(body.text));result={value,fingerprint:hash(value)};}break;
    case 'flatten_json':fields(body,['value']);result={values:flatten(body.value),root_pointer:''};break;
    case 'validate_schema':fields(body,['value','schema']);result=validate(body.value,schema(body.schema));break;
    case 'coerce_to_schema':fields(body,['value','schema'],['decimal_comma']);if(body.decimal_comma!==undefined&&typeof body.decimal_comma!=='boolean')throw new InputError('decimal_comma must be boolean.');result=coerce(body.value,schema(body.schema),body.decimal_comma===true);break;
    case 'map_fields':fields(body,['value','mapping'],['omit_missing']);if(body.omit_missing!==undefined&&typeof body.omit_missing!=='boolean')throw new InputError('omit_missing must be boolean.');result=map(body.value,body.mapping,body.omit_missing===true);break;
    case 'dedupe_records':fields(body,['records','keys']);result=dedupe(body.records,body.keys);break;
    case 'diff_json':fields(body,['before','after']);result=diff(body.before,body.after);break;
    default:throw new InputError('Unknown agent tool.');
  }
  if(Buffer.byteLength(JSON.stringify(result))>128000)throw new InputError('Result exceeds 128,000 bytes; reduce input.');
  return result;
}
