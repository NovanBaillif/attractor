import { template, draft, draftFragment, readDraft, versionLink } from './contribute-contract.js';
const $ = s => document.querySelector(s);
let token = '', selected = null, publishing = false;
function say(selector, value) { $(selector).textContent = value; }
async function api(path, body) {
  if (!token) {
    const r = await fetch('/api/v2/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entrypoint: 'registry', campaign: 'civilisation-first-brick' }) });
    const data = await r.json(); if (!r.ok) throw Error(data.error || 'Session indisponible.'); token = data.access_token;
  }
  const r = await fetch('/api/v2' + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json(); if (!r.ok) throw Error(data.error || 'Opération refusée.'); return data;
}
async function read(id) {
  versionLink(id); selected = await api('/recipes/' + id); const a = selected.artifact;
  $('#version').hidden = false; say('#version-title', a.slug); say('#version-detail', JSON.stringify({ recipe: a.recipe, examples: a.examples, verification: a.verification }, null, 2));
  const lineage = $('#lineage'); lineage.replaceChildren(document.createTextNode('Version ' + a.revision + '. '));
  if (a.parent_id) { const link = document.createElement('a'); link.href = versionLink(a.parent_id); link.textContent = 'Lire la version parente'; lineage.append(link); }
  $('#reuse-input').value = JSON.stringify(a.examples[0].input, null, 2); $('#reuse-output').value = '';
}
$('#proposal').value = JSON.stringify(template(), null, 2);
try {
  if (location.hash) { $('#proposal').value = JSON.stringify(readDraft(location.hash), null, 2); say('#draft-state', 'Brouillon reçu, non déposé. Relis son contenu avant publication.'); }
  else { const id = new URLSearchParams(location.search).get('version'); if (id) read(id).catch(e => say('#status', e.message)); }
} catch (e) { say('#status', e.message); }
$('#make-link').addEventListener('click', () => {
  try { $('#draft-link').value = location.origin + '/contribute.html' + draftFragment(JSON.parse($('#proposal').value)); say('#status', 'Lien préparé localement. Aucun dépôt effectué.'); }
  catch (e) { say('#status', e.message); }
});
$('#publish').addEventListener('submit', async e => {
  e.preventDefault(); if (publishing) return;
  let value; try { value = draft(JSON.parse($('#proposal').value)); } catch (err) { say('#status', err.message); return; }
  publishing = true; $('#publish-button').disabled = true;
  try {
    if (value.parent_id) { const parent = await api('/recipes/' + value.parent_id); value = { ...value, exposure_id: parent.exposure_id }; }
    const result = await api('/recipes', value);
    say('#status', 'Publiée après vérification des exemples. Ce résultat ne vaut pas adoption d’une norme.');
    $('#permalink').href = versionLink(result.artifact.id); $('#permalink').hidden = false;
    $('#proposal').readOnly = true;
  } catch (err) {
    say('#status', err.message + ' En cas de réponse réseau perdue, vérifie le registre avant de retenter.');
    publishing = false; $('#publish-button').disabled = false;
  }
});
$('#revise').addEventListener('click', () => {
  const a = selected.artifact;
  $('#proposal').readOnly = false; publishing = false; $('#publish-button').disabled = false; $('#consent').checked = false;
  $('#proposal').value = JSON.stringify({ slug: a.slug, recipe: a.recipe, examples: a.examples, conventions: a.conventions, parent_id: a.id }, null, 2);
  say('#draft-state', 'Révision en brouillon : modifie la recette ou ajoute un exemple. Le parent reste conservé.'); $('#proposal').focus();
});
$('#reuse').addEventListener('submit', async e => {
  e.preventDefault(); const button = $('#reuse button'); if (button.disabled) return; button.disabled = true;
  try { const result = await api('/recipes/' + selected.artifact.id + '/use', { exposure_id: selected.exposure_id, marker: selected.marker, input: JSON.parse($('#reuse-input').value), output: JSON.parse($('#reuse-output').value) }); say('#reuse-status', 'Réutilisation vérifiée côté serveur : ' + JSON.stringify(result)); }
  catch (err) { say('#reuse-status', err.message); button.disabled = false; }
});
