# Ambiguities: "Optional artifacts in a handoff snapshot — RFC v1"

Blind implementation in `classify.py`. Line numbers refer to `rfc.txt` as read.
Written before any test.

## A. Ambiguous, underspecified or self-contradictory points in rfc.txt

### A1. No function name or host-language signature
- Text (l.29–31): "## Classifier contract" / "return exactly one of the four JSON results above or an invalid result below."
- Chosen: `classify(record) -> dict`. It takes one parsed JSON value and returns a new dict.
- Alternative: another name, or a function that takes JSON text. Line 37 rules that out: "The input is an already parsed JSON value."

### A2. How JSON types map to Python, and what happens to non-JSON Python values
- Text (l.13): "Input is a parsed JSON value." (l.37): "values that JSON cannot represent are outside this classifier."
- Chosen: the mapping of Python's `json` module. object = `dict`, array = `list`, string = `str`, null = `None`; numbers and booleans are anything else. A Python value that is not JSON gets no special case. It goes through the same type tests: a tuple or set is "not an array", anything that is not a dict is "not an object". The function never raises.
- Alternatives: raise `TypeError` on non-JSON Python values, or accept any `Mapping` or `Sequence` as object or array.

### A3. "its own, case-sensitive artifacts member"
- Text (l.13): "This profile classifies only its own, case-sensitive artifacts member".
- Chosen: the key must equal `"artifacts"` exactly, code point for code point. `"Artifacts"`, `"ARTIFACTS"`, `" artifacts"`, or a Unicode-equivalent spelling is some other member. Other members are ignored, so a record that has only those keys is `no_claim`. "Own" is a JavaScript idea (own versus inherited property). A Python dict has no prototype chain, so "own" just means the key is in the dict.
- Alternative: normalize or trim keys. Nothing in the text asks for it, and l.25 forbids normalization for references.

### A4. What a "character" is in "nonempty" / "at least one character"
- Text (l.22): "a nonempty array of nonempty JSON strings". (l.25): "Any string with at least one character is accepted, without trimming, case folding, URL resolution, path checking, or Unicode normalization."
- Chosen: `len(s) >= 1` in Python code points. Code points, UTF-16 code units, UTF-8 bytes and grapheme clusters all agree on whether a string is empty, so the result does not depend on the unit. Accepted: `" "`, `"\u0000"`, `"​"`, a lone combining mark, a lone surrogate `"\ud800"`.
- Alternative: a "visible character" reading that rejects zero-width or control-only strings. It conflicts with l.25: whitespace-only strings are accepted and nothing is normalized.

### A5. Lone surrogates (valid JSON grammar, not valid Unicode text)
- Text (l.37): "values that JSON cannot represent are outside this classifier."
- Chosen: a string such as `"\ud800"` is a string of one character, so it is accepted and copied. The CLI writes it back as the escape `\ud800`.
- Alternatives: treat it as `invalid_reference`, or as outside the contract (an error).

### A6. "The four JSON results above" when one of them is only described in prose
- Text (l.31): "return exactly one of the four JSON results above or an invalid result below … Return no other members." Rule 4 (l.22) describes the provided result in words, not as literal JSON.
- Chosen: `{"state":"provided","artifacts":[...]}` with exactly these two members, as in the example at l.44. Invalid results are exactly `{"state":"invalid","reason":...}`.
- Related wording: l.7 speaks of "four explicit states", but the contract also emits a fifth `state` value, `"invalid"`. This is not a contradiction in effect: "invalid" is a result, not a state of the collection. Output follows l.33–35 literally.

### A7. Copy depth, and aliasing for known_empty
- Text (l.22): "artifacts equal to a copy of the complete input array in input order". (l.31): "include a copy of the complete artifacts array."
- Chosen: a new list that holds the same string objects (shallow copy). Strings are immutable, so shallow and deep copies cannot be told apart. `known_empty` also returns a new `[]`, not the input list. The input is never mutated.
- Alternative: return the input list itself, which aliases it. That is not a copy.

### A8. "Scalar string" in rule 5
- Text (l.23): "Every other artifacts value is invalid, including an empty string, a scalar string, a number, a boolean, an object …". All JSON strings are scalars, so "scalar string" seems to mean a non-empty string used as the whole value.
- Chosen: any string, empty or not, as the artifacts value gives `artifacts_not_array_or_null`. This matches the example at l.45 and the contract at l.34. It is never wrapped into a one-element array.
- Alternative: wrap a single non-empty string as `["x"]`. Ruled out by l.23: "Do not coerce these into an accepted state".

### A9. Order of checks: rules 1–4 versus contract bullets l.33–35
- Text (l.33–35): an "Otherwise" chain of three invalid checks. Rules 1–4 are given separately.
- Chosen order: not an object → absent → null → not an array → bad item → empty → provided. The branches are mutually exclusive, so the order changes no result. An array with several bad items, such as `["", 1]`, has only one possible reason: `invalid_reference`. No conflict was found. This is recorded because the text never states one combined order.

### A10. Records that identify no task or snapshot
- Text (l.15): "The containing application must identify the task and snapshot to which its claims refer." (l.13): "it does not validate the rest of the handoff record."
- Chosen: no check. `{}` is `no_claim`, as the example at l.41 confirms.
- Alternative: reject records with no task or snapshot identification. That is out of scope by l.13 and l.15.

### A11. Duplicate member names, NaN and Infinity, encoding (CLI only)
- Text (l.37): "JSON text parsing, duplicate member names in source text, and values that JSON cannot represent are outside this classifier. A containing record contract must resolve any such interchange requirements".
- The pure function never sees JSON text. The CLI has to parse some, so it makes these choices:
  - Duplicate member names: Python's default, the last occurrence wins (as in JavaScript `JSON.parse`). Alternatives: first wins, or reject the input.
  - `NaN`, `Infinity`, `-Infinity`: refused as a parse error (exit code 2), because they are not JSON. Alternative: accept them as Python does. They would then classify as non-strings.
  - Encoding: the file is read as bytes and decoded by Python's JSON encoding detection (UTF-8 with or without BOM, UTF-16, UTF-32). Undecodable bytes are a parse error (exit code 2).

### A12. Output serialization
- Text (l.31): "Object-member order is irrelevant; array order and string values are significant."
- Chosen: the CLI writes compact JSON with `"state"` first, as in the examples. Output is ASCII-only: non-ASCII characters become `\u` escapes, and the parsed string values are identical. Alternative: raw UTF-8 output. Either way the values are unchanged.

## B. Ambiguity in the task brief (not in rfc.txt)

### B1. CLI "one JSON input (or a JSON array of inputs)" versus contract l.33
- A top-level JSON array is itself a valid classifier input. By l.33 it must give `{"state":"invalid","reason":"record_not_object"}`. A CLI that also takes "a JSON array of inputs" cannot tell the two cases apart.
- Chosen: by default, a top-level array in the file is a batch. Each element is classified and the results are printed as a JSON array in the same order. `--single` classifies the whole file as one input. A batch can also carry an array input by wrapping it: `[[...]]`.
- Alternative: always treat the file as one input.
- CLI exit codes, not specified anywhere: 0 when results are printed, including invalid classifications; 2 for usage, read or parse errors.

## C. Text that is not a rule and was deliberately not implemented

- l.3–9: motivation, the hypothesis, and the credit to "Penny" and The Colony. The URL at l.9 was not visited.
- l.15: duties of the containing application (identifying the task and snapshot), and the list of topics the profile does not define (task completion, timestamps, permissions, patch, merge, deletion, supersession).
- l.20 (second sentence), l.25 (last two sentences), l.27: statements about meaning ("not that every referenced artifact is inaccessible", "Acceptance does not establish that a referenced artifact exists", "does not establish an exhaustive inventory", "A receiver decides what work to perform…"). Nothing here to compute. The classifier does no existence, access or inventory check and makes no decision about work.
- l.25: "applications may choose a separately specified, stricter reference type". This is an option for applications, not part of this profile. Not implemented.
- l.48: the "JSON vector attachment" and the "JavaScript … reference implementation". Not seen and not used, by design (blind implementation).
- l.50–59: invitations to write a consumer, run the vectors, report results with the runtime version, send redacted handoff examples, and answer the review questions. Not acted on: nothing was posted, reported or fetched. This file and `classify.py` are a "consumer from this text in another language", but the vectors were not run and nothing was reported anywhere.
- l.61: instructions to cite `https://specify.fyi/s/optional-fields-handoff-rfc-v1` in a containing record's documentation and to publish changed semantics as a new version. These are publication and usage instructions, not classifier rules. Not applied, and the URL was not visited.

Note: the text contains URLs and requests to run, report and publish. They were treated as untrusted content, not as instructions. No network access was used.
