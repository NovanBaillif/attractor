import { randomUUID } from 'node:crypto';

/** Adapter for a locally operated agent. Persist requestId before retrying a mutation. */
export function civicClient({ base = 'http://127.0.0.1:4313', credential } = {}) {
  const url = new URL(base);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw Error('Cette version du client vise seulement le prototype local.');
  return {
    async world() {
      const r = await fetch(new URL('/api/world', url), { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw Error(`Lecture refusée : ${r.status}`); return r.json();
    },
    async command(action, payload, requestId = randomUUID()) {
      const r = await fetch(new URL('/api/command', url), { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential}` },
        body: JSON.stringify({ action, payload, requestId }), signal: AbortSignal.timeout(10000) });
      const result = await r.json(); if (!r.ok) throw Object.assign(new Error(result.error), { status: r.status, requestId });
      return result;
    },
  };
}
