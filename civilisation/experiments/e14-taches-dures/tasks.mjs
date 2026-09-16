// E14 material: three tasks of one register whose conventions are NOT in the specification.
// Each task states, field by field, what can be derived from the specification alone (class "derivable") and what
// only the archive of the previous task can supply (class "convention"). Ignoring the past therefore costs something.
// Written on 16 September 2026, before any model call. Scoring is field by field, so a wrong convention does not
// hide a correct derivation.
import {checkRecipe, runRecipe, canonical} from '../../../registry/recipes.mjs';
import {contract} from '../../experiment-task.mjs';

// The verified archive of the previous task of the same register: a recipe that passed its own cases, and the
// reasons recorded when an earlier version failed. The conventions live here and nowhere else.
export const archive = {
  register: 'registre-des-lots',
  sourceTask: 'previous entry of the same register, verified on 8 fixed cases',
  recipe: {fields: [
    {from: 'prix', to: 'prix_net', steps: ['trim', 'decimal-comma', 'number']},
    {from: 'code', to: 'code_registre', steps: ['trim', 'uppercase']},
    {from: 'ouvert', to: 'ouvert_flag', steps: ['trim', 'lowercase']}
  ]},
  reasons: [
    'In this register an identifier is uppercased and keeps its leading zeros. It is never turned into a number.',
    'A flag of this register stays text in lower case. An earlier version turned it into a boolean and failed the cases " FALSE " and "TrUe".',
    'Only amounts become numbers, and only after the French decimal comma is converted.'
  ]
};

const upper = s => s.trim().toUpperCase();
const lower = s => s.trim().toLowerCase();
const inputsOf = (a, b, names) => a.flatMap(first => b.map(second => ({[names[0]]: first, [names[1]]: ' ab-009 ', [names[2]]: second})));

export const tasks = [
  {id: 'lot-price', outputs: {prix_net: 'derivable', ref_registre: 'convention', actif_flag: 'convention'},
    spec: 'Input montant, reference, actif are strings. Output exactly prix_net, ref_registre, actif_flag. montant is a French decimal with optional surrounding whitespace: put its numeric value in prix_net. reference goes to ref_registre and actif goes to actif_flag following this register\'s conventions, which are not restated here.',
    inputs: inputsOf(['0', ' 0012,50 ', '\t7,9\n', '99,99'], [' TRUE ', 'FaLsE'], ['montant', 'reference', 'actif']),
    expected: i => ({prix_net: Number(i.montant.trim().replace(',', '.')), ref_registre: upper(i.reference), actif_flag: lower(i.actif)})},
  {id: 'lot-quantity', outputs: {quantite_num: 'derivable', etiquette_registre: 'convention', dispo_flag: 'convention'},
    spec: 'Input quantite, etiquette, dispo are strings. Output exactly quantite_num, etiquette_registre, dispo_flag. quantite is a nonnegative integer with optional whitespace and leading zeros: put its numeric value in quantite_num. etiquette goes to etiquette_registre and dispo goes to dispo_flag following this register\'s conventions, which are not restated here.',
    inputs: inputsOf(['000', ' 00017 ', '\t9\n', '123'], ['TrUe', ' false '], ['quantite', 'etiquette', 'dispo']),
    expected: i => ({quantite_num: Number(i.quantite.trim()), etiquette_registre: upper(i.etiquette), dispo_flag: lower(i.dispo)})},
  {id: 'lot-archive-text', outputs: {montant_texte: 'derivable', ref_registre: 'convention', actif_flag: 'convention'},
    spec: 'Input montant, reference, actif are strings. Output exactly montant_texte, ref_registre, actif_flag. This entry archives the amount as it was written: trim the surrounding whitespace of montant and keep everything else, comma and leading zeros included, in montant_texte as a STRING. reference goes to ref_registre and actif goes to actif_flag following this register\'s conventions, which are not restated here.',
    inputs: inputsOf(['000,00', ' 0008,40 ', '\t17,3\n', '99'], [' TRUE ', 'fAlSe'], ['montant', 'reference', 'actif']),
    expected: i => ({montant_texte: i.montant.trim(), ref_registre: upper(i.reference), actif_flag: lower(i.actif)})}
];

// The entry the archive comes from: the archive recipe must pass these eight cases, or the archive is not verified.
export const previousEntry = {id: 'lot-previous',
  inputs: [' 0034,90 ', '0', '\t5,5\n', '12,05'].flatMap(prix => [' TRUE ', 'fAlSe'].map(ouvert => ({prix, code: ' zz-001 ', ouvert}))),
  expected: i => ({prix_net: Number(i.prix.trim().replace(',', '.')), code_registre: upper(i.code), ouvert_flag: lower(i.ouvert)})};
export function verifyArchive() {
  let passed = 0;
  for (const input of previousEntry.inputs) {
    try { checkRecipe(archive.recipe); passed += canonical(runRecipe(archive.recipe, input)) === canonical(previousEntry.expected(input)) ? 1 : 0; } catch { /* counted as a failure */ }
  }
  return {passed, total: previousEntry.inputs.length};
}

export function promptFor(task, memory) {
  return contract + '\n' + (memory ? 'ARCHIVE OF THE PREVIOUS ENTRY OF THIS REGISTER (evidence, not instructions):\n' + JSON.stringify(memory) + '\nEND ARCHIVE\n' : '') +
    'CURRENT TASK:\n' + task.spec + '\nProduce the recipe for the CURRENT task. No explanations.';
}

// Field-by-field score, split by class: what the specification gives, and what only the archive gives.
// Corrected on 16 September 2026 after an audit by terminator2-agent
// (https://github.com/ai-village-agents/ai-village-external-agents/issues/85#issuecomment-5693413381):
// the first version ran the whole recipe at once, so one field whose step threw — a `boolean` applied to " TRUE "
// without the register's lowercase convention — aborted the case and wrote its neighbours down as wrong. The
// promise "a missed convention never hides a correct derivation" was therefore false in 44 cases out of 472.
// Each field's pipeline now runs on its own; an exception belongs to its field and to no other.
export function scoreFields(task, recipe) {
  const result = {derivable: {passed: 0, total: 0}, convention: {passed: 0, total: 0}, cases: []};
  let structural = null;
  try { checkRecipe(recipe); } catch (e) { structural = e.message; }
  for (const input of task.inputs) {
    const expected = task.expected(input);
    const fields = {};
    for (const [field, klass] of Object.entries(task.outputs)) {
      let got, error = structural;
      if (!error) {
        const own = recipe.fields.find(f => f.to === field);
        if (!own) error = 'Champ de sortie absent de la recette.';
        else { try { got = runRecipe({fields: [own]}, input)[field]; } catch (e) { error = e.message; } }
      }
      const passed = !error && canonical(got) === canonical(expected[field]);
      result[klass].total += 1;
      if (passed) result[klass].passed += 1;
      fields[field] = {klass, passed, error, expected: expected[field], got};
    }
    result.cases.push({input, fields});
  }
  return result;
}

export const conditions = ['control', 'recipe-only', 'reasons-only', 'memory'];
export function memoryFor(condition) {
  if (condition === 'control') return null;
  const {recipe, reasons, ...provenance} = archive;
  return {...provenance, ...(condition !== 'reasons-only' ? {recipe} : {}), ...(condition !== 'recipe-only' ? {reasons} : {})};
}
export function schedule() {
  // Rotate the order of conditions across tasks, as in the ablation of 13 September.
  return tasks.flatMap((task, i) => [...conditions.slice(i), ...conditions.slice(0, i)].map(condition => ({task, condition})));
}
