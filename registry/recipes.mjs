import {createHash} from 'node:crypto';

export class InputError extends Error {}
const identifier=/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/;
const forbidden=new Set(['__proto__','constructor','prototype']);
export const operations=['trim','lowercase','uppercase','number','decimal-comma','boolean'];
function object(v){return v!==null && typeof v==='object' && !Array.isArray(v);}
function name(v){return typeof v==='string' && identifier.test(v) && !forbidden.has(v);}
function keys(v,allowed){if(!object(v) || Object.keys(v).some(k=>!allowed.includes(k)))throw new InputError(`Champs autorisés : ${allowed.join(', ')}.`);}
export function canonical(v){
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(object(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
export const hash=v=>createHash('sha256').update(canonical(v)).digest('hex');
export function checkRecipe(recipe){
  keys(recipe,['fields']);
  if(!Array.isArray(recipe.fields) || recipe.fields.length<1 || recipe.fields.length>12)throw new InputError('Une recette contient 1 à 12 champs.');
  const outputs=new Set();
  for(const f of recipe.fields){
    keys(f,['from','to','steps']);
    if(!name(f.from)||!name(f.to)||outputs.has(f.to))throw new InputError('Noms de champs invalides ou destinations dupliquées.');
    outputs.add(f.to);
    if(!Array.isArray(f.steps)||f.steps.length>5||f.steps.some(s=>!operations.includes(s)))throw new InputError('Opération inconnue ou plus de 5 opérations.');
  }
  return recipe;
}
export function runRecipe(recipe,input){
  checkRecipe(recipe);
  if(!object(input)||Object.keys(input).length>20)throw new InputError('Entrée : objet de 20 champs maximum.');
  for(const [key,value] of Object.entries(input)){
    if(!name(key)||value!==null&&!['string','number','boolean'].includes(typeof value))throw new InputError('Entrée : noms courts et valeurs scalaires uniquement.');
    if(typeof value==='string'&&value.length>200||typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>1e12))throw new InputError('Valeur d’entrée hors limites.');
  }
  const output=Object.create(null);
  for(const f of recipe.fields){
    if(!Object.hasOwn(input,f.from))throw new InputError(`Champ absent : ${f.from}.`);
    let value=input[f.from];
    if(value!==null && !['string','number','boolean'].includes(typeof value))throw new InputError('Valeurs scalaires uniquement.');
    if(typeof value==='string' && value.length>200)throw new InputError('Texte limité à 200 caractères.');
    for(const step of f.steps){
      if(['trim','lowercase','uppercase','decimal-comma'].includes(step) && typeof value!=='string')throw new InputError(`${step} attend du texte.`);
      if(step==='trim')value=value.trim();
      if(step==='lowercase')value=value.toLowerCase();
      if(step==='uppercase')value=value.toUpperCase();
      if(step==='decimal-comma'){
        if(!/^[+-]?\d+(,\d+)?$/.test(value))throw new InputError('Décimal à virgule invalide.');
        value=value.replace(',','.');
      }
      if(step==='number'){
        if(typeof value==='string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))throw new InputError('Nombre invalide.');
        if(!['number','string'].includes(typeof value))throw new InputError('Conversion numérique invalide.');
        value=Number(value);if(!Number.isFinite(value)||Math.abs(value)>1e12)throw new InputError('Nombre hors limites.');
      }
      if(step==='boolean'){
        if(value==='true'||value===true)value=true;else if(value==='false'||value===false)value=false;else throw new InputError('Booléen attendu : true ou false.');
      }
    }
    output[f.to]=value;
  }
  return output;
}
export function contribution(body){
  keys(body,['slug','recipe','examples','parent_id','exposure_id','conventions']);
  if(typeof body.slug!=='string'||!/^[a-z][a-z0-9-]{2,59}$/.test(body.slug))throw new InputError('slug : 3 à 60 caractères minuscules, chiffres et tirets.');
  checkRecipe(body.recipe);
  if(!Array.isArray(body.examples)||body.examples.length<1||body.examples.length>8)throw new InputError('Fournir 1 à 8 exemples synthétiques.');
  for(const ex of body.examples){
    keys(ex,['input','expected']);
    if(!object(ex.expected))throw new InputError('expected doit être un objet.');
    if(canonical(runRecipe(body.recipe,ex.input))!==canonical(ex.expected))throw new InputError('La recette échoue sur un exemple fourni.');
  }
  const conventions=body.conventions || {};
  if(!object(conventions)||Object.keys(conventions).length>8 || Object.entries(conventions).some(([k,v])=>!name(k)||!name(v)))throw new InputError('Conventions : jusqu’à 8 paires de noms courts.');
  for(const k of ['parent_id','exposure_id'])if(body[k]!==undefined && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(body[k]))throw new InputError(`${k} invalide.`);
  if(Boolean(body.parent_id)!==Boolean(body.exposure_id))throw new InputError('parent_id et exposure_id sont requis ensemble.');
  return {...body,conventions,content_hash:hash({recipe:body.recipe,examples:body.examples,conventions}),verification:{kind:'submitted_examples',passed:body.examples.length,claim:'Validation limitée aux exemples fournis ; aucune généralisation démontrée.'}};
}
export const seeds=[
  {slug:'csv-trim-and-number',recipe:{fields:[{from:'name',to:'name',steps:['trim']},{from:'count',to:'count',steps:['trim','number']}]},examples:[{input:{name:' demo ',count:' 3 '},expected:{name:'demo',count:3}},{input:{name:' sample ',count:'0'},expected:{name:'sample',count:0}}]},
  {slug:'decimal-comma-to-number',recipe:{fields:[{from:'amount',to:'amount',steps:['trim','decimal-comma','number']}]},examples:[{input:{amount:' 12,50 '},expected:{amount:12.5}},{input:{amount:'-2,75'},expected:{amount:-2.75}}]},
  {slug:'normalize-status-and-flag',recipe:{fields:[{from:'status',to:'status',steps:['trim','lowercase']},{from:'enabled',to:'enabled',steps:['trim','lowercase','boolean']}]},examples:[{input:{status:' READY ',enabled:' TRUE '},expected:{status:'ready',enabled:true}}]}
];
