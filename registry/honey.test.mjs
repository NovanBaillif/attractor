import test from 'node:test';
import assert from 'node:assert/strict';
import {runHoney} from './honey.mjs';
import {honeyCatalog,honeyTools} from './honey-catalog.mjs';
const plain=x=>JSON.parse(JSON.stringify(x));
test('all nine tools have executable examples and stable explicit results',()=>{
  assert.equal(honeyTools.length,9);for(const t of honeyCatalog)assert.ok(runHoney(t.name,t.example));
  const r=runHoney('canonicalize_json',{value:JSON.parse('{"2":2,"10":10,"a":0}')});assert.equal(r.canonical,'{"10":10,"2":2,"a":0}');
  assert.equal(runHoney('fingerprint_json',{value:{b:2,a:1}}).fingerprint,runHoney('fingerprint_json',{value:{a:1,b:2}}).fingerprint);
  assert.deepEqual(runHoney('extract_json',{text:'before {"a":[{"b":"}\\\""}]} after'}).value,{a:[{b:'}"'}]});
  assert.throws(()=>runHoney('extract_json',{text:'first {"a":1} then {"b":2}'}),/Exactly one/);
  assert.throws(()=>runHoney('extract_json',{text:'result {"a":[1}'}),/Mismatched/);
  assert.deepEqual(plain(runHoney('flatten_json',{value:{'':42,'a/b':{'~':[]},empty:{},text:'[]'}}).values),{'/':42,'/a~1b/~0':[],'/empty':{},'/text':'[]'});
  assert.deepEqual(plain(runHoney('flatten_json',{value:42}).values),{'':42});
});
test('schema conversion preserves data, reports changes and rejects unsupported constraints',()=>{
  const schema={type:'object',properties:{count:{type:'integer',minimum:0}},required:['count'],additionalProperties:false};
  const result=runHoney('coerce_to_schema',{value:{count:'2',important:'keep'},schema});
  assert.deepEqual(result.value,{count:2,important:'keep'});assert.equal(result.valid,false);assert.equal(result.changes.length,1);
  assert.equal(runHoney('validate_schema',{value:{count:-1},schema}).valid,false);
  assert.throws(()=>runHoney('validate_schema',{value:1,schema:{type:'number',multipleOf:2}}),/pris en charge/);
  assert.equal(runHoney('coerce_to_schema',{value:'12,50',schema:{type:'number'}}).valid,false);
  assert.equal(runHoney('coerce_to_schema',{value:'12,50',schema:{type:'number'},decimal_comma:true}).value,12.5);
  for(const v of ['0x10','Infinity','','9007199254740993'])assert.equal(runHoney('coerce_to_schema',{value:v,schema:{type:'number'}}).valid,false);
  assert.equal(runHoney('coerce_to_schema',{value:'oui',schema:{type:'boolean'}}).valid,false);
});
test('prototype paths, overlaps, missing dedupe keys and resource excess are rejected',()=>{
  for(const key of ['__proto__','prototype','constructor']){
    assert.throws(()=>runHoney('canonicalize_json',{value:JSON.parse('{"'+key+'":1}')}));
    assert.throws(()=>runHoney('map_fields',{value:{a:1},mapping:{[key+'.probe']:'a'}}));
  }
  assert.equal(({}).probe,undefined);
  assert.throws(()=>runHoney('map_fields',{value:{x:1},mapping:{a:'x','a.b':'x'}}),/Overlapping/);
  assert.throws(()=>runHoney('map_fields',{value:{},mapping:{a:'missing'}}),/missing/);
  assert.deepEqual(runHoney('map_fields',{value:{},mapping:{a:'missing'},omit_missing:true}).omitted,['a']);
  assert.throws(()=>runHoney('dedupe_records',{records:[{id:null},{}],keys:['id']}),/missing/);
  assert.deepEqual(runHoney('dedupe_records',{records:[{id:null,x:1},{id:null,x:2},{id:1}],keys:['id']}).records,[{id:null,x:1},{id:1}]);
  assert.throws(()=>runHoney('canonicalize_json',{value:Array(4001).fill(0)}),/4,000/);
  let deep=0;for(let i=0;i<26;i++)deep={x:deep};assert.throws(()=>runHoney('canonicalize_json',{value:deep}),/depth/);
});
test('diff patches reconstruct roots, escaped paths, removals and changed arrays',()=>{
  for(const [before,after] of [[1,2],[{}, {'':2,'a/b':3}],[{a:[1,2],b:1},{a:[2,3],c:true}],[{'~':{a:1}},{'~':{b:2}}]]){
    let value=structuredClone(before);
    for(const op of runHoney('diff_json',{before,after}).patch){
      if(op.path===''){value=op.value;continue;}
      const keys=op.path.slice(1).split('/').map(k=>k.replaceAll('~1','/').replaceAll('~0','~'));let parent=value;
      for(const k of keys.slice(0,-1))parent=parent[k];
      if(op.op==='remove')delete parent[keys.at(-1)];else parent[keys.at(-1)]=op.value;
    }
    assert.deepEqual(value,after);
  }
});
