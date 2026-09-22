// La veille se juge à ce qu'elle change, pas à ce qu'elle ramasse.
//
// Le 22/09/2026, le compte était : 181 articles relevés le matin, 16 sources, et zéro article entré dans la
// norme depuis l'ouverture de la veille le 17/09. Un agent d'AI Village (terminator2) venait de faire la même
// mesure sur ses propres contrôles : combien ont déjà refusé quelque chose. Même question ici, pour chaque source.
//
//   node registry/actu-usage.mjs            → le relevé : par source, ce qui est ramassé et ce qui a servi
//   node registry/actu-usage.mjs --verifier → contrôle du registre ; code de sortie 1 s'il est mal tenu
//
// Node seul : aucun paquet, aucun réseau, aucune écriture. Les articles ramassés par source sont comptés sur
// l'historique git de registry/actu.json, donc sur les relevés réellement publiés, pas sur une déclaration.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const VERDICTS = new Set(['changement', 'lu-sans-effet', 'a-lire']);
const JOURS_SANS_USAGE = 21;
const usage = JSON.parse(readFileSync(new URL('./actu-usage.json', import.meta.url), 'utf8'));
const actu = JSON.parse(readFileSync(new URL('./actu.json', import.meta.url), 'utf8'));
const sources = JSON.parse(readFileSync(new URL('./actu-sources.json', import.meta.url), 'utf8'));
const listeSources = (sources.sources ?? sources).map(s => s.id ?? s.nom ?? s.name);

// Ce que chaque source a ramassé, sur les relevés que la veille a publiés.
const ramasses = {};
let relevesLus = 0;
try {
  const commits = execFileSync('git', ['-c', 'safe.directory=*', 'log', '--format=%H', '--', 'registry/actu.json'],
    {encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname.replace(/^\//, '')}).trim().split('\n').filter(Boolean);
  for (const commit of commits.slice(0, 30)) {
    let contenu;
    try { contenu = execFileSync('git', ['-c', 'safe.directory=*', 'show', `${commit}:registry/actu.json`],
      {encoding: 'utf8', maxBuffer: 64e6, cwd: new URL('..', import.meta.url).pathname.replace(/^\//, '')}); } catch { continue; }
    let releve; try { releve = JSON.parse(contenu); } catch { continue; }
    relevesLus++;
    for (const a of releve.articles ?? []) { ramasses[a.source] ??= new Set(); ramasses[a.source].add(a.lien ?? a.titre); }
  }
} catch { /* pas de git : on se rabat sur le relevé du jour */ }
if (relevesLus === 0) for (const a of actu.articles ?? []) { ramasses[a.source] ??= new Set(); ramasses[a.source].add(a.lien ?? a.titre); }

const parSource = {};
for (const a of usage.articles) {
  parSource[a.source] ??= {changement: 0, 'lu-sans-effet': 0, 'a-lire': 0, dernier: null};
  parSource[a.source][a.verdict] += 1;
  if (a.verdict === 'changement' && (!parSource[a.source].dernier || a.lu_le > parSource[a.source].dernier)) {
    parSource[a.source].dernier = a.lu_le;
  }
}

if (process.argv.includes('--verifier')) {
  const erreurs = [];
  for (const [i, a] of usage.articles.entries()) {
    const ou = `article ${i + 1} (${(a.titre ?? '').slice(0, 40)})`;
    if (!VERDICTS.has(a.verdict)) erreurs.push(`${ou} : verdict « ${a.verdict} » inconnu`);
    if (!/^https:\/\//.test(a.lien ?? '')) erreurs.push(`${ou} : lien manquant ou non https`);
    if (a.verdict === 'changement' && (!Array.isArray(a.ou) || a.ou.length === 0)) erreurs.push(`${ou} : un changement dit où il a atterri`);
    if (a.verdict === 'lu-sans-effet' && !a.pourquoi) erreurs.push(`${ou} : « lu, sans effet » dit pourquoi`);
    if (a.verdict !== 'a-lire' && !a.lu_le) erreurs.push(`${ou} : date de lecture manquante`);
    if (!listeSources.includes(a.source)) erreurs.push(`${ou} : source « ${a.source} » absente de actu-sources.json`);
  }
  for (const e of erreurs) console.log('  ' + e);
  console.log(erreurs.length ? `${erreurs.length} erreur(s) dans le registre.` : 'registre de la veille : correct.');
  process.exit(erreurs.length ? 1 : 0);
}

const aujourdhui = new Date().toISOString().slice(0, 10);
const jours = d => d ? Math.round((Date.parse(aujourdhui) - Date.parse(d)) / 86400000) : null;
console.log(`Veille : ${Object.values(ramasses).reduce((n, s) => n + s.size, 0)} articles distincts ramassés sur ${relevesLus || 1} relevé(s), ${usage.articles.length} lu(s).\n`);
console.log('source                     ramassés   lus   changements   dernier usage');
for (const id of listeSources) {
  const u = parSource[id] ?? {changement: 0, 'lu-sans-effet': 0, 'a-lire': 0, dernier: null};
  const lus = u.changement + u['lu-sans-effet'];
  const age = jours(u.dernier);
  const etat = u.changement === 0 ? (age === null ? 'jamais' : '') : `il y a ${age} j`;
  console.log(`${id.padEnd(26)} ${String(ramasses[id]?.size ?? 0).padStart(6)} ${String(lus).padStart(6)} ${String(u.changement).padStart(12)}   ${etat}`);
}
const mortes = listeSources.filter(id => (parSource[id]?.changement ?? 0) === 0);
console.log(`\n${mortes.length} source(s) sur ${listeSources.length} n'ont encore rien changé.`);
console.log(`Règle : une source sans aucun changement au bout de ${JOURS_SANS_USAGE} jours sort de actu-sources.json.`);
console.log('Le volume ramassé n\'est pas un résultat : il ne devient un résultat qu\'une fois un article lu en entier et son effet écrit.');
