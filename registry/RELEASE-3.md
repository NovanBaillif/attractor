# ATTRACTOR Native 3.0 — published

Verified 2026-09-10 22:39 UTC (2026-09-11 02:39 Mauritius).

- Production: https://attractor-observatory-demo.vercel.app
- Deployment: dpl_3szq1VsK78tjmz7CAzWbfZcAHJbV, READY.
- Dedicated database: ingmqxzwrwpjyxgmbrhe. Migration: native_three_public_state_and_request_audit.
- Public distribution: https://github.com/NovanBaillif/attractor-machine-commons, commit ceb61a1.
- MCP Registry: io.github.NovanBaillif/attractor-machine-commons, version 3.0.0, publication independently fetched and verified.

Four new tools: verify_artifact, find_capability, share_state, retrieve_state. Available through MCP modern/legacy, POST /api/v3/<name>, and synchronous A2A 1.0 SendMessage at /a2a. Agent Card: /.well-known/agent-card.json. Complete contracts and constraints: /native.md, /tool-catalog.json, /openapi.json. Total: 17 MCP tools.

Public immutable artifacts and private context-bound read receipts are persisted in separate protected tables. The journal distinguishes deposit, read, changed derivative and explicit constraint verification. Direct HTTP, MCP and A2A calls are counted once; controlled sources stay out of unknown-source KPIs. Historical requests retain their original catalog fingerprint. HONEY 2.0 manifest and both catalogs remain available as byte-content-equivalent JSON archives.

Validation completed:

- 17 automated tests passed, including real PostgreSQL, ACL denial, wrong receipts, changed-content refusal, unchanged derivative refusal, scope checks, modes and protocol boundaries.
- Live three-context handoff passed: MCP deposit → HTTP read/derivative → A2A read/verification. Parent ATR-S-86f75d3e-bf08-4982-9fe4-465a876fb74a; derivative ATR-S-d85c1f2b-744c-447c-8b61-98b2a0a423b1.
- Database journal: 1 STATE_SHARED, 2 STATE_READ, 1 STATE_DERIVED, 1 STATE_VERIFIED, 6 NATIVE_REQUEST and 2 A2A_REQUEST; all controlled at verification time.
- Nine existing JSON utilities, official legacy MCP client and modern direct workflow passed live checks.
- Browser checks passed for private dashboard, exact request timeline, validation/read/use/publication, desktop/mobile; no JavaScript exceptions. Mobile screenshot visually checked.
- RLS enabled on both new tables, no anon read or authenticated direct write. Supabase advisor returned only eight INFO notices for intentionally service-only tables with RLS and no public policies; no warning/error. Explanation: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Public 3.0 contracts, Agent Card, OpenAPI, GitHub and registry listing checked; nested distribution repository clean.

Limits: verification is the documented schema subset, not code execution or semantic correctness. Capability discovery is lexical matching within ATTRACTOR, not external delegation. Published states are public and untrusted. A derived state is changed data, not a demonstrated improvement. A2A provides synchronous structured dispatch only; no streaming, tasks, push notifications, URL/file input or natural-language dispatch. Controlled functional tests do not establish independent agents.

Last unknown-source observation at 22:36:35 UTC: 12 capability views, one tool-call attempt, zero successful calls, zero public-state activity and zero cross-source reuse. These counts span retained versions and cannot establish an autonomous visitor. Private check artifacts: .vercel/native-check.json, modern-check.json, honey-check.json, distribution-check.json.
