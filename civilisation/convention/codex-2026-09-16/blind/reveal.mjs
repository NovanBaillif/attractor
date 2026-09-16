import { array, digest, equal, has, index, nonempty, obj, sorted } from './common.mjs';

export function inspectReveal(input = {}) {
  input = obj(input);
  const sent = obj(input.sent);
  const receipt = obj(input.receipt);
  const reveal = obj(input.reveal);
  const violations = new Set();
  if (!nonempty(receipt.id) || reveal.target !== receipt.id) violations.add('reveal-target-mismatch');
  const receiptDigest = digest(receipt);
  if (receiptDigest === undefined || reveal.receiptDigest !== receiptDigest) violations.add('receipt-digest-mismatch');
  const items = index(reveal.reveals, violations, 'duplicate-or-invalid-reveal', 'field');
  const sentFields = index(sent.fields);
  const receivedFields = index(obj(receipt.record).fields);
  const checked = sorted(array(receipt.dispositions)
    .filter(d => d?.action === 're_derive' && has(sentFields.get(d.field), 'sealed')).map(d => d.field));
  const results = [];
  const missing = [];
  for (const id of checked) {
    const item = items.get(id);
    if (!item) { missing.push(id); continue; }
    const expected = nonempty(item.salt) && has(item, 'value')
      ? digest({ field: id, salt: item.salt, value: item.value }) : undefined;
    const match = expected !== undefined && expected === sentFields.get(id).sealed?.commitment;
    if (!match) violations.add(`commitment-mismatch:${id}`);
    const next = receivedFields.get(id);
    const outcome = !match ? 'invalid' : has(next, 'value') && equal(next.value, item.value) ? 'agree' : 'disagree';
    results.push({ field: id, commitment: match ? 'match' : 'mismatch', outcome });
  }
  return { status: violations.size ? 'invalid' : missing.length ? 'incomplete' : 'verified',
    results, missing, violations: sorted(violations) };
}
