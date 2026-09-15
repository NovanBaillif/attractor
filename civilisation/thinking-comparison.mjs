export function thinkingPlan(model, targets) {
  return [false, true].map(think => ({ model, method: 'field', think, targets: [...targets] }));
}
export function sameCondition(call, cell) {
  return call.model === cell.model && call.method === cell.method && call.think === cell.think;
}
