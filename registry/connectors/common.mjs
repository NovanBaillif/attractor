import {createHash} from 'node:crypto';

export class ConnectorError extends Error {
  constructor(code, message, status) { super(message); this.name = 'ConnectorError'; this.code = code; this.status = status; }
}
export const fail = message => { throw new ConnectorError('invalid_data', message); };
export const digest = value => createHash('sha256').update(value).digest('hex');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export function object(value, label = 'response') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected object: ' + label);
  return value;
}
export function string(value, label, max = 80000, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) fail('Invalid string: ' + label);
  return value;
}
export function date(value, required = false) {
  if ((value === undefined || value === null) && !required) return null;
  if (typeof value !== 'string' || value.length > 40 || !Number.isFinite(Date.parse(value))) fail('Invalid source timestamp');
  return value;
}
export function safeUrl(value) {
  let url; try { url = new URL(value); } catch { fail('Invalid configured URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.href.length > 2048) fail('Expected HTTPS URL without credentials or custom port');
  return url;
}
export function limit(value = 10) {
  if (!Number.isInteger(value) || value < 1 || value > 20) fail('Local limit must be 1-20');
  return value;
}
export function snapshot(fields, fetched) {
  // Fresh retrieval dates and unrelated wire metadata do not change normalized content identity.
  return {...fields, fetched_at: fetched.fetched_at,
    content_hash: digest(JSON.stringify(stable(fields))), raw_sha256: fetched.raw_sha256};
}
export async function fetchJson(value, {fetchImpl = fetch, timeoutMs = 10000, maxBytes = 262144} = {}) {
  const url = safeUrl(value);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000 || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 262144) fail('Invalid bounded fetch options');
  const controller = new AbortController();
  const expired = new ConnectorError('timeout', 'Read-only source request timed out');
  let onAbort;
  const abort = new Promise((_, reject) => { onAbort = () => reject(expired); controller.signal.addEventListener('abort', onAbort, {once: true}); });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let reader;
  try {
    const response = await Promise.race([fetchImpl(url.href, {method: 'GET', redirect: 'error', credentials: 'omit',
      headers: {Accept: 'application/json', 'User-Agent': 'Attractor-ReadOnly-Connectors/0.1'}, signal: controller.signal}), abort]);
    if (response.redirected || response.status >= 300 && response.status < 400 || response.url && response.url !== url.href) {
      await response.body?.cancel(); throw new ConnectorError('redirect', 'Source redirection refused');
    }
    if (!response.ok) { await response.body?.cancel(); throw new ConnectorError('http', 'Source returned HTTP ' + response.status, response.status); }
    if (!/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel(); throw new ConnectorError('content_type', 'Expected a JSON response');
    }
    if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); throw new ConnectorError('body_limit', 'Source response exceeds byte limit'); }
    reader = response.body?.getReader(); if (!reader) fail('Source returned no body');
    const chunks = []; let bytes = 0;
    for (;;) {
      const part = await Promise.race([reader.read(), abort]); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) throw new ConnectorError('body_limit', 'Source response exceeds byte limit');
      chunks.push(Buffer.from(part.value));
    }
    const raw = Buffer.concat(chunks);
    let json; try { json = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw)); } catch { fail('Source returned invalid JSON or UTF-8'); }
    return {json, raw_sha256: digest(raw), fetched_at: new Date().toISOString(), bytes, url: url.href};
  } catch (error) {
    if (reader) await reader.cancel().catch(() => {});
    if (controller.signal.aborted) throw expired;
    throw error;
  } finally { clearTimeout(timer); controller.signal.removeEventListener('abort', onAbort); }
}
