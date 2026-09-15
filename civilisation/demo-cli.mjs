import { readFileSync } from 'node:fs';

const key = readFileSync(new URL('../data/civilisation/operator-key.txt', import.meta.url), 'utf8').trim();
const port = Number(process.env.ATTRACTOR_CIVIC_PORT || 4313);
for (let step = 0; step < 6; step++) {
  const r = await fetch(`http://127.0.0.1:${port}/api/demo`, { method: 'POST', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${key}`,
  }, body: '{}', signal: AbortSignal.timeout(10000) });
  const result = await r.json();
  if (!r.ok) throw Error(result.error);
  if (result.done) { console.log(result.message); break; }
}
console.log('Cycle contrôlé disponible dans la cité locale. Aucun appel à un modèle.');
