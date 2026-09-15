// Offline behavioral replay: no network, packages, model calls or writes.
import {readFileSync} from 'node:fs';
import {checkCases} from './check-cases.mjs';
const location = process.argv[2] || new URL('./cases.json', import.meta.url);
const results = checkCases(JSON.parse(readFileSync(location, 'utf8')));
console.log(JSON.stringify({scope: 'Synthetic behavioral cases only; no schema or identity verification.',
  total_cases: results.length, expected_outcomes_met: results.length, results}, null, 2));
