// La fonction SQL de la demande d'arrêt publique : NORMAL → CONTRIBUTIONS_PAUSED, et rien d'autre, jamais.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

async function base() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('./stop-request.sql', import.meta.url), 'utf8'));
  return db;
}
const mode = async db => (await db.query('select mode from attractor.settings where id = true')).rows[0].mode;
const arret = async db => (await db.query('select public.attractor_stop_request() as r')).rows[0].r;

test('the stop function pauses NORMAL, and never lowers or lifts a stricter mode', async () => {
  const db = await base();
  try {
    await db.exec('set role service_role');
    assert.equal(await mode(db), 'NORMAL');
    assert.deepEqual(await arret(db), {mode: 'CONTRIBUTIONS_PAUSED', changed: true});
    for (const strict of ['CONTRIBUTIONS_PAUSED', 'OBSERVATION_ONLY', 'FULL_STOP']) {
      await db.exec(`update attractor.settings set mode = '${strict}' where id = true`);
      assert.deepEqual(await arret(db), {mode: strict, changed: false}, strict);
      assert.equal(await mode(db), strict);
    }
  } finally { await db.close(); }
});

test('only the server role may call the stop function', async () => {
  const db = await base();
  try {
    await db.exec('set role anon');
    await assert.rejects(() => arret(db), /permission denied/);
  } finally { await db.close(); }
});
