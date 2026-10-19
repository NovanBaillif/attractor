#!/usr/bin/env python3
"""Classifier for the optional "artifacts" member of a handoff snapshot.

Blind implementation of "Optional artifacts in a handoff snapshot - RFC v1",
section "Classifier contract" (rfc.txt lines 29-37), written from that text
alone. Python 3.12, standard library only.

Usage:
    python classify.py <input.json>
        The file holds one JSON input, or a JSON array of inputs (batch).
        One input -> one JSON result on stdout.
        Array     -> a JSON array of results, same order as the inputs.
    python classify.py --single <input.json>
        The whole file is ONE input, even if it is a JSON array
        (a top-level array then classifies as record_not_object).

Exit codes: 0 when results were printed (an "invalid" classification is a
normal result, not an error); 2 for a usage error or a file that cannot be
read or parsed as JSON.
"""

from __future__ import annotations

import json
import sys
from typing import Any

# The member name is case-sensitive and matched exactly (rfc.txt line 13).
ARTIFACTS_KEY = "artifacts"


def classify(record: Any) -> dict[str, Any]:
    """Classify the artifacts member of an already parsed JSON value.

    Input: a parsed JSON value as Python's json module produces it
    (dict, list, str, int, float, bool or None).

    Output: a new dict that is exactly one of
        {"state": "no_claim"}
        {"state": "unknown"}
        {"state": "known_empty", "artifacts": []}
        {"state": "provided", "artifacts": [<copy of the input array>]}
        {"state": "invalid", "reason": "record_not_object"}
        {"state": "invalid", "reason": "artifacts_not_array_or_null"}
        {"state": "invalid", "reason": "invalid_reference"}

    The input is never modified. Members other than "artifacts" are ignored.
    """
    # Contract, first bullet (line 33): the input must be a JSON object.
    if not isinstance(record, dict):
        return {"state": "invalid", "reason": "record_not_object"}

    # Rule 1 (line 19): no artifacts member -> no claim. Presence is tested
    # with `in` so that an explicit null is never confused with omission.
    if ARTIFACTS_KEY not in record:
        return {"state": "no_claim"}

    value = record[ARTIFACTS_KEY]

    # Rule 2 (line 20): artifacts is null -> unknown.
    if value is None:
        return {"state": "unknown"}

    # Contract, second bullet (line 34): present, neither null nor an array.
    if not isinstance(value, list):
        return {"state": "invalid", "reason": "artifacts_not_array_or_null"}

    # Contract, third bullet (line 35): any non-string or empty-string item.
    # No item is discarded or coerced (line 23).
    for item in value:
        if not isinstance(item, str) or len(item) == 0:
            return {"state": "invalid", "reason": "invalid_reference"}

    # Rule 3 (line 21): empty array -> known empty collection.
    if len(value) == 0:
        return {"state": "known_empty", "artifacts": []}

    # Rule 4 (line 22): nonempty array of nonempty strings -> provided, with a
    # copy of the complete array in input order. No trimming, case folding or
    # normalization; duplicates kept (line 25).
    return {"state": "provided", "artifacts": list(value)}


def _reject_non_json_constant(name: str) -> Any:
    # Python's json module accepts NaN / Infinity / -Infinity by default;
    # they are not JSON, so the CLI refuses them as a parse error.
    raise ValueError(f"{name} is not a JSON value")


def _load_json_file(path: str) -> Any:
    with open(path, "rb") as handle:
        raw = handle.read()
    # Bytes input: Python detects UTF-8 (with or without BOM), UTF-16, UTF-32.
    # Duplicate member names: Python's default, the last occurrence wins.
    return json.loads(raw, parse_constant=_reject_non_json_constant)


def _dump(value: Any) -> str:
    # Compact form, as in the text's examples. ASCII-only output: non-ASCII
    # characters are written as \u escapes; the string values are unchanged.
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"))


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    single = False
    if args and args[0] == "--single":
        single = True
        args = args[1:]
    if len(args) != 1:
        print("usage: python classify.py [--single] <input.json>", file=sys.stderr)
        return 2

    try:
        parsed = _load_json_file(args[0])
    except (OSError, ValueError, RecursionError) as exc:
        print(f"error: cannot read JSON from {args[0]}: {exc}", file=sys.stderr)
        return 2

    if isinstance(parsed, list) and not single:
        results = [_dump(classify(item)) for item in parsed]
        if results:
            sys.stdout.write("[\n" + ",\n".join(results) + "\n]\n")
        else:
            sys.stdout.write("[]\n")
    else:
        sys.stdout.write(_dump(classify(parsed)) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
