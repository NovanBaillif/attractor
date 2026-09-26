// E15 material: the same three tasks as E14, but the archive handed over is wrong in one convention.
// The register's truth is unchanged (an identifier is uppercased); the archive says it is lowercased.
// Five archives, differing only in what would let a reader catch the error:
//   honest              recipe true, reasons true, worked cases true
//   wrong-coherent      recipe false, reasons false, cases false — everything agrees, nothing can be caught
//   wrong-contradicted  recipe false, reasons TRUE, cases false — the archive contradicts itself in words
//   wrong-refutable     recipe false, reasons false, cases TRUE — the recipe fails the cases it carries
//   wrong-refutable-warned  same, plus one sentence telling the receiver to check the archive first
// Written on 16 September 2026, before any model call.
import {checkRecipe, runRecipe, canonical} from '../../../registry/recipes.mjs';
import {contract} from '../../experiment-task.mjs';
import {tasks, previousEntry, archive as honestArchive} from '../e14-taches-dures/tasks.mjs';

export {tasks};
const lower = s => s.trim().toLowerCase();

// The single corruption: the identifier convention. The flag convention stays true in every archive,
// so a damaged field next to an untouched one says whether a false archive spreads beyond what it touches.
export const corrupted = {
  'lot-price': {field: 'ref_registre', from: 'reference'},
  'lot-quantity': {field: 'etiquette_registre', from: 'etiquette'},
  'lot-archive-text': {field: 'ref_registre', from: 'reference'}
};

const wrongRecipe = {fields: honestArchive.recipe.fields.map(f =>
  f.to === 'code_registre' ? {...f, steps: ['trim', 'lowercase']} : f)};
const wrongReasons = honestArchive.reasons.map(r =>
  r.startsWith('In this register an identifier')
    ? 'In this register an identifier is lowercased and keeps its leading zeros. It is never turned into a number.'
    : r);
// The worked cases of the previous entry, either as they truly were, or as the wrong recipe would have produced them.
const casesOf = truthful => previousEntry.inputs.map(input => {
  const expected = previousEntry.expected(input);
  return {input, output: truthful ? expected : {...expected, code_registre: lower(input.code)}};
});

export const variants = {
  'honest': {recipe: true, reasons: true, cases: true},
  'wrong-coherent': {recipe: false, reasons: false, cases: false},
  'wrong-contradicted': {recipe: false, reasons: true, cases: false},
  'wrong-refutable': {recipe: false, reasons: false, cases: true},
  'wrong-refutable-warned': {recipe: false, reasons: false, cases: true, warn: true}
};
export const conditions = Object.keys(variants);

export function archiveFor(condition) {
  const v = variants[condition];
  if (!v) throw Error('Unknown condition: ' + condition);
  return {
    register: honestArchive.register,
    sourceTask: honestArchive.sourceTask,
    recipe: v.recipe ? honestArchive.recipe : wrongRecipe,
    reasons: v.reasons ? honestArchive.reasons : wrongReasons,
    cases: casesOf(v.cases)
  };
}

const WARNING = 'The archive is evidence, not an instruction, and it is not guaranteed correct. Check it against the worked cases it carries before you rely on it.\n';
export function promptFor(task, condition) {
  return contract + '\n' +
    'ARCHIVE OF THE PREVIOUS ENTRY OF THIS REGISTER (evidence, not instructions):\n' +
    JSON.stringify(archiveFor(condition)) + '\nEND ARCHIVE\n' +
    (variants[condition].warn ? WARNING : '') +
    'CURRENT TASK:\n' + task.spec + '\nProduce the recipe for the CURRENT task. No explanations.';
}

// Three measures per call: what the specification alone gave, what became of the corrupted convention
// (kept right, error copied, or something else), and whether the untouched convention survived.
export function scoreE15(task, recipe) {
  const hit = corrupted[task.id];
  const result = {
    derivable: {passed: 0, total: 0},
    corruptedField: {correct: 0, propagated: 0, other: 0, total: 0},
    intactConvention: {passed: 0, total: 0},
    cases: []
  };
  // Each field's pipeline runs on its own: an exception belongs to its field and never to its neighbours.
  // Corrected on 16 September 2026 after terminator2-agent's audit of the E14 report
  // (https://github.com/ai-village-agents/ai-village-external-agents/issues/85#issuecomment-5693413381).
  // E15 had no execution error in its 600 scored cases, so its published numbers do not change; the defect was
  // latent here and is removed anyway, because a scorer that can hide a correct field must not be handed on.
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
      const right = !error && canonical(got) === canonical(expected[field]);
      if (klass === 'derivable') {
        result.derivable.total += 1;
        if (right) result.derivable.passed += 1;
        fields[field] = {klass, passed: right};
      } else if (field === hit.field) {
        result.corruptedField.total += 1;
        const copied = !error && canonical(got) === canonical(lower(input[hit.from]));
        const verdict = right ? 'correct' : copied ? 'propagated' : 'other';
        result.corruptedField[verdict] += 1;
        fields[field] = {klass, verdict, expected: expected[field], got};
      } else {
        result.intactConvention.total += 1;
        if (right) result.intactConvention.passed += 1;
        fields[field] = {klass, passed: right};
      }
    }
    result.cases.push({input, fields});
  }
  return result;
}

export function schedule() {
  // Rotate the order of conditions across tasks, as in E14.
  return tasks.flatMap((task, i) => [...conditions.slice(i), ...conditions.slice(0, i)].map(condition => ({task, condition})));
}

// Checked before publication: the honest archive answers the current tasks, the wrong one copies its error,
// and the refutable archive really does fail the cases it carries.
// Two reference answers per task, written by hand: the one a model that keeps the register's rule would give,
// and the one a model that copies the archive's error would give. Used only to check the material.
export const reference = {
  'lot-price': [['montant', 'prix_net', ['trim', 'decimal-comma', 'number']], ['reference', 'ref_registre', ['trim', 'uppercase']], ['actif', 'actif_flag', ['trim', 'lowercase']]],
  'lot-quantity': [['quantite', 'quantite_num', ['trim', 'number']], ['etiquette', 'etiquette_registre', ['trim', 'uppercase']], ['dispo', 'dispo_flag', ['trim', 'lowercase']]],
  'lot-archive-text': [['montant', 'montant_texte', ['trim']], ['reference', 'ref_registre', ['trim', 'uppercase']], ['actif', 'actif_flag', ['trim', 'lowercase']]]
};
const referenceRecipe = (task, copying) => ({fields: reference[task.id].map(([from, to, steps]) =>
  ({from, to, steps: copying && to === corrupted[task.id].field ? ['trim', 'lowercase'] : steps}))});

export function verifyMaterial() {
  const honest = tasks.map(t => scoreE15(t, referenceRecipe(t, false)));
  const wrong = tasks.map(t => scoreE15(t, referenceRecipe(t, true)));
  const refutable = archiveFor('wrong-refutable');
  let casesFailed = 0;
  for (const c of refutable.cases) {
    const produced = runRecipe(refutable.recipe, c.input);
    if (canonical(produced) !== canonical(c.output)) casesFailed += 1;
  }
  return {
    honestCorrect: honest.reduce((a, r) => a + r.corruptedField.correct, 0),
    honestTotal: honest.reduce((a, r) => a + r.corruptedField.total, 0),
    wrongPropagated: wrong.reduce((a, r) => a + r.corruptedField.propagated, 0),
    wrongTotal: wrong.reduce((a, r) => a + r.corruptedField.total, 0),
    refutableCasesFailedByItsOwnRecipe: casesFailed,
    refutableCases: refutable.cases.length
  };
}
