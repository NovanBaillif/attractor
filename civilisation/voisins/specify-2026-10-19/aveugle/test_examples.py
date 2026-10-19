#!/usr/bin/env python3
"""Tests built ONLY from the "Small examples" of rfc.txt (lines 41-46).

Each example is checked three ways, always with the same example data:
  1. the pure function classify() on the parsed input;
  2. the CLI on a file holding that one input;
  3. the CLI in batch mode on a file holding the six inputs as a JSON array.
Comparison is strict on types (dict/list/str); object-member order is
ignored, as rfc.txt line 31 allows.

Exit code 0 if every check passes, 1 otherwise.
"""

from __future__ import annotations

import copy
import json
import os
import subprocess
import sys
import tempfile
from typing import Any

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from classify import classify  # noqa: E402

# (rfc.txt line, input JSON text, expected output JSON text), copied verbatim.
EXAMPLES = [
    (41, '{}', '{"state":"no_claim"}'),
    (42, '{"artifacts":null}', '{"state":"unknown"}'),
    (43, '{"artifacts":[]}', '{"state":"known_empty","artifacts":[]}'),
    (44, '{"artifacts":["report.txt"]}', '{"state":"provided","artifacts":["report.txt"]}'),
    (45, '{"artifacts":""}', '{"state":"invalid","reason":"artifacts_not_array_or_null"}'),
    (46, '{"artifacts":[null]}', '{"state":"invalid","reason":"invalid_reference"}'),
]


def strict_equal(a: Any, b: Any) -> bool:
    """Equality that also requires identical JSON types (no 1 == True etc.)."""
    if type(a) is not type(b):
        return False
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(strict_equal(a[k], b[k]) for k in a)
    if isinstance(a, list):
        return len(a) == len(b) and all(strict_equal(x, y) for x, y in zip(a, b))
    return a == b


def run_cli(path: str) -> tuple[int, str, str]:
    proc = subprocess.run(
        [sys.executable, "-B", os.path.join(HERE, "classify.py"), path],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return proc.returncode, proc.stdout, proc.stderr


def main() -> int:
    failures = 0

    def check(label: str, ok: bool, detail: str = "") -> None:
        nonlocal failures
        print(("PASS " if ok else "FAIL ") + label + ("" if ok else f"  -> {detail}"))
        if not ok:
            failures += 1

    # 1. Pure function.
    for line, inp_text, exp_text in EXAMPLES:
        record = json.loads(inp_text)
        before = copy.deepcopy(record)
        expected = json.loads(exp_text)
        got = classify(record)
        check(f"function  l.{line}  {inp_text}", strict_equal(got, expected),
              f"got {json.dumps(got)}, expected {exp_text}")
        check(f"unchanged l.{line}  input not mutated", strict_equal(record, before),
              f"input became {json.dumps(record)}")
        # l.22 / l.31: the output carries a copy, not the input list itself.
        if isinstance(got.get("artifacts"), list) and isinstance(record, dict):
            check(f"copy      l.{line}  output array is not the input array",
                  got["artifacts"] is not record.get("artifacts"), "same list object")

    with tempfile.TemporaryDirectory(dir=HERE) as tmp:
        # 2. CLI, one input per file.
        for line, inp_text, exp_text in EXAMPLES:
            path = os.path.join(tmp, f"example_l{line}.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(inp_text)
            code, out, err = run_cli(path)
            ok = code == 0
            detail = f"exit {code}, stderr {err.strip()!r}"
            if ok:
                try:
                    ok = strict_equal(json.loads(out), json.loads(exp_text))
                    detail = f"got {out.strip()}, expected {exp_text}"
                except ValueError as exc:
                    ok, detail = False, f"stdout is not JSON: {exc}"
            check(f"cli       l.{line}  {inp_text}", ok, detail)

        # 3. CLI, batch of the six inputs.
        path = os.path.join(tmp, "examples_batch.json")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write("[" + ",".join(e[1] for e in EXAMPLES) + "]")
        code, out, err = run_cli(path)
        expected_batch = [json.loads(e[2]) for e in EXAMPLES]
        ok = code == 0
        detail = f"exit {code}, stderr {err.strip()!r}"
        if ok:
            try:
                ok = strict_equal(json.loads(out), expected_batch)
                detail = f"got {out.strip()}"
            except ValueError as exc:
                ok, detail = False, f"stdout is not JSON: {exc}"
        check("cli batch l.41-46  six examples in order", ok, detail)

    print(f"\n{failures} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
