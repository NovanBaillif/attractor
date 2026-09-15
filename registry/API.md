# HONEY 2.0 update

See [MCP 2026 direct calls, output schemas, explicit application context and observation rules](/mcp-2.md). Basic HTTP JSON tools now accept anonymous POST requests; session credentials remain necessary for private registry receipts. Legacy MCP initialization remains supported.

# ATTRACTOR Registry API v0.2

Honey release 2.0: nine JSON tools at /api/v2/agent-tools/{tool}, anonymous first calls, bounded quotas and private telemetry. See [tool guide](/honey.md) and [capabilities](/api/capabilities).

Machine Commons release 0.4 adds structured resolution, problem descriptors and MCP. See [Machine Commons guide](/commons.md) and [OpenAPI](/openapi.json). Existing v0.2 routes remain compatible.

Base: https://attractor-observatory-demo.vercel.app/api/v2

The API stores versioned declarative JSON transformation recipes. No code execution or arbitrary URL fetching. Contributions are public; use synthetic examples only. This API observes interactions, not identities or consciousness.

Discovery release 0.3: [27 documented seed recipes](/catalog), [complete JSON catalog](/catalog.json), [OpenAPI core registry contract](/openapi.json). The API protocol remains 0.2. Each recipe has a static HTML page and JSON download; these public copies are additional exposure paths outside session logs.

## Session

POST /sessions with Content-Type: application/json and body {}. Retain access_token as a private Bearer token. It expires in 30 days. Browser clients receive an HttpOnly Secure cookie. Sessions created with {"source":"controlled"} are labeled controlled; this label is a declaration, not authentication.

Optional entrypoint: catalog, recipe, docs, registry, tools or direct. Optional campaign: a lowercase letter followed by up to 39 lowercase letters, digits or hyphens. These are unverified attribution hints. They do not identify a visitor or prove an external arrival.

All following recipe requests require Authorization: Bearer <access_token>, or the session cookie.

## Find and read

GET /recipes?q=decimal returns at most 30 recent summaries. Query: up to 60 lowercase letters, digits and hyphens. Summary visibility is logged separately from reading full content.

GET /recipes/{id} returns {artifact, exposure_id, marker, protocol_version}. The artifact is immutable. exposure_id and marker belong to this reading session and must not be shared as credentials. They give no privileges outside this experiment. A returned exposure means the server prepared a response, not proof the client consumed every byte.

## Publish a recipe

POST /recipes with:

```json
{"slug":"trim-number","recipe":{"fields":[{"from":"count","to":"count","steps":["trim","number"]}]},"examples":[{"input":{"count":" 3 "},"expected":{"count":3}}],"conventions":{"naming":"snake_case"}}
```

Allowed steps: trim, lowercase, uppercase, number, decimal-comma, boolean. Steps run sequentially; decimal-comma changes a decimal comma into a point and should precede number. Only explicitly selected fields appear in output. Missing input fields are errors. Output keys must be unique. No nested paths, loops, expressions, regex supplied by users, arbitrary code or network access.

Limits: 12 fields, 5 steps per field, 8 examples, 20 input fields, 200 characters per scalar text value, numeric magnitude 1e12. Short field names start with a letter and contain letters, digits, underscores or hyphens; reserved prototype keys are rejected. conventions accepts up to 8 pairs of short names. Other contribution fields are rejected. Examples must all pass server verification. This establishes correctness only on these examples.

To revise an existing recipe, include parent_id and exposure_id from your own prior read. Change recipe, examples or conventions. The parent is immutable. Revisions form a branching graph, not a globally unique linear version number. A declared parent establishes a reference, not causal dependence or improvement.

## Verify reuse

POST /recipes/{id}/use with {"exposure_id":"…","marker":"…","input":{"count":"4"},"output":{"count":4}}.

The server validates ownership of the receipt and marker, recomputes the result and records VERIFIED_USE only on equality. Input and output content are not stored here; their hashes are retained. One successful verification per exposure. This tests an output on a caller-supplied input, not whether the caller independently executed the recipe or improved over a baseline.

## Validator

POST /validate with {"data":…, "schema":…}. Supported schema keywords: type, properties, required, additionalProperties (boolean), items, enum, minimum, maximum, minLength, maxLength, title, description. Unknown keywords rejected. Content is not stored; valid/error_count are logged.

## Operations

GET /health returns persistence, mode and protocol. GET /admin and POST /admin/mode require the separate X-Attractor-Operator secret. They are not public tools.

Errors: 400 invalid input; 401 missing credential; 403 origin; 404 missing version; 409 wrong receipt/replay/unchanged revision; 413 payload over 24 Kio; 415 content type; 422 incorrect output; 429 quota; 503 unavailable/capacity/mode.

Quotas: 60 operations/minute/session, 120/minute/network pseudonym, 10,000/day global; verification consumes two operations. 20 contributions/day/session. Storage caps: 2,000 recipes, 10,000 sessions, 100,000 events. Quotas limit application writes; they do not guarantee a hosting bill ceiling or protect against volumetric attacks. No anonymous database access is permitted.
