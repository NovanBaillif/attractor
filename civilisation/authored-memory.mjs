import { specification, evaluate, publicInputs } from './experiment-task.mjs';

const claim = { type: 'object', additionalProperties: false, required: ['text', 'evidence'], properties: {
  text: { type: 'string', minLength: 1, maxLength: 350 }, evidence: { type: 'string', enum: ['success', 'failure', 'scope'] },
} };
export const noteSchema = { type: 'object', additionalProperties: false, required: ['worked', 'conditions', 'errors', 'uncertainties'],
  properties: Object.fromEntries(['worked', 'conditions', 'errors', 'uncertainties'].map(k => [k, { type: 'array', minItems: 1, maxItems: 2, items: claim }])) };
export function validateNote(note) {
  if (!note || Object.keys(note).sort().join(',') !== 'conditions,errors,uncertainties,worked') throw Error('Invalid note sections');
  for (const section of Object.values(note)) {
    if (!Array.isArray(section) || section.length < 1 || section.length > 2) throw Error('Invalid note length');
    for (const item of section) {
      if (!item || Object.keys(item).sort().join(',') !== 'evidence,text' || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 350 || !['success', 'failure', 'scope'].includes(item.evidence)) throw Error('Invalid note claim or evidence reference');
    }
  }
  return note;
}
export function authorEvidence(source, failed) {
  return { scope: specification, success: { recipe: source.multi.recipe, cases: evaluate(source.multi.recipe, publicInputs) },
    failure: { recipe: failed.multi.recipe, cases: evaluate(failed.multi.recipe, publicInputs) } };
}
export function authorPrompt(evidence) {
  return 'Write a short handover note from these past execution records for a future agent. In English: what worked, conditions where it applies, errors encountered, and what remains uncertain. Cite success, failure or scope for each statement. Distinguish observations from hypotheses. Do not invent results or infer general success from finite tests. You do not know the successor task. Records:\n' + JSON.stringify(evidence);
}
export const successorTasks = [
  { id: 'signed-invoice', spec: 'Input unitPrice, sku, active are strings. unitPrice is a signed French decimal with optional whitespace: output numeric net. Trim sku and UPPERCASE it into productCode, preserving leading zeros. Trim active, normalize its case, convert true/false into boolean isActive. Output exactly net, productCode, isActive.',
    inputs: ['-12,50', ' +0003,20 ', '0', '\t-0,75\n'].flatMap(unitPrice => [' TRUE ', 'False'].map(active => ({ unitPrice, sku: ' 00ab-7 ', active }))),
    expected: i => ({ net: Number(i.unitPrice.trim().replace(',', '.')), productCode: i.sku.trim().toUpperCase(), isActive: i.active.trim().toLowerCase() === 'true' }) },
  { id: 'printed-label', spec: 'Input gross, serial, ready are strings for a printed label. Trim gross into printedPrice STRING preserving its comma and leading zeros. Trim serial into serialNumber STRING preserving zeros. Trim and lowercase ready into readyText STRING, never a boolean. Output exactly printedPrice, serialNumber, readyText. Do not convert any field into a number or boolean.',
    inputs: ['000,00', ' 0008,40 ', '\t17,3\n', '99'].flatMap(gross => [' TRUE ', 'FaLsE'].map(ready => ({ gross, serial: ' 000014 ', ready }))),
    expected: i => ({ printedPrice: i.gross.trim(), serialNumber: i.serial.trim(), readyText: i.ready.trim().toLowerCase() }) },
];
export function authoredSchedule() {
  return [{ task: { id: 'memory-author', spec: 'Write a note about previous evidence only.', inputs: [] }, condition: 'author' },
    ...successorTasks.flatMap((task, i) => (i ? ['memory', 'control'] : ['control', 'memory']).map(condition => ({ task, condition })))];
}
