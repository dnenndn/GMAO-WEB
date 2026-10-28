#!/usr/bin/env python3
"""
Admin-gating consistency sweep for Parametre* settings deletions.

This app's established, consistent pattern (verified by reading many
existing examples before writing this check, not assumed): creating a
Parametre*-model settings entry is not admin-gated, but deleting/
deactivating one is — matching this codebase's own naming convention for
standalone master/reference data (distinct from nested associations like
TableauXxx link tables, which are also not gated).

This script checks every `delete*`/`deactivate*` function in every
`actions.ts` file that mutates a `Parametre*` Prisma model, and flags any
that doesn't call `requireAdmin()`.

**This check found a real, previously-unnoticed gap on its first real
run, not just in a scratch positive control**: 8 settings lists built
across two earlier passes (Fournisseur reference data — Phase 22 — and
Article reference data — Phase 23) had create actions and a settings
page already querying `where: { deleted: false }`, but no delete action
had ever been written for any of them. The UI implied deletability
(`deleted: false` filters don't make sense on tables with no deletion
path) but there was no way to actually do it. Fixed by adding all 8
delete actions (admin-gated, per the established pattern) and wiring up
delete buttons on both settings pages. See
docs/12-schema-validation-findings.md §34 for the full account,
including why this genuinely counts as this script paying for itself
immediately rather than only proving a negative.

Usage: python3 scripts/audit-admin-gating.py
(run from the project root)
"""
import re
import glob


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"//[^\n]*", "", text)
    return text


def camel_to_pascal(s: str) -> str:
    return s[0].upper() + s[1:]


def main():
    flagged = []
    checked = 0

    for path in sorted(glob.glob("src/app/**/actions.ts", recursive=True)):
        content = open(path).read()
        for fn_m in re.finditer(r"export async function (\w+)\([^)]*\)\s*\{", content):
            fn_name = fn_m.group(1)
            if not re.match(r"^(delete|deactivate)[A-Z]", fn_name):
                continue

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

            model_m = re.search(r"prisma\.(\w+)\.(update|delete)\w*\s*\(", body)
            if not model_m:
                continue
            model_pascal = camel_to_pascal(model_m.group(1))

            if not model_pascal.startswith("Parametre"):
                continue
            checked += 1

            has_admin = "requireAdmin(" in body
            if not has_admin:
                flagged.append((path, fn_name, model_pascal))

    print(f"Checked {checked} delete/deactivate function(s) targeting a Parametre* model.\n")
    if not flagged:
        print("All of them call requireAdmin() — no gaps found.")
    else:
        print(f"{len(flagged)} function(s) missing requireAdmin():")
        for path, fn, model in flagged:
            print(f"  {path}: {fn} (targets {model})")


if __name__ == "__main__":
    main()
