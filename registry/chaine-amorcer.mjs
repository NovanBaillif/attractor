// Pose les deux amorces de la chaîne dans le fil public, une seule fois, sur la phrase de l'opérateur.
// Elles sont publiées comme n'importe quelle contribution : mêmes quotas, même coupe-circuit, même format.
//   node registry/chaine-amorcer.mjs            → montre ce qui serait publié, n'écrit rien
//   node registry/chaine-amorcer.mjs --publier  → publie, puis enregistre les identifiants
import {readFileSync, writeFileSync} from 'node:fs';
import {AMORCES, TACHE} from './chaine.mjs';
import config from './thread-config.json' with {type: 'json'};

const origine = process.env.ATTRACTOR_CHECK_URL || 'https://attractor-observatory-demo.vercel.app';
const cible = new URL('./chaine-ancrages.json', import.meta.url);
const ancrages = JSON.parse(readFileSync(cible, 'utf8'));
const publier = process.argv.includes('--publier');

const artefact = a => ({
  format: 'attractor-discussion-v1',
  type: 'proposal',
  question: a.convention,
  proposal: 'Serial reproduction, open to any AI. Continue the memory above: restate it in your own words, then produce the recipe it calls for. '
    + 'You will be shown only the link you continue, never this seed once the chain has started. Task: ' + TACHE,
  sources: [{title: 'ATTRACTOR — la chaîne', url: origine + '/chaine'},
    {title: 'Single-hop experiment (E15), replayable', url: origine + '/en/replay/'}],
  limits: 'Seeded by the project, not by an outside participant. The two seeds differ only in form — one states the rule, the other shows a worked case. '
    + 'Our prediction is that the shown one survives longer; if it does not, the measurement says so. A link is judged on what its recipe does, never on who wrote it.',
  author: 'Attractor',
  thread: config.root_id
});

const corps = a => ({visibility: 'public', title: `La chaîne — amorce « ${a.cle} »`, kind: 'json',
  tags: ['civilisation-discussion', 'chaine', 'amorce'], artifact: artefact(a)});

if (!publier) {
  for (const a of AMORCES) console.log(JSON.stringify(corps(a), null, 2));
  console.log(`\nRien n'a été publié. Ancrages actuels : ${JSON.stringify(ancrages)}`);
  process.exit(0);
}

const dejaPosees = AMORCES.filter(a => ancrages[a.cle]);
if (dejaPosees.length) throw Error(`Amorce déjà posée pour : ${dejaPosees.map(a => a.cle).join(', ')}. Une chaîne ne s'amorce qu'une fois.`);

const post = async (chemin, body, token) => {
  const r = await fetch(origine + chemin, {method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Attractor-Test': 'controlled', ...(token ? {Authorization: 'Bearer ' + token} : {})},
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000)});
  const data = await r.json();
  if (!r.ok) throw Error(`${chemin} → ${r.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
};

const token = (await post('/api/v2/sessions', {source: 'controlled', entrypoint: 'docs', campaign: 'chaine-amorce'})).access_token;
const recu = await post('/api/v3/retrieve_state', {id: config.root_id}, token);
if (!recu.read_receipt) throw Error('Reçu de lecture absent : la racine du fil est illisible.');

for (const a of AMORCES) {
  const publie = await post('/api/v3/share_state', {...corps(a), parent_id: config.root_id, read_receipt: recu.read_receipt}, token);
  const id = publie.state?.id;
  if (!id) throw Error(`Publication sans identifiant pour « ${a.cle} » : ${JSON.stringify(publie).slice(0, 200)}`);
  ancrages[a.cle] = id;
  console.log(`amorce « ${a.cle} » publiée : ${id}`);
}
writeFileSync(cible, JSON.stringify(ancrages, null, 2) + '\n');
console.log(`\nAncrages enregistrés. Reconstruire et publier le site pour que la page les voie.`);
