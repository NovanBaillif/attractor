import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,asContribution} from './catalog.mjs';
import {contribution,runRecipe} from './recipes.mjs';
import {openapi} from './openapi.mjs';
test('24 distinct catalog recipes pass 48 independently specified examples',()=>{
  assert.equal(catalog.length,24);assert.equal(new Set(catalog.map(x=>x.slug)).size,24);
  for(const row of catalog){assert.equal(contribution(asContribution(row)).verification.passed,2);assert.ok(row.limit.length>40);}
});
test('documented pitfalls: preserve identifiers, reject thousands separators, require explicit booleans',()=>{
  const get=slug=>catalog.find(x=>x.slug===slug).recipe;
  assert.equal(runRecipe(get('csv-leading-zero-identifiers'),{product_id:'00042',postal_code:'01230',count:'2'}).product_id,'00042');
  assert.throws(()=>runRecipe(get('csv-french-unit-prices'),{reference:'A',prix:'1.234,50',quantite:'1'}));
  assert.throws(()=>runRecipe(get('forms-explicit-boolean-flags'),{enabled:'on',archived:'false'}));
});
test('OpenAPI core contract has unique operations and resolvable local schemas',()=>{
  const ids=Object.values(openapi.paths).flatMap(path=>Object.values(path).map(op=>op.operationId));
  assert.equal(new Set(ids).size,ids.length);
  function visit(v){if(!v||typeof v!=='object')return;if(v.$ref)assert.ok(openapi.components.schemas[v.$ref.split('/').at(-1)]);Object.values(v).forEach(visit);}
  visit(openapi);
  assert.equal(openapi.paths['/recipes/{id}/use'].post.responses[422].description,'Incorrect output');
});
