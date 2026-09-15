import { tasks } from './transmission-task.mjs';

export const conditions = ['control', 'recipe-only', 'reasons-only', 'memory'];
export function selectMemory(memory, condition) {
  if (!conditions.includes(condition)) throw Error('Unknown ablation condition');
  if (condition === 'control') return null;
  const { recipe, reasons, ...provenance } = memory;
  return { ...provenance, ...(condition !== 'reasons-only' ? { recipe } : {}), ...(condition !== 'recipe-only' ? { reasons } : {}) };
}
export function ablationSchedule() {
  // Rotate positions; with three tasks and four conditions this is not fully balanced.
  return tasks.flatMap((task, i) => [...conditions.slice(i), ...conditions.slice(0, i)].map(condition => ({ task, condition })));
}
