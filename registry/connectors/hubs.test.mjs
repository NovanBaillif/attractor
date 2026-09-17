import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discovery} from './index.mjs';

const observed = JSON.parse(readFileSync(new URL('./discovery-sources.json', import.meta.url)));
const probe = id => observed.probes.find(p => p.id === id);
const fixture = id => structuredClone(probe(id).responseProjection);
const response = data => new Response(JSON.stringify(data), {headers: {'Content-Type': 'application/json'}});
function mock(data) {
  const calls = [];
  return {calls, fetchImpl: async (url, init) => { calls.push({url, init}); return response(data); }};
}
const AGNTCY = {connector: 'agntcy', url: 'https://ai-catalog.outshift.io/v1/agents', media_type: 'application/a2a-agent-card+json', limit: 2};
const MCP = {connector: 'mcp-registry', url: 'https://registry.modelcontextprotocol.io/v0.1/servers', limit: 2};
const A2A = {connector: 'a2aregistry', url: 'https://a2aregistry.org/api/agents', limit: 2};

test('AGNTCY catalog: one collection per call, observed request, records without card contents', async () => {
  const client = mock(fixture('agntcy-catalog-a2a')), result = await discovery(AGNTCY, client);
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].url, probe('agntcy-catalog-a2a').url);
  assert.equal(client.calls[0].init.method, 'GET');
  assert.equal(result.metadata.total_reported, fixture('agntcy-catalog-a2a').totalCount);
  for (const c of result.candidates) {
    assert.match(c.external_id, /^urn:ai:org\.agntcy:cid:/);
    assert.equal(c.data_kind, 'directory-record');
    assert.equal(c.metadata.media_type, AGNTCY.media_type);
    assert.equal('data' in c.metadata, false);
  }
  await assert.rejects(discovery({...AGNTCY, limit: 6}, mock({})), /at most 5/);
  await assert.rejects(discovery({...AGNTCY, media_type: 'text/html'}, mock({})), /media_type/);
  await assert.rejects(discovery({...AGNTCY, query: 'memory'}, mock({})), /single filter/);
  const next = await discovery({...AGNTCY, cursor: '5'}, mock({...fixture('agntcy-catalog-a2a'), results: []}));
  assert.match(next.metadata.fetched_at, /T/);
  await assert.rejects(discovery(AGNTCY, mock({results: 'none', totalCount: 1})), /Unexpected/);
});

test('MCP Registry: cursor paging, one record per version, remotes kept as declared addresses', async () => {
  const data = fixture('mcp-registry-servers'), client = mock(data), result = await discovery(MCP, client);
  assert.equal(client.calls[0].url, probe('mcp-registry-servers').url);
  assert.equal(result.candidates.length, data.servers.length);
  const first = result.candidates[0], server = data.servers[0].server;
  assert.equal(first.external_id, `${server.name}@${server.version}`);
  assert.equal(first.revision, server.version);
  assert.ok(Array.isArray(first.metadata.declared_remotes));
  assert.equal(result.next_cursor, data.metadata.nextCursor);
  assert.equal(result.metadata.total_reported, null);
  const searched = mock(data);
  await discovery({...MCP, query: 'memory', cursor: 'abc'}, searched);
  assert.equal(searched.calls[0].url, 'https://registry.modelcontextprotocol.io/v0.1/servers?search=memory&limit=2&cursor=abc');
  await assert.rejects(discovery({...MCP, url: 'https://registry.modelcontextprotocol.io/v0/servers'}, mock(data)), /Unsupported/);
});

test('a2aregistry: offset paging, health values reported as the registry\'s own', async () => {
  const data = fixture('a2aregistry-agents'), client = mock(data), result = await discovery(A2A, client);
  assert.equal(client.calls[0].url, probe('a2aregistry-agents').url);
  assert.equal(result.metadata.total_reported, data.total);
  assert.deepEqual(result.next_cursor, data.total > 2 ? {offset: 2} : null);
  const first = result.candidates[0];
  assert.equal(first.external_id, data.agents[0].id);
  assert.equal(first.metadata.healthy_reported, data.agents[0].is_healthy);
  assert.equal(first.metadata.agent_card_url, data.agents[0].wellKnownURI);
  const healthy = mock(data);
  await discovery({...A2A, healthy: true}, healthy);
  assert.equal(healthy.calls[0].url, 'https://a2aregistry.org/api/agents?healthy=true&limit=2&offset=0');
  await assert.rejects(discovery({...A2A, healthy: false}, mock(data)), /healthy/);
  await assert.rejects(discovery({...A2A, cursor: {offset: -1}}, mock(data)), /offset/);
  await assert.rejects(discovery({...A2A, cursor: {page: 2}}, mock(data)), /offset/);
  await assert.rejects(discovery(A2A, mock({...data, offset: 5})), /Unexpected/);
});

test('No hub call leaves the configured host or carries credentials', async () => {
  for (const [config, id] of [[AGNTCY, 'agntcy-catalog-a2a'], [MCP, 'mcp-registry-servers'], [A2A, 'a2aregistry-agents']]) {
    const client = mock(fixture(id));
    await discovery({...config, headers: {Authorization: 'must-never-be-forwarded'}}, client);
    assert.equal(new URL(client.calls[0].url).host, new URL(config.url).host);
    assert.equal(client.calls[0].init.credentials, 'omit');
    assert.equal(JSON.stringify(client.calls[0].init.headers).includes('must-never'), false);
  }
});
