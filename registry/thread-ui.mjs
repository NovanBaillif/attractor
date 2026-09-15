const $ = selector => document.querySelector(selector);
const form = $('#thread-form');
const rootId = form.dataset.rootId;
const idPattern = /^ATR-S-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
let token = '', busy = false, publicationUncertain = false;
const status = value => { $('#thread-status').textContent = value; };
function published(id, pageUrl = '/conversation') {
  status('Réponse publiée : ' + id + '.');
  const link = document.createElement('a');
  link.href = pageUrl + '#' + id;
  link.textContent = 'Ouvrir la conversation';
  $('#thread-status').append(' ', link);
  return link.href;
}
async function findPublished(id) {
  let conversation = '/conversation';
  for (let page = 0; page < 100; page++) {
    const url = new URL(conversation, location.origin);
    if (url.pathname === '/api/v3/thread') url.pathname = '/conversation';
    if (url.origin !== location.origin || url.pathname !== '/conversation') throw Error('Lien de pagination invalide.');
    const response = await fetch('/api/v3/thread' + url.search, {redirect:'error', signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw Error('La conversation est temporairement indisponible.');
    const data = await response.json();
    if (data.items?.some(item => item.id === id)) return url.pathname + url.search;
    if (!data.next_url) return '';
    conversation = data.next_url;
  }
  return '';
}
async function request(path, body, authenticated = true) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(path, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: {'Content-Type':'application/json', ...(authenticated ? {Authorization:'Bearer ' + token} : {})},
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(typeof data.error === 'string' ? data.error : 'Opération refusée.');
      error.rejected = response.status >= 400 && response.status < 500;
      throw error;
    }
    return data;
  } finally { clearTimeout(timer); }
}
function value() {
  const parent = $('#parent-id').value;
  if (!idPattern.test(rootId) || !idPattern.test(parent)) throw Error('Contribution parente invalide. Rechargez la conversation.');
  const artifact = {format:'attractor-discussion-v1', type:$('#kind').value, thread:rootId};
  for (const key of ['question','proposal','limits']) {
    const v = $('#' + key).value.trim();
    if (v.length < 5 || v.length > 1800) throw Error('Question, contribution et limites : entre 5 et 1800 caractères chacune.');
    artifact[key] = v;
  }
  const author = $('#author').value.trim();
  if (!author || author.length > 100 || /[\u0000-\u001f\u007f]/.test(author)) throw Error('Indiquez un nom ou pseudonyme de 1 à 100 caractères, sans caractère de contrôle.');
  artifact.author = author;
  artifact.sources = $('#sources').value.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const index = line.indexOf('|'), title = line.slice(0, index).trim(), url = line.slice(index + 1).trim();
    if (index < 1 || !title || title.length > 160 || url.length > 600) throw Error('Chaque source doit avoir la forme « titre | https://adresse ».');
    let parsed; try { parsed = new URL(url); } catch { throw Error('Adresse de source invalide.'); }
    if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw Error('Une source doit être HTTP(S), sans identifiants dans l’adresse.');
    return {title, url};
  });
  if (artifact.sources.length > 6) throw Error('Six sources maximum.');
  if (new TextEncoder().encode(JSON.stringify(artifact)).length > 11000) throw Error('Contribution trop longue. Raccourcissez le texte ou les sources.');
  return {artifact, parent};
}
function selectParent(id, title) {
  if (busy || !idPattern.test(id)) return;
  $('#parent-id').value = id;
  $('#reply-target').textContent = id === rootId ? 'En réponse au point de départ.' : 'En réponse à : ' + title;
  $('#consent').checked = false;
}
document.querySelectorAll('[data-reply-to]').forEach(link => link.addEventListener('click', event => {
  if (busy) { event.preventDefault(); return; }
  selectParent(link.dataset.replyTo, link.dataset.replyTitle);
}));
$('#reply-root').addEventListener('click', () => selectParent(rootId, 'Point de départ'));
$('#publish-button').disabled = !idPattern.test(rootId);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || publicationUncertain || !$('#consent').checked || !form.reportValidity()) return;
  let draft;
  try { draft = value(); } catch (error) { status(error.message); return; }
  busy = true; $('#thread-fields').disabled = true;
  status('Publication en cours…');
  let publicationStarted = false;
  let publishedId = '';
  try {
    if (!token) {
      const session = await request('/api/v2/sessions', {entrypoint:'docs', campaign:'civilisation-thread'}, false);
      if (typeof session.access_token !== 'string' || !session.access_token) throw Error('Session indisponible.');
      token = session.access_token;
    }
    const parent = await request('/api/v3/retrieve_state', {id:draft.parent});
    if (parent.state?.id !== draft.parent || typeof parent.read_receipt !== 'string' || !parent.read_receipt) throw Error('Lecture de la contribution parente non confirmée.');
    publicationStarted = true;
    const result = await request('/api/v3/share_state', {
      visibility:'public', title:draft.artifact.question.slice(0,120), kind:'json',
      tags:['civilisation-discussion'], artifact:draft.artifact,
      parent_id:draft.parent, read_receipt:parent.read_receipt
    });
    if (!idPattern.test(result.state?.id || '')) throw Error('La réponse ne contient pas de lien de publication valide.');
    publishedId = result.state.id;
    published(publishedId);
    const page = await findPublished(publishedId);
    if (page) location.assign(published(publishedId, page));
    else $('#thread-status').append(' La réponse est enregistrée ; sa page n’a pas encore été retrouvée. Ne la republiez pas.');
  } catch (error) {
    if (publishedId) {
      published(publishedId);
      $('#thread-status').append(' L’affichage du fil est temporairement indisponible. Votre réponse est enregistrée ; ne la republiez pas.');
      return;
    }
    busy = false; $('#thread-fields').disabled = false;
    publicationUncertain = publicationStarted && !error.rejected;
    $('#publish-button').disabled = publicationUncertain;
    const detail = error.name === 'AbortError' ? 'Le serveur n’a pas répondu dans le délai prévu.' : error.message;
    status(detail + (publicationUncertain
      ? ' La réponse a peut-être été publiée. Votre brouillon est conservé ici et le bouton est verrouillé pour éviter un doublon. Consultez la conversation dans un autre onglet avant toute nouvelle publication.'
      : ' Votre brouillon est conservé. Vous pouvez corriger puis réessayer.'));
    if (publicationUncertain) {
      const link = document.createElement('a');
      link.href = '/conversation'; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = 'Vérifier la conversation dans un nouvel onglet';
      $('#thread-status').append(' ', link);
    }
  }
});
