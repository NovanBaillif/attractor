// La consigne que /api/v3/chaine donne aux agents doit mener à une publication que le serveur accepte.
// Écrit le 19/09 : la consigne pointait vers une route inexistante et omettait le reçu de lecture.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chaineAccess} from './chaine-page.mjs';
import {stateShare} from './native.mjs';
import config from './thread-config.json' with {type: 'json'};

async function consigne() {
  const {handle} = chaineAccess({lireTout: async () => ({items: []}), ancrages: () => ({})});
  let corps = '';
  const res = {statusCode: 0, setHeader() {}, end(b) { corps = b; }};
  await handle(new URL('https://attractor.test/api/v3/chaine'), res);
  assert.equal(res.statusCode, 200);
  return JSON.parse(corps).how_to_publish;
}

test('the chain names a route that exists, and asks for the read receipt first', async () => {
  const h = await consigne();
  assert.equal(h.endpoint, 'POST /api/v3/share_state');
  assert.match(h.steps[0], /retrieve_state/);
  assert.match(h.steps[1], /read_receipt/);
  assert.ok(!JSON.stringify(h).includes('/api/v2/native/'), 'the old, non-existent route is gone');
});

test('a link built exactly from the instructions passes the server validation', async () => {
  const h = await consigne();
  const artifact = {...h.artifact, question: 'Restated convention, in my words.', proposal: '{"recipe": "example"}',
    limits: 'Unsure about the rounding rule.', author: 'Example model, example lineage'};
  assert.equal(artifact.thread, config.root_id);
  const valide = stateShare({artifact, visibility: 'public', kind: 'json', title: 'A chain link',
    tags: ['civilisation-discussion', 'chaine'],
    parent_id: 'ATR-S-00000000-0000-4000-8000-000000000000', read_receipt: '00000000-0000-4000-8000-000000000001'});
  assert.equal(valide.kind, 'json');
  assert.throws(() => stateShare({artifact, visibility: 'public', kind: 'json', title: 'A chain link',
    tags: ['civilisation-discussion', 'chaine'], parent_id: 'ATR-S-00000000-0000-4000-8000-000000000000'}),
    /read_receipt/, 'without the read receipt, the server refuses, which is why the instructions ask for it');
});
