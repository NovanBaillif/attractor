# ATTRACTOR / HONEY 2.0

Nine bounded deterministic JSON tools and four persistent knowledge tools. Anonymous first call, no account or API key. Endpoint: https://attractor-observatory-demo.vercel.app/mcp

## Direct MCP 2026-07-28 request

```sh
curl https://attractor-observatory-demo.vercel.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' \
  -H 'Mcp-Method: tools/call' \
  -H 'Mcp-Name: extract_json_from_llm_output' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"extract_json_from_llm_output","arguments":{"text":"Result: {\"count\":3}"},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{},"io.modelcontextprotocol/clientInfo":{"name":"example-client","version":"1.0"}}}}'
```

The result has `resultType: complete`, `structuredContent.result.value: {count:3}`, an opaque public `knowledge_id`, a public `attractor_trace_id`, and machine-readable `outputSchema` in the tool catalog. Invalid extraction returns a model-readable error rather than invented JSON. No `Mcp-Session-Id` is created or required for this protocol version.

`server/discover` is optional. It returns supportedVersions, capabilities, instructions and serverInfo. `tools/list` returns deterministic ordered tools, schemas, ttlMs and cacheScope. Discovery does not imply tools were listed. Both operations are quota-limited. Headers must match the body; missing/mismatched routing headers return -32020. Unsupported versions return -32022 with supported versions. Required request metadata is protocolVersion and clientCapabilities; clientInfo is optional and self-reported.

## Two-tool workflow

1. Call `extract_json_from_llm_output` with `text`.
2. Call `validate_json_schema` with `value` equal to the extracted value, and your supported `schema`.
3. Optionally include the previous `knowledge_id` as `attractor_knowledge_id` and carry `attractor_trace_id`.

Each successful result receives a unique per-request knowledge handle, even for repeated identical values. An observed value match is logged only if the supplied input fingerprint matches the previous knowledge handle and an earlier issued handle exists. This is value reuse, not a claim about task success. Opaque HMAC handles avoid exposing a public dictionary-test hash of private input. They cannot fetch private results or authorize an operation. Results themselves are not persisted as public knowledge: publish a synthetic recipe explicitly to add durable reusable content.

## Application continuation

Every first modern tool call works alone. To reuse a private Commons exposure receipt across requests, retain `result._meta["io.attractor/context"]` and send it in `params._meta["io.attractor/context"]`. This is a private application bearer credential, distinct from the public trace ID. It expires after 30 days. Never publish it, a marker or a receipt. A new call without context starts a separate application record. The public trace ID alone never grants access to a previous receipt. Lists and discovery do not return private context and may be cached by clients.

`find_solutions` returns known_solution_id, lineage, verification_count, alternatives, confidence and immutable recipe IDs. Read a recipe by UUID, using its read_url or removing the ATR-K- prefix. `read_solution` obtains the private exposure receipt; `contribute_solution` publishes a synthetic revision; `verify_reuse` recomputes the supplied output. Matching valid coercion results may also link an existing Commons solution. The tool still works without a known match.

## Compatibility and schemas

Legacy 2025-11-25, 2025-06-18 and 2025-03-26 clients keep initialize and Mcp-Session-Id. Legacy catalog names remain extract_json, coerce_to_schema, validate_schema and dedupe_records. Modern names are extract_json_from_llm_output, coerce_json_to_schema, validate_json_schema and deduplicate_json_array. Both catalogs contain 17 tools; aliases do not duplicate tools in a catalog.

Tool input/output contracts use JSON Schema syntax compatible with 2020-12. The **validation utility's schema argument remains the documented bounded subset**; supporting the modern protocol does not turn that utility into a full JSON Schema engine. No arbitrary schema fetching, code execution, shell, scanners or URL proxy.

## Observation and controls

Events record request IDs, UTC start/completion timestamps, protocol/header method and tool, client name/version, user-agent, query-free referrer, status, error category, processing latency before audit persistence, server version, catalog SHA-256, tool names actually presented, public correlation handles and keyed hashes. Daily network HMACs support limited grouping without storing raw IPs. mcpbeat's published address can be compared transiently at trusted ingress; the resulting match flag is not cryptographic authentication. Historical missing fields stay unknown.

Classifications: CONTROLLED, DECLARED_INFRASTRUCTURE, PROBABLE_INFRASTRUCTURE, UNKNOWN, INTERACTIVE_UNKNOWN. At least three similar arrivals with intervals within 20% of their median, no calls/contributions/reuse and a catalog view suggest a periodic infrastructure source. This is a heuristic, particularly weak without historical network/client metadata. Changing libraries or daily pseudonyms can split a source; shared stacks/NAT can merge sources. Never interpret group count as independent actors.

Unknown Tool Conversion counts groups with both catalog views and calls divided by groups with catalog views, excluding controlled and infrastructure groups. Direct-call groups are separate so modern clients are not penalized for skipping discovery. Contributions and recipe/value reuse have separate counters. Returned results are not labelled consumed. CAKTR remains uncomputed until an operational definition is specified. GET/DELETE/HEAD 405 are expected transport behavior, not a server outage.

Limits: 24,000 request bytes, depth 24, 4,000 JSON nodes, 128,000 result bytes, 100,000 retained events, 10,000 application records, 2,000 recipe versions, 10,000 RPC quota units/day, 120/network/minute and 60/application record/minute. Calls consume multiple units (gate, attempt, result, trace; optional session creation and Commons lookup). Private events expire after 30 days via request-triggered daily cleanup. No billing API charges or arbitrary external fetches are initiated by tools. Hosting costs still depend on the provider plan.

CONTRIBUTIONS_PAUSED stops new recipes while leaving tools and reads operational. OBSERVATION_ONLY also suspends utility execution and verified-use writes. FULL_STOP blocks live experimental operations; private operator diagnostics and static documentation remain available.

The public experiment manifest archives both catalog hashes and the UTC freeze time. After release, only bug fixes may change this experiment; record a new version/hash and observation window for any behavior or catalog change. Controlled conformance tests are scripted checks, not evidence that an agent spontaneously chose the honey.

## Native 3.0

The four machine-native capabilities are documented in [native.md](/native.md). The original HONEY 2.0 experiment and both catalogs are preserved as archives.
