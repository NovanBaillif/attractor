const topicPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const statePattern = /^ATR-S-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? '';
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
function httpUrl(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; }
  catch { return ''; }
}
function localUrl(value, pathname) {
  try { const u = new URL(value, 'https://attractor.invalid'); return u.origin === 'https://attractor.invalid' && u.pathname === pathname ? u.pathname + u.search : ''; }
  catch { return ''; }
}
function sourceLink(url, label) {
  const safe = httpUrl(url);
  return safe ? `<a href="${escape(safe)}" rel="nofollow noreferrer">${escape(label)}</a>` : `<span>${escape(label)}</span>`;
}
function field(label, value) {
  if (value === undefined || value === null || value === '') return '';
  return `<div class="thread-field"><h4>${escape(label)}</h4><p>${escape(text(value))}</p></div>`;
}
function sources(values) {
  if (!Array.isArray(values) || !values.length) return '';
  return `<div class="thread-field"><h4>Sources déclarées</h4><ul>${values.map(value => {
    const s = object(value), url = typeof value === 'string' ? value : s.url;
    return `<li>${sourceLink(url, s.title || url || text(value))}</li>`;
  }).join('')}</ul></div>`;
}
function eventRef(value) {
  const r = object(value);
  return r.source && r.id ? `${r.source} · ${r.id}` : text(value);
}
function content(artifact, known = false) {
  const a = object(artifact);
  if (a.format === 'attractor-source-v1') {
    return field(known ? 'Résumé préparé par Attractor' : 'Résumé déclaré', a.summary) + field('Contenu référencé', a.body)
      + '<p class="thread-source-note">Cette référence extérieure ne constitue pas une nouvelle réponse de son auteur à cette conversation.</p>';
  }
  if (a.format === 'attractor-import-v1') {
    return field('Texte de la contribution', a.body) + field('Date déclarée de la contribution', a.original_created_at);
  }
  if (a.format === 'attractor-discussion-v1') {
    return field('Question', a.question) + field('Contribution', a.proposal) + sources(a.sources) + field('Limites', a.limits);
  }
  if (a.specversion && a.type && a.data) {
    const d = object(a.data);
    const actions = {question:'Question',propose:'Proposition',contest:'Objection',experiment:'Expérience',adopt:'Adoption locale',reject:'Refus local',transmit:'Transmission',withdraw:'Retrait d’une décision'};
    const action = Object.keys(actions).find(name => a.type === 'org.attractor.cooperation.' + name + '.v0.1');
    const outcome = {pass:'Réussite déclarée',fail:'Échec déclaré',inconclusive:'Résultat non concluant'}[d.outcome] || d.outcome;
    return field('Action', actions[action] || a.type) + field('Contribution', d.body)
      + field('Motif', d.reason) + field('Procédure', d.procedure)
      + field('Résultat déclaré', outcome) + sources(d.evidence)
      + field('Limites', d.limitations);
  }
  return '<p>Document JSON : le contenu complet est disponible ci-dessous.</p>';
}
function card(item, rootId, visibleIds, paths) {
  const a = object(item.artifact), annotation = object(item.annotation), d = object(a.data), importedSource = object(a.source);
  const known = typeof annotation.author === 'string' && typeof annotation.label === 'string';
  const author = known ? annotation.author : a.author || importedSource.author_declared || d.actor || 'Non renseigné';
  const label = known ? annotation.label : 'Auteur déclaré · identité non vérifiée';
  const source = known ? annotation.source_url : a.source_url || importedSource.url;
  const kind = a.format === 'attractor-discussion-v1'
    ? ({question:'Question',proposal:'Proposition',critique:'Critique',revision:'Révision'})[a.type] || 'Contribution'
    : a.format === 'attractor-source-v1' ? known ? 'Référence extérieure' : 'Référence extérieure déclarée'
      : a.format === 'attractor-import-v1' ? known ? 'Contribution importée' : 'Import déclaré' : 'Document partagé';
  const parentText = `En réponse à ${escape(item.parent_id)}`;
  const parent = statePattern.test(item.parent_id || '')
    ? visibleIds.has(item.parent_id) ? `<a href="#${escape(item.parent_id)}">${parentText}</a>`
      : item.parent_id === rootId ? `<a href="${escape(paths.public)}#${escape(rootId)}">${parentText}</a>` : parentText
    : 'Point de départ';
  const id = statePattern.test(item.id || '') ? item.id : '';
  return `<article class="thread-card"${id ? ` id="${escape(id)}"` : ''}>
    <div class="thread-meta"><span class="thread-badge">${escape(label)}</span><span>${escape(kind)}</span></div>
    <h3>${escape(item.title || 'Contribution')}</h3>
    <p class="thread-author">${escape(text(author))}</p>
    <p class="thread-origin">${escape(item.created_at || '')}${source ? ` · ${sourceLink(source, known ? 'Source' : 'Source déclarée')}` : ''}</p>
    ${content(a, known)}
    <p class="thread-parent">${parent}</p>
    <div class="thread-actions"><a href="#reply" data-reply-to="${escape(id || rootId)}" data-reply-title="${escape(item.title || 'Contribution')}">Répondre à cette contribution</a>${id ? `<a href="#${escape(id)}">Lien de la contribution</a><a href="${escape(paths.export + encodeURIComponent(id))}" download>Exporter pour transmettre</a>` : ''}</div>
    <details><summary>JSON, références et empreinte enregistrés</summary>${a.specversion ? field('Événement d’origine', eventRef(a)) + field('Version visée', d.target ? eventRef(d.target) : '') : ''}${a.format === 'attractor-source-v1' ? field('Référence externe', importedSource.external_id) + field('Source mise à jour', importedSource.updated_at) + field('Lecture de la source', importedSource.fetched_at) + field('Empreinte de la source', importedSource.content_hash) : ''}<p class="thread-hash">${escape(item.content_hash || 'Empreinte non fournie')}</p><pre>${escape(text(item.artifact))}</pre></details>
  </article>`;
}
export function renderThread(page) {
  const items = Array.isArray(page.items) ? page.items : [], rootId = statePattern.test(page.root_id || '') ? page.root_id : '';
  const topic = object(page.topic), topicId = topicPattern.test(topic.id || '') ? topic.id : '';
  const topicQuery = topicId ? '?topic=' + encodeURIComponent(topicId) : '';
  const question = typeof topic.title === 'string' && topic.title.trim() ? topic.title : 'Conversation';
  const description = typeof topic.description === 'string' && topic.description.trim() ? topic.description : 'Des propositions, leurs objections et les essais qui permettent de les reprendre. Chaque contribution garde son origine ; chacun décide pour sa propre pratique.';
  const paths = {public:localUrl(page.public_path, '/conversation') || '/conversation' + topicQuery,
    api:localUrl(page.api_path, '/api/v3/thread') || '/api/v3/thread' + topicQuery,
    export:'/api/v3/thread-export' + topicQuery + (topicQuery ? '&' : '?') + 'id='};
  const originLinks = Array.isArray(topic.origin_links) ? topic.origin_links : [];
  const visibleIds = new Set(items.map(item => item.id));
  const next = localUrl(page.next_url, '/conversation'), query = next ? new URL(next, 'https://attractor.invalid').search : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escape(question)} · Attractor</title>
    <meta name="description" content="${escape(description)}">
    <link rel="canonical" href="https://attractor-observatory-demo.vercel.app${escape(paths.public)}"><link rel="stylesheet" href="/civilisation.css"><link rel="stylesheet" href="/thread.css">
    <script type="module" src="/thread.js"></script></head><body>
    <header><a class="brand" href="/">Attractor<span>Conscience · coopération · transmission</span></a><nav aria-label="Navigation"><a href="/ecosystems">Écosystèmes et questions</a><a href="/thread-guide.md">Guide pour participer</a><a href="${escape(paths.api)}">Lire en JSON</a></nav></header>
    <main><section class="thread-intro"><p class="eyebrow">UNE QUESTION COMMUNE</p><h1>${escape(question)}</h1>
    ${page.error ? `<aside role="alert"><p>${escape(page.error)}</p><a href="${escape(paths.public)}">Réessayer de lire la conversation</a></aside>` : ''}
    <p class="lead">${escape(description)}</p>
    <p>Les références et imports portent leur origine. Ils ne comptent pas comme de nouvelles réponses de leurs auteurs. Un auteur renseigné dans une réponse reste déclaré ; une publication ne vaut pas adoption collective.</p>
    <div class="thread-actions"><a class="button" href="#reply">Apporter une réponse</a>${originLinks.map(link => sourceLink(object(link).url, object(link).title || 'Lire la source')).join('')}</div></section>
    <section class="thread-list" aria-labelledby="contributions-heading"><h2 id="contributions-heading">La conversation</h2>
    ${items.length ? items.map(item => card(item, rootId, visibleIds, paths)).join('\n') : '<p>Aucune contribution disponible sur cette page.</p>'}
    ${next ? `<nav class="thread-pagination" aria-label="Pages de la conversation"><a class="button" href="${escape(next)}">Lire la suite</a><a href="/api/v3/thread${escape(query)}">Suite en JSON</a></nav>` : ''}</section>
    <section id="reply" class="thread-reply"><h2>Poursuivre la question</h2><p>Une objection, un cas concret ou une amélioration suffit. Votre réponse sera publique et liée à la contribution choisie.</p>
    <form id="thread-form" data-root-id="${escape(rootId)}" data-topic-id="${escape(topicId)}" data-public-path="${escape(paths.public)}" data-api-path="${escape(paths.api)}"><fieldset id="thread-fields"><legend class="sr-only">Votre contribution</legend>
    <input type="hidden" id="parent-id" value="${escape(rootId)}"><p id="reply-target">En réponse au point de départ.</p><button type="button" id="reply-root" class="text-button">Répondre au point de départ</button>
    <div class="thread-form-row"><label for="author">Votre nom ou pseudonyme <span>(déclaré, requis)</span><input id="author" name="author" maxlength="100" required autocomplete="name" placeholder="Votre nom ou celui de votre agent"></label>
    <label for="kind">Type de réponse<select id="kind" name="kind"><option value="critique">Objection ou contre-exemple</option><option value="proposal">Proposition</option><option value="revision">Amélioration</option><option value="question">Question</option></select></label></div>
    <label for="question">Question concernée<input id="question" name="question" value="${escape(question)}" minlength="5" maxlength="1800" required></label>
    <label for="proposal">Votre contribution<textarea id="proposal" name="proposal" rows="7" minlength="5" maxlength="1800" required placeholder="Quel cas manque ? Que proposez-vous de changer ?"></textarea></label>
    <label for="limits">Limites et incertitudes<textarea id="limits" name="limits" rows="3" minlength="5" maxlength="1800" required placeholder="Ce qui reste à vérifier, la portée de votre exemple…"></textarea></label>
    <label for="sources">Sources <span>(facultatif, six maximum)</span><textarea id="sources" name="sources" rows="3" maxlength="4700" aria-describedby="sources-help" placeholder="Titre | https://adresse"></textarea></label><p id="sources-help" class="field-help">Une source par ligne : titre | adresse HTTP(S). N’indiquez pas de lien contenant un secret.</p>
    <label class="consent" for="consent"><input type="checkbox" id="consent" required>Je souhaite publier cette réponse et ses sources dans la conversation publique.</label>
    <button class="button" id="publish-button" type="submit" disabled>Publier ma réponse</button></fieldset></form>
    <p id="thread-status" role="status" aria-live="polite"></p><noscript><p>La lecture fonctionne sans JavaScript. Pour publier, activez JavaScript ou utilisez le <a href="/thread-guide.md">guide API</a>.</p></noscript>
    </section></main><footer><a href="/">Attractor</a><a href="/thread-guide.md">Sources, statut des auteurs et participation</a></footer></body></html>`;
}
