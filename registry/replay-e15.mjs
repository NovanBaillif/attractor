// Refaire E15 depuis le site : un chercheur passe les quinze consignes publiées à son propre modèle, envoie les
// recettes obtenues, et reçoit la note calculée par le programme de notation de l'expérience lui-même
// (civilisation/experiments/e15-archive-fausse/archives.mjs). Rien n'est enregistré, rien n'est publié.
// Écrit le 17 septembre 2026, étape B du plan validé par Novan : que d'autres puissent confirmer ou contredire.
import {schedule, scoreE15, conditions} from '../civilisation/experiments/e15-archive-fausse/archives.mjs';
import {InputError} from './recipes.mjs';

export const plan = schedule().map(({task, condition}) => ({id: `${task.id}:${condition}`, task, condition}));
const ISOLATIONS = ['fresh-context-per-prompt', 'shared-context', 'unknown'];

// Résultat publié le 16/09/2026 (rapport 80197f87-3e60-4ea7-9e94-ea150119b686) : Claude Sonnet 5, cinq passages,
// ramené à un passage (24 points par archive), pour comparer directement avec un envoi.
export const REFERENCE = {model: 'Claude Sonnet 5', operator: 'ATTRACTOR', rounds: 5, perRound: {
  'honest': {correct: 24, copied: 0}, 'wrong-coherent': {correct: 0, copied: 24}, 'wrong-contradicted': {correct: 0, copied: 24},
  'wrong-refutable': {correct: 24, copied: 0}, 'wrong-refutable-warned': {correct: 24, copied: 0}}};

const texte = (v, nom, max) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || v.length > max) throw new InputError(`${nom} : texte de ${max} caractères au plus.`);
  return v;
};

export function scoreReplay(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Objet JSON requis.');
  const answers = body.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new InputError('Champ answers requis : {"<id de consigne>": <recette>}.');
  const known = new Set(plan.map(p => p.id));
  const unknown = Object.keys(answers).filter(k => !known.has(k));
  if (unknown.length) throw new InputError(`Consignes inconnues : ${unknown.slice(0, 3).join(', ')}.`);
  const isolation = body.isolation ?? 'unknown';
  if (!ISOLATIONS.includes(isolation)) throw new InputError(`isolation : ${ISOLATIONS.join(', ')}.`);
  const replayer = {model: texte(body.model, 'model', 100), operator: texte(body.operator, 'operator', 100), isolation};

  const byCondition = Object.fromEntries(conditions.map(c => [c, {correct: 0, copied: 0, other: 0, total: 0, derivable: 0, derivableTotal: 0, intact: 0, intactTotal: 0}]));
  const missing = [], invalid = [];
  for (const p of plan) {
    const recipe = answers[p.id];
    if (recipe === undefined) { missing.push(p.id); continue; }
    let s;
    try { s = scoreE15(p.task, recipe); } catch (e) { invalid.push({id: p.id, error: String(e.message).slice(0, 200)}); continue; }
    const t = byCondition[p.condition];
    t.correct += s.corruptedField.correct; t.copied += s.corruptedField.propagated; t.other += s.corruptedField.other; t.total += s.corruptedField.total;
    t.derivable += s.derivable.passed; t.derivableTotal += s.derivable.total;
    t.intact += s.intactConvention.passed; t.intactTotal += s.intactConvention.total;
  }
  return {experiment: 'E15', stored: false, replayer,
    measures: isolation === 'fresh-context-per-prompt' ? 'a false memory handed to a fresh context, as designed'
      : isolation === 'shared-context' ? 'within-context carry-over: the prompts were read in one window, so this is a different measurement'
      : 'unknown: say whether each prompt was answered in a fresh context, or the result cannot be compared',
    byCondition, reference: REFERENCE, missing, invalid,
    next: 'Nothing was stored. To add your result to the shared record, post it with your model name and isolation in the thread (https://attractor-observatory-demo.vercel.app/conversation) or on GitHub issue 85 of ai-village-agents/ai-village-external-agents.'};
}
