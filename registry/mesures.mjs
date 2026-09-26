// Le projet se mesure lui-même. Chaque indicateur a une cible écrite, un état, et l'action qu'il déclenche.
// Aucune action sortante n'est exécutée ici : un indicateur au rouge PRÉPARE et signale, il n'envoie rien.
// Seul le recalcul agit seul, parce qu'il ne fait que relire nos propres fichiers.
//   node registry/mesures.mjs            → registry/mesures.json + tableau à l'écran
//   node registry/mesures.mjs --audit    → détail du recalcul, cas par cas
// Écrit le 16 septembre 2026, après qu'un auditeur extérieur eut trouvé dans nos chiffres publiés une erreur
// que nos propres données contenaient déjà : 44 cas où une exception sur un champ faisait compter les champs
// voisins comme faux. L'anomalie était visible sans rien savoir de l'expérience. Personne ne regardait.
import {readFileSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const jours = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const MAINTENANT = new Date().toISOString();

// ————— Les rapports d'expérience présents dans le dépôt —————
function rapports() {
  const base = 'civilisation/experiments/';
  if (!existsSync(base)) return [];
  const out = [];
  for (const entree of readdirSync(base, {withFileTypes: true})) {
    if (!entree.isDirectory()) continue;
    const chemin = base + entree.name + '/';
    for (const f of readdirSync(chemin).filter(n => n.startsWith('report') && n.endsWith('.json'))) {
      try { out.push({fichier: chemin + f, contenu: read(chemin + f)}); } catch { /* fichier illisible : signalé plus bas */ }
    }
  }
  return out;
}

// ————— B. Le recalcul : nos chiffres publiés tiennent-ils face à nos propres données brutes ? —————
// Trois questions distinctes, parce qu'elles attrapent trois pannes différentes.
function audit(rapport, corriges) {
  const r = rapport.contenu, notes = r.calls?.filter(c => c.score) ?? [];
  const problemes = [], aRegarder = [];
  // Un rapport dont une version renotée existe n'est plus le chiffre publié : son défaut est connu et corrigé.
  const remplace = corriges.has(r.id) && r.mode !== 'rescore-of-existing-answers';
  if (!notes.length) return {fichier: rapport.fichier, verifiable: false, problemes, aRegarder};

  // 1. Cohérence : le résumé affiché est-il la somme des appels ? Attrape une recopie fautive.
  const classes = Object.keys(notes[0].score).filter(k => notes[0].score[k]?.total !== undefined
    || notes[0].score[k]?.correct !== undefined);
  for (const [condition, resume] of Object.entries(r.summary ?? {})) {
    const siens = notes.filter(c => c.condition === condition);
    for (const klass of classes) {
      const attendu = resume[klass];
      if (typeof attendu !== 'string' || !attendu.includes('/')) continue;
      const p = siens.reduce((a, c) => a + (c.score[klass].passed ?? 0), 0);
      const t = siens.reduce((a, c) => a + (c.score[klass].total ?? 0), 0);
      if (`${p}/${t}` !== attendu) problemes.push(`résumé ${condition}/${klass} : affiché ${attendu}, recalculé ${p}/${t}`);
    }
  }

  // 2. Appels perdus : sont-ils déclarés ? Un appel qui ne répond pas doit se voir dans le rapport.
  const rates = r.calls.filter(c => c.status && c.status !== 'scored').length;

  // 3. Anomalie d'exécution : un champ en erreur à côté de champs voisins comptés faux dans le MÊME cas.
  // C'est la signature d'un correcteur qui interrompt le cas au lieu du seul champ. Défaut du 16/09.
  let casAvecErreur = 0, voisinsEmportes = 0;
  const parCondition = {};
  for (const appel of notes) {
    for (const cas of appel.score.cases ?? []) {
      const champs = Object.values(cas.fields ?? {});
      const enErreur = champs.filter(f => f.error).length + (cas.error ? champs.length : 0);
      if (!enErreur) continue;
      casAvecErreur += 1;
      parCondition[appel.condition] = (parCondition[appel.condition] ?? 0) + 1;
      const rates = champs.filter(f => f.passed === false || f.verdict && f.verdict !== 'correct').length;
      if (cas.error && rates > 0) voisinsEmportes += rates;
    }
  }
  if (voisinsEmportes) (remplace ? aRegarder : problemes).push(
    `${voisinsEmportes} champ(s) comptés faux dans un cas interrompu par l’erreur d’un autre champ` + (remplace ? ' — défaut connu, corrigé par la version renotée' : ''));
  const conditions = Object.keys(parCondition);
  if (conditions.length === 1 && casAvecErreur > 3) {
    aRegarder.push(`les ${casAvecErreur} cas en erreur sont tous dans la seule condition « ${conditions[0]} » : à regarder avant de conclure`);
  }
  return {fichier: rapport.fichier, verifiable: true, remplaceParUneVersionRenotee: remplace, appels: r.calls.length, notes: notes.length,
    appelsRates: rates, casAvecErreur, casEnErreurParCondition: parCondition, problemes, aRegarder};
}

// ————— A. Qui a rejoué : familles de modèles et opérateurs distincts —————
function rejeux(tous) {
  const familles = new Set(), operateurs = new Set(), externes = [];
  for (const {contenu: r} of tous) {
    if (r.mode === 'external-answers') {
      const replay = {experience: r.experiment, modele: r.replayer?.model ?? 'non déclaré',
        famille: r.replayer?.lineage ?? 'non déclarée', operateur: r.replayer?.operator ?? 'non déclaré',
        isolement: r.replayer?.isolation ?? 'inconnu'};
      // A file imported through the external-answer format can still be run by this project.
      // It adds a model family but must never be counted as an independent operator.
      if (replay.operateur !== 'projet') externes.push(replay);
      // Ni une famille : une exécution en contexte partagé mesure le report à l'intérieur d'une fenêtre,
      // pas la transmission d'une mémoire. Compter sa famille fermerait l'indicateur par la moitié facile
      // de sa propre définition, et il cesserait d'être un instrument (terminator2-agent, 16/09).
      if (r.replayer?.lineage && replay.isolement === 'fresh-context-per-prompt') familles.add(r.replayer.lineage);
      if (r.replayer?.operator) operateurs.add(r.replayer.operator);
    } else if (r.model) { familles.add('anthropic/claude'); operateurs.add('projet'); }
  }
  return {familles: [...familles], operateurs: [...operateurs], externes};
}

// ————— C. La contradiction reçue : est-elle transformée en quelque chose de testable ? —————
function contradictions(config, commitExiste) {
  const recues = config.sources.filter(s => s.relationship === 'external_counterexample');
  return recues.map(s => {
    const t = s.handled ?? null;
    const verifie = t?.commit ? commitExiste(t.commit, t.repo) : false;
    return {id: s.id, url: s.url, traite: Boolean(t), commit: t?.commit ?? null, commitVerifie: verifie, quoi: t?.what ?? null};
  });
}

// ————— D. La dette de réponse : un message extérieur laissé sans suite —————
function dettes(config, sources) {
  const date = cle => {
    const c = (sources.comments ?? []).filter(x => String(x.id) === cle || String(x.id).startsWith(cle + '@'));
    return c.map(x => x.captured_at ?? x.created_at).sort().pop() ?? null;
  };
  const nôtres = config.sources.filter(s => s.relationship === 'operator_post').map(s => date(s.thread?.key)).filter(Boolean).sort();
  const dernierDesNôtres = nôtres[nôtres.length - 1] ?? null;
  return config.sources.filter(s => s.relationship === 'external_reply' || s.relationship === 'external_counterexample')
    .map(s => ({id: s.id, url: s.url, vu: date(s.thread?.key)}))
    .filter(x => x.vu && (!dernierDesNôtres || x.vu > dernierDesNôtres))
    .map(x => ({...x, heures: Math.round((Date.now() - new Date(x.vu)) / 3600000)}));
}

// ————— Assemblage —————
const config = read('registry/ecosystems.json');
const sources = existsSync('registry/thread-sources.json') ? read('registry/thread-sources.json') : {comments: []};
const jalons = existsSync('registry/jalons.json') ? read('registry/jalons.json') : {jalons: []};
// Le dépôt appartient à un autre compte Windows : git refuse de le lire sans cette exception.
// Un contre-exemple peut être traité dans le dépôt de la norme plutôt qu'ici. Le commit est vérifié là où il vit ;
// si le dépôt n'est pas présent sur cette machine, la vérification échoue et l'indicateur reste au rouge,
// ce qui est le bon défaut : nous ne comptons comme traité que ce que nous pouvons montrer.
// 26/09/2026 : « attractor » manquait à cette table, donc un contre-exemple traité DANS CE DÉPÔT et déclaré comme
// tel ne pouvait jamais être vérifié — l'indicateur restait au rouge en accusant un travail pourtant fait. Le
// défaut par défaut doit rester le rouge, mais pas pour un dépôt qu'on a sous la main.
const DEPOTS = {'attractor-cooperation': 'C:/Users/Utilisateur/CodeGPT/attractor-cooperation', 'attractor': process.cwd()};
const commitExiste = (sha, depot) => {
  const chemin = depot ? DEPOTS[depot] : process.cwd();
  if (!chemin || !existsSync(chemin)) return false;
  try { execFileSync('git', ['-c', 'safe.directory=' + chemin, 'cat-file', '-e', sha + '^{commit}'], {stdio: 'ignore', cwd: chemin}); return true; }
  catch { return false; }
};

const tous = rapports();
// Un rapport renoté désigne, par son identifiant, le rapport d'origine qu'il remplace.
const corriges = new Set(tous.filter(x => x.contenu.mode === 'rescore-of-existing-answers').map(x => x.contenu.id));
const audits = tous.map(r => audit(r, corriges));
const qui = rejeux(tous);
const contre = contradictions(config, commitExiste);
const sansReponse = dettes(config, sources);
const echeances = (jalons.jalons ?? []).map(j => ({...j, joursRestants: jours(MAINTENANT, j.date)}))
  .filter(j => j.joursRestants >= -30).sort((a, b) => a.joursRestants - b.joursRestants);

const chiffresSains = audits.filter(a => a.verifiable && !a.problemes.length).length;
const chiffresVerifiables = audits.filter(a => a.verifiable).length;
const contreTraites = contre.filter(c => c.commitVerifie).length;

const indicateurs = [
  {id: 'familles', libelle: 'Familles de modèles ayant rejoué un protocole', valeur: qui.familles.length, cible: 3,
    etat: qui.familles.length >= 3 ? 'vert' : qui.familles.length >= 2 ? 'orange' : 'rouge',
    detail: qui.familles.join(', ') || 'aucune',
    action: 'Préparer une invitation là où les agents répondent, en demandant la déclaration de famille (norme 0.3.1). Ne pas envoyer sans accord.'},
  {id: 'replications', libelle: 'Résultats rejoués par un opérateur extérieur', valeur: qui.externes.length, cible: 1,
    etat: qui.externes.length >= 1 ? 'vert' : 'rouge', detail: qui.externes.map(e => `${e.experience} par ${e.modele}`).join(' · ') || 'aucun',
    action: 'Relancer les invitations en cours et proposer le paquet de consignes à un autre écosystème.'},
  {id: 'chiffres', libelle: 'Rapports dont les chiffres tiennent face aux données brutes', valeur: chiffresSains, cible: chiffresVerifiables,
    etat: chiffresSains === chiffresVerifiables ? 'vert' : 'rouge',
    detail: audits.filter(a => a.problemes.length).map(a => a.fichier + ' : ' + a.problemes.join(' ; ')).join(' | ')
      || (audits.some(a => a.aRegarder.length) ? 'aucun écart ; à regarder : ' + audits.flatMap(a => a.aRegarder).join(' · ') : 'aucun écart'),
    action: 'Corriger le chiffre publié à partir des données brutes, publier la correction à l’endroit de l’erreur, dire qui l’a trouvée.'},
  {id: 'contradictions', libelle: 'Contre-exemples reçus transformés en test ou en correction', valeur: contreTraites, cible: contre.length,
    etat: contreTraites === contre.length ? 'vert' : 'rouge',
    detail: contre.map(c => `${c.id} : ${c.commitVerifie ? 'traité (' + c.commit.slice(0, 7) + ')' : 'non traité'}`).join(' · ') || 'aucun reçu',
    action: 'Écrire le cas de test qui reproduit l’objection, puis noter le commit dans `handled` de la source.'},
  {id: 'dette', libelle: 'Messages extérieurs sans réponse de notre part', valeur: sansReponse.length, cible: 0,
    etat: sansReponse.length === 0 ? 'vert' : sansReponse.some(x => x.heures > 48) ? 'rouge' : 'orange',
    detail: sansReponse.map(x => `${x.id} (${x.heures} h)`).join(' · ') || 'aucun',
    action: 'Préparer la réponse et la soumettre à l’opérateur. Rien ne part sans sa phrase.'},
  {id: 'echeances', libelle: 'Échéances déclarées dans les sept jours', valeur: echeances.filter(j => j.joursRestants <= 7 && j.joursRestants >= 0).length, cible: 0,
    etat: echeances.some(j => j.joursRestants < 0 && !j.clos) ? 'rouge' : echeances.some(j => j.joursRestants <= 7) ? 'orange' : 'vert',
    detail: echeances.map(j => `${j.quoi} : ${j.joursRestants} j`).join(' · ') || 'aucune',
    action: 'Rappeler l’échéance à l’opérateur et préparer ce qui doit être publié ce jour-là, résultat négatif compris.'}
];

const mesures = {mesureA: MAINTENANT, outil: 'registry/mesures.mjs', indicateurs,
  detail: {audits, rejeux: qui, contradictions: contre, sansReponse, echeances}};
writeFileSync('registry/mesures.json', JSON.stringify(mesures, null, 2) + '\n');

const pastille = e => e === 'vert' ? 'OK  ' : e === 'orange' ? 'ATT ' : 'ROUGE';
for (const i of indicateurs) console.log(`${pastille(i.etat)} ${String(i.valeur).padStart(3)} / ${String(i.cible).padEnd(3)} ${i.libelle}\n        ${i.detail}`);
if (process.argv.includes('--audit')) console.log(JSON.stringify(audits, null, 2));
console.log(`\nregistry/mesures.json écrit · ${indicateurs.filter(i => i.etat === 'rouge').length} indicateur(s) au rouge`);
