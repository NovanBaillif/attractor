import { array, copy, equal, has, index, nonempty, obj, object, sorted } from './common.mjs';

export function inspectDispute(input = {}) {
  input = obj(input);
  const claim = obj(input.claim);
  const objection = obj(input.objection);
  const policy = obj(input.policy);
  const problems = new Set();
  const warnings = new Set();
  const sources = index(input.sources, problems, 'source-invalid');
  let controlling;
  let status = 'unresolved';
  let established = false;
  const structure = object(input.claim) && object(input.objection) && object(input.policy)
    && nonempty(claim.id) && nonempty(objection.id) && has(claim, 'value')
    && has(objection, 'proposedValue') && nonempty(claim.domain) && nonempty(claim.version);
  const policyValid = objection.claimId === claim.id && policy.claimId === claim.id
    && policy.verified === true && policy.domain === claim.domain && policy.version === claim.version;
  const scoped = source => source.status === 'verified' && source.domain === claim.domain
    && source.version === claim.version && has(source, 'value');
  const supersedes = (source, id) => source.supersedes === id || array(source.supersedes).includes(id);
  if (structure && policyValid && !problems.size) {
    controlling = sources.get(policy.sourceId);
    if (controlling && scoped(controlling)) {
      established = true;
      let blocked = false;
      for (const [id, source] of sources) {
        if (id === controlling.id || !scoped(source) || equal(source.value, controlling.value)) continue;
        if (supersedes(source, controlling.id)) blocked = true;
        else warnings.add(`contradicted-undeclared:${id}`);
      }
      if (!blocked) status = equal(controlling.value, claim.value) ? 'confirmed'
        : equal(controlling.value, objection.proposedValue) ? 'correction_supported' : 'contradicted';
    }
  }
  return {
    status, value: copy(claim.value), original: copy(input.claim), objection: copy(input.objection),
    reason: established ? `The controlling source yields status ${status}.` : 'No controlling source is established.',
    applied: false,
    objectionAssessment: {
      citation: !nonempty(objection.sourceId) ? 'none'
        : established && objection.sourceId === controlling.id ? 'controlling' : 'secondary',
      proposedValueSupported: status === 'unresolved' ? null : equal(controlling.value, objection.proposedValue),
    },
    warnings: sorted(warnings),
  };
}
