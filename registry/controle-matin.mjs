// Le contrôle du matin : il regarde le projet comme un visiteur, pas comme son auteur.
//
// Écrit le 23/09/2026 après trois défauts que les contrôles internes n'avaient pas vus, tous trouvés par
// l'opérateur : un déploiement parti en aperçu pendant que le site public restait figé trois jours ; des pages
// arrêtées au 18 septembre ; un contrôle du piège à robots en échec depuis douze jours sans que personne ne le
// relance. Les trois ont un point commun : on vérifiait la base de données et les fichiers locaux, jamais ce
// qu'un visiteur voit.
//
// Les six critères sont ceux de l'opérateur, tirés de ses corrections de cap (registry/part-humaine.json) :
// ça sert à quelqu'un · ça existe déjà ailleurs · c'est mesuré ou affirmé · ce qu'on montre est vrai
// aujourd'hui · la source est vérifiable · un humain comprend. Ce programme en vérifie quatre ; les deux
// autres (servir à quelqu'un, être compris) ne se mesurent pas par machine et restent à l'humain.
//
//   node registry/controle-matin.mjs             → le relevé, code de sortie 1 si quelque chose est rouge
//   node registry/controle-matin.mjs --reparer   → relance en plus ce qui se régénère seul, et le dit
//
// CE QU'IL N'A PAS LE DROIT DE FAIRE : modifier un texte, une règle, une priorité. Il peut dire « cette page a
// douze jours » ; il ne peut pas écrire la page. Un système qui note sa propre qualité optimise la note.
import {readFileSync, existsSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const SITE = 'https://attractor-observatory-demo.vercel.app';
const NORME = 'C:/Users/Utilisateur/CodeGPT/attractor-cooperation';
const reparer = process.argv.includes('--reparer');
const lignes = [];
const jours = iso => iso ? Math.round((Date.now() - Date.parse(iso)) / 86400000) : null;
const dire = (etat, quoi, detail) => lignes.push({etat, quoi, detail});

// 1. Ce que le visiteur voit porte-t-il la version qu'on croit avoir mise en ligne ?
const version = readFileSync('VERSION', 'utf8').trim();
let pageVersions = '';
try {
  pageVersions = await (await fetch(SITE + '/versions/', {signal: AbortSignal.timeout(20000)})).text();
  dire(pageVersions.includes(version) ? 'ok' : 'rouge', 'version en ligne',
    pageVersions.includes(version) ? `le site public affiche ${version}`
      : `le fichier VERSION dit ${version}, la page publique ne l'affiche pas — déploiement parti en aperçu ?`);
} catch (e) { dire('rouge', 'version en ligne', 'page injoignable : ' + String(e.message).slice(0, 60)); }

// 2. Les pages publiques répondent-elles ?
const pages = ['/', '/conversation', '/actu', '/ecosystemes/', '/versions/', '/histoire/', '/lignees/',
  '/part-humaine/', '/ce-quils-ont-change/', '/journal/', '/api/v2/health'];
const cassees = [];
for (const p of pages) {
  try {
    const r = await fetch(SITE + p, {method: 'GET', signal: AbortSignal.timeout(20000)});
    if (!r.ok) cassees.push(`${p} (${r.status})`);
  } catch { cassees.push(`${p} (injoignable)`); }
}
dire(cassees.length ? 'rouge' : 'ok', 'pages publiques',
  cassees.length ? cassees.join(', ') : `${pages.length} pages répondent`);

// 3. La conversation montre-t-elle les trois réseaux dès le haut de page, ET le message le plus récent que nous
// ayons relevé ? Le nom des réseaux ne suffisait pas : le 23/09/2026 les trois messages du jour manquaient sur le
// site alors que la page affichait bien « AI Village · The Colony · Moltbook ». Le build recopiait le bloc
// « Ce qui vient d'arriver » avant de le régénérer, donc la page partait avec un déploiement de retard.
try {
  const conv = await (await fetch(SITE + '/conversation', {signal: AbortSignal.timeout(20000)})).text();
  const manquants = ['AI Village', 'The Colony', 'Moltbook'].filter(n => !conv.includes(n));
  if (manquants.length) dire('orange', 'derniers messages', 'réseaux absents de la page : ' + manquants.join(', '));
  else {
    // Le plus récent de nos relevés doit être visible : on cherche son adresse publique, pas son texte.
    const relevés = JSON.parse(readFileSync('registry/thread-sources.json', 'utf8')).comments ?? [];
    const dernier = relevés.map(c => ({quand: c.original_created_at ?? c.captured_at, lien: c.source_url}))
      .filter(m => m.quand && m.lien).sort((a, b) => String(b.quand).localeCompare(String(a.quand)))[0];
    if (!dernier) dire('orange', 'derniers messages', 'aucun relevé daté dans thread-sources.json');
    else dire(conv.includes(dernier.lien) ? 'ok' : 'rouge', 'derniers messages',
      conv.includes(dernier.lien) ? `les trois réseaux sont en tête, dernier relevé du ${String(dernier.quand).slice(0, 10)} visible`
        : `le relevé du ${String(dernier.quand).slice(0, 10)} n'est pas sur la page — bloc « Ce qui vient d'arriver » en retard d'un déploiement ?`);
  }
} catch (e) { dire('orange', 'derniers messages', 'page de la conversation illisible : ' + String(e.message).slice(0, 60)); }

// 4. Âge de chaque donnée du site. Le seuil dit au bout de combien de jours une donnée ne vaut plus rien.
const seuils = {'actu.json': 2, 'carte.json': 7, 'mesures.json': 7, 'ecosystem-status.json': 7,
  'conformite.json': 14, 'part-humaine.json': 30, 'histoire.json': 45, 'encyclopedie.json': 45};
const dateDe = d => d.misAJourLe ?? d.mesureA ?? d.measured_at ?? d.releveeA ?? d.checked_at ?? d.as_of ?? null;
const vieilles = [];
for (const [fichier, seuil] of Object.entries(seuils)) {
  const chemin = 'registry/' + fichier;
  if (!existsSync(chemin)) { vieilles.push(`${fichier} absent`); continue; }
  const age = jours(dateDe(JSON.parse(readFileSync(chemin, 'utf8'))));
  if (age === null) vieilles.push(`${fichier} sans date`);
  else if (age > seuil) vieilles.push(`${fichier} : ${age} j (seuil ${seuil})`);
}
dire(vieilles.length ? 'orange' : 'ok', 'fraîcheur des données',
  vieilles.length ? vieilles.join(' · ') : 'toutes les données sont dans leur seuil');

// 5. Une publication laissée sans conclusion bloque la suivante : il vaut mieux le voir au matin.
if (existsSync('.vercel/thread-import-pending.json')) {
  const p = JSON.parse(readFileSync('.vercel/thread-import-pending.json', 'utf8'));
  dire(p.unresolved ? 'rouge' : 'ok', 'publication du fil',
    p.unresolved ? `issue non tranchée sur ${p.key} : vérifier si le message est en ligne avant de relancer`
      : 'aucune publication en suspens');
}

// 6. Les contrôles de la norme, s'ils sont sur cette machine. Un code de sortie, pas une lecture de la dernière ligne.
if (existsSync(NORME + '/conformance/run.mjs')) {
  for (const [nom, args] of [['conformité', ['conformance/run.mjs']], ['registre des crédits', ['conformance/contributors-check.mjs']],
    ['indifférence', ['conformance/indifference-check.mjs']], ['carte de détection', ['conformance/detection-map.mjs']],
    ['Test #001', ['--test', 'experiments/break-axiom-1/check.test.mjs']]]) {
    let code = 0;
    try { execFileSync(process.execPath, args, {cwd: NORME, stdio: 'ignore'}); } catch (e) { code = e.status ?? 1; }
    dire(code === 0 ? 'ok' : 'rouge', nom, code === 0 ? 'code de sortie 0' : `code de sortie ${code}`);
  }
} else dire('orange', 'contrôles de la norme', 'dépôt de la norme absent de cette machine');

// 7. La veille : ce qu'elle change, jamais ce qu'elle ramasse.
if (existsSync('registry/actu-usage.json')) {
  const u = JSON.parse(readFileSync('registry/actu-usage.json', 'utf8'));
  const aLire = u.articles.filter(a => a.verdict === 'a-lire');
  dire(aLire.length > 3 ? 'orange' : 'ok', 'veille',
    `${u.articles.length} article(s) lus, ${aLire.length} en attente de lecture`);
}

// 8. Ce qui se régénère seul, uniquement sur demande, et toujours dit.
const repare = [];
if (reparer) {
  for (const [nom, script] of [['carte', 'registry/carte.mjs'], ['mesures', 'registry/mesures.mjs']]) {
    try { execFileSync(process.execPath, [script], {stdio: 'ignore'}); repare.push(nom); }
    catch { repare.push(nom + ' (échec)'); }
  }
  dire('ok', 'régénéré', repare.join(', ') || 'rien');
}

const rouges = lignes.filter(l => l.etat === 'rouge'), oranges = lignes.filter(l => l.etat === 'orange');
const relevé = {controle: 'contrôle du matin', fait_le: new Date().toISOString(), site: SITE,
  regenere: reparer ? repare : [], lignes};
writeFileSync('registry/controle-matin.json', JSON.stringify(relevé, null, 2) + '\n');

console.log(`Contrôle du matin · ${new Date().toISOString().slice(0, 16)} · ${SITE}\n`);
for (const l of lignes) console.log(`${l.etat.toUpperCase().padEnd(6)} ${l.quoi.padEnd(24)} ${l.detail}`);
console.log(`\n${rouges.length} rouge(s), ${oranges.length} orange(s), ${lignes.length - rouges.length - oranges.length} au vert.`);
console.log('Ce contrôle alerte ; il ne décide pas. Il ne modifie aucun texte, aucune règle, aucune priorité.');
if (rouges.length) process.exitCode = 1;
