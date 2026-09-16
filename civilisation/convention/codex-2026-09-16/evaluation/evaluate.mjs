import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const trial = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? '../attractor-cooperation');
const mode = process.argv[3] ?? 'reference';
if (!['reference', 'empty', 'blind', 'revision'].includes(mode)) throw new Error('Unknown mode');
const output = join(trial, 'results');
mkdirSync(output, { recursive: true });
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const inventory = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? inventory(path) : [{ file: relative(trial, path).replaceAll('\\', '/'), sha256: hash(path) }];
});
const manifest = JSON.parse(readFileSync(join(trial, 'input-manifest.json'), 'utf8'));
for (const entry of manifest.inputFiles) {
  if (hash(join(source, entry.file)) !== entry.sha256) throw new Error(`Input changed: ${entry.file}`);
}
const implementation = mode === 'reference' ? join(source, 'reference/index.mjs')
  : mode === 'empty' ? join(trial, 'evaluation/empty-checker.mjs')
    : join(trial, mode, 'index.mjs');
const frozenPath = join(output, `${mode}-freeze.json`);
const implementationDir = dirname(implementation);
const frozen = {
  frozenAt: new Date().toISOString(), runtime: process.version,
  sourceCommit: manifest.sourceCommit,
  files: inventory(implementationDir),
  harnessSha256: hash(join(source, 'conformance/run.mjs')),
  casesSha256: hash(join(source, 'conformance/cases.json')),
};
if (existsSync(frozenPath)) throw new Error(`Refusing to replace existing freeze: ${mode}`);
writeFileSync(frozenPath, JSON.stringify(frozen, null, 2) + '\n', { flag: 'wx' });
const harnesses = [['upstream', join(source, 'conformance/run.mjs')]];
const strict = join(trial, 'proposals/conformance/run.mjs');
if (existsSync(strict)) harnesses.push(['strict', strict]);
for (const [label, harness] of harnesses) {
  const commandArgs = [harness, implementation, join(source, 'conformance/cases.json')];
  const result = spawnSync(process.execPath, commandArgs, { encoding: 'utf8', windowsHide: true, timeout: 120000 });
  const artifact = {
    observedAt: new Date().toISOString(), mode, harness: label, harnessSha256: hash(harness),
    exitCode: result.status, signal: result.signal, error: result.error?.message ?? null,
    stderr: result.stderr, stdout: result.stdout,
  };
  try { artifact.report = JSON.parse(result.stdout); } catch { /* preserve unparsed output */ }
  const path = join(output, `${mode}-${label}.json`);
  writeFileSync(path, JSON.stringify(artifact, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ mode, harness: label, exitCode: result.status, report: artifact.report ?? result.stderr }));
}
for (const entry of frozen.files) {
  if (hash(resolve(trial, entry.file)) !== entry.sha256) throw new Error(`Implementation changed during evaluation: ${entry.file}`);
}
