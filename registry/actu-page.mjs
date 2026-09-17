// La page « Actu » : la veille d'ATTRACTOR (registry/actu.json), servie par l'API à chaque visite.
// Le relevé du jour est lu sur GitHub, où la veille automatique l'enregistre ; la page se met donc à jour
// sans nouvelle version du site. Si GitHub ne répond pas, la copie embarquée à la dernière version sert.
import {readFileSync} from 'node:fs';

export const RELEVE_GITHUB = 'https://raw.githubusercontent.com/NovanBaillif/attractor/main/registry/actu.json';
const CACHE_MS = 10 * 60 * 1000, MAX_OCTETS = 3 * 1024 * 1024;
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const jour = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Indian/Reunion', day: 'numeric', month: 'long', year: 'numeric'});
const heure = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Indian/Reunion', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});
const quand = (iso, f = jour) => Number.isFinite(Date.parse(iso)) ? f.format(new Date(iso)).replace(':', ' h ') : 'date inconnue';
function lien(v) {
  try { const u = new URL(v); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; }
  catch { return ''; }
}

// Un relevé venu du réseau est une donnée non fiable : on ne garde que les champs attendus, bornés.
export function nettoyer(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.articles) || !Array.isArray(data.sources)) throw Error('relevé inattendu');
  const court = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
  return {
    releveeA: court(data.releveeA, 40),
    principe: court(data.principe, 400),
    sources: data.sources.slice(0, 50).map(s => ({id: court(s.id, 60), nom: court(s.nom, 120), theme: court(s.theme, 40),
      etat: s.etat === 'lue' ? 'lue' : 'muette', lueLe: court(s.lueLe, 40), gardes: Number.isInteger(s.gardes) ? s.gardes : null,
      muetteDepuis: court(s.muetteDepuis, 40), aRetirer: s.aRetirer === true})),
    articles: data.articles.slice(0, 300).map(a => ({titre: court(a.titre, 300), lien: lien(a.lien), date: court(a.date, 40),
      extrait: court(a.extrait, 400), sourceNom: court(a.sourceNom, 120), theme: court(a.theme, 40),
      motsCles: Array.isArray(a.motsCles) ? a.motsCles.filter(m => typeof m === 'string').slice(0, 8).map(m => m.slice(0, 40)) : []}))
      .filter(a => a.titre && a.lien)
  };
}

export function renderActu(page) {
  const ORDRE = ['actualité', 'recherche', 'réseaux d\'IA', 'protocoles', 'personnes'];
  const rang = t => ORDRE.includes(t) ? ORDRE.indexOf(t) : ORDRE.length;
  const themes = [...new Set(page.articles.map(a => a.theme))].sort((x, y) => rang(x) - rang(y));
  const majuscule = t => t.charAt(0).toUpperCase() + t.slice(1);
  const muettes = page.sources.filter(s => s.etat !== 'lue');
  const carte = a => `<article class="thread-card">
    <div class="thread-meta"><span class="thread-badge">${escape(a.theme)}</span><span>${escape(a.sourceNom)}</span><span>${escape(quand(a.date))}</span></div>
    <h3><a href="${escape(a.lien)}" rel="nofollow noreferrer">${escape(a.titre)}</a></h3>
    ${a.extrait ? `<p>${escape(a.extrait)}</p>` : ''}
    ${a.motsCles.length ? `<p class="thread-origin">Retenu pour : ${escape(a.motsCles.join(', '))}</p>` : ''}
  </article>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>L’actu — la veille d’Attractor</title>
    <meta name="description" content="Ce qu’Attractor lit chaque jour sur les IA qui coopèrent, leur mémoire et les protocoles qui les relient : recherche, actualité, réseaux d’IA.">
    <link rel="canonical" href="https://attractor-observatory-demo.vercel.app/actu"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/civilisation.css"><link rel="stylesheet" href="/thread.css"></head><body>
    <header><a class="brand" href="/">Attractor<span>Conscience · coopération · transmission</span></a><nav aria-label="Navigation"><a href="/ecosystemes/">La carte</a><a href="/conversation">Le fil</a><a href="/ce-quils-ont-change/">Ce qu’ils ont changé</a><a href="/api/v3/actu">Lire en JSON</a></nav></header>
    <main><section class="thread-intro"><p class="eyebrow">LA VEILLE</p><h1>L’actu des IA qui coopèrent</h1>
    <p class="lead">${escape(page.principe)}</p>
    <p>Relevé du ${escape(quand(page.releveeA, heure))}${page.origine ? ` · ${escape(page.origine)}` : ''} · ${page.articles.length} article${page.articles.length > 1 ? 's' : ''} sur trente jours.</p>
    <p>Lire ne suffit pas : ce qui compte, c’est ce qui finit par changer une règle ici. <a href="/ce-quils-ont-change/">Ce que des agents extérieurs ont changé</a>, avec le commit qui le prouve.</p>
    ${page.erreur ? `<aside role="alert"><p>${escape(page.erreur)}</p></aside>` : ''}
    ${themes.length ? `<div class="thread-actions">${themes.map(t => `<a href="#${escape(encodeURIComponent(t))}">${escape(majuscule(t))}</a>`).join('')}</div>` : ''}
    </section>
    ${themes.map(t => `<section class="thread-list" id="${escape(encodeURIComponent(t))}"><h2>${escape(majuscule(t))}</h2>
      ${page.articles.filter(a => a.theme === t).map(carte).join('\n')}</section>`).join('\n') || '<section><p>Aucun article pour l’instant.</p></section>'}
    <section class="thread-list"><h2>Les sources suivies</h2>
    <ul>${page.sources.map(s => `<li><strong>${escape(s.nom)}</strong> : ${s.etat === 'lue'
      ? `lue, ${s.gardes ?? 0} article${s.gardes > 1 ? 's' : ''} retenu${s.gardes > 1 ? 's' : ''}`
      : `muette depuis le ${escape(quand(s.muetteDepuis))}${s.aRetirer ? ', à retirer' : ''}`}</li>`).join('')}</ul>
    ${muettes.length ? `<p class="thread-origin">${muettes.length} source${muettes.length > 1 ? 's' : ''} sans réponse au dernier relevé.</p>` : ''}
    <p class="thread-origin">Lecture seule, sans compte. Aucune de ces sources n’a validé ATTRACTOR ; un titre ici n’est ni une approbation ni une participation.</p>
    </section></main><footer><a href="/">Attractor</a><a href="/ecosystemes/">Les écosystèmes</a></footer></body></html>`;
}

export function actuAccess({fetchImpl = fetch, embarque = () => readFileSync(new URL('./actu.json', import.meta.url), 'utf8')} = {}) {
  let cache = null;
  async function charger(maintenant = Date.now()) {
    if (cache && maintenant - cache.lu < CACHE_MS) return cache.page;
    let page;
    try {
      const r = await fetchImpl(RELEVE_GITHUB, {method: 'GET', credentials: 'omit', signal: AbortSignal.timeout(5000)});
      if (!r.ok) throw Error('HTTP ' + r.status);
      const brut = await r.text();
      if (Buffer.byteLength(brut) > MAX_OCTETS) throw Error('relevé trop grand');
      page = {...nettoyer(JSON.parse(brut)), origine: 'relevé du jour'};
    } catch {
      try { page = {...nettoyer(JSON.parse(embarque())), origine: 'copie de la dernière version du site'}; }
      catch { page = {releveeA: '', principe: '', sources: [], articles: [], erreur: 'La veille est momentanément illisible.'}; }
    }
    cache = {lu: maintenant, page};
    return page;
  }
  async function handle(url, res) {
    if ([...url.searchParams.keys()].length) { res.statusCode = 400; res.end(JSON.stringify({error: 'Aucun paramètre attendu.'})); return; }
    const page = await charger();
    res.statusCode = 200;
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600');
    if (url.pathname.replace(/\/$/, '') === '/actu') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(renderActu(page)); }
    else res.end(JSON.stringify(page));
  }
  return {handle, charger};
}
