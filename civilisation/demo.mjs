import { createHmac } from 'node:crypto';

/** Scripted citizens exercising the real kernel. No model identity or independence claimed. */
export function advanceDemo(world, operatorKey) {
  const call = (token, action, payload, id) => world.command(token, action, payload, `controlled-demo-v1:${id}`);
  const token = role => createHmac('sha256', operatorKey).update(`controlled-demo-v1:${role}`).digest('hex');
  const p = call(operatorKey, 'project', { title: 'Transmettre un prix sans perdre une référence',
    purpose: 'Composer une recette Attractor réutilisable : montant décimal français et référence conservée.',
    tests: [{ input: { price: '12,50', ref: '00042' }, expected: { amount: 12.5, reference: '00042' } },
      { input: { price: ' 8,20 ', ref: '007' }, expected: { amount: 8.2, reference: '007' } }] }, 'project');
  for (const [role, name, mandate] of [
    ['builder', 'Bâtisseur', 'Proposer et réviser les recettes de ce projet.'],
    ['reviewer', 'Contradicteur', 'Rejouer les critères du projet et conserver les échecs.'],
    ['user', 'Passeur', 'Réutiliser une version acceptée dans un autre contexte.'],
  ]) call(operatorKey, 'enrol', { name, role, mandate, projects: [p.id], budget: 12, credential: token(role) }, `enrol-${role}`);
  const s = world.snapshot(), versions = s.versions.filter(v => v.projectId === p.id);
  const latest = versions.at(-1);
  if (!latest || latest.status === 'rejected') {
    if (versions.length >= 2) return { done: true, message: 'Expérience arrêtée après deux propositions.' };
    const repaired = !!latest;
    return call(token('builder'), 'propose', { projectId: p.id, parentId: latest?.id,
      reason: repaired ? 'Le test avec espaces échoue : ajouter trim avant conversion. Préserver la référence textuelle.' : 'Réutiliser decimal-comma et number du registre ; copier la référence sans conversion.',
      recipe: { fields: [{ from: 'price', to: 'amount', steps: [...(repaired ? ['trim'] : []), 'decimal-comma', 'number'] },
        { from: 'ref', to: 'reference', steps: [] }] } }, `proposal-${versions.length}`);
  }
  if (latest.status === 'proposed') return call(token('reviewer'), 'review', { versionId: latest.id,
    reason: 'Exécuter tous les cas fixés par le projet ; aucun critère modifié par le proposant.' }, `review-${latest.id}`);
  if (latest.status === 'accepted' && latest.reuseCount === 0) return call(token('user'), 'reuse', {
    versionId: latest.id, input: { price: ' 19,90 ', ref: '00009' } }, 'reuse');
  return { done: true, message: latest.status === 'accepted' ? 'Une révision corrigée a été réutilisée. Coopération contrôlée, aucun appel à un modèle.' : 'Projet en attente de décision humaine.' };
}
