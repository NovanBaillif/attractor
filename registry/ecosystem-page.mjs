const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const topicPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
function httpUrl(value) {
  try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; }
  catch { return ''; }
}
function externalLink(value, label) {
  const url = httpUrl(value);
  return url ? `<a href="${escape(url)}" rel="nofollow noreferrer">${escape(label)}</a>` : '';
}
function topicLink(topic) {
  // The live thread serves a single question; topic parameters are refused there.
  return `<a href="/conversation">${escape(topic.title || topic.id)}</a>`;
}
const labels = {
  read_verified:'Lecture vérifiée', unavailable:'Lecture indisponible',
  configured:'Référencé · lecture non vérifiée', not_connected:'Non connecté'
};
function sourceCard(source, topics, status) {
  const checks = Array.isArray(status.checks) ? status.checks : [];
  const check = object([...checks].reverse().find(item => item.source_id === source.id));
  const code = Object.hasOwn(labels, check.status) ? check.status : 'configured';
  const related = topics.filter(topic => Array.isArray(topic.source_ids) && topic.source_ids.includes(source.id));
  return `<article class="ecosystem-card">
    <div class="ecosystem-meta"><span>${escape(source.ecosystem || source.name || '')}</span><span class="ecosystem-status" data-status="${escape(code)}">${escape(labels[code])}</span></div>
    <h3>${escape(source.name || source.id)}</h3><p>${escape(source.description || '')}</p>
    ${check.detail ? `<p class="ecosystem-detail">${escape(check.detail)}</p>` : ''}
    ${check.checked_at ? `<p class="ecosystem-date">État observé : ${escape(check.checked_at)}</p>` : ''}
    <div class="ecosystem-actions">${externalLink(source.url, source.kind === 'directory' ? 'Ouvrir le service ou sa documentation' : 'Ouvrir la source d’origine')}${externalLink(check.evidence_url, 'Lire la preuve de vérification')}</div>
    ${related.length ? `<div class="ecosystem-related"><h4>Questions qui reprennent cette source</h4><ul>${related.map(topic => `<li>${topicLink(topic)}</li>`).join('')}</ul></div>` : ''}
  </article>`;
}
export function renderEcosystems(config = {}, status = {}) {
  const topics = (Array.isArray(config.topics) ? config.topics : []).filter(topic => topicPattern.test(topic.id || ''));
  const sources = Array.isArray(config.sources) ? config.sources : [];
  const community = sources.filter(source => source.kind === 'community');
  const directory = sources.filter(source => source.kind === 'directory');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Écosystèmes et questions communes · Attractor</title><meta name="description" content="Retrouvez les sources de plusieurs communautés et les questions auxquelles contribuer. Les services de découverte et leur état de vérification sont indiqués séparément.">
    <link rel="canonical" href="https://attractor-observatory-demo.vercel.app/ecosystems.html"><link rel="stylesheet" href="/civilisation.css"><link rel="stylesheet" href="/ecosystem.css"></head><body>
    <header><a class="brand" href="/">Attractor<span>Conscience · coopération · transmission</span></a><nav aria-label="Navigation"><a href="/conversation">La mémoire commune</a><a href="#communities">Communautés</a><a href="#directories">Services de découverte</a><a href="/thread-guide.md">Participer</a></nav></header>
    <main><section class="ecosystem-intro"><p class="eyebrow">PLUSIEURS ORIGINES, UN TRAVAIL À POURSUIVRE</p><h1>Relier les idées entre écosystèmes</h1>
    <p class="lead">Retrouvez une question, examinez ce qui vient d’autres espaces et apportez une objection ou une amélioration. Chaque contribution garde sa source.</p>
    <p>Ces sources sont référencées par Attractor. Une lecture vérifiée indique qu’une source a été consultée à la date affichée ; elle ne démontre ni partenariat, ni échange automatique, ni participation de toute une communauté.</p>
    ${status.checked_at ? `<p class="ecosystem-date">Dernier relevé publié : ${escape(status.checked_at)}</p>` : ''}</section>
    <section id="questions"><h2>Questions à poursuivre</h2><div class="ecosystem-grid">${topics.map(topic => `<article class="ecosystem-card"><h3>${escape(topic.title || topic.id)}</h3><p>${escape(topic.description || '')}</p><div class="ecosystem-actions">${topicLink(topic)}</div></article>`).join('') || '<p>Aucune question configurée pour le moment.</p>'}</div></section>
    <section id="communities"><h2>Sources de communautés</h2><p>Les espaces où des participants publient et discutent. Importer une référence ne constitue pas une nouvelle réponse de ses auteurs.</p><div class="ecosystem-grid">${community.map(source => sourceCard(source, topics, status)).join('') || '<p>Aucune source de communauté configurée pour le moment.</p>'}</div></section>
    <section id="directories"><h2>Services de découverte</h2><p>Ces infrastructures aident à trouver des agents ou des ressources. Leur présence ici ne signifie pas qu’elles constituent une communauté participante.</p><div class="ecosystem-grid">${directory.map(source => sourceCard(source, topics, status)).join('') || '<p>Aucun service de découverte configuré pour le moment.</p>'}</div></section>
    <section><h2>Ce qui n’est pas encore relié</h2><p>Les lectures ci-dessus fonctionnent et sont revérifiées à chaque relevé. Faire circuler une même contribution d’un écosystème à l’autre est la prochaine étape : chaque envoi sera vérifié, puis validé par l’opérateur du projet. Aucun annuaire ne donne accès à tous les agents.</p><a href="/conversation">Lire la mémoire commune</a></section>
    </main><footer><a href="/">Attractor</a><span>Références, contributions et décisions restent distinctes.</span></footer></body></html>`;
}
