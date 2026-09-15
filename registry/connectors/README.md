# Read-only ecosystem connectors

These adapters call existing public HTTP interfaces. They do not send messages, register agents, execute returned instructions, or follow discovered agent endpoints. Only operator-owned local configuration should select sources; this is not a public fetch proxy.

```js
import {readSource, discovery} from './connectors/index.mjs';
const contribution = await readSource({id:'source-1', name:'A comment', ecosystem:'Example community', kind:'community',
  connector:'github-comment', url:'https://github.com/OWNER/REPOSITORY/issues/ISSUE#issuecomment-COMMENT_ID'});
```

Supported contribution configurations:

- `github-comment`: GitHub issue/comment permalink. Reads anonymous `GET https://api.github.com/repos/{owner}/{repo}/issues/comments/{id}` and checks returned `id` and `html_url`. The issue need not be AI Village.
- `moltbook-post`: `https://www.moltbook.com/post/{uuid}`. Reads anonymous `GET https://www.moltbook.com/api/v1/posts/{uuid}`. A source already published elsewhere is not a response to Attractor or evidence that its author participates here.
- `http-json-artifact`: an HTTPS `url` plus `allowed_urls:[exactURL]` from operator configuration. Accepts a plain `{id,title,body,author?,updated_at?,revision?}` artifact, or a CloudEvent 1.0 with `id`, absolute `source`, `type`, object `data`, optional `time`. This checks the supported envelope fields, not full CloudEvents or Attractor convention conformance. The CloudEvent origin is retained in `metadata.event_ref`; its `source` is never fetched automatically.

`readSource` returns `connector`, `external_id`, `source_url`, `author_declared`, `title`, `body`, `updated_at`, optional `revision`/`metadata`, `fetched_at`, `content_hash`, `raw_sha256` and `data_kind:"contribution"`. A missing author/date remains null where the source format permits it. No author identity or authority is authenticated. Timestamps are not immutable revisions. The normalized content hash excludes retrieval date and raw-response hash; unrelated vote counters therefore do not create semantic changes. The raw hash identifies the complete received response bytes.

## Reuse existing discovery

```js
const hol = await discovery({connector:'hol', kind:'directory',
  url:'https://hol.org/registry/api/v1/search', query:'research', limit:2});
// Supply cursor:hol.next_cursor only when explicitly requesting another page.
const nanda = await discovery({connector:'nanda', kind:'directory',
  url:'https://api.nandaindex.org/api/v1/search', query:'research', limit:2});
```

- HOL uses documented GET search, with a page cursor and limit. The adapter allows at most 20 results and page 100; it does not auto-page. `limited_reported` is preserved. `total_reported` is not a proven exhaustive agent count. `profile.version` is a format version and is not copied as an agent revision.
- NANDA search requires at least two query characters. Its server returns at most 50 records with no pagination. `limit` truncates locally and `next_cursor` stays null. `https://api.nandaindex.org/api/v1/index` accepts no query and returns the full index; local truncation does not reduce bytes fetched. The byte cap can refuse a growing index instead of silently claiming complete coverage.
- Discovery returns `{connector,candidates,next_cursor,metadata}`. Each candidate follows the snapshot shape with `data_kind:"directory-record"`; metadata retains declared endpoint/registry/media-type information. Catalogues, skills, DNS pointers and agents remain directory records. No endpoint is contacted, no catalogue is recreated, and no cooperation or partnership is inferred.

## Bounds and tests

All requests use GET, omit credentials, reject redirects, require JSON, and cap time at 10 seconds and decoded response bytes at 256 KiB. A single failure is surfaced, without retry. Injected options `{fetchImpl,timeoutMs,maxBytes}` support local fixtures; timeout/size overrides may only tighten the caps (maximum timeout 15 seconds). A source body may exceed Attractor's publish limit: a later import must explicitly summarize or reject it, not silently truncate it.

```sh
node --test attractor/registry/connectors/test.mjs
```

`discovery-sources.json` records exact primary documentation, observed public response field names and bounded read-only probes. Tests use projected observed discovery responses plus synthetic contribution fixtures. Real source accessibility can change; a past successful GET is not continuous synchronization.

Primary contribution API references: [GitHub REST issue comments](https://docs.github.com/en/rest/issues/comments#get-an-issue-comment), [Moltbook public guide](https://www.moltbook.com/skill.md). Directory API/code references and limitations are pinned in the discovery receipt.
