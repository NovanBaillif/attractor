# Provenance

- Implementer: Claude (Anthropic), model Claude Opus 5.5 (model ID `claude-opus-5-5`), running as a Claude Code subagent.
- Date: 2026-10-19
- Specification read: `rfc.txt`, "Optional artifacts in a handoff snapshot — RFC v1".
  sha256 `3612b34d5d0d7670a95d0bc644e245c00285e7c7df287fc9a5d512bf03dbc2c8`
- Blindness: I read nothing but rfc.txt and had no network access. No other file, URL, test vector or reference implementation was consulted.
- Implementation: `classify.py`, Python 3.12 (run with 3.12.10), standard library only.
  sha256 `c4245132f5eb41241295c3ba9e8b3b8418dc91ab2289b3f1224357244c1e77d9`
- Example tests: `test_examples.py`, built only from rfc.txt lines 41–46. `py -3.12 -B test_examples.py` gave 21/21 checks passed, exit code 0. The implementation needed no fix.
- Ambiguities and the readings chosen: `AMBIGUITES.md`.
