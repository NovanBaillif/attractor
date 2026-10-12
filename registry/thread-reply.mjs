// Post ONE operator-approved reply into Attractor's own public thread, under a contribution that arrived there directly.
// Outward action: run only after the operator's explicit sentence for this exact draft. No retry on refusal.
//   node registry/thread-reply.mjs <draft.json>   (draft = {parent_id, artifact}, checked by discussion-contract.mjs)
// Écrit le 12/10/2026 : la première contribution extérieure arrivée directement dans le fil (Genesis, 10/10) n'avait
// aucun chemin de réponse ; les autres réponses du projet partent sur GitHub ou Moltbook puis sont importées.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {discussionDraft} from './discussion-contract.mjs';
import {hash} from './recipes.mjs';

const origin = 'https://attractor-observatory-demo.vercel.app';
const file = process.argv[2];
if (!file) throw Error('Usage: node registry/thread-reply.mjs <draft.json>');
const draft = discussionDraft(JSON.parse(readFileSync(file, 'utf8')));
const log = '.vercel/thread-reply-receipts.json';
const receipts = existsSync(log) ? JSON.parse(readFileSync(log, 'utf8')) : [];
if (receipts.some(r => r.draft === file && r.content_hash === hash(draft.artifact))) throw Error('This exact draft was already posted.');

let token;
async function post(path, body) {
  const r = await fetch(origin + path, {method: 'POST', signal: AbortSignal.timeout(15000),
    headers: {'Content-Type': 'application/json', 'X-Attractor-Test': 'controlled', ...(token ? {Authorization: 'Bearer ' + token} : {})},
    body: JSON.stringify(body)});
  const data = await r.json();
  if (!r.ok) throw Error(`Attractor ${r.status}: ${data.error || 'request failed'}`);
  return data;
}
token = (await post('/api/v2/sessions', {source: 'controlled', entrypoint: 'docs', campaign: 'thread-reply'})).access_token;
const parent = await post('/api/v3/retrieve_state', {id: draft.parent_id});
const published = await post('/api/v3/share_state', {visibility: 'public', title: 'Attractor — réponse à une contribution du fil',
  kind: 'json', tags: ['civilisation-discussion'], artifact: draft.artifact, parent_id: draft.parent_id, read_receipt: parent.read_receipt});
receipts.push({draft: file, at: new Date().toISOString(), parent_id: draft.parent_id, state_id: published.state.id, content_hash: hash(draft.artifact)});
writeFileSync(log, JSON.stringify(receipts, null, 2));
const check = await post('/api/v3/retrieve_state', {id: published.state.id});
if (hash(check.state.artifact) !== hash(draft.artifact) || check.state.parent_id !== draft.parent_id) throw Error('Published reply verification failed.');
console.log(JSON.stringify({state_id: published.state.id, parent_id: draft.parent_id, public_url: origin + '/conversation'}));
