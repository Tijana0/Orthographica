#!/usr/bin/env python3
"""Regenerate js/data.js from dataset.json (run from the project root)."""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "dataset.json").read_text())

out = root / "js" / "data.js"
with out.open("w") as f:
    f.write("// Generated from dataset.json — regenerate with: python3 tools/build_data.py\n")
    f.write("const SCRIPTS = ")
    json.dump(data, f, ensure_ascii=False)
    f.write(";\n")

print(f"wrote {out} ({len(data)} scripts)")
