#!/usr/bin/env python3
"""
Sequence-reset sweep for migration/modules/*.ts.

Every function that inserts rows with an explicit legacy `id: r.id` (the
id-preservation strategy this whole migration uses — see "Why original
IDs are preserved" in migration/README.md) MUST call resetSequence()
for that table afterward. Skipping it leaves Postgres's own autoincrement
counter unaware of the migrated ids, so the app's own *next* insert into
that table could collide with one of them — a silent bug that wouldn't
surface until well after the migration ran, when someone creates a new
row through the app itself.

This script checks every `migrate*` function across every tier for that
pairing. Comments are stripped before matching, specifically because an
earlier version of this exact script was fooled by a scratch test file
whose own comment said "missing resetSequence() call" — the comment text
alone satisfied a naive substring check, which meant the check would
never have failed on a REAL bug either (a genuinely broken function with
a misleading nearby comment would pass). Fixed by stripping comments
first and requiring an actual `resetSequence(` call pattern.

Verified against a positive control (a scratch module missing the real
call) before trusting a clean run — see
docs/12-schema-validation-findings.md §29 for that verification,
including the self-correction after the first control attempt was
itself flawed.

Run this alongside audit-field-names.py and audit-nullability.py after
writing or editing any migration module.

Usage: python3 migration/audit-sequence-resets.py
"""
import re
import glob


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"//[^\n]*", "", text)
    return text


def main():
    flagged = []
    checked = 0

    for path in sorted(glob.glob("migration/modules/*.ts")):
        content = open(path).read()
        for fn_m in re.finditer(r"async function (migrate\w+)\([^)]*\)\s*\{", content):
            fn_name = fn_m.group(1)
            start = fn_m.end()
            depth = 1
            i = start
            while depth > 0 and i < len(content):
                if content[i] == "{":
                    depth += 1
                elif content[i] == "}":
                    depth -= 1
                i += 1
            body = strip_comments(content[start : i - 1])

            sets_explicit_id = re.search(r"\bid:\s*r\.id\b", body) is not None
            if not sets_explicit_id:
                continue
            checked += 1

            has_reset = re.search(r"\bresetSequence\s*\(", body) is not None
            if not has_reset:
                flagged.append((path, fn_name))

    print(f"Checked {checked} function(s) that preserve explicit legacy ids.")
    if not flagged:
        print("All of them call resetSequence() — no gaps found.")
    else:
        print(f"\n{len(flagged)} function(s) missing resetSequence():")
        for path, fn in flagged:
            print(f"  {path}: {fn}")


if __name__ == "__main__":
    main()
