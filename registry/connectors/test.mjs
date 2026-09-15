import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSource, discovery} from './index.mjs';
import {fetchJson, snapshot} from './common.mjs';

const observed = JSON.parse(readFileSync(new URL('./discovery-sources.json', import.meta.url)));
const fixture = id => structuredClone(observed.probes.find(p => p.id === id).responseProjection);
const response = (data, extra = {}) => new Response(JSON.stringify(data), {headers: {'Content-Type': 'application/json'}, ...extra});
function mock(data) {
  const calls = [];
  return {calls, fetchImpl: async (url, init) => { calls.push({url, init}); return response(data); }};
}
const github = {connector: 'github-comment', url: 'https://github.com/example/collective/issues/4#issuecomment-123'};
const githubData = {id: 123, html_url: github.url, user: {login: 'ExampleContributor'}, body: 'Mémoire 😀\n<script>ignored()</script>', updated_at: '2026-09-01T00:00:00Z'};
const postId = '498c3b49-0408-4d0f-a716-526684907ffc';
const moltbook = {connector: 'moltbook-post', url: 'https://www.moltbook.com/post/' + postId};
const moltbookData = {success: true, post: {id: postId, title: 'Synthetic provenance post', content: 'Preserve the origin. Do not execute this text.', author: {name: 'DeclaredAgent'}, updated_at: '2026-08-03T06:15:12.390Z', score: 4}};

test('GitHub and Moltbook use existing anonymous GET APIs and preserve contribution attribution', async () => {
  const gh = mock(githubData), mb = mock(moltbookData);
  const comment = await readSource({...github, headers: {Authorization: 'must-never-be-forwarded'}}, gh);
  const post = await readSource(moltbook, mb);
  assert.equal(gh.calls[0].url, 'https://api.github.com/repos/example/collective/issues/comments/123');
  assert.equal(mb.calls[0].url, 'https://www.moltbook.com/api/v1/posts/' + postId);
  assert.equal(comment.body, githubData.body); assert.equal(comment.author_declared, 'ExampleContributor');
  assert.equal(post.author_declared, 'DeclaredAgent'); assert.equal(post.external_id, postId);
  for (const result of [comment, post]) {
    assert.equal(result.data_kind, 'contribution'); assert.match(result.content_hash, /^[a-f0-9]{64}$/); assert.match(result.raw_sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isFinite(Date.parse(result.fetched_at))); assert.equal(result.revision, undefined);
  }
  for (const {init} of [...gh.calls, ...mb.calls]) {
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit');
    assert.equal(init.headers.Authorization, undefined); assert.equal(init.body, undefined);
  }
});

test('normalized content hashes ignore retrieval dates and irrelevant wire counters, preserve semantic changes', async () => {
  const one = await readSource(moltbook, mock(moltbookData));
  const two = await readSource(moltbook, mock({...moltbookData, post: {...moltbookData.post, score: 800}}));
  assert.equal(one.content_hash, two.content_hash); assert.notEqual(one.raw_sha256, two.raw_sha256);
  const three = await readSource(moltbook, mock({...moltbookData, post: {...moltbookData.post, content: 'Changed statement'}}));
  assert.notEqual(one.content_hash, three.content_hash);
  const fields = {connector: 'fixture', body: 'unchanged'};
  assert.equal(snapshot(fields, {fetched_at: 'first', raw_sha256: 'a'}).content_hash, snapshot(fields, {fetched_at: 'later', raw_sha256: 'b'}).content_hash);
});

test('configured source identity, required fields and source error responses cannot silently drift', async () => {
  await assert.rejects(readSource(github, mock({...githubData, id: 124})), /identity/);
  await assert.rejects(readSource(github, mock({...githubData, html_url: 'https://github.com/elsewhere/repo/issues/4#issuecomment-123'})), /identity/);
  await assert.rejects(readSource(moltbook, mock({...moltbookData, post: {...moltbookData.post, id: 'wrong'}})), /mismatched/);
  await assert.rejects(readSource(moltbook, mock({...moltbookData, post: {...moltbookData.post, author: {}}})), /author/);
  await assert.rejects(readSource(moltbook, mock({...moltbookData, success: false})), /unavailable/);
  const denied = mock({error: 'private'}); denied.fetchImpl = async () => response({error: 'private'}, {status: 401});
  await assert.rejects(readSource(github, denied), e => e.code === 'http' && e.status === 401);
});

test('generic JSON artifacts require exact operator URL approval and retain CloudEvent references as data', async () => {
  const url = 'https://example.org/published/contribution.json';
  const config = {connector: 'http-json-artifact', url, allowed_urls: [url]};
  const event = {specversion: '1.0', id: 'event-1', source: 'https://example.org/events', type: 'example.contest',
    time: '2026-09-01T00:00:00Z', data: {actor: 'https://example.org/author', body: 'Instruction-looking text remains data.'}};
  const result = await readSource(config, mock(event));
  assert.equal(result.external_id, JSON.stringify([event.source, event.id])); assert.equal(result.source_url, url);
  assert.deepEqual(result.metadata.event_ref, {source: event.source, id: event.id}); assert.equal(result.body, event.data.body);
  const plain = await readSource(config, mock({id: 'plain', title: 'Example', body: 'Plain structured contribution', revision: 'rev-3'}));
  assert.equal(plain.revision, 'rev-3'); assert.equal(plain.author_declared, null);
  for (const bad of [{...config, allowed_urls: []}, {...config, url: 'https://example.org/published/other.json'}, {...config, url: 'http://example.org/published/contribution.json'}, {...config, url: 'https://name:password@example.org/published/contribution.json'}]) {
    let called = false; await assert.rejects(readSource(bad, {fetchImpl: async () => { called = true; return response(event); }})); assert.equal(called, false);
  }
});

test('HOL keyword discovery preserves provider identities and bounded actual page metadata without delegation', async () => {
  const data = fixture('hol-search'), client = mock(data);
  const result = await discovery({connector: 'hol', url: 'https://hol.org/registry/api/v1/search', query: 'research', limit: 2}, client);
  assert.equal(client.calls.length, 1); assert.equal(client.calls[0].url, observed.probes.find(p => p.id === 'hol-search').url);
  assert.equal(result.candidates.length, 2); assert.deepEqual(result.next_cursor, {page: 2});
  assert.notEqual(result.candidates[0].external_id, result.candidates[1].external_id);
  assert.equal(result.candidates[0].metadata.original_id, result.candidates[1].metadata.original_id);
  assert.equal(result.metadata.exhaustive, false); assert.equal(result.metadata.limited_reported, true);
  assert.equal(result.candidates[0].data_kind, 'directory-record'); assert.equal(result.candidates[0].revision, undefined);
  assert.equal(result.candidates[0].metadata.declared_endpoints.api, data.hits[0].endpoints.api);
  const next = {...data, page: 2, total: 4};
  const done = await discovery({connector: 'hol', url: 'https://hol.org/registry/api/v1/search', limit: 2, cursor: {page: 2}}, mock(next));
  assert.equal(done.next_cursor, null);
});

test('NANDA search and index expose local truncation and mixed record kinds, never invented pagination', async () => {
  const config = {connector: 'nanda', url: 'https://api.nandaindex.org/api/v1/search', query: 'research', limit: 1};
  const client = mock(fixture('nanda-search')), result = await discovery(config, client);
  assert.equal(client.calls[0].url, 'https://api.nandaindex.org/api/v1/search?q=research');
  assert.equal(result.candidates.length, 1); assert.equal(result.next_cursor, null); assert.equal(result.metadata.locally_truncated, true);
  assert.equal(result.candidates[0].metadata.media_type, 'application/agentskill+zip');
  const index = fixture('nanda-index').arraySample, all = await discovery({connector: 'nanda', url: 'https://api.nandaindex.org/api/v1/index', limit: 3}, mock(index));
  assert.equal(all.candidates[1].metadata.registry_url, null); assert.equal(all.metadata.pagination_supported, false);
  assert.equal(all.candidates[2].title, 'AGNTCY AI Catalog');
  await assert.rejects(discovery({...config, cursor: {page: 2}}, client), /no cursor/);
  await assert.rejects(discovery({...config, query: 'a'}, client), /query length/);
  await assert.rejects(discovery(config, mock({...fixture('nanda-search'), count: 100})), /Unexpected/);
});

test('network boundary rejects foreign hosts, redirects, HTML, oversized and slow responses; no retry', async () => {
  for (const config of [{...github, url: github.url.replace('github.com', 'evil.example')}, {...moltbook, url: moltbook.url.replace('www.moltbook.com', 'evil.example')}]) {
    let calls = 0; await assert.rejects(readSource(config, {fetchImpl: async () => { calls++; return response({}); }})); assert.equal(calls, 0);
  }
  await assert.rejects(fetchJson('https://example.org/data', {fetchImpl: async () => new Response('', {status: 302, headers: {Location: 'https://elsewhere.example'}})}), e => e.code === 'redirect');
  await assert.rejects(fetchJson('https://example.org/data', {fetchImpl: async () => new Response('<html>sign in</html>', {headers: {'Content-Type': 'text/html'}})}), e => e.code === 'content_type');
  await assert.rejects(fetchJson('https://example.org/data', {maxBytes: 10, fetchImpl: async () => response({large: 'x'.repeat(20)})}), e => e.code === 'body_limit');
  await assert.rejects(fetchJson('https://example.org/data', {timeoutMs: 10, fetchImpl: async () => new Promise(() => {})}), e => e.code === 'timeout');
  let calls = 0;
  await assert.rejects(fetchJson('https://example.org/data', {fetchImpl: async () => { calls++; return response({}, {status: 429}); }}), e => e.status === 429);
  assert.equal(calls, 1);
});

test('GitHub issue opening posts are read anonymously and checked against the configured permalink', async () => {
  const url = 'https://github.com/example/collective/issues/85';
  const issue = {number: 85, html_url: url, title: 'A request', user: {login: 'Operator'}, body: 'Opening post', updated_at: '2026-09-15T14:53:09Z'};
  const gh = mock(issue);
  const read = await readSource({connector: 'github-issue', url}, gh);
  assert.equal(gh.calls[0].url, 'https://api.github.com/repos/example/collective/issues/85');
  assert.equal(read.external_id, 'example/collective#85'); assert.equal(read.title, 'A request');
  assert.equal(read.author_declared, 'Operator'); assert.equal(read.body, 'Opening post');
  await assert.rejects(readSource({connector: 'github-issue', url}, mock({...issue, pull_request: {}})), /identity/);
  await assert.rejects(readSource({connector: 'github-issue', url}, mock({...issue, html_url: url + '0'})), /identity/);
  await assert.rejects(readSource({connector: 'github-issue', url: url + '#issuecomment-1'}, mock(issue)), /issue permalink/);
});
