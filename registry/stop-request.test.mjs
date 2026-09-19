// The public stop request only ever pauses new contributions; it never lifts a stricter mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHandler} from './api.mjs';

const env = {ATTRACTOR_DB_URL: 'https://example.invalid', ATTRACTOR_DB_KEY: 'test-only', ATTRACTOR_NETWORK_KEY: 'test-network',
  ATTRACTOR_ADMIN_KEY: 'test-operator', ATTRACTOR_ORIGIN: 'https://attractor.example'};

async function withServer(start, run) {
  let mode = start;
  const calls = [];
  const rpc = async (op, token, network, args) => {
    calls.push({op, args});
    if (op === 'health') return {mode, protocol: '0.2', persistence: true};
    if (op === 'admin_mode') { mode = args.mode; return {mode}; }
    if (op === 'stop_request') { const changed = mode === 'NORMAL'; if (changed) mode = 'CONTRIBUTIONS_PAUSED'; return {mode, changed}; }
    return {error: 'unexpected', status: 500};
  };
  const server = http.createServer(createHandler({env, rpc}));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(base + '/api/v2/stop-request', {method: 'POST',
    headers: {'Content-Type': 'application/json', ...headers}, body: JSON.stringify(body)});
  try { await run({post, calls, mode: () => mode}); } finally { server.close(); }
}

test('a stop request moves NORMAL to CONTRIBUTIONS_PAUSED and says so', async () => {
  await withServer('NORMAL', async ({post, calls, mode}) => {
    const r = await post({reason: 'Messages en boucle depuis dix minutes', requester: 'un agent'});
    const d = await r.json();
    assert.equal(r.status, 200); assert.equal(d.changed, true); assert.equal(d.mode, 'CONTRIBUTIONS_PAUSED');
    assert.equal(mode(), 'CONTRIBUTIONS_PAUSED');
    assert.deepEqual(calls.map(c => c.op), ['stop_request'], 'one atomic operation, never a read followed by a write');
  });
});

test('a stop request never lifts or lowers a stricter mode', async () => {
  for (const start of ['CONTRIBUTIONS_PAUSED', 'OBSERVATION_ONLY', 'FULL_STOP']) {
    await withServer(start, async ({post, calls, mode}) => {
      const d = await (await post({reason: 'Encore une demande'})).json();
      assert.equal(d.changed, false); assert.equal(mode(), start);
      assert.ok(!calls.some(c => c.op === 'admin_mode'));
    });
  }
});

test('a stop request needs a reason, JSON, and an allowed origin when a browser sends one', async () => {
  await withServer('NORMAL', async ({post, mode}) => {
    assert.equal((await post({reason: 'no'})).status, 400);
    assert.equal((await post({reason: 'x'.repeat(501)})).status, 400);
    assert.equal((await post({reason: 'Raison valable'}, {Origin: 'https://evil.example'})).status, 403);
    assert.equal(mode(), 'NORMAL');
  });
});
