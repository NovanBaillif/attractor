import assert from 'node:assert/strict';
import {runHoney} from './honey.mjs';
import {validate} from '../validator.mjs';

// Controlled synthetic pilot: no network, production traffic or real customer data.
const schema={type:'object',required:['reference','quantity','price','active'],additionalProperties:false,properties:{
  reference:{type:'string'},quantity:{type:'integer',minimum:1},price:{type:'number',minimum:0},active:{type:'boolean'}
}};
const base={reference:'00042',quantity:'2',price:'12,50',active:'true'};
const cases=[
  {name:'CSV strings and decimal comma',value:base,expected:{reference:'00042',quantity:2,price:12.5,active:true},valid:true},
  {name:'Already valid',value:{reference:'00042',quantity:2,price:12.5,active:true},valid:true},
  {name:'Ambiguous boolean needs human decision',value:{...base,active:'oui'},valid:false},
  {name:'Missing required price',value:{reference:'00042',quantity:'2',active:'true'},valid:false},
  {name:'Negative quantity remains rejected',value:{...base,quantity:'-2'},valid:false},
  {name:'Fractional quantity remains rejected',value:{...base,quantity:'2.5'},valid:false},
  {name:'Unexpected column is preserved',value:{...base,note:'keep me'},valid:false},
  {name:'Unsafe integer remains rejected',value:{...base,quantity:'9007199254740993'},valid:false}
];
const rows=cases.map(c=>{
  const input=structuredClone(c.value);
  const before=validate(input,schema);
  const result=runHoney('coerce_to_schema',{value:input,schema,decimal_comma:true});
  assert.equal(result.valid,c.valid,c.name);
  assert.deepEqual(input,c.value,'Input must not be mutated');
  assert.equal(result.value.reference,'00042','Preserve identifier leading zeros');
  if(c.expected)assert.deepEqual(result.value,c.expected);
  if(Object.hasOwn(input,'note'))assert.equal(result.value.note,input.note);
  return {case:c.name,accepted_before:before.valid,accepted_after:result.valid,changes:result.changes.length,remaining_errors:result.errors};
});
console.log(JSON.stringify({classification:'CONTROLLED_SYNTHETIC_LOCAL',baseline:'Same schema validation without conversion',cases:rows.length,accepted_before:rows.filter(r=>r.accepted_before).length,accepted_after:rows.filter(r=>r.accepted_after).length,rows,limits:'No evidence of adoption, time saved, model autonomy or superiority to another converter.'},null,2));
