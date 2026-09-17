// Ce que doit tenir le programme de rejeu, celui qu'un chercheur télécharge : lire la recette dans une
// réponse de modèle (avec balises, avec prose autour, avec un objet JSON qui n'est pas la recette), et
// refuser une commande mal formée. Le programme est en anglais : il est lu et lancé hors du projet.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractRecipe, parseArgs, table} from './replay-e15-run.mjs';

test('la recette est lue même enrobée de prose et de balises', () => {
  const reponse = 'Here is my answer.\n\n```json\n{"fields": [{"from": "a", "to": "b", "steps": ["trim"]}]}\n```\n\nI followed the register.';
  assert.deepEqual(extractRecipe(reponse), {fields: [{from: 'a', to: 'b', steps: ['trim']}]});
});

test('entre plusieurs objets JSON, on garde celui qui porte fields', () => {
  const reponse = 'Register rule: {"rule": "decimal-comma"}\nRecipe:\n{"fields": [{"from": "x", "to": "y", "steps": []}]}';
  assert.equal(extractRecipe(reponse).fields.length, 1);
});

test('les accolades dans une chaîne ne cassent pas la lecture', () => {
  assert.equal(extractRecipe('{"fields": [{"from": "a {b}", "to": "c", "steps": ["trim"]}]}').fields[0].from, 'a {b}');
});

test('une réponse sans JSON est une erreur nommée', () => {
  assert.throws(() => extractRecipe('I cannot answer that.'), /no JSON object/);
  assert.throws(() => extractRecipe(undefined), /empty answer/);
});

test('il faut choisir une façon d’interroger le modèle', () => {
  assert.throws(() => parseArgs([]), /--cmd|--api/);
  assert.throws(() => parseArgs(['--api', 'openai']), /--model/);
  assert.throws(() => parseArgs(['--truc']), /unknown argument/);
  assert.throws(() => parseArgs(['--cmd']), /needs a value/);
  assert.equal(parseArgs(['--cmd', 'claude -p']).cmd, 'claude -p');
  assert.equal(parseArgs(['--cmd', 'x', '--lineage', 'alibaba/qwen']).lineage, 'alibaba/qwen');
  assert.equal(parseArgs(['--score-only', 'a.json']).scoreOnly, 'a.json');
  assert.equal(parseArgs(['--cmd', 'x', '--no-score']).score, false);
});

test('le tableau de note reste lisible', () => {
  const texte = table({byCondition: {honest: {correct: 24, copied: 0, other: 0, total: 24}}});
  assert.match(texte, /condition/);
  assert.match(texte, /honest/);
});
