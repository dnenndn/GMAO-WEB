#!/usr/bin/env python3
"""
Field-name auditor for migration/modules/*.ts.

Why this exists: `npx tsc --noEmit` in this sandbox does NOT actually
verify Prisma model or field names (see the "real limitation" section in
migration/README.md — @prisma/client's generated types here are frozen
from before most of this migration was written, since `npx prisma
generate` can't reach the network in this environment). This script is
the real check: it parses every `model` block in prisma/schema.prisma
for its actual field names, finds every `prisma.<model>.upsert(...)` /
`.create(...)` call across every migration module, extracts the literal
object keys passed to each (both the where/create-or-data block and the
create block within an upsert), and diffs them against the real schema.

Run this after writing or editing ANY migration module — not just once
at the end. Re-run it whenever prisma/schema.prisma changes too, since a
schema edit elsewhere in the app can silently invalidate a migration
call that used to be correct.

Usage: python3 migration/audit-field-names.py
"""
import re
import glob
import sys


def parse_schema_models(schema_path: str) -> dict[str, set[str]]:
    schema = open(schema_path).read()
    models: dict[str, set[str]] = {}
    for m in re.finditer(r"model\s+(\w+)\s*\{([^}]*)\}", schema, re.S):
        name = m.group(1)
        body = m.group(2)
        fields = set()
        for line in body.splitlines():
            line = line.strip()
            if not line or line.startswith("//") or line.startswith("@@"):
                continue
            fm = re.match(r"(\w+)\s", line)
            if fm:
                fields.add(fm.group(1))
        models[name] = fields
    return models


def camel_to_pascal(s: str) -> str:
    return s[0].upper() + s[1:] if s else s


def brace_match(text: str, start_after: str, search_from: int) -> tuple[int, int] | None:
    """Finds `search_from`, from a given start index, and returns the
    (content_start, content_end) span inside the first `{...}` found
    right after the given key text — brace-matched, not regex-greedy, so
    it doesn't accidentally grab an unrelated later block."""
    m = re.search(re.escape(start_after) + r"\s*\{", text[search_from:])
    if not m:
        return None
    open_idx = search_from + m.end() - 1
    depth = 1
    i = open_idx + 1
    while depth > 0 and i < len(text):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
        i += 1
    return open_idx + 1, i - 1


def audit() -> int:
    models = parse_schema_models("prisma/schema.prisma")
    problems: list[str] = []
    checked = 0
    files = sorted(glob.glob("migration/modules/*.ts"))

    for path in files:
        content = open(path).read()
        for call_m in re.finditer(r"prisma\.(\w+)\.(upsert|create)\(", content):
            model_camel, method = call_m.group(1), call_m.group(2)
            model_pascal = camel_to_pascal(model_camel)

            # brace-match this call's own argument list
            depth, i = 1, call_m.end()
            while depth > 0 and i < len(content):
                if content[i] == "(":
                    depth += 1
                elif content[i] == ")":
                    depth -= 1
                i += 1
            call_body = content[call_m.end():i]

            if model_pascal not in models:
                problems.append(f"{path}: prisma.{model_camel}.{method} — unknown model '{model_pascal}'")
                continue

            checked += 1
            key_block_name = "create" if method == "upsert" else "data"
            span = brace_match(call_body, key_block_name + ":", 0)
            if span:
                data_block = call_body[span[0]:span[1]]
                for k in re.findall(r"^\s*(\w+):", data_block, re.M):
                    if k not in models[model_pascal]:
                        problems.append(f"{path}: {model_pascal}.{k} (in {key_block_name}) — no such field")

            # also check the upsert's `where:` clause
            if method == "upsert":
                span = brace_match(call_body, "where:", 0)
                if span:
                    where_block = call_body[span[0]:span[1]]
                    for k in re.findall(r"^\s*(\w+):", where_block, re.M):
                        if k not in models[model_pascal]:
                            problems.append(f"{path}: {model_pascal}.{k} (in where) — no such field")

    print(f"Checked {checked} create/upsert calls across {len(files)} tier files")
    print(f"Problems found: {len(problems)}")
    for p in problems:
        print(" -", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(audit())
