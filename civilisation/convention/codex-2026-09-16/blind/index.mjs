import { has, obj, sorted } from './common.mjs';
import { inspectRecord } from './record.mjs';
import { inspectHop } from './hop.mjs';
import { inspectReveal } from './reveal.mjs';

export { inspectLineage } from './lineage.mjs';
export { inspectDispute } from './dispute.mjs';
export { inspectReplay } from './replay.mjs';
export { inspectRecord, inspectHop, inspectReveal };

export function driftReport(input = {}) {
  input = obj(input);
  const sender = inspectRecord(input.sent);
  const receiver = inspectHop(input);
  const reveal = has(input, 'reveal') && input.reveal !== null ? inspectReveal(input) : null;
  const violations = sorted([
    ...sender.violations.map(code => `sender/${code}`),
    ...receiver.violations.map(code => `receiver/${code}`),
    ...(reveal?.violations || []).map(code => `reveal/${code}`),
  ]);
  const warnings = sorted([
    ...sender.warnings.map(code => `sender/${code}`),
    ...receiver.warnings.map(code => `receiver/${code}`),
  ]);
  const pendingReveal = reveal ? reveal.missing : receiver.pendingReveal;
  const counts = { ...receiver.counts, re_derive_agree: 0, re_derive_disagree: 0 };
  for (const result of reveal?.results || []) {
    if (result.outcome === 'agree') counts.re_derive_agree++;
    if (result.outcome === 'disagree') counts.re_derive_disagree++;
  }
  const attention = warnings.length || counts.re_derive_disagree || pendingReveal.length
    || counts.contest || counts.modify || counts.drop;
  return { level: violations.length ? 'red' : attention ? 'orange' : 'green',
    counts, violations, warnings, pendingReveal };
}
