import { array, channels, distinctIds, has, ids, index, kinds, nonempty, obj,
  object, operations, sorted, transitive, validBasis, validWitness } from './common.mjs';

function validDerivation(d) {
  return object(d) && operations.includes(d.operation) && distinctIds(d.inputs)
    && ['available', 'sufficient'].every(key => !has(d, key) || distinctIds(d[key]))
    && ['quote', 'locator', 'approvedBy'].every(key => !has(d, key) || nonempty(d[key]));
}

function matchingOperation(field, d) {
  const length = d.inputs.length;
  switch (d.operation) {
    case 'measured': return field.kind === 'observed' && field.channel === 'direct' && length === 0;
    case 'quoted': return field.kind === 'observed' && length === 0;
    case 'copied': return (field.kind === 'observed' && length === 0
      && ['cached', 'mirrored', 'republished'].includes(field.channel))
      || (field.kind === 'derived' && length === 1);
    case 'computed':
    case 'reconciled': return ['derived', 'reconstructed'].includes(field.kind) && length > 0;
    default: return false;
  }
}

function checkDerivation(field, fields, violations, warnings) {
  if (!has(field, 'derivation')) return;
  const d = field.derivation;
  const fail = code => violations.add(`${code}:${field.id}`);
  if (!validDerivation(d)) fail('invalid-derivation');
  else if (!matchingOperation(field, d)
    || d.inputs.some(id => !array(field.sources).includes(id))
    || array(d.sufficient).some(id => !d.inputs.includes(id))
    || array(d.available).some(id => id === field.id || !fields.has(id) || d.inputs.includes(id))) {
    fail('derivation-inconsistent');
  }
  if (d?.operation === 'quoted' && (!nonempty(d.quote) || !nonempty(d.locator))) fail('quote-missing');
  if (has(d, 'witness') && !validWitness(d.witness)) fail('invalid-witness');
  if (has(d, 'verifiedOn') && !validWitness(d.witness)) warnings.add(`verification-unsupported:${field.id}`);
}

export function inspectRecord(input = {}) {
  const record = obj(input);
  const violations = new Set();
  const warnings = new Set();
  const fields = index(record.fields, violations, 'missing-or-duplicate-field-id');
  const objections = index(record.objections, violations, 'missing-or-duplicate-objection-id');
  if (!nonempty(record.id)) violations.add('missing-record-id');
  if (!nonempty(record.author?.lineage)) warnings.add('lineage-undeclared');
  for (const [id, field] of fields) {
    const fail = code => violations.add(`${code}:${id}`);
    const warn = code => warnings.add(`${code}:${id}`);
    if (has(field, 'expect') && !['accept', 'verify', 're_derive'].includes(field.expect)) fail('invalid-expect');
    const validKind = kinds.includes(field.kind);
    if (!validKind) fail('invalid-kind');
    if (!ids(field.sources)) fail('missing-or-invalid-sources');
    else {
      if (field.sources.some(source => !fields.has(source))) fail('provenance-truncated');
      if (validKind && (['derived', 'reconstructed'].includes(field.kind)
        ? field.sources.length === 0 : field.sources.length !== 0)) fail('inconsistent-provenance');
    }
    const ancestors = transitive(id, fields);
    if (ancestors.has(id)) violations.add('source-cycle');
    const sealed = has(field, 'sealed');
    if (sealed) {
      if (field.sealed?.alg !== 'sha256-jcs' || typeof field.sealed?.commitment !== 'string'
        || !/^[0-9a-f]{64}$/.test(field.sealed.commitment)) fail('invalid-seal');
      if (has(field, 'value')) fail('sealed-value-present');
      if (field.expect !== 're_derive') fail('sealed-without-re-derive');
    } else {
      if (field.expect === 're_derive') fail('re-derive-unsealed');
      if (!has(field, 'value')) fail('missing-value');
      if ([...ancestors].some(source => has(fields.get(source), 'sealed'))) fail('sealed-value-leak');
    }
    if (field.kind === 'observed') {
      if (!has(field, 'channel')) warn('observed-channel-undeclared');
      else if (!channels.includes(field.channel)) fail('invalid-channel');
      else if (field.channel !== 'direct' && !nonempty(field.upstream)) warn('upstream-undeclared');
    }
    if (nonempty(field.upstream) && field.upstream.startsWith('self:') && field.channel !== 'cached') {
      fail('self-state-not-cached');
    }
    checkDerivation(field, fields, violations, warnings);
  }
  for (const [id, objection] of objections) {
    if (!fields.has(objection.target)) violations.add(`objection-target-missing:${id}`);
    if (!validBasis(objection.basis)) violations.add(`objection-basis-missing:${id}`);
  }
  return { status: violations.size ? 'non-conformant' : 'conformant',
    violations: sorted(violations), warnings: sorted(warnings) };
}
