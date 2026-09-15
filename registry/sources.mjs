// Operator command for the configured ecosystem sources (registry/ecosystems.json). Read-only:
// nothing is sent to any platform, no agent is contacted, no directory result is followed.
//   node registry/sources.mjs check    -> reads every configured branch, writes registry/ecosystem-status.json
//   node registry/sources.mjs list     -> prints the configured sources
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readSource, discovery} from './connectors/index.mjs';

const config = JSON.parse(readFileSync('registry/ecosystems.json', 'utf8'));
const CONTRIBUTION = new Set(['github-comment', 'github-issue', 'moltbook-post', 'http-json-artifact']);
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

async function check(source) {
  const base = {source_id: source.id, checked_at: new Date().toISOString()};
  try {
    if (source.kind === 'community' && CONTRIBUTION.has(source.connector)) {
      const r = await readSource(source);
      return {...base, status: 'read_verified', evidence_url: r.source_url, content_hash: r.content_hash,
        detail: `Lecture anonyme réussie · auteur déclaré : ${r.author_declared ?? 'non renseigné'} · mise à jour : ${r.updated_at ?? 'inconnue'}`};
    }
    if (source.connector === 'github-discussion') {
      const d = readDiscussion(source);
      return {...base, status: 'read_verified', evidence_url: d.url,
        detail: `Lecture par le compte de l’opérateur · ${d.comments.totalCount} réponse(s) · dernière activité : ${d.updatedAt}`};
    }
    if (source.kind === 'directory' && ['hol', 'nanda'].includes(source.connector)) {
      const r = await discovery({connector: source.connector, url: source.url, query: source.query, limit: source.limit});
      return {...base, status: 'read_verified', evidence_url: source.url,
        detail: `Recherche « ${source.query} » : ${r.candidates.length} fiche(s) lue(s) · aucun agent contacté ni ajouté`};
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
  const checks = [];
  for (const source of config.sources) checks.push(await check(source));
  const status = {checked_at: new Date().toISOString(), checks};
  writeFileSync('registry/ecosystem-status.json', JSON.stringify(status, null, 2) + '\n');
  for (const c of checks) console.log(`${c.status.padEnd(14)} ${c.source_id.padEnd(36)} ${c.detail}`);
} else {
  throw Error('Usage: node registry/sources.mjs check|list');
}
