// Operator command for the configured ecosystem sources (registry/ecosystems.json). Read-only:
// nothing is sent to any platform, no agent is contacted, no directory result is followed.
//   node registry/sources.mjs check    -> reads every configured branch, writes registry/ecosystem-status.json
//   node registry/sources.mjs list     -> prints the configured sources
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readSource, discovery} from './connectors/index.mjs';

const config = JSON.parse(readFileSync('registry/ecosystems.json', 'utf8'));
const CONTRIBUTION = new Set(['github-comment', 'github-issue', 'moltbook-post', 'moltbook-comment',
  'thecolony-post', 'thecolony-comment', 'http-json-artifact']);
const name = /^[A-Za-z0-9_.-]+$/;

// Repository discussions have no anonymous public API: the operator's GitHub account reads them (GraphQL).
function readDiscussion(source) {
  const m = /^https:\/\/github\.com\/orgs\/([A-Za-z0-9_.-]+)\/discussions\/([1-9]\d*)$/.exec(source.url);
  const [owner, repo] = String(source.repository || '').split('/');
  if (!m || !name.test(owner || '') || !name.test(repo || '')) throw Error('Discussion address or backing repository not recognised');
  const query = `query{repository(owner:"${owner}",name:"${repo}"){discussion(number:${Number(m[2])}){url comments{totalCount} updatedAt}}}`;
  const data = JSON.parse(execFileSync('gh', ['api', 'graphql', '-f', 'query=' + query], {encoding: 'utf8'}));
  const d = data?.data?.repository?.discussion;
  if (!d || d.url !== source.url) throw Error('Discussion not found or address mismatch');
  return d;
}

// 07/10/2026 : lire les commentaires GitHub un par un demandait 103 lectures, quand l'accès anonyme en permet 60 par
// heure ; la vérification refusait donc de partir et ecosystem-status.json avait quatorze jours. Les commentaires
// d'un même ticket sont maintenant lus d'un coup, toujours sans compte, dans la liste du ticket (100 par page), puis
// servis au connecteur, qui les valide exactement comme une lecture à l'unité (identité, adresse, auteur, texte).
// L'empreinte du contenu ne change pas ; seule `raw_sha256`, que ce fichier ne garde pas, dépend de la forme reçue.
// Un commentaire absent de la liste repart en lecture à l'unité, et un 404 y reste un 404.
const COMMENTAIRE = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/issues\/([1-9]\d*)#issuecomment-([1-9]\d*)$/;
const ticketsGroupes = [...new Set(config.sources.filter(s => s.kind === 'community' && s.connector === 'github-comment')
  .map(s => COMMENTAIRE.exec(s.url)).filter(Boolean).map(m => `${m[1]}/${m[2]}/issues/${m[3]}`))];
const dejaLus = new Map();
async function lireLesListes() {
  for (const ticket of ticketsGroupes) {
    for (let page = 1; page <= 10; page++) {
      const r = await fetch(`https://api.github.com/repos/${ticket}/comments?per_page=100&page=${page}`, {credentials: 'omit',
        headers: {Accept: 'application/json', 'User-Agent': 'Attractor-ReadOnly-Connectors/0.1'}, signal: AbortSignal.timeout(15000)});
      // Un refus de quota n'est pas une panne de la source : on s'arrête sans rien écrire.
      if (r.status === 403 || r.status === 429) throw Error(`quota GitHub atteint en lisant ${ticket} (HTTP ${r.status})`);
      if (!r.ok) break;
      const liste = await r.json();
      const [proprietaire, depot] = ticket.split('/');
      for (const c of liste) dejaLus.set(`https://api.github.com/repos/${proprietaire}/${depot}/issues/comments/${c.id}`, c);
      if (liste.length < 100) break;
    }
  }
}
const servirDepuisLesListes = (url, init) => dejaLus.has(url)
  ? Promise.resolve(new Response(JSON.stringify(dejaLus.get(url)), {status: 200, headers: {'content-type': 'application/json; charset=utf-8'}}))
  : fetch(url, init);

async function check(source) {
  const base = {source_id: source.id, checked_at: new Date().toISOString()};
  try {
    if (source.kind === 'community' && CONTRIBUTION.has(source.connector)) {
      const r = await readSource(source, {fetchImpl: servirDepuisLesListes});
      return {...base, status: 'read_verified', evidence_url: r.source_url, content_hash: r.content_hash,
        detail: `Lecture anonyme réussie · auteur déclaré : ${r.author_declared ?? 'non renseigné'} · mise à jour : ${r.updated_at ?? 'inconnue'}`};
    }
    if (source.connector === 'github-discussion') {
      const d = readDiscussion(source);
      return {...base, status: 'read_verified', evidence_url: d.url,
        detail: `Lecture par le compte de l’opérateur · ${d.comments.totalCount} réponse(s) · dernière activité : ${d.updatedAt}`};
    }
    if (source.kind === 'directory' && ['hol', 'nanda', 'agntcy', 'mcp-registry', 'a2aregistry'].includes(source.connector)) {
      const r = await discovery({connector: source.connector, url: source.url, query: source.query, limit: source.limit,
        ...(source.media_type ? {media_type: source.media_type} : {})});
      const quoi = source.query ? `Recherche « ${source.query} »` : 'Lecture';
      const total = Number.isInteger(r.metadata?.total_reported) ? ` sur ${r.metadata.total_reported} annoncée(s)` : '';
      return {...base, status: 'read_verified', evidence_url: source.url,
        detail: `${quoi} : ${r.candidates.length} fiche(s) lue(s)${total} · aucun agent contacté ni ajouté`};
    }
    if (source.connector === 'documentation') {
      const r = await fetch(source.url, {method: 'GET', credentials: 'omit', signal: AbortSignal.timeout(10000)});
      return {...base, status: r.ok ? 'configured' : 'unavailable', evidence_url: source.url,
        detail: r.ok ? 'Documentation joignable · aucun service raccordé au fil' : `Documentation injoignable (HTTP ${r.status})`};
    }
    return {...base, status: 'not_connected', detail: 'Aucun connecteur pour cette source'};
  } catch (error) {
    return {...base, status: 'unavailable', detail: 'Lecture impossible : ' + String(error?.message || error).slice(0, 200)};
  }
}

const command = process.argv[2];
if (command === 'list') {
  for (const s of config.sources) console.log(`${s.id.padEnd(36)} ${s.ecosystem} · ${s.connector}`);
} else if (command === 'check') {
  // Anonymous GitHub reads are capped at 60 an hour. On 17 September 2026 the cap ran out mid-check and
  // sixteen public comments were written down as "unavailable". Refuse to start rather than record a
  // quota as an outage; the rate-limit endpoint itself does not count against the quota.
  // Since 7 October 2026 grouped comments cost one read per page of their ticket's list, not one each.
  const groupes = config.sources.filter(s => s.kind === 'community' && s.connector === 'github-comment' && COMMENTAIRE.test(s.url)).length;
  const github = config.sources.filter(s => CONTRIBUTION.has(s.connector) && String(s.connector).startsWith('github')).length
    - groupes + ticketsGroupes.length * 2;
  const quota = await fetch('https://api.github.com/rate_limit', {credentials: 'omit', signal: AbortSignal.timeout(10000)})
    .then(r => r.json()).then(j => j.rate).catch(() => null);
  const listes = quota && quota.remaining < github ? null : await lireLesListes().then(() => true, e => (console.error(e.message), false));
  if (!listes) {
    if (quota && quota.remaining < github) console.error(`Quota GitHub anonyme insuffisant : ${quota.remaining} lectures restantes pour ${github} lectures prévues.`
      + ` Relancer après ${new Date(quota.reset * 1000).toISOString()}.`);
    console.error("Rien n'a été écrit.");
    process.exitCode = 2;
  } else {
    const checks = [];
    for (const source of config.sources) checks.push(await check(source));
    const status = {checked_at: new Date().toISOString(), checks};
    writeFileSync('registry/ecosystem-status.json', JSON.stringify(status, null, 2) + '\n');
    for (const c of checks) console.log(`${c.status.padEnd(14)} ${c.source_id.padEnd(36)} ${c.detail}`);
  }
} else {
  throw Error('Usage: node registry/sources.mjs check|list');
}
