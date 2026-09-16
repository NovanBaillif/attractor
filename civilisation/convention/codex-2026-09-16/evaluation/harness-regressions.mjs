import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const trial = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? '../attractor-cooperation');
const dir = join(trial, 'results/harness-fixtures');
mkdirSync(dir, { recursive: true });
const names = ['inspectLineage', 'inspectDispute', 'inspectRecord', 'inspectHop',
  'inspectReveal', 'inspectReplay', 'driftReport'];
const casesFile = join(source, 'conformance/cases.json');
const loaded = JSON.parse(readFileSync(casesFile, 'utf8'));
const total = (Array.isArray(loaded) ? loaded : loaded.cases).length;
const observations = [];
for (const expression of ['undefined', 'null', 'false', '0', '""', '[]']) {
  const file = join(dir, `invalid-${observations.length}.mjs`);
  writeFileSync(file, names.map(name => `export const ${name} = () => ${expression};`).join('\n'));
  observations.push({ label: `returns ${expression}`, ...compare(file) });
}
const reordered = join(dir, 'missing-on-reorder.mjs');
writeFileSync(reordered, `import * as reference from ${JSON.stringify(pathToFileURL(join(source, 'reference/index.mjs')).href)};\n`
  + names.map(name => `let n_${name} = 0; export const ${name} = input => ++n_${name} % 3 === 0 ? undefined : reference.${name}(input);`).join('\n'));
observations.push({ label: 'valid result then missing on reordered call', ...compare(reordered) });
for (const observation of observations) {
  assert.equal(observation.strict.passed, 0, observation.label);
  assert.equal(observation.strict.exitCode, 1, observation.label);
  if (observation.label !== 'returns []') {
    assert.equal(observation.upstream.passed, total, `original false positive: ${observation.label}`);
  }
}
const result = { observedAt: new Date().toISOString(), casesPerChecker: total, checks: observations.length, observations };
writeFileSync(join(trial, 'results/harness-regressions.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));

function compare(implementation) {
  return Object.fromEntries([
    ['upstream', join(source, 'conformance/run.mjs')],
    ['strict', join(trial, 'proposals/conformance/run.mjs')],
  ].map(([label, harness]) => {
    const run = spawnSync(process.execPath, [harness, implementation, casesFile],
      { encoding: 'utf8', windowsHide: true, timeout: 60000 });
    if (run.error) throw run.error;
    const report = JSON.parse(run.stdout);
    return [label, { exitCode: run.status, passed: report.passed, total: report.total,
      firstFailure: report.failures[0] ?? null }];
  }));
}
