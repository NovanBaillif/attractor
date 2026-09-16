// Usage: node evaluation/proposed-suite.mjs <pinned-snapshot-directory> <Ajv-install-directory>
// The snapshot supplies every source file. Only Ajv is loaded from the external installation.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve, join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath, pathToFileURL} from 'node:url';

if (!process.argv[2] || !process.argv[3]) throw new Error('Supply the pinned snapshot and Ajv installation directories.');
const snapshot = resolve(process.argv[2]), ajvRoot = resolve(process.argv[3]);
const trial = fileURLToPath(new URL('../', import.meta.url));
const proposals = join(trial, 'proposals');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const file = (root, name) => join(root, ...name.split('/'));
const sourceNames = ['conformance/cases.json', 'conformance/schema-check.mjs',
  'conformance/run.mjs', 'schema/transmission.schema.json', 'reference/index.mjs'];
const sourceHashes = Object.fromEntries(sourceNames.map(name => [name, hash(file(snapshot, name))]));
const original = read(file(snapshot, 'conformance/cases.json'));
const proposed = read(file(proposals, 'conformance/cases.json'));
const expected = structuredClone(original);
const approved = new Set([
  'v04-record-verified-claim-without-witness', 'v04-record-verified-claim-with-witness',
  'v04-record-no-claim-no-duty', 'v04-witness-confirmed', 'v04-witness-self-refuted',
  'v04-witness-partial-refuted', 'v04-witness-undeclared', 'v04-witness-count-mismatch',
  'v04-witness-same-lineage'
]);
const additions = [];
for (const c of expected.cases) {
  if (!approved.has(c.id)) continue;
  const record = c.kind === 'record' ? c.input : c.input.record;
  if (Object.hasOwn(record, 'parent') || Object.hasOwn(record, 'objections')) {
    throw new Error(`Pinned fixture already contains a member slated for addition: ${c.id}`);
  }
  record.parent = null;
  record.objections = [];
  const recordPath = c.kind === 'record' ? 'input' : 'input.record';
  additions.push({id: c.id, path: `${recordPath}.parent`, value: null},
    {id: c.id, path: `${recordPath}.objections`, value: []});
}
const onlyApprovedAdditions = additions.length === 18 && isDeepStrictEqual(proposed, expected);
const byId = new Map(proposed.cases.map(c => [c.id, c]));
const expectedOutputsUnchanged = original.cases.every(c => isDeepStrictEqual(c.expected, byId.get(c.id)?.expected));
const negativeId = 'v04-record-witness-malformed';
const negativeFixtureUnchanged = isDeepStrictEqual(original.cases.find(c => c.id === negativeId), byId.get(negativeId));
const changedCases = original.cases.filter(c => !isDeepStrictEqual(c, byId.get(c.id))).map(c => c.id);

const expectedSchema = read(file(snapshot, 'schema/transmission.schema.json'));
expectedSchema.$id = 'urn:attractor:cooperation:0.4:transmission';
expectedSchema.title = 'attractor-cooperation/0.4 transmission objects (draft)';
expectedSchema.description = expectedSchema.description.replace('Record, Receipt and Reveal', 'Record, Receipt, Reveal and Replay');
const replay = expectedSchema.$defs.replay;
replay.properties.method.enum.push('witness');
replay.properties.produced = {type: 'array', minItems: 1, items: true};
replay.if = {required: ['method'], properties: {method: {const: 'witness'}}};
replay.then = {required: ['produced']};
const schemaHasOnlyApprovedDelta = isDeepStrictEqual(expectedSchema, read(file(proposals, 'schema/transmission.schema.json')));

const require = createRequire(join(ajvRoot, 'package.json'));
const ajvUrl = pathToFileURL(require.resolve('ajv/dist/2020.js')).href;
const source = readFileSync(file(snapshot, 'conformance/schema-check.mjs'), 'utf8');
const adaptations = [
  ["'ajv/dist/2020.js'", JSON.stringify(ajvUrl)],
  ["new URL('../schema/transmission.schema.json', import.meta.url)", JSON.stringify(file(proposals, 'schema/transmission.schema.json'))],
  ["new URL('./cases.json', import.meta.url)", JSON.stringify(file(proposals, 'conformance/cases.json'))]
];
let adapted = source;
for (const [from, to] of adaptations) {
  if (adapted.split(from).length !== 2) throw new Error(`Expected exactly one adapter target: ${from}`);
  adapted = adapted.replace(from, to);
}
function execute(args) {
  const result = spawnSync(process.execPath, args, {cwd: trial, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024});
  if (result.error) throw result.error;
  return {exitCode: result.status, stderr: result.stderr, result: JSON.parse(result.stdout)};
}
const schemaRun = execute(['--input-type=module', '--eval', adapted]);
const referencePath = file(snapshot, 'reference/index.mjs');
const runnerPath = file(proposals, 'conformance/run.mjs');
const casesPath = file(proposals, 'conformance/cases.json');
const referenceRun = execute([runnerPath, referencePath, casesPath]);
const sourceFilesUnchanged = sourceNames.every(name => sourceHashes[name] === hash(file(snapshot, name)));
const schemaValid = schemaRun.exitCode === 0 && schemaRun.result.schema_errors.length === 0;
const referencePassed = referenceRun.exitCode === 0 && referenceRun.result.total === 122 &&
  referenceRun.result.passed === 122 && referenceRun.result.failures.length === 0;
const report = {
  sourceBase: {commit: 'de29041', directory: snapshot, fileSha256: sourceHashes},
  runtime: process.version,
  cases: {total: proposed.cases.length, changedCases, additions,
    onlyApprovedAdditions, expectedOutputsUnchanged, negativeFixtureUnchanged},
  schemaHasOnlyApprovedDelta,
  testOnlyAdapter: {
    description: 'Executes the exact pinned schema-check source after three import/path substitutions; validation logic is unchanged.',
    substitutions: adaptations.map(([from, to]) => ({from, to})),
    originalSha256: sourceHashes['conformance/schema-check.mjs'],
    adaptedSha256: createHash('sha256').update(adapted).digest('hex')
  },
  officialSchemaCheck: schemaRun,
  strictReferenceRun: {runner: runnerPath, runnerSha256: hash(runnerPath), ...referenceRun},
  sourceFilesUnchanged,
  passed: onlyApprovedAdditions && expectedOutputsUnchanged && negativeFixtureUnchanged &&
    schemaHasOnlyApprovedDelta && schemaValid && referencePassed && sourceFilesUnchanged
};
writeFileSync(join(trial, 'results/proposed-suite.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({passed: report.passed, cases: proposed.cases.length,
  changedCases: changedCases.length, addedMembers: additions.length,
  expectedOutputsUnchanged, negativeFixtureUnchanged, schemaHasOnlyApprovedDelta,
  schema: schemaRun.result, reference: referenceRun.result}, null, 2));
process.exitCode = report.passed ? 0 : 1;
