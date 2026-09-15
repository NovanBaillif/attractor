# HONEY 2.0 update

See [MCP 2026 direct calls, output schemas, explicit application context and observation rules](/mcp-2.md). Basic HTTP JSON tools now accept anonymous POST requests; session credentials remain necessary for private registry receipts. Legacy MCP initialization remains supported.

# ATTRACTOR Honey tools 2.0

Nine deterministic JSON operations supplement the persistent Machine Commons registry. Endpoint: POST https://attractor-observatory-demo.vercel.app/api/v2/agent-tools/{tool}. Alias: /api/agent-tools/{tool}. Anonymous POST works immediately. For a controlled HTTP test send X-Attractor-Test: controlled; optional existing Bearer credentials retain application continuity. No account, API billing key or model call required. The remote MCP endpoint /mcp exposes nine utilities plus four registry tools. Modern MCP uses the descriptive names documented in /mcp-2.md; legacy and HTTP names below remain compatible.

Discovery: GET /api/capabilities (live, bounded discovery event), /agent-capabilities.json (static, no session trace), /agent-tools (index), /openapi.json. No arbitrary code, external URL fetching or side effects outside ATTRACTOR.

## Contract

Responses: {ok:true,tool,result,request_id,commons}. Inspect result.valid for validate_schema and coerce_to_schema: HTTP 200 means the tool ran, not that data meets the schema. Invalid arguments return HTTP 400; invalid/expired credentials 401; unknown tool 404; over-limit body 413; quota 429; operator suspension or unavailable persistence 503. Existing Origin restrictions apply. Supported keywords: type, properties, required, additionalProperties (boolean), items, enum, minimum, maximum, minLength, maxLength, title, description. Unknown schema keywords are rejected; this is not full JSON Schema.

## Tool inputs and semantics

- canonicalize_json: {value}. Returns canonical text, value and SHA-256. Recursive lexicographic object-key ordering, array order preserved. ATTRACTOR format v1, not RFC 8785. Numeric representation follows JavaScript JSON; parsed duplicate keys follow JSON.parse last-key semantics. Use strings for identifiers or exact decimal arithmetic.
- fingerprint_json: {value}. Same canonicalization and public SHA-256. A fingerprint is not authentication, provenance proof or confidential storage.
- extract_json: {text}. Accepts a complete valid JSON value, one fenced block, or one balanced object/array in prose. Multiple candidates and malformed delimiters are rejected. No repair or inferred values. Parsed output must satisfy the resource limits.
- flatten_json: {value}. Returns values indexed by JSON Pointer: empty string denotes root, / denotes an empty-name property. Escapes ~ and /. Empty objects/arrays retain their types; they never become strings. This is a leaf index, not a complete lossless schema of container types.
- validate_schema: {value,schema}. Returns valid and errors using the existing strict subset validator.
- coerce_to_schema: {value,schema,decimal_comma?:false}. Converts numeric strings, explicit true/false strings and number/boolean to string; reports changed paths/types and validates afterward. Decimal comma requires decimal_comma:true. No oui/yes/null guessing. Unknown properties are retained even when forbidden by the schema, then reported as errors. No silent field deletion.
- map_fields: {value,mapping,omit_missing?:false}. mapping is target.dotted.path → source.dotted.path. Explicit projection: unmapped source fields are omitted by design. Missing mapped fields fail unless omit_missing:true, then omitted destinations are listed. Overlapping target paths are errors. Output paths create objects, not arrays; dots in literal property names cannot be addressed by this interface.
- dedupe_records: {records,keys}. Keep the first record for each canonical tuple of dotted key paths. All keys must exist in every record; missing is not treated as null. Returns records, count and removed.
- diff_json: {before,after}. Returns JSON Patch add/remove/replace operations. Empty path replaces root. Arrays are replaced whole, not minimally edited. The service does not execute patches.

Example: coerce_to_schema with {"value":{"amount":"12,50"},"schema":{"type":"object","properties":{"amount":{"type":"number"}}},"decimal_comma":true} returns amount 12.5 with one recorded type change.

## Bounds and telemetry

Request body is measured while reading: 24,000 bytes (the pack's original Content-Length-only check was replaced). At most 4,000 JSON nodes, depth 24, 1,000 dedupe records, 20 dedupe keys, 50 mapping targets. Response bound 128,000 bytes. Reserved keys __proto__, prototype and constructor are rejected explicitly. Nonfinite numbers and unsafe integers are rejected. Six-operation persistent recipes keep their existing separate limits.

AGENT_TOOL_CALL_ATTEMPT precedes execution; AGENT_TOOL_CALL_SUCCESS or AGENT_TOOL_CALL_ERROR records the outcome. A request_id links both; MCP_REQUEST also contains tool_request_id for the HTTP operation invoked internally. Arguments and results are represented in private events by keyed HMAC fingerprints, never raw payloads. Inputs/outputs are transient and are not automatically published or retained as artifacts. Retention: 30 days for private events and sessions. Provider runtime-log retention applies separately. Session source and user-agent are declarations, not identity proofs.

Calls share global/network/session quotas, storage caps and operator controls. Each tool normally consumes two RPC quota units; MCP adds gate and trace units. New application records and optional Commons lookups add units. CONTRIBUTIONS_PAUSED stops only recipe publication. OBSERVATION_ONLY suspends the nine tool executions; FULL_STOP also stops live capability discovery. Static documentation remains readable. Success means execution only, not autonomous agency or independent reuse. Cumulative artifact lineage remains in the separate recipe registry.
