import { actions, array, equal, has, index, nonempty, obj, reconciled, sorted,
  transitive, validBasis, without } from './common.mjs';
import { inspectLineage } from './lineage.mjs';

export function inspectHop(input = {}) {
  const sent = obj(obj(input).sent);
  const receipt = obj(obj(input).receipt);
  const received = obj(receipt.record);
  const violations = new Set();
  const warnings = new Set();
  const pendingReveal = new Set();
  const modified = new Set();
  const sentFields = index(sent.fields, violations, 'sent-record-invalid');
  const sentObjections = index(sent.objections, violations, 'sent-record-invalid');
  const receivedFields = index(received.fields, violations, 'received-record-invalid');
  const receivedObjections = index(received.objections, violations, 'received-record-invalid');
  const counts = Object.fromEntries(actions.map(action => [action, 0]));
  if (!nonempty(sent.id) || received.parent !== sent.id) violations.add('parent-missing');
  const dispositions = new Map();
  for (const entry of array(receipt.dispositions)) {
    const disposition = obj(entry);
    const ref = nonempty(disposition.field) ? disposition.field : '';
    if (!sentFields.has(ref)) { violations.add(`unknown-field-disposition:${ref}`); continue; }
    if (!dispositions.has(ref)) dispositions.set(ref, []);
    dispositions.get(ref).push(disposition);
  }
  for (const [id, field] of sentFields) {
    const ds = dispositions.get(id) || [];
    const fail = code => violations.add(`${code}:${id}`);
    const warn = code => warnings.add(`${code}:${id}`);
    if (ds.length > 1) { fail('duplicate-disposition'); continue; }
    if (!ds.length) { fail('missing-disposition'); continue; }
    const d = ds[0];
    if (!actions.includes(d.action)) { fail('invalid-disposition'); continue; }
    counts[d.action]++;
    if (has(field, 'sealed') && !['re_derive', 'drop'].includes(d.action)) {
      fail('sealed-field-not-re-derived');
      continue;
    }
    const next = receivedFields.get(id);
    const kept = receivedFields.has(id) && equal(without(field, 'expect'), without(next, 'expect'));
    const basisValid = nonempty(d.basis) && receivedFields.has(d.basis);
    switch (d.action) {
      case 'accept':
        if (!kept) fail('altered-on-accept');
        break;
      case 'verify': {
        if (!kept) fail('altered-on-verify');
        if (!basisValid) fail('verify-without-basis');
        else if (d.basis === id || transitive(d.basis, receivedFields).has(id)) fail('circular-verification');
        else {
          if (reconciled(d.basis, receivedFields)) fail('reconciled-basis');
          const lineage = inspectLineage({ fields: received.fields, comparison: { left: id, right: d.basis } });
          const code = { dependent: 'verification-dependent',
            'dependent-partial': 'verification-partially-dependent', unknown: 'verification-unverifiable' }[lineage.status];
          if (code) warn(code);
        }
        break;
      }
      case 're_derive':
        if (!has(field, 'sealed')) warn('re-derivation-unprovable');
        if (!next || !has(next, 'value') || has(next, 'sealed')) fail('re-derivation-missing');
        else if (has(field, 'sealed')) pendingReveal.add(id);
        break;
      case 'contest': {
        if (!kept) fail('original-overwritten');
        const objection = receivedObjections.get(d.objection);
        if (!objection || objection.target !== id || sentObjections.has(d.objection)) fail('contest-objection-missing');
        else if (!validBasis(objection.basis)) fail('contest-without-basis');
        break;
      }
      case 'modify':
        modified.add(id);
        if (!next) fail('modified-field-missing');
        if (!basisValid) fail('modify-without-basis');
        else {
          if (reconciled(d.basis, receivedFields)) fail('reconciled-basis');
          if (next && !array(next.sources).includes(d.basis)) fail('modification-provenance-omits-basis');
        }
        if (kept) warn('modify-without-change');
        break;
      case 'drop':
        if (!nonempty(d.reason)) fail('drop-without-reason');
        if (next) fail('dropped-field-present');
        break;
    }
  }
  for (const [id, field] of receivedFields) {
    if (array(field.sources).some(source => !receivedFields.has(source))) violations.add(`provenance-truncated:${id}`);
  }
  for (const [id, objection] of sentObjections) {
    const next = receivedObjections.get(id);
    if (!next) { violations.add(`objection-lost:${id}`); continue; }
    if (!equal(has(objection, 'basis') ? objection.basis : null, has(next, 'basis') ? next.basis : null)) {
      violations.add(`objection-basis-lost:${id}`);
    }
    if (!equal(without(objection, 'basis'), without(next, 'basis'))) violations.add(`objection-altered:${id}`);
  }
  for (const [id, entries] of dispositions) {
    if (entries.length === 1 && ['accept', 'verify'].includes(entries[0].action)
      && [...transitive(id, receivedFields)].some(source => modified.has(source))) warnings.add(`ancestor-modified:${id}`);
  }
  const a = sent.author?.lineage;
  const b = received.author?.lineage;
  if (!nonempty(a) || !nonempty(b)) warnings.add('lineage-undeclared');
  else if (a === b && a !== 'human') warnings.add('same-lineage');
  return { status: violations.size ? 'non-conformant' : 'conformant', violations: sorted(violations),
    warnings: sorted(warnings), counts, pendingReveal: sorted(pendingReveal) };
}
