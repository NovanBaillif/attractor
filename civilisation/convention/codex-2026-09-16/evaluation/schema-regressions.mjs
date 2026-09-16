// Usage: node evaluation/schema-regressions.mjs <pinned-upstream-directory>
// Reads supplied fixtures and Ajv only; does not import either checker implementation.
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

if (!process.argv[2]) throw new Error('Supply the pinned upstream repository directory.');
const upstream = resolve(process.argv[2]);
const trial = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(join(upstream, 'package.json'));
const Ajv = require('ajv/dist/2020.js').default;
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const original = read(join(upstream, 'schema/transmission.schema.json'));
const proposed = read(join(trial, 'proposals/schema/transmission.schema.json'));
const {cases} = read(join(upstream, 'conformance/cases.json'));
const {witness: probe} = read(join(trial, 'results/semantic-probes.json'));
const definitions = ['record', 'receipt', 'reveal', 'replay'];
function validators(schema) {
  const ajv = new Ajv({strict: true, strictRequired: false, allErrors: true});
  ajv.addSchema(schema);
  return Object.fromEntries(definitions.map(def => [def, ajv.getSchema(`${schema.$id}#/$defs/${def}`)]));
}
const before = validators(original), after = validators(proposed);
function inspect(validate, value) {
  const valid = validate(value);
  return {valid, errors: valid ? [] : structuredClone(validate.errors)};
}
function parts(c) {
  if (c.kind === 'record') return [{def: 'record', part: 'record', value: c.input}];
  if (c.kind === 'replay') return [
    {def: 'record', part: 'record', value: c.input.record},
    {def: 'replay', part: 'replay', value: c.input.replay}
  ];
  if (!['hop', 'reveal', 'drift'].includes(c.kind)) return [];
  return [
    {def: 'record', part: 'sent', value: c.input.sent},
    {def: 'receipt', part: 'receipt', value: c.input.receipt},
    ...(c.input.reveal ? [{def: 'reveal', part: 'reveal', value: c.input.reveal}] : [])
  ];
}
// Exact positive-case selection used by the pinned conformance/schema-check.mjs.
const good = c => (c.kind === 'record' && c.expected.status === 'conformant') ||
  (c.kind === 'hop' && c.expected.status === 'conformant') ||
  (c.kind === 'reveal' && c.expected.status === 'verified') ||
  (c.kind === 'drift' && c.expected.level === 'green');
function suiteReport(checks) {
  const errors = [], groups = [], kinds = ['record', 'hop', 'reveal', 'drift'];
  let validated = 0, violationCases = 0, invalidViolations = 0, replays = 0;
  for (const c of cases.filter(c => kinds.includes(c.kind) || c.kind === 'replay')) {
    const results = parts(c).map(p => ({part: p.part, ...inspect(checks[p.def], p.value)}));
    const invalid = results.filter(r => !r.valid);
    if (c.kind === 'replay') replays += 1;
    else if (good(c)) validated += 1;
    else {
      violationCases += 1;
      if (invalid.length) invalidViolations += 1;
    }
    if (c.kind === 'replay' || good(c)) {
      for (const r of invalid) {
        errors.push({id: c.id, part: r.part, errors: r.errors});
        groups.push(...r.errors.map(e => ({id: c.id, part: r.part, error: e})));
      }
    }
  }
  const fixtureOmissions = groups.filter(({error}) => error.keyword === 'required' &&
    ['parent', 'objections'].includes(error.params.missingProperty));
  const unsupportedWitness = groups.filter(({part, error}) => part === 'replay' &&
    ((error.keyword === 'enum' && error.instancePath === '/method') ||
      (error.keyword === 'additionalProperties' && error.params.additionalProperty === 'produced')));
  return {
    replays_validated: replays, conformant_inputs_validated: validated,
    schema_errors: errors, schema_error_count: groups.length,
    failing_case_ids: [...new Set(errors.map(e => e.id))],
    violation_cases: violationCases, violation_cases_also_rejected_by_schema: invalidViolations,
    incomplete_fixture_errors: fixtureOmissions.length,
    incomplete_fixture_case_ids: [...new Set(fixtureOmissions.map(e => e.id))],
    unsupported_witness_errors: unsupportedWitness.length
  };
}

const regressions = [];
function check(id, def, value, expected) {
  const actual = inspect(after[def], value);
  regressions.push({id, definition: def, expectedValid: expected, ...actual, passed: actual.valid === expected});
}
const completeRecord = structuredClone(probe.record);
function withDerivation(change) {
  const record = structuredClone(completeRecord);
  change(record.fields[0].derivation);
  return record;
}
check('complete-witness-record', 'record', completeRecord, true);
check('verifiedOn-with-witness', 'record', withDerivation(d => {d.verifiedOn = 'one case';}), true);
check('unsupported-verification-is-a-warning-not-a-shape-error', 'record', withDerivation(d => {
  delete d.witness; d.verifiedOn = 'one case';
}), true);
check('legacy-derivation-without-v04-members', 'record', withDerivation(d => {delete d.witness;}), true);
for (const [id, witness] of [
  ['empty-witness', []], ['null-witness', null], ['object-witness', {}],
  ['primitive-case', [1]], ['missing-input', [{output: 2}]], ['missing-output', [{input: 1}]]
]) check(id, 'record', withDerivation(d => {d.witness = witness;}), false);
for (const value of ['', 7, null]) {
  check(`invalid-verifiedOn-${JSON.stringify(value)}`, 'record', withDerivation(d => {d.verifiedOn = value;}), false);
}
check('null-is-a-json-value-in-both-witness-members', 'record', withDerivation(d => {
  d.witness = [{input: null, output: null}];
}), true);
check('matching-witness-replay', 'replay', probe.matchingReplay, true);
check('refuted-witness-replay-still-has-valid-shape', 'replay', probe.wrongReplay, true);
const missingProduced = structuredClone(probe.matchingReplay);
delete missingProduced.produced;
check('witness-requires-produced', 'replay', missingProduced, false);
for (const [id, produced] of [['empty', []], ['null', null], ['scalar', 2], ['object', {}]]) {
  check(`invalid-produced-${id}`, 'replay', {...probe.matchingReplay, produced}, false);
}
check('produced-accepts-all-json-value-types', 'replay', {
  ...probe.matchingReplay, produced: [null, false, 1, 'a', [], {}]
}, true);
check('unknown-method', 'replay', {...probe.matchingReplay, method: 'other'}, false);
check('unknown-replay-member', 'replay', {...probe.matchingReplay, extra: true}, false);
check('legacy-sufficiency-replay', 'replay', {field: 'f', method: 'sufficiency', input: 's', value: 2}, true);
check('legacy-quote-replay', 'replay', {field: 'f', method: 'quote', sourceText: 'quote'}, true);

const legacy = cases.filter(c => !c.id.startsWith('v04-') && parts(c).length);
const legacyComparisons = legacy.flatMap(c => parts(c).map(p => ({
  id: c.id, part: p.part, beforeValid: Boolean(before[p.def](p.value)), afterValid: Boolean(after[p.def](p.value))
})));
const legacyChanges = legacyComparisons.filter(r => r.beforeValid !== r.afterValid);
const v04 = cases.filter(c => c.id.startsWith('v04-') && parts(c).length);
const completedClones = v04.map(c => {
  const cloned = structuredClone(c);
  const record = cloned.kind === 'record' ? cloned.input : cloned.input.record;
  const supplied = [];
  if (!Object.hasOwn(record, 'parent')) {record.parent = null; supplied.push('parent');}
  if (!Object.hasOwn(record, 'objections')) {record.objections = []; supplied.push('objections');}
  return {
    id: c.id, suppliedOnlyOnClone: supplied,
    parts: parts(cloned).map(p => ({part: p.part,
      before: inspect(before[p.def], p.value), after: inspect(after[p.def], p.value)}))
  };
});
const baselineSuite = suiteReport(before), proposedSuite = suiteReport(after);
const remainingFixtureErrorsOnly = proposedSuite.schema_errors.every(e => e.id.startsWith('v04-') &&
  e.errors.every(error => error.keyword === 'required' && ['parent', 'objections'].includes(error.params.missingProperty)));
const failedClones = completedClones.filter(c => c.parts.some(p => !p.after.valid) &&
  c.id !== 'v04-record-witness-malformed');
const originalRun = spawnSync(process.execPath, [join(upstream, 'conformance/schema-check.mjs')],
  {cwd: upstream, encoding: 'utf8'});
if (originalRun.error) throw originalRun.error;
const originalRunResult = JSON.parse(originalRun.stdout);
const originalRunMatchesSelection = originalRunResult.conformant_inputs_validated === baselineSuite.conformant_inputs_validated &&
  originalRunResult.replays_validated === baselineSuite.replays_validated &&
  originalRunResult.schema_errors.flatMap(e => e.errors).length === baselineSuite.schema_error_count;
const report = {
  upstream, schemaBefore: original.$id, schemaProposed: proposed.$id,
  scope: 'Schema validation only. Outputs are supplied data; count matching and execution remain semantic checks.',
  regression_count: regressions.length,
  regression_passed: regressions.filter(r => r.passed).length,
  regressions,
  legacy: {cases: legacy.length, parts: legacyComparisons.length,
    unchanged: legacyComparisons.length - legacyChanges.length, changes: legacyChanges},
  original_official_selection: baselineSuite,
  original_official_runner: {exitCode: originalRun.status, stderr: originalRun.stderr, result: originalRunResult},
  original_runner_matches_selection: originalRunMatchesSelection,
  proposed_official_selection: proposedSuite,
  v04_complete_clones: completedClones,
  remaining_errors_are_original_fixture_omissions: remainingFixtureErrorsOnly,
  schema_check_source_unchanged: readFileSync(join(upstream, 'conformance/schema-check.mjs')).equals(
    readFileSync(join(trial, 'proposals/conformance/schema-check.mjs'))),
  passed: regressions.every(r => r.passed) && legacyChanges.length === 0 &&
    remainingFixtureErrorsOnly && failedClones.length === 0 && originalRunMatchesSelection
};
writeFileSync(join(trial, 'results/schema-regressions.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({passed: report.passed, regression_count: report.regression_count,
  regression_passed: report.regression_passed, legacy: report.legacy,
  baseline_schema_errors: baselineSuite.schema_error_count,
  proposed_schema_errors: proposedSuite.schema_error_count,
  fixture_case_ids: proposedSuite.incomplete_fixture_case_ids,
  conformant_inputs_validated: proposedSuite.conformant_inputs_validated,
  replays_validated: proposedSuite.replays_validated}, null, 2));
process.exitCode = report.passed ? 0 : 1;
