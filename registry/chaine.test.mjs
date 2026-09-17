// Ce que doit tenir la chaîne : juger un maillon sur ce qu'il FAIT, pas sur ce qu'il dit, et suivre la
// filiation sans se perdre quand un maillon a plusieurs enfants ou quand une boucle est tentée.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lireRecette, jugerComportement, jugerMots, chaines, bilan, AMORCES, CONTROLE, ATTENDU} from './chaine.mjs';

const JUSTE = {fields: [
  {from: 'prix_texte', to: 'prix', steps: ['trim', 'decimal-comma', 'number']},
  {from: 'quantite_texte', to: 'quantite', steps: ['trim', 'number']},
  {from: 'libelle', to: 'libelle', steps: ['trim', 'lowercase']}
]};

test('la recette juste fait tenir la convention sur l’étalon', () => {
  const j = jugerComportement(JUSTE);
  assert.equal(j.etat, 'tient');
  assert.equal(j.justes, 3);
});

test('une convention à demi oubliée est « entamée », pas « perdue »', () => {
  const partiel = {fields: [
    {from: 'prix_texte', to: 'prix', steps: ['trim', 'decimal-comma', 'number']},
    {from: 'quantite_texte', to: 'quantite', steps: ['trim', 'number']},
    {from: 'libelle', to: 'libelle', steps: ['trim']}
  ]};
  const j = jugerComportement(partiel);
  assert.equal(j.etat, 'entamee');
  assert.equal(j.champs.libelle, false);
  assert.equal(j.champs.prix, true);
});

test('une recette absente ou illisible est nommée comme telle', () => {
  assert.equal(jugerComportement(null).etat, 'illisible');
  assert.equal(lireRecette('je préfère ne pas répondre'), null);
  assert.equal(jugerComportement({fields: [{from: 'absent', to: 'prix', steps: []}]}).etat, 'refusee');
});

test('la recette est lue même noyée dans de la prose et des balises', () => {
  const r = lireRecette('Voici ma réponse.\n```json\n' + JSON.stringify(JUSTE) + '\n```\nJ’ai suivi le registre.');
  assert.equal(r.fields.length, 3);
  assert.equal(jugerComportement(r).etat, 'tient');
});

test('l’usure des mots se mesure par les termes porteurs encore présents', () => {
  const amorce = AMORCES[0].convention;
  assert.equal(jugerMots(amorce, amorce).part, 1);
  assert.equal(jugerMots(amorce, 'rien à voir avec tout cela').part, 0);
  const moitie = jugerMots(amorce, 'the price has a decimal comma and comes out as a number');
  assert.ok(moitie.part > 0 && moitie.part < 1);
});

const message = (id, parent, question, recette, at) => ({id, parent_id: parent, created_at: at,
  artifact: {author: 'essai', question, proposal: recette ? JSON.stringify(recette) : 'pas de recette'}});

test('la chaîne suit un seul fil, le plus ancien enfant à chaque embranchement', () => {
  const items = [
    message('A', null, 'amorce', null, '2026-09-18T00:00:00Z'),
    message('B', 'A', AMORCES[0].convention, JUSTE, '2026-09-18T01:00:00Z'),
    message('B2', 'A', 'branche concurrente', JUSTE, '2026-09-18T02:00:00Z'),
    message('C', 'B', 'le prix ressort en nombre', JUSTE, '2026-09-18T03:00:00Z')
  ];
  const [c] = chaines(items, [{...AMORCES[0], state_id: 'A'}]);
  assert.equal(c.publiee, true);
  assert.deepEqual(c.maillons.map(m => m.id), ['B', 'C']);
  assert.equal(c.profondeur, 2);
  assert.equal(c.pointe, 'C');
});

test('une amorce non publiée ne casse rien', () => {
  const [c] = chaines([], [{...AMORCES[1], state_id: null}]);
  assert.equal(c.publiee, false);
  assert.equal(c.profondeur, 0);
  assert.equal(c.pointe, null);
});

test('le bilan dit où la convention a lâché', () => {
  const casse = {fields: [{from: 'libelle', to: 'libelle', steps: ['uppercase']}]};
  const items = [
    message('A', null, 'amorce', null, '2026-09-18T00:00:00Z'),
    message('B', 'A', 'convention redite', JUSTE, '2026-09-18T01:00:00Z'),
    message('C', 'B', 'convention redite', casse, '2026-09-18T02:00:00Z')
  ];
  const [c] = chaines(items, [{...AMORCES[0], state_id: 'A'}]);
  const b = bilan(c);
  assert.equal(b.profondeur, 2);
  assert.equal(b.tenus, 1);
  assert.equal(b.premierEcart, 2);
});

test('l’étalon et sa sortie attendue restent ce qu’ils sont', () => {
  assert.equal(CONTROLE.prix_texte, ' 12,50 ');
  assert.deepEqual(ATTENDU, {prix: 12.5, quantite: 3, libelle: 'riz basmati'});
});

test('on reconnaît un cas exécuté d’une règle énoncée', async () => {
  const {porteUnCas} = await import('./chaine.mjs');
  assert.equal(porteUnCas(AMORCES[1].convention), true, 'l’amorce « montre » porte bien un cas');
  assert.equal(porteUnCas(AMORCES[0].convention), false, 'l’amorce « dit » n’en porte pas');
  assert.equal(porteUnCas('le prix " 3,20 " donne 3.2'), true);
  assert.equal(porteUnCas('le prix doit ressortir en nombre'), false);
});
