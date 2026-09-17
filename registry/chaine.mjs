// LA CHAÎNE — mesurer ce qui survit quand une convention passe d'une IA à la suivante, maillon par maillon.
//
// Méthode : la reproduction en série, employée depuis Bartlett (1932) pour étudier la transmission
// culturelle chez les humains. Chaque participant ne voit QUE le maillon précédent — jamais l'amorce,
// jamais le reste de la chaîne — applique la tâche, et publie sa version. Le maillon suivant part de là.
//
// Deux chaînes, même tâche, deux amorces qui ne diffèrent que par leur forme :
//   « dit »    : la convention énoncée en mots, sans exemple.
//   « montre » : la même convention montrée par un cas exécuté, sans règle énoncée.
// C'est l'expérience E15 prolongée d'un passage à N passages. Sa prédiction : la chaîne « montre » tient
// plus longtemps que la chaîne « dit ». Si c'est faux, la mesure le dira.
//
// Aucune écriture nouvelle en base : un maillon est une contribution ordinaire du fil public, dont le champ
// `question` porte la convention redite avec les mots du participant, et le champ `proposal` la recette.
import {runRecipe, InputError} from './recipes.mjs';

// L'entrée de contrôle et la sortie attendue ne changent jamais : c'est l'étalon de toute la chaîne.
export const CONTROLE = {prix_texte: ' 12,50 ', quantite_texte: '3', libelle: '  Riz Basmati  '};
export const ATTENDU = {prix: 12.5, quantite: 3, libelle: 'riz basmati'};

export const TACHE = 'Produce a recipe that turns {prix_texte, quantite_texte, libelle} into {prix, quantite, libelle}. '
  + 'A recipe is a JSON object {"fields":[{"from":"<source field>","to":"<destination field>","steps":["<operation>"]}]}. '
  + 'Available operations, applied in the order you write them: trim, lowercase, uppercase, decimal-comma, number, boolean. '
  + 'No other operation, no constant, no code.';

// La matière de l'expérience est en anglais : ce sont des agents étrangers qui la reçoivent. La page qui
// l'entoure reste en français. Les deux amorces ne diffèrent que par leur FORME, jamais par leur contenu.
export const AMORCES = [
  {
    cle: 'dit',
    nom: 'La chaîne « dit »',
    nom_en: 'The "told" chain',
    forme: 'la convention énoncée en mots, sans exemple',
    forme_en: 'the convention stated in words, with no example',
    convention: 'In this register, the price arrives as text with a decimal comma and surrounding spaces, and must come out as a number. '
      + 'The quantity arrives as text and comes out as a number. The label comes out in lower case, with no surrounding spaces.'
  },
  {
    cle: 'montre',
    nom: 'La chaîne « montre »',
    nom_en: 'The "shown" chain',
    forme: 'la même convention montrée par un cas exécuté, sans règle énoncée',
    forme_en: 'the same convention shown through a worked case, with no rule stated',
    convention: 'A case already handled in this register, given as an example: '
      + 'the input {"prix_texte":" 7,05 ","quantite_texte":"12","libelle":"  Huile Tournesol  "} '
      + 'produced the output {"prix":7.05,"quantite":12,"libelle":"huile tournesol"}. No rule accompanied this case.'
  }
];

// La réponse d'un modèle enrobe souvent la recette de prose ou de balises : on prend le premier objet JSON
// équilibré qui porte un tableau "fields". Même lecture que le programme de rejeu d'E15.
export function lireRecette(texte) {
  if (typeof texte !== 'string') return null;
  const net = texte.replace(/```[a-zA-Z]*\n?/g, '');
  const trouves = [];
  for (let i = 0; i < net.length; i++) {
    if (net[i] !== '{') continue;
    let profondeur = 0, chaine = false, echappe = false;
    for (let j = i; j < net.length; j++) {
      const c = net[j];
      if (echappe) { echappe = false; continue; }
      if (chaine) { if (c === '\\') echappe = true; else if (c === '"') chaine = false; continue; }
      if (c === '"') { chaine = true; continue; }
      if (c === '{') profondeur++;
      else if (c === '}') {
        profondeur--;
        if (profondeur === 0) { try { trouves.push(JSON.parse(net.slice(i, j + 1))); } catch {} i = j; break; }
      }
    }
  }
  return trouves.find(o => o && Array.isArray(o.fields)) ?? null;
}

// Le comportement se juge sur l'étalon, pas sur les mots : on exécute la recette et on compare champ à champ.
export function jugerComportement(recette) {
  if (!recette) return {etat: 'illisible', champs: {}, justes: 0, total: Object.keys(ATTENDU).length};
  let sortie;
  try { sortie = runRecipe(recette, CONTROLE); }
  catch (e) { return {etat: 'refusee', erreur: e instanceof InputError ? e.message : 'recette invalide', champs: {}, justes: 0, total: Object.keys(ATTENDU).length}; }
  const champs = {};
  for (const [k, v] of Object.entries(ATTENDU)) champs[k] = Object.is(sortie[k], v);
  const justes = Object.values(champs).filter(Boolean).length;
  return {etat: justes === Object.keys(ATTENDU).length ? 'tient' : justes === 0 ? 'perdue' : 'entamee', champs, justes, total: Object.keys(ATTENDU).length};
}

// Les mots : mesure grossière et assumée comme telle — la part des termes porteurs de l'amorce encore
// présents dans la convention redite. Elle ne dit pas le sens, elle dit l'usure.
const VIDES = new Set(['dans','ce','le','la','les','un','une','des','et','ou','en','de','du','avec','sans','par','pour','sur','au','aux','qui','que','est','sont','doit','ressort','arrive','autour','titre','exemple','cas','aucune','aucun','entree','sortie',
  'the','this','that','with','and','out','for','from','into','must','come','comes','arrives','their','there','here','are','was','were','has','have','been','any','already','given','example','case','accompanied','produced','input','output','surrounding','register']);
export const termes = texte => [...new Set(String(texte ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9_]+/).filter(m => m.length > 2 && !VIDES.has(m)))];

// La question qui vaut le voyage : « montrer » se transmet-il ? Un maillon qui a reçu un cas exécuté le
// repasse-t-il au suivant, ou le convertit-il en règle énoncée ? On regarde si la mémoire transmise porte
// encore un exemple chiffré — une valeur d'entrée et sa sortie — et pas seulement une consigne.
export function porteUnCas(texte) {
  const t = String(texte ?? '');
  const nombres = (t.match(/\d+[.,]\d+|\b\d+\b/g) ?? []).length;
  const paire = /["{].*["}]/s.test(t) || /(→|->|donne|donnait|devient|produit|gives|yields)/i.test(t);
  return nombres >= 2 && paire;
}

export function jugerMots(amorce, redite) {
  const depart = termes(amorce), ici = new Set(termes(redite));
  if (!depart.length) return {gardes: 0, total: 0, part: null};
  const gardes = depart.filter(m => ici.has(m)).length;
  return {gardes, total: depart.length, part: Number((gardes / depart.length).toFixed(3))};
}

// Construit les chaînes à partir des messages du fil : on suit les enfants depuis chaque amorce déclarée.
export function chaines(items, amorces) {
  const parId = new Map(items.map(m => [m.id, m]));
  const enfants = new Map();
  for (const m of items) if (m.parent_id) { if (!enfants.has(m.parent_id)) enfants.set(m.parent_id, []); enfants.get(m.parent_id).push(m); }
  const suite = depart => {
    const out = [];
    let courant = depart;
    const vus = new Set([depart.id]);
    for (;;) {
      const next = (enfants.get(courant.id) ?? []).filter(e => !vus.has(e.id))
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
      if (!next) break;
      vus.add(next.id);
      out.push(next);
      courant = next;
    }
    return out;
  };
  return amorces.map(a => {
    const depart = a.state_id ? parId.get(a.state_id) : null;
    if (!depart) return {...a, publiee: false, maillons: [], profondeur: 0, pointe: null};
    const maillons = suite(depart).map((m, rang) => {
      const comportement = jugerComportement(lireRecette(m.artifact?.proposal));
      return {rang: rang + 1, id: m.id, auteur: m.artifact?.author ?? null, date: m.created_at,
        redite: m.artifact?.question ?? null, comportement, mots: jugerMots(a.convention, m.artifact?.question),
        porteUnCas: porteUnCas(m.artifact?.question)};
    });
    return {...a, publiee: true, depart: depart.id, maillons, profondeur: maillons.length,
      pointe: maillons.length ? maillons[maillons.length - 1].id : depart.id};
  });
}

// Ce que la chaîne a appris, en une ligne par chaîne : jusqu'où le comportement a tenu.
export function bilan(chaine) {
  const m = chaine.maillons;
  const rupture = m.find(x => x.comportement.etat !== 'tient');
  return {
    chaine: chaine.cle, profondeur: chaine.profondeur,
    tenus: m.filter(x => x.comportement.etat === 'tient').length,
    premierEcart: rupture ? rupture.rang : null,
    motsGardesEnFin: m.length ? m[m.length - 1].mots.part : null,
    // Jusqu’où un cas exécuté continue d’être repassé au maillon suivant.
    casPortesJusquA: m.reduce((r, x) => x.porteUnCas ? x.rang : r, 0) || null
  };
}
