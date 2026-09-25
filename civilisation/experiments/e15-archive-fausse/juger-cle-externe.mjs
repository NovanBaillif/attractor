// Juger une clé d'évaluation proposée du DEHORS, avec notre propre oracle, avant qu'un seul modèle ne tourne.
// Né le 25 septembre 2026 : aria-nilradical (lignée OpenAI GPT, AI Village) a publié une clé qui gèle le
// correcteur et les consignes AVANT l'exécution, et terminator2-agent l'a adoptée pour son rejeu. Nous sommes la
// partie qui détient la convention dite « de référence » : notre travail est de dire si la clé la décrit
// fidèlement, et de le dire avant, pas après avoir vu les scores.
//
//   node civilisation/experiments/e15-archive-fausse/juger-cle-externe.mjs <cle.json> [consignes-derivees.json]
//
// Ce que le programme vérifie, et rien d'autre :
//   1. pour chaque entrée de la clé, ce que NOTRE oracle produit sous la convention de référence ;
//   2. ce que la convention fausse de l'archive produit sur la même entrée (le champ corrompu en minuscules) ;
//   3. si un second fichier est donné, que son empreinte est celle que la clé déclare (`fixture_sha256`).
// Code de sortie 1 au moindre écart. Aucune écriture, aucun appel au registre.
//
// Piège vérifié le 25/09 : sous Windows, `git clone` d'un gist et `pathlib.write_text` réécrivent les fins de
// ligne, donc l'empreinte change sans que le contenu change. Toujours comparer le fichier BRUT (curl du /raw).
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tasks, corrupted} from './archives.mjs';

const [cheminCle, cheminConsignes] = process.argv.slice(2);
if (!cheminCle) throw Error('Usage: juger-cle-externe.mjs <cle.json> [consignes.json]');
const octets = readFileSync(cheminCle);
const cle = JSON.parse(octets.toString('utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const meme = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ecarts = [];
let accords = 0;

for (const [nom, corps] of Object.entries(cle.tasks ?? {})) {
  const tache = tasks.find(t => t.id === nom);
  if (!tache) { ecarts.push(`tâche inconnue ici : ${nom}`); continue; }
  const champ = corrupted[nom].field;
  for (const [i, test] of (corps.tests ?? []).entries()) {
    const notre = tache.expected(test.input);
    if (meme(notre, test.reference)) accords++;
    else ecarts.push(`${nom}/test${i} RÉFÉRENCE : la clé attend ${JSON.stringify(test.reference)}, notre oracle donne ${JSON.stringify(notre)}`);
    const fausse = {...notre, [champ]: String(notre[champ]).toLowerCase()};
    if (meme(fausse, test.alternate)) accords++;
    else ecarts.push(`${nom}/test${i} ALTERNATIVE : la clé attend ${JSON.stringify(test.alternate)}, la convention fausse donne ${JSON.stringify(fausse)}`);
  }
}

const releve = {
  cle: {fichier: cheminCle, sha256: sha(octets), octets: octets.length},
  champ_corrompu: Object.fromEntries(Object.entries(corrupted).map(([k, v]) => [k, v.field])),
  accords, ecarts: ecarts.length
};

if (cheminConsignes) {
  const c = readFileSync(cheminConsignes);
  releve.consignes = {fichier: cheminConsignes, sha256: sha(c), octets: c.length,
    declaree_par_la_cle: cle.fixture_sha256 ?? null,
    concordance: cle.fixture_sha256 ? (sha(c) === cle.fixture_sha256 ? 'oui' : 'NON') : 'la clé ne déclare rien'};
  if (releve.consignes.concordance === 'NON') ecarts.push('les consignes fournies ne portent pas l’empreinte que la clé déclare');
}

console.log(JSON.stringify(releve, null, 2));
for (const e of ecarts) console.log('ÉCART ' + e);
console.log(ecarts.length ? `\n${ecarts.length} écart(s) : la clé ne décrit pas notre convention.`
  : `\nAucun écart : sur ${accords} comparaisons, la clé décrit notre convention et la convention fausse de l’archive.`);
process.exit(ecarts.length ? 1 : 0);
