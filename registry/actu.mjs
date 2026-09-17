// La veille d'ATTRACTOR : lit chaque jour les sources gratuites de registry/actu-sources.json, garde ce qui
// touche le projet (agents qui coopèrent, mémoire, provenance, protocoles), retire les doublons et écrit
// registry/actu.json. Lecture seule : aucun compte, aucun envoi, aucune adresse trouvée n'est suivie.
//   node registry/actu.mjs
// Écrit le 17 septembre 2026, à la demande de Novan : « attractor capte toutes les actu sur son blog ».
// Les titres restent dans leur langue ; seul un court extrait est gardé, avec le lien vers la source.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const JOURS_GARDES = 30, MAX_ARTICLES = 300, MUETTE_APRES_JOURS = 7;
const MAX_OCTETS = 2 * 1024 * 1024, DELAI_MS = 15000;

// ————— Lecture bornée —————
export async function lireTexte(url, {fetchImpl = fetch, maxOctets = MAX_OCTETS} = {}) {
  if (!Number.isInteger(maxOctets) || maxOctets < 1 || maxOctets > 8 * 1024 * 1024) throw Object.assign(Error('plafond invalide'), {code: 'taille'});
  const u = new URL(url);
  if (u.protocol !== 'https:') throw Object.assign(Error('HTTPS attendu'), {code: 'url'});
  const r = await fetchImpl(u.href, {method: 'GET', redirect: 'follow', credentials: 'omit', signal: AbortSignal.timeout(DELAI_MS),
    headers: {'User-Agent': 'Attractor-Veille/1.0 (+https://attractor-observatory-demo.vercel.app/actu)', Accept: 'application/json, application/xml, text/xml, */*'}});
  if (!r.ok) throw Object.assign(Error('HTTP ' + r.status), {code: 'http'});
  if (Number(r.headers.get('content-length')) > maxOctets) throw Object.assign(Error('réponse trop grande'), {code: 'taille'});
  const brut = Buffer.from(await r.arrayBuffer());
  if (brut.length > maxOctets) throw Object.assign(Error('réponse trop grande'), {code: 'taille'});
  return brut.toString('utf8');
}

// ————— Texte propre —————
const ENTITES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};
export function texte(valeur) {
  return String(valeur ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#'
      ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
      : ENTITES[e.toLowerCase()] ?? m)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const extrait = v => { const t = texte(v); return t.length > 280 ? t.slice(0, 277).replace(/\s+\S*$/, '') + '…' : t; };
const balise = (bloc, nom) => (bloc.match(new RegExp(`<${nom}\\b[^>]*>([\\s\\S]*?)</${nom}>`, 'i')) || [])[1] ?? '';
function date(v) { const t = Date.parse(texte(v)); return Number.isFinite(t) ? new Date(t).toISOString() : null; }
function lienSur(v) {
  try { const u = new URL(texte(v)); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; }
  catch { return null; }
}

// ————— Formats —————
export function lireRss(xml) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(([b]) => ({
    titre: texte(balise(b, 'title')), lien: lienSur(balise(b, 'link')),
    date: date(balise(b, 'pubDate') || balise(b, 'dc:date')), extrait: extrait(balise(b, 'description')), auteurs: []}));
}
export function lireAtom(xml) {
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(([b]) => {
    const liens = [...b.matchAll(/<link\b([^>]*)\/?>/gi)].map(([, a]) => ({
      href: (a.match(/href="([^"]+)"/i) || [])[1], rel: (a.match(/rel="([^"]+)"/i) || [])[1] || 'alternate'}));
    const lien = liens.find(l => l.rel === 'alternate')?.href ?? liens[0]?.href;
    return {titre: texte(balise(b, 'title')), lien: lienSur(lien), date: date(balise(b, 'published') || balise(b, 'updated')),
      extrait: extrait(balise(b, 'summary') || balise(b, 'content')),
      auteurs: [...b.matchAll(/<author\b[\s\S]*?<\/author>/gi)].map(([a]) => texte(balise(a, 'name'))).filter(Boolean)};
  });
}
export function lireHn(json, {jours, pointsMin = 0}, maintenant) {
  const depuis = maintenant - jours * 86400000;
  return (JSON.parse(json).hits || []).filter(h => (h.points ?? 0) >= pointsMin && Date.parse(h.created_at) >= depuis).map(h => ({
    titre: texte(h.title), lien: lienSur(h.url) ?? `https://news.ycombinator.com/item?id=${encodeURIComponent(h.objectID)}`,
    date: date(h.created_at), extrait: `${h.points} points, ${h.num_comments ?? 0} commentaires sur Hacker News`, auteurs: []}));
}
export function lireHfPapers(json) {
  return (JSON.parse(json) || []).map(p => ({titre: texte(p.title ?? p.paper?.title),
    lien: p.paper?.id ? `https://huggingface.co/papers/${encodeURIComponent(p.paper.id)}` : null,
    date: date(p.publishedAt ?? p.paper?.publishedAt), extrait: extrait(p.summary ?? p.paper?.summary),
    auteurs: (p.paper?.authors || []).map(a => texte(a.name)).filter(Boolean)}));
}
export function lireMoltbook(json) {
  return (JSON.parse(json).posts || []).filter(p => !p.is_spam && !p.is_deleted).map(p => ({titre: texte(p.title),
    lien: /^[0-9a-f-]{36}$/.test(String(p.id)) ? `https://www.moltbook.com/post/${p.id}` : null,
    date: date(p.created_at), extrait: extrait(p.content), auteurs: [texte(p.author?.name)].filter(Boolean)}));
}

// ————— Tri —————
export function pertinent(article, motsCles) {
  const t = `${article.titre} ${article.extrait}`.toLowerCase();
  return motsCles.filter(m => m.length <= 4 ? new RegExp(`(^|[^a-z0-9])${m.replace(/[^a-z0-9]/g, '')}([^a-z0-9]|$)`).test(t) : t.includes(m));
}
const cle = lien => { try { const u = new URL(lien); for (const p of [...u.searchParams.keys()]) if (/^utm_|^ref$/.test(p)) u.searchParams.delete(p); u.hash = ''; return u.href; } catch { return lien; } };

export async function collecter(config, avant, {fetchImpl = fetch, maintenant = Date.now()} = {}) {
  const etats = [], nouveaux = [];
  for (const s of config.sources) {
    const ancien = avant?.sources?.find(x => x.id === s.id);
    try {
      // Hacker News classe par pertinence sur toute son histoire : la fenêtre de temps se demande dans la requête.
      const url = s.format === 'hn'
        ? `${s.url}&numericFilters=${encodeURIComponent(`created_at_i>${Math.floor((maintenant - s.jours * 86400000) / 1000)},points>=${s.pointsMin ?? 0}`)}`
        : s.url;
      const corps = await lireTexte(url, {fetchImpl, ...(s.maxOctets ? {maxOctets: s.maxOctets} : {})});
      let lus = s.format === 'rss' ? lireRss(corps) : s.format === 'atom' ? lireAtom(corps)
        : s.format === 'hn' ? lireHn(corps, s, maintenant) : s.format === 'hf-papers' ? lireHfPapers(corps)
        : s.format === 'moltbook' ? lireMoltbook(corps) : (() => { throw Object.assign(Error('format inconnu'), {code: 'format'}); })();
      lus = lus.filter(a => a.titre && a.lien);
      if (s.auteur) lus = lus.filter(a => a.auteurs.includes(s.auteur));
      const gardes = lus.map(a => ({...a, pourquoi: pertinent(a, config.motsCles)}))
        .filter(a => !s.filtre || a.pourquoi.length).slice(0, s.max ?? 10);
      for (const a of gardes) nouveaux.push({id: cle(a.lien), titre: a.titre, lien: a.lien, date: a.date, extrait: a.extrait,
        source: s.id, sourceNom: s.nom, theme: s.theme, motsCles: a.pourquoi, vuLe: new Date(maintenant).toISOString()});
      etats.push({id: s.id, nom: s.nom, theme: s.theme, lien: s.url, etat: 'lue', lueLe: new Date(maintenant).toISOString(), lus: lus.length, gardes: gardes.length});
    } catch (e) {
      const muetteDepuis = ancien?.etat === 'muette' ? ancien.muetteDepuis : new Date(maintenant).toISOString();
      etats.push({id: s.id, nom: s.nom, theme: s.theme, lien: s.url, etat: 'muette', muetteDepuis, lueLe: ancien?.lueLe ?? null,
        erreur: `${e.code ?? e.name} : ${e.message}`.slice(0, 200),
        aRetirer: maintenant - Date.parse(muetteDepuis) > MUETTE_APRES_JOURS * 86400000});
    }
  }
  // Fusion avec les jours précédents : un article déjà vu garde sa première date de passage.
  const parCle = new Map((avant?.articles || []).map(a => [a.id, a]));
  const titres = new Set([...parCle.values()].map(a => a.titre.toLowerCase()));
  for (const a of nouveaux) {
    if (parCle.has(a.id)) continue;
    if (titres.has(a.titre.toLowerCase())) continue;
    parCle.set(a.id, a); titres.add(a.titre.toLowerCase());
  }
  const limite = maintenant - JOURS_GARDES * 86400000;
  const articles = [...parCle.values()]
    .filter(a => Date.parse(a.date ?? a.vuLe) >= limite)
    .sort((x, y) => String(y.date ?? y.vuLe).localeCompare(String(x.date ?? x.vuLe)))
    .slice(0, MAX_ARTICLES);
  return {releveeA: new Date(maintenant).toISOString(), outil: 'registry/actu.mjs',
    principe: 'Ce que le projet lit chaque jour, sans compte, dans des sources publiques et gratuites. Titres dans leur langue d’origine, court extrait, lien vers la source. Aucune de ces sources n’a validé ATTRACTOR.',
    sources: etats, articles};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(readFileSync('registry/actu-sources.json', 'utf8'));
  const avant = existsSync('registry/actu.json') ? JSON.parse(readFileSync('registry/actu.json', 'utf8')) : null;
  const actu = await collecter(config, avant);
  writeFileSync('registry/actu.json', JSON.stringify(actu, null, 2) + '\n');
  for (const s of actu.sources) console.log(`${s.etat.padEnd(7)} ${s.nom.padEnd(46)} ${s.etat === 'lue' ? `${s.gardes}/${s.lus}` : s.erreur}${s.aRetirer ? ' · MUETTE DEPUIS 7 JOURS' : ''}`);
  console.log(`\nregistry/actu.json écrit · ${actu.articles.length} article(s)`);
}
