import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const trial = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? '../attractor-cooperation');
const impl = await import(pathToFileURL(join(source, 'reference/index.mjs')).href);
const { default: Ajv2020 } = await import(pathToFileURL(join(source, 'node_modules/ajv/dist/2020.js')).href);
const schema = JSON.parse(readFileSync(join(source, 'schema/transmission.schema.json'), 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addSchema(schema);
const validateReplay = ajv.compile({ $ref: `${schema.$id}#/$defs/replay` });
const rule = {
  id: 's', parent: null, author: { actor: 'sender', lineage: 'family-A' },
  fields: [{ id: 'f', kind: 'observed', channel: 'direct', sources: [], value: 'x => x + 1',
    derivation: { operation: 'measured', inputs: [], witness: [{ input: 1, output: 2 }] } }],
  objections: [],
};
const wrongReplay = { field: 'f', method: 'witness', produced: [999], lineage: 'family-B' };
const matchingReplay = { ...wrongReplay, produced: [2] };
const wrong = impl.inspectReplay({ record: rule, replay: wrongReplay });
const matching = impl.inspectReplay({ record: rule, replay: matchingReplay });
assert.equal(wrong.status, 'refuted');
assert.ok(wrong.warnings.includes('self-refuting-witness'));
assert.equal(matching.status, 'confirmed');
// Independent executable oracle: the carried rule's single worked case is consistent.
assert.equal(1 + 1, rule.fields[0].derivation.witness[0].output);
const shapeValid = validateReplay(matchingReplay);
const schemaErrors = structuredClone(validateReplay.errors);
assert.equal(shapeValid, false);
const sent = {
  id: 's', parent: null, author: { actor: 'sender', lineage: 'family-A' },
  fields: [{ id: 'f', value: 1, kind: 'observed', sources: [], channel: 'direct', expect: 'verify' }],
  objections: [],
};
const receipt = {
  id: 'r', target: 's', dispositions: [{ field: 'f', action: 'accept' }],
  record: { id: 't', parent: 's', author: { actor: 'receiver', lineage: 'family-B' },
    fields: structuredClone(sent.fields), objections: [] },
};
const green = impl.driftReport({ sent, receipt });
assert.equal(green.level, 'green');
assert.equal(green.counts.verify, 0);
assert.equal(green.counts.accept, 1);
const result = {
  observedAt: new Date().toISOString(),
  witness: { record: rule, wrongReplay, matchingReplay, wrongResult: wrong, matchingResult: matching,
    independentlyComputedOutput: 2, matchingReplaySchemaValid: shapeValid, schemaErrors },
  requestedVerification: { input: { sent, receipt }, actual: green },
};
mkdirSync(join(trial, 'results'), { recursive: true });
writeFileSync(join(trial, 'results/semantic-probes.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
