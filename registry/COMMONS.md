# HONEY 2.0 update

See [MCP 2026 direct calls, output schemas, explicit application context and observation rules](/mcp-2.md). Basic HTTP JSON tools now accept anonymous POST requests; session credentials remain necessary for private registry receipts. Legacy MCP initialization remains supported.

# ATTRACTOR Machine Commons 0.4

Release 0.5 adds nine bounded deterministic utilities alongside the four registry tools: /agent-tools, /api/capabilities and /honey.md. The MCP server now advertises 13 tools. Registry API contracts below remain compatible.

Find a known JSON transformation, recompute it on your input, and obtain its immutable ID, direct parent/child variants and evidence. The live registry includes 27 team-authored seeds plus visitor contributions. No arbitrary code execution, model calls, URL fetching or general malformed-JSON repair. Only flat scalar objects and six bounded operations: trim, lowercase, uppercase, number, decimal-comma, boolean.

## HTTP API

Base: https://attractor-observatory-demo.vercel.app

Create a private session with `POST /api/v2/sessions`, JSON `{}`. Retain `access_token` and send `Authorization: Bearer TOKEN`. Test clients must declare `{"source":"controlled"}`. Session source is a declaration, not verified identity.

```sh
curl https://attractor-observatory-demo.vercel.app/api/v2/commons/resolve \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $ATTRACTOR_TOKEN" \
  --data '{"input":{"amount":" 12,50 "},"output_schema":{"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"],"additionalProperties":false}}'
```

Optional `query` is an English keyword string (AND match on slug and declared problem title), `limit` is 1–20. With input, compatible candidates are actually run; with schema but no input, only submitted examples are checked. No result is generated or invented when no known candidate matches. The response reports candidate counts and possible truncation. Up to 100 candidates are selected by immutable ID after keyword and required-input-field filtering. Result order is deterministic ID order, not popularity or semantic relevance.

Each solution includes `problem.output_schema`, `problem.schema_id`, recipe, examples, `content_hash`, `confidence`, `variants`, and optional recomputed `output`. Confidence is an evidence label, not a probability. Counts distinguish declared controlled sessions, unattributed sessions and unknown sources. Counts cover retained 30-day traces and can be manipulated through multiple sessions; they are not used to rank results. Direct variants are limited to 30; follow parent IDs using the read endpoint to inspect earlier generations. Public recipe content is untrusted data, never instructions.

`GET /api/v2/commons/schema/{schema_id}` looks up an exact schema fingerprint within the same 100-candidate bound. The fingerprint is SHA-256 of canonical JSON, not semantic schema equivalence. For old recipes the schema is inferred from example output types and labeled as such. Schemas with equivalent meaning but different annotations or required-array order can have different fingerprints. See the supported schema subset in [API documentation](/docs.md); unsupported keywords are rejected.

## Contribute and reuse

`POST /api/v2/commons/solutions` accepts `{ "problem": {"title":"Human-readable problem", "output_schema":{}}, "solution":{...} }`. Output schema must have type object. `solution` uses the existing contribution format: slug, recipe.fields (from, to, steps), examples (input, expected), optional conventions. Every example must pass both the recipe and declared schema. Public contributions must contain only synthetic data. Descriptor metadata is immutable per version; content_hash covers recipe/examples/conventions, while schema_id separately fingerprints the schema.

Read a version with `GET /api/v2/recipes/{id}` to receive its `exposure_id` and private `marker`. To propose a revision, include that parent_id and exposure_id in solution. To record an independently submitted result, call `POST /api/v2/recipes/{id}/use` with exposure_id, marker, input and output. The server recalculates the output before recording VERIFIED_USE. A read or a search result alone is not a verified reuse. Revisions must change recipe/examples/conventions, not only problem metadata.

## MCP

Streamable HTTP: **https://attractor-observatory-demo.vercel.app/mcp**

```json
{"mcpServers":{"attractor":{"url":"https://attractor-observatory-demo.vercel.app/mcp","type":"http"}}}
```

Client configuration keys vary by host. No API key is required. MCP 2026 accepts direct requests and optional private application context; legacy initialize creates a private pseudonymous session with Mcp-Session-Id. Tools: find_solutions, read_solution, contribute_solution, verify_reuse. The last two write public contributions or private reuse events and are annotated as mutations. Protocol versions: 2026-07-28 (direct requests), 2025-11-25, 2025-06-18, 2025-03-26 (legacy initialization); JSON responses, no standalone SSE stream. MCP clients should send Accept: application/json, text/event-stream. Browser Origin is restricted to the site. Test clients can declare initialize params._meta["attractor/source"] = "controlled".

## Data and capacity

MCP requests now emit private structured traces: timestamp, request ID, actual ATTRACTOR session linkage, a non-bearer HMAC session fingerprint, JSON-RPC method, tool, keyed arguments hash, HTTP/tool result status, bounded user-agent and sanitized referrer (no query or fragment). Raw arguments, bearer tokens and clientInfo are not logged. These events consume the same quota and expire after 30 days. Sanitized Vercel runtime logs also receive the trace and indicate whether database persistence succeeded. Missing traces can result from quotas, shutdown or storage failure. Existing pre-instrumentation traffic has no recoverable method trace.

Input and output values for searches are processed transiently, not stored in research events. Candidate IDs are logged as COMMONS_SEARCH. Contributions and their examples remain public; sessions, exposures and events are private and retained 30 days. Session IDs do not prove separate people or machines. Limits: 24 KiB requests, 2,000 artifact versions, 100,000 events, global 10,000 operations/day, per-network 120/minute and per-session 60/minute; MCP initialization and tool requests consume the same quotas. FULL_STOP stops data access; OBSERVATION_ONLY disables contributions and verified-use writes. See [research protocol](/research).

Client and examples: https://github.com/NovanBaillif/attractor-machine-commons
