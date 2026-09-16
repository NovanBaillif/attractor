import { array, channels, has, ids, index, nonempty, obj, sorted, transitive } from './common.mjs';

export function inspectLineage(input = {}) {
  input = obj(input);
  const problems = new Set();
  const warnings = new Set();
  const fields = index(input.fields, problems, 'missing-or-duplicate-field-id');
  const comparison = obj(input.comparison);

  function roots(id, path = new Set()) {
    if (!fields.has(id)) { problems.add('missing-field'); return new Set(); }
    if (path.has(id)) { problems.add('source-cycle'); return new Set(); }
    const field = fields.get(id);
    if (!ids(field.sources)) { problems.add('missing-or-invalid-sources'); return new Set(); }
    if (field.kind === 'observed' && field.sources.length === 0) return new Set([id]);
    if (!['derived', 'reconstructed'].includes(field.kind) || !field.sources.length) {
      problems.add('unknown-or-inconsistent-provenance');
      return new Set();
    }
    const nextPath = new Set(path).add(id);
    const result = new Set();
    for (const source of field.sources) for (const root of roots(source, nextPath)) result.add(root);
    return result;
  }

  function rootKeys(rootIds) {
    const keys = new Map();
    for (const id of rootIds) {
      const root = fields.get(id);
      if (has(root, 'upstream') && !nonempty(root.upstream)) problems.add('invalid-upstream');
      if (has(root, 'channel') && !channels.includes(root.channel)) problems.add('invalid-channel');
      const key = nonempty(root.upstream) ? root.upstream : root.id;
      const verifiable = has(root, 'channel')
        && (root.channel === 'direct' || nonempty(root.upstream));
      if (!has(root, 'channel')) warnings.add('observed-channel-undeclared');
      else if (root.channel !== 'direct' && !nonempty(root.upstream)) warnings.add('upstream-undeclared');
      keys.set(key, (!keys.has(key) || keys.get(key)) && verifiable);
    }
    return keys;
  }

  const left = rootKeys(roots(comparison.left));
  const right = rootKeys(roots(comparison.right));
  const path = id => fields.has(id) ? new Set([id, ...transitive(id, fields)]) : new Set();
  const leftPath = path(comparison.left);
  const rightPath = path(comparison.right);
  const sees = (a, b) => [...a].some(id =>
    array(fields.get(id)?.derivation?.available).some(other => b.has(other)));
  const comparandVisible = sees(leftPath, rightPath) || sees(rightPath, leftPath);
  if (comparandVisible) warnings.add('comparand-visible');
  let status = 'unknown';
  let sharedSources = [];
  let independentRoots = { left: [], right: [] };
  if (!problems.size) {
    sharedSources = sorted([...left.keys()].filter(key => right.has(key)));
    independentRoots = {
      left: sorted([...left.keys()].filter(key => left.get(key) && !right.has(key))),
      right: sorted([...right.keys()].filter(key => right.get(key) && !left.has(key))),
    };
    if (sharedSources.length) {
      status = independentRoots.left.length || independentRoots.right.length
        ? 'dependent-partial' : 'dependent';
    } else if ([...left.values(), ...right.values()].every(Boolean) && !comparandVisible) {
      status = 'independent';
    } else independentRoots = { left: [], right: [] };
  }
  const noDerivation = [...leftPath, ...rightPath].some(id => {
    const field = fields.get(id);
    return ['derived', 'reconstructed'].includes(field?.kind) && !has(field, 'derivation');
  });
  const limits = ['independent', 'dependent-partial'].includes(status) && noDerivation
    ? ['derivation-undeclared'] : [];
  return { status, sharedSources, independentRoots, problems: sorted(problems),
    warnings: sorted(warnings), limits, interpretation: `Declared lineage is ${status}.` };
}
