import { array, equal, has, index, nonempty, obj, object, sorted, validWitness } from './common.mjs';

export function inspectReplay(input = {}) {
  input = obj(input);
  const record = obj(input.record);
  const replay = obj(input.replay);
  const problems = new Set();
  const warnings = new Set();
  const fields = index(record.fields, problems, 'record-invalid');
  const field = fields.get(replay.field);
  let status = 'invalid';
  let reproduced = null;
  let cases;
  if (replay.method === 'witness') cases = { matched: 0, total: array(field?.derivation?.witness).length };
  if (!nonempty(replay.lineage)) warnings.add('replayer-lineage-undeclared');
  else if (replay.lineage === record.author?.lineage && replay.lineage !== 'human') warnings.add('same-lineage-replay');
  if (!field) problems.add('replay-field-missing');
  else if (!object(field.derivation)) problems.add('derivation-undeclared');
  else {
    const d = field.derivation;
    switch (replay.method) {
      case 'sufficiency':
        if (!has(field, 'value') || has(field, 'sealed')) problems.add('value-unavailable');
        if (!fields.has(replay.input)) problems.add('replay-input-invalid');
        if (!has(replay, 'value')) problems.add('replay-value-missing');
        if (!problems.size) {
          reproduced = equal(replay.value, field.value);
          status = array(d.sufficient).includes(replay.input) ? reproduced ? 'confirmed' : 'refuted' : 'undeclared';
        }
        break;
      case 'quote':
        if (d.operation !== 'quoted' || !nonempty(d.quote)) problems.add('quote-undeclared');
        if (typeof replay.sourceText !== 'string') problems.add('source-text-missing');
        if (!problems.size) {
          reproduced = replay.sourceText.includes(d.quote);
          status = reproduced ? 'confirmed' : 'refuted';
        }
        break;
      case 'witness': {
        if (!has(d, 'witness') || (Array.isArray(d.witness) && d.witness.length === 0)) {
          problems.add('witness-undeclared');
        } else if (!validWitness(d.witness)) problems.add('witness-invalid');
        if (!Array.isArray(replay.produced) || !Array.isArray(d.witness)
          || replay.produced.length !== d.witness.length) problems.add('replay-produced-invalid');
        if (!problems.size) {
          cases.matched = d.witness.reduce((count, item, i) => count + Number(equal(replay.produced[i], item.output)), 0);
          reproduced = cases.matched === cases.total;
          status = reproduced ? 'confirmed' : 'refuted';
          if (!reproduced) warnings.add('self-refuting-witness');
        }
        break;
      }
      default: problems.add('replay-method-invalid');
    }
  }
  const result = { status, reproduced, independence: 'not-established', problems: sorted(problems),
    warnings: sorted(warnings), interpretation: `The replay is ${status}; independence is not established.` };
  if (cases) result.cases = cases;
  return result;
}
