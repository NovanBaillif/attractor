export const problem = {
  id: 'preserve-code-v1', title: 'Convertir un prix sans perdre une référence',
  objective: 'price devient amount numérique ; ref devient reference textuelle, zéros conservés ; enabled devient active booléen après normalisation de casse.',
  examples: [
    { input: { price: ' 12,50 ', ref: ' 00042 ', enabled: ' TRUE ' }, expected: { amount: 12.5, reference: '00042', active: true } },
    { input: { price: '0', ref: '007', enabled: 'False' }, expected: { amount: 0, reference: '007', active: false } },
  ],
  limits: 'Recette de normalisation, pas norme adoptée. Réussir les exemples ne garantit pas tous les cas.',
};
export function template() {
  return { slug: 'preserve-code', recipe: { fields: [
    { from: 'price', to: 'amount', steps: [] }, { from: 'ref', to: 'reference', steps: [] }, { from: 'enabled', to: 'active', steps: [] },
  ] }, examples: structuredClone(problem.examples), conventions: { problem: problem.id } };
}
export function draft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['slug', 'recipe', 'examples', 'conventions', 'parent_id'].includes(k))) throw Error('Brouillon : champs inconnus ou privés refusés.');
  if (typeof value.slug !== 'string' || !/^[a-z][a-z0-9-]{2,59}$/.test(value.slug) || !value.recipe || !Array.isArray(value.examples)) throw Error('Brouillon incomplet.');
  if (value.parent_id !== undefined && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(value.parent_id)) throw Error('Parent invalide.');
  if (JSON.stringify(value).length > 6000) throw Error('Brouillon limité à 6 000 caractères.');
  return value;
}
export function draftFragment(value) { return '#draft=' + encodeURIComponent(JSON.stringify(draft(value))); }
export function readDraft(fragment) {
  if (fragment.length > 36000 || !fragment.startsWith('#draft=')) throw Error('Lien de brouillon invalide.');
  return draft(JSON.parse(decodeURIComponent(fragment.slice(7))));
}
export function versionLink(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(id)) throw Error('Version invalide.');
  return '/contribute.html?version=' + id;
}
