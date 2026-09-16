import { createHash } from 'node:crypto';

export const has = (value, key) => value !== null && typeof value === 'object'
  && Object.hasOwn(value, key);
export const object = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
export const obj = value => object(value) ? value : {};
export const array = value => Array.isArray(value) ? value : [];
export const nonempty = value => typeof value === 'string' && value.length > 0;
export const sorted = values => [...new Set(values)].sort();
export const ids = value => Array.isArray(value) && value.every(nonempty);
export const distinctIds = value => ids(value) && new Set(value).size === value.length;
export const channels = ['direct', 'cached', 'mirrored', 'republished'];
export const kinds = ['observed', 'derived', 'reconstructed', 'unknown'];
export const operations = ['measured', 'quoted', 'copied', 'computed', 'reconciled'];
export const actions = ['accept', 'verify', 're_derive', 'contest', 'modify', 'drop'];

// Reject non-JSON values rather than silently dropping or converting members.
function encode(value, path) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== 'object' || path.has(value)) throw new TypeError('Not JSON');
  path.add(value);
  let encoded;
  if (Array.isArray(value)) {
    const parts = [];
    for (let i = 0; i < value.length; i++) {
      if (!has(value, i)) throw new TypeError('Not JSON');
      parts.push(encode(value[i], path));
    }
    encoded = '[' + parts.join(',') + ']';
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) throw new TypeError('Not JSON');
    encoded = '{' + Object.keys(value).sort().map(key =>
      JSON.stringify(key) + ':' + encode(value[key], path)).join(',') + '}';
  }
  path.delete(value);
  return encoded;
}

export function canonical(value) {
  try { return encode(value, new Set()); } catch { return undefined; }
}

export function equal(left, right) {
  const a = canonical(left);
  return a !== undefined && a === canonical(right);
}

export function digest(value) {
  const encoded = canonical(value);
  return encoded === undefined ? undefined : createHash('sha256').update(encoded).digest('hex');
}

export function copy(value, seen = new Map()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  const result = Array.isArray(value) ? [] : {};
  seen.set(value, result);
  for (const key of Object.keys(value)) {
    Object.defineProperty(result, key, {
      value: copy(value[key], seen), enumerable: true, configurable: true, writable: true,
    });
  }
  return result;
}

export function without(value, key) {
  const result = {};
  for (const [name, member] of Object.entries(obj(value))) {
    if (name !== key) Object.defineProperty(result, name, {
      value: member, enumerable: true, configurable: true, writable: true,
    });
  }
  return result;
}

export function index(items, diagnostics, code, key = 'id') {
  const grouped = new Map();
  for (const item of array(items)) {
    const id = obj(item)[key];
    if (!nonempty(id)) { if (diagnostics) diagnostics.add(code); continue; }
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(item);
  }
  const result = new Map();
  for (const [id, entries] of grouped) {
    if (entries.length === 1) result.set(id, entries[0]);
    else if (diagnostics) diagnostics.add(code);
  }
  return result;
}

export function transitive(id, fields) {
  const reached = new Set();
  const stack = [...array(fields.get(id)?.sources)];
  while (stack.length) {
    const source = stack.pop();
    if (reached.has(source)) continue;
    reached.add(source);
    stack.push(...array(fields.get(source)?.sources));
  }
  return reached;
}

export function validBasis(basis) {
  return object(basis) && ['controlling', 'secondary', 'none'].includes(basis.citation)
    && (basis.citation === 'none' || nonempty(basis.sourceId));
}

export function validWitness(witness) {
  return Array.isArray(witness) && witness.length > 0
    && witness.every(item => object(item) && has(item, 'input') && has(item, 'output'));
}

export function reconciled(id, fields) {
  return [id, ...transitive(id, fields)].some(source =>
    fields.get(source)?.derivation?.operation === 'reconciled');
}
