// Local trial policy, not the published convention or a truth/identity verifier.
import {isDeepStrictEqual} from 'node:util';

export function inspectLineage(input) {
  const fields = Array.isArray(input?.fields) ? input.fields : [];
  const graph = new Map();
  const problems = new Set();
  for (const field of fields) {
    if (typeof field?.id !== 'string' || !field.id || graph.has(field.id)) {
      problems.add('missing-or-duplicate-field-id');
    } else graph.set(field.id, field);
  }
  function roots(id, visiting = new Set()) {
    if (!graph.has(id)) { problems.add('missing-field'); return new Set(); }
    if (visiting.has(id)) { problems.add('source-cycle'); return new Set(); }
    const field = graph.get(id);
    if (!Array.isArray(field.sources) || field.sources.some(s => typeof s !== 'string' || !s)) {
      problems.add('missing-or-invalid-sources'); return new Set();
    }
    if (field.kind === 'observed' && field.sources.length === 0) return new Set([id]);
    if (!['derived', 'reconstructed'].includes(field.kind) || field.sources.length === 0) {
      problems.add('unknown-or-inconsistent-provenance'); return new Set();
    }
    const path = new Set([...visiting, id]);
    return new Set(field.sources.flatMap(source => [...roots(source, path)]));
  }
  const left = roots(input?.comparison?.left);
  const right = roots(input?.comparison?.right);
  const sharedSources = [...left].filter(id => right.has(id)).sort();
  return {
    status: problems.size ? 'unknown' : sharedSources.length ? 'dependent' : 'independent',
    sharedSources,
    problems: [...problems].sort(),
    interpretation: 'Independence of declared source paths only; provenance is not authenticated.'
  };
}

export function inspectDispute(input) {
  const {claim, objection, policy} = input || {};
  // These snapshots never get overwritten by the result or the objection.
  const original = structuredClone(claim ?? null);
  const preservedObjection = structuredClone(objection ?? null);
  const result = (status, reason) => ({status, value: original?.value, original,
    objection: preservedObjection, reason, applied: false});
  if (!claim || !objection || !policy || typeof claim.id !== 'string' || !claim.id ||
      typeof objection.id !== 'string' || !objection.id ||
      !Object.hasOwn(claim, 'value') || !Object.hasOwn(objection, 'proposedValue') ||
      !['domain', 'version'].every(k => typeof claim[k] === 'string' && claim[k])) {
    return result('unresolved', 'Missing claim, objection or local policy.');
  }
  if (objection.claimId !== claim.id || policy.claimId !== claim.id ||
      policy.verified !== true || policy.domain !== claim.domain || policy.version !== claim.version) {
    return result('unresolved', 'Unverified, stale or differently scoped local policy.');
  }
  const sources = Array.isArray(input.sources) ? input.sources : [];
  const ids = sources.map(s => s?.id);
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
    return result('unresolved', 'Source identity missing or in conflict.');
  }
  const controlling = sources.find(s => s.id === policy.sourceId);
  if (!controlling || controlling.status !== 'verified' ||
      controlling.domain !== claim.domain || controlling.version !== claim.version ||
      !Object.hasOwn(controlling, 'value')) {
    return result('unresolved', 'Applicable source missing, unverified or superseded.');
  }
  if (isDeepStrictEqual(controlling.value, claim.value)) {
    return result('confirmed', 'The verified applicable source supports the original claim.');
  }
  if (objection.sourceId === controlling.id && isDeepStrictEqual(controlling.value, objection.proposedValue)) {
    return result('correction_supported', 'Evidence supports a new version; original remains intact.');
  }
  return result('unresolved', 'The cited objection does not settle the discrepancy.');
}
