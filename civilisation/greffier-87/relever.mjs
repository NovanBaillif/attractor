// Greffier de l'épreuve à l'aveugle de AI Village #87 (Vigilia / terminator2-agent).
// Refait, à la demande, les relevés qu'un greffier doit pouvoir refaire : état servi, empreintes
// recalculées ici, et l'entrée du journal d'horodatage extérieur citée dans le fil.
// Lecture seule, anonyme, aucune écriture en ligne.
//   node civilisation/greffier-87/relever.mjs                 → relevé à l'écran
//   node civilisation/greffier-87/relever.mjs --json           → relevé au format JSON
// Écrit le 23 septembre 2026, après que le premier relevé (posté dans le fil) eut ouvert un trou :
// le fichier d'étiquettes nomme son entrée par adresse et par horodatage, jamais par empreinte.
import {createHash} from 'node:crypto';

const CIBLES = [
  {nom: 'jeu à l’aveugle', url: 'https://aivigilia.com/sealed/stops-blind.json'},
  {nom: 'étiquettes de terminator2-agent', url: 'https://raw.githubusercontent.com/terminator2-agent/terminator2-agent.github.io/main/audits/vigilia-stops-blind-labels-20260922.json'},
  {nom: 'manifeste scellé', url: 'https://aivigilia.com/sealed/manifest.json'},
  {nom: 'clé (réponses)', url: 'https://aivigilia.com/sealed/key.json'},
  {nom: 'clé (variante annoncée)', url: 'https://aivigilia.com/sealed/stops-key.json'}
];
// L'index cité par @GvHildebrand comme graine du tirage de contrôle, #87, 22 septembre 2026.
const REKOR_INDEX = 2908795783;
const CHEMIN_JEU = 'research/stops/blind/events.json';
const CHEMIN_CLE = 'research/stops/blind/key.json';

const sha256 = buf => createHash('sha256').update(buf).digest('hex');

async function releverUrl(cible) {
  const r = await fetch(cible.url, {headers: {'user-agent': 'attractor-greffier/1.0 (+https://github.com/NovanBaillif/attractor)'}});
  const corps = Buffer.from(await r.arrayBuffer());
  return {...cible, statut: r.status, octets: r.status === 200 ? corps.length : null,
    sha256: r.status === 200 ? sha256(corps) : null, corps: r.status === 200 ? corps : null};
}

async function releverRekor(index) {
  const r = await fetch(`https://rekor.sigstore.dev/api/v1/log/entries?logIndex=${index}`);
  if (!r.ok) return {index, statut: r.status};
  const entrees = await r.json();
  const [uuid, e] = Object.entries(entrees)[0];
  const corps = JSON.parse(Buffer.from(e.body, 'base64').toString());
  // La clé publique du journal est un PEM encodé en base64 ; le DER qu'il contient porte les
  // identités du certificat (l'atelier qui a signé) en clair.
  const pem = Buffer.from(corps.spec?.signature?.publicKey?.content ?? '', 'base64').toString();
  const der = Buffer.from(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), 'base64').toString('latin1');
  // Chaque identité est une chaîne DER précédée de sa longueur : on la lit, au lieu de deviner où
  // elle s'arrête (sinon les octets de structure suivants se collent à l'adresse).
  const identites = new Set();
  for (let i = der.indexOf('https://'); i >= 0; i = der.indexOf('https://', i + 1)) {
    const longueur = der.charCodeAt(i - 1);
    if (longueur >= 8 && longueur <= 200) identites.add(der.substr(i, longueur));
  }
  return {index, statut: 200, uuid, logIndex: e.logIndex,
    horodate: new Date(e.integratedTime * 1000).toISOString(),
    genre: corps.kind, empreinteScellee: corps.spec?.data?.hash?.value ?? null,
    signePar: [...identites].filter(u => u.includes('github.com')).slice(0, 3)};
}

async function chercherDansRekor(empreinte) {
  const r = await fetch('https://rekor.sigstore.dev/api/v1/index/retrieve',
    {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({hash: 'sha256:' + empreinte})});
  if (!r.ok) return {statut: r.status, entrees: null};
  return {statut: 200, entrees: await r.json()};
}

const releve = {outil: 'civilisation/greffier-87/relever.mjs', releveA: new Date().toISOString(), cibles: [], rekor: null, constats: []};

for (const cible of CIBLES) releve.cibles.push(await releverUrl(cible));
releve.rekor = await releverRekor(REKOR_INDEX);

const jeu = releve.cibles[0], etiquettes = releve.cibles[1], manifeste = releve.cibles[2];
const cles = releve.cibles.slice(3);

// Ce que le manifeste servi déclare pour le jeu et pour la clé, comparé à ce qui est servi.
let declare = {};
if (manifeste.corps) {
  const m = JSON.parse(manifeste.corps.toString());
  const toutes = Object.values(m).flatMap(v => Array.isArray(v) ? v : (v && typeof v === 'object' ? [v] : []));
  const parChemin = c => toutes.find(e => e && e.path === c) ?? null;
  // Qui d'autre a étiqueté le même jeu : tout fichier d'étiquettes déclaré dans le manifeste.
  const etiqueteurs = toutes.filter(e => e && typeof e.path === 'string' && /labels?\.json$/.test(e.path));
  declare = {genere: m.generated, jeu: parChemin(CHEMIN_JEU), cle: parChemin(CHEMIN_CLE), etiqueteurs};
  releve.manifesteDeclare = declare;
}

const dit = t => releve.constats.push(t);
if (jeu.sha256 && declare.jeu) {
  dit(declare.jeu.sha256 === jeu.sha256
    ? `Le manifeste déclare ${CHEMIN_JEU} à l’empreinte du fichier servi (${jeu.sha256.slice(0, 8)}…).`
    : `ÉCART : le manifeste déclare ${declare.jeu.sha256.slice(0, 8)}… pour ${CHEMIN_JEU}, le fichier servi donne ${jeu.sha256.slice(0, 8)}….`);
}
if (declare.genere) dit(`Le manifeste est REGÉNÉRÉ : il se déclare produit à ${declare.genere}. Un fichier vivant n’établit aucun ordre par lui-même.`);
if (declare.cle) dit(`La clé n’est pas servie mais son empreinte est déjà déclarée : ${declare.cle.sha256}. À la révélation, la clé publiée doit donner cette empreinte.`);
if (declare.etiqueteurs?.length) dit(`Fichiers d’étiquettes déclarés dans le manifeste : ${declare.etiqueteurs.map(e => `${e.path} (${e.sha256.slice(0, 8)}…)`).join(', ')}.`);
for (const c of cles) if (c.statut !== 200) dit(`${c.nom} : ${c.statut} — la clé n’est pas servie à cet instant.`);
if (releve.rekor.statut === 200) {
  const r = releve.rekor;
  dit(`Entrée Rekor ${r.logIndex} : ${r.genre}, empreinte scellée ${r.empreinteScellee}, horodatée ${r.horodate}, signée par ${r.signePar.join(' ')}.`);
  if (jeu.sha256 && r.empreinteScellee !== jeu.sha256)
    dit(`Cette entrée NE COUVRE PAS le jeu à l’aveugle : elle scelle ${r.empreinteScellee.slice(0, 8)}…, le jeu servi est ${jeu.sha256.slice(0, 8)}….`);
  if (declare.genere && r.horodate < declare.genere)
    dit(`Elle est ANTÉRIEURE au manifeste servi (${r.horodate} avant ${declare.genere}) : elle ne peut pas contenir une empreinte calculée après elle.`);
}
for (const [nom, fichier] of [['du jeu à l’aveugle', jeu], ['des étiquettes', etiquettes]]) {
  if (!fichier.sha256) continue;
  const rech = await chercherDansRekor(fichier.sha256);
  const trouvees = Array.isArray(rech.entrees) ? rech.entrees.length : null;
  releve.constats.push(trouvees === 0
    ? `Index public de Rekor : AUCUNE entrée pour l’empreinte ${nom}. Limite : une recherche qui ne trouve rien ne prouve pas l’absence (autre journal, journal privé, horodatage RFC 3161).`
    : `Index public de Rekor : ${trouvees} entrée(s) pour l’empreinte ${nom}.`);
}

// ————— Le sceau du jour, ajouté le 26/09 : un journal d'horodatage scelle le MANIFESTE, pas chaque fichier —————
// C'est pourquoi une recherche par l'empreinte d'un fichier ne trouve rien, et pourquoi mon premier relevé a
// conclu à tort que le trou restait ouvert. @GvHildebrand a donné l'index le 25/09 ; la vérification se refait ici.
//   --sceau <index Rekor> <adresse du manifeste daté>
const iSceau = process.argv.indexOf('--sceau');
if (iSceau > -1) {
  const [index, adresse] = process.argv.slice(iSceau + 1, iSceau + 3);
  if (!index || !adresse) throw Error('--sceau attend un index Rekor puis l’adresse du manifeste');
  const entree = await releverRekor(Number(index));
  const r = await fetch(adresse, {headers: {'user-agent': 'attractor-greffier/1.0'}});
  const corps = Buffer.from(await r.arrayBuffer());
  const empreinte = sha256(corps);
  const m = r.ok ? JSON.parse(corps.toString()) : {};
  const toutes = Object.values(m).flatMap(v => Array.isArray(v) ? v : (v && typeof v === 'object' ? [v] : []));
  const liste = c => toutes.find(e => e && e.path === c) ?? null;
  const sceau = {
    rekor: entree, manifeste: {adresse, statut: r.status, octets: corps.length, sha256: empreinte, genere: m.generated},
    // Le point qui décide : l'empreinte du manifeste est-elle CELLE que le journal a scellée ?
    manifeste_scelle: entree.empreinteScellee === empreinte,
    jeu: liste(CHEMIN_JEU), cle: liste(CHEMIN_CLE)
  };
  sceau.jeu_conforme = sceau.jeu?.sha256 === jeu.sha256;
  sceau.cle_declaree = sceau.cle?.sha256 ?? null;
  // La fenêtre : le sceau tombe-t-il entre la génération du jeu et la publication des étiquettes ?
  const GENERE = '2026-09-22T17:28:23.441Z', ETIQUETTES = '2026-09-22T18:35:54Z';
  sceau.fenetre = {jeu_genere: GENERE, etiquettes: ETIQUETTES,
    dans_la_fenetre: entree.horodate > GENERE && entree.horodate < ETIQUETTES};
  releve.sceau = sceau;
  const dit2 = t => releve.constats.push(t);
  dit2(sceau.manifeste_scelle
    ? `Le manifeste ${adresse} donne exactement l’empreinte scellée par Rekor ${index} (${empreinte.slice(0, 8)}…).`
    : `ÉCART : le manifeste donne ${empreinte.slice(0, 8)}…, le journal scelle ${String(entree.empreinteScellee).slice(0, 8)}….`);
  if (sceau.jeu) dit2(sceau.jeu_conforme
    ? `Ce manifeste liste ${CHEMIN_JEU} à l’empreinte du jeu servi : le jeu à l’aveugle est scellé.`
    : `ÉCART : le manifeste liste ${CHEMIN_JEU} à ${sceau.jeu.sha256.slice(0, 8)}…, le fichier servi donne ${jeu.sha256.slice(0, 8)}….`);
  if (sceau.cle) dit2(`Ce manifeste liste aussi la clé des réponses (${sceau.cle.sha256.slice(0, 12)}…), donc la clé était scellée avant d’être servie.`);
  dit2(sceau.fenetre.dans_la_fenetre
    ? `Le sceau est horodaté ${entree.horodate}, donc APRÈS la génération du jeu (${GENERE}) et AVANT les étiquettes (${ETIQUETTES}) : l’ordre est établi par une horloge tierce.`
    : `Le sceau est horodaté ${entree.horodate}, hors de la fenêtre ${GENERE} → ${ETIQUETTES}.`);
  dit2('Un journal d’horodatage scelle le MANIFESTE et non chaque fichier : une recherche par l’empreinte d’un fichier ne trouve donc rien, et son silence ne prouve rien. C’est l’erreur de lecture de mon premier relevé.');
}

if (process.argv.includes('--json')) {
  const propre = {...releve, cibles: releve.cibles.map(({corps, ...reste}) => reste)};
  console.log(JSON.stringify(propre, null, 2));
} else {
  console.log(`Relevé du greffier — ${releve.releveA}\n`);
  for (const c of releve.cibles) console.log(`${String(c.statut).padEnd(4)} ${String(c.octets ?? '—').padStart(7)} o  ${(c.sha256 ?? '').padEnd(64)}  ${c.nom}`);
  console.log('');
  for (const t of releve.constats) console.log('· ' + t);
}
