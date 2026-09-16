"""Produce a reviewable patch for the pinned upstream, without modifying it."""
import difflib
import pathlib
import sys

trial = pathlib.Path(__file__).resolve().parent.parent
source = pathlib.Path(sys.argv[1]).resolve()
files = ["conformance/run.mjs", "schema/transmission.schema.json", "conformance/cases.json"]
chunks = []
for name in files:
    before = (source / name).read_text(encoding="utf-8").splitlines(keepends=True)
    after = (trial / "proposals" / name).read_text(encoding="utf-8").splitlines(keepends=True)
    chunks.extend(difflib.unified_diff(before, after, fromfile="a/" + name, tofile="b/" + name))
destination = trial / "proposals" / "upstream.patch"
destination.write_text("".join(chunks), encoding="utf-8", newline="\n")
print(f"Prepared {len(files)} files: {destination.name}")
