import { array, equal, has, index, nonempty, obj, object, sorted, validWitness } from '../blind/common.mjs';

export function inspectReplay(input = {}) {
  input = obj(input);
  const record = obj(input.record), replay = obj(input.replay);
  const problems = new Set(), warnings = new Set();
  const fields = index(record.fields, problems, 'record-invalid');
  const field = fields.get(replay.field);
  let status = 'invalid', reproduced = null, cases;
  if (!nonempty(replay.lineage)) warnings.add('replayer-lineage-undeclared');
  else if (replay.lineage === record.author?.lineage && replay.lineage !== 'human') warnings.add('same-lineage-replay');
  if (!field) problems.add('replay-field-missing');
  else if (!object(field.derivation)) problems.add('derivation-undeclared');
  else {
    const derivation = field.derivation;
    if (replay.method === 'sufficiency') {
      if (!has(field, 'value') || has(field, 'sealed')) problems.add('value-unavailable');
      if (!fields.has(replay.input)) problems.add('replay-input-invalid');
      if (!has(replay, 'value')) problems.add('replay-value-missing');
      if (!problems.size) {
        reproduced = equal(replay.value, field.value);
        status = array(derivation.sufficient).includes(replay.input) ? (reproduced ? 'confirmed' : 'refuted') : 'undeclared';
      }
    } else if (replay.method === 'quote') {
      if (derivation.operation !== 'quoted' || !nonempty(derivation.quote)) problems.add('quote-undeclared');
      if (typeof replay.sourceText !== 'string') problems.add('source-text-missing');
      if (!problems.size) { reproduced = replay.sourceText.includes(derivation.quote); status = reproduced ? 'confirmed' : 'refuted'; }
    } else if (replay.method === 'witness') {
      if (!has(derivation, 'witness') || (Array.isArray(derivation.witness) && !derivation.witness.length)) {
        problems.add('witness-undeclared');
      } else if (!validWitness(derivation.witness)) problems.add('witness-invalid');
      if (!problems.size) {
        if (!Array.isArray(replay.produced) || replay.produced.length !== derivation.witness.length) {
          problems.add('replay-produced-invalid');
        } else {
          cases = { matched: derivation.witness.reduce((count, item, i) => count + Number(equal(replay.produced[i], item.output)), 0), total: derivation.witness.length };
          reproduced = cases.matched === cases.total;
          status = reproduced ? 'confirmed' : 'refuted';
          if (!reproduced) warnings.add('self-refuting-witness');
        }
      }
    } else problems.add('replay-method-invalid');
  }
  const result = { status, reproduced, independence: 'not-established', problems: sorted(problems), warnings: sorted(warnings), interpretation: `The replay is ${status}; independence is not established.` };
  if (cases) result.cases = cases;
  return result;
}
