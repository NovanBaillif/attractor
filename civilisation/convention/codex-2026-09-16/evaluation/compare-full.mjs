// Supplementary comparison of entire results. The official suite checks selected members only.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const trial = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? '../attractor-cooperation');
const mode = process.argv[3] ?? 'blind';
if (!['blind', 'revision'].includes(mode)) throw new Error('Unknown implementation');
const impl = await import(pathToFileURL(join(trial, mode, 'index.mjs')).href);
const reference = await import(pathToFileURL(join(source, 'reference/index.mjs')).href);
const loaded = JSON.parse(readFileSync(join(source, 'conformance/cases.json'), 'utf8'));
const cases = Array.isArray(loaded) ? loaded : loaded.cases;
const names = { lineage: 'inspectLineage', dispute: 'inspectDispute', record: 'inspectRecord',
  hop: 'inspectHop', reveal: 'inspectReveal', replay: 'inspectReplay', drift: 'driftReport' };
function evaluate(module, entry) {
  try {
    const result = module[names[entry.kind]](structuredClone(entry.input));
    if (!result || typeof result !== 'object') return { invalidResult: String(result) };
    // Only these top-level members are explicitly free text; preserve everything else.
    const { interpretation, reason, ...stable } = result;
    return stable;
  } catch (error) { return { thrown: error.message }; }
}
const differences = [];
for (const entry of cases) {
  const actual = evaluate(impl, entry), expected = evaluate(reference, entry);
  if (!isDeepStrictEqual(actual, expected)) differences.push({ id: entry.id, kind: entry.kind, expected, actual });
}
const result = { observedAt: new Date().toISOString(), implementation: mode, total: cases.length,
  matching: cases.length - differences.length, differences,
  scope: 'Full-result differential on published cases, excluding only top-level free-text interpretation/reason. Reference agreement is not an independent truth oracle.' };
writeFileSync(join(trial, `results/${mode}-full-comparison.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
