// Deliberately bounded subset; unsupported keywords are rejected, never ignored.
const keywords = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'description', 'title']);
const types = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];
export function checkSchema(schema, depth = 0) {
  if (depth > 12 || !schema || typeof schema !== 'object' || Array.isArray(schema)) throw Error('Schéma invalide ou profondeur supérieure à 12.');
  for (const key of Object.keys(schema)) if (!keywords.has(key)) throw Error(`Mot-clé non pris en charge : ${key}`);
  if (schema.type !== undefined && !types.includes(schema.type)) throw Error('Type de schéma non pris en charge.');
  if (schema.required !== undefined && (!Array.isArray(schema.required) || !schema.required.every(x => typeof x === 'string'))) throw Error('required doit être une liste de noms.');
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== 'boolean') throw Error('additionalProperties doit être booléen.');
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || !schema.enum.length)) throw Error('enum doit être une liste non vide.');
  for (const key of ['minimum', 'maximum', 'minLength', 'maxLength']) if (schema[key] !== undefined && (typeof schema[key] !== 'number' || !Number.isFinite(schema[key]) || (key.endsWith('Length') && (!Number.isInteger(schema[key]) || schema[key] < 0)))) throw Error(`Limite invalide : ${key}`);
  if (schema.properties !== undefined) {
    if (!schema.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) throw Error('properties doit être un objet.');
    for (const child of Object.values(schema.properties)) checkSchema(child, depth + 1);
  }
  if (schema.items !== undefined) checkSchema(schema.items, depth + 1);
}
function equal(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && equal(a[k], b[k]));
}
export function validate(data, schema) {
  checkSchema(schema);
  const errors = [];
  function visit(value, rule, path, depth) {
    if (errors.length >= 100) return;
    if (depth > 24) { errors.push({path, message:'Profondeur maximale dépassée.'}); return; }
    const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (rule.type && !(rule.type === kind || rule.type === 'integer' && Number.isInteger(value))) { errors.push({path, message:`Type attendu : ${rule.type}; reçu : ${kind}.`}); return; }
    if (rule.enum && !rule.enum.some(v => equal(v, value))) errors.push({path, message:'Valeur absente de enum.'});
    if (kind === 'object') {
      for (const key of rule.required || []) if (!Object.hasOwn(value, key)) errors.push({path, message:`Propriété obligatoire : ${key}.`});
      for (const [key, child] of Object.entries(value)) {
        const next = `${path}/${key.replaceAll('~','~0').replaceAll('/','~1')}`;
        if (Object.hasOwn(rule.properties || {}, key)) visit(child, rule.properties[key], next, depth + 1);
        else if (rule.additionalProperties === false) errors.push({path:next, message:'Propriété supplémentaire interdite.'});
      }
    }
    if (kind === 'array' && rule.items) value.forEach((v, i) => visit(v, rule.items, `${path}/${i}`, depth + 1));
    if (kind === 'number') for (const [key, bad] of [['minimum',value < rule.minimum],['maximum',value > rule.maximum]]) if (bad) errors.push({path,message:`${key} : ${rule[key]}.`});
    if (kind === 'string') for (const [key, bad] of [['minLength',[...value].length < rule.minLength],['maxLength',[...value].length > rule.maxLength]]) if (bad) errors.push({path,message:`${key} : ${rule[key]}.`});
  }
  visit(data, schema, '', 0);
  return {valid:errors.length === 0, errors:errors.slice(0,100)};
}
