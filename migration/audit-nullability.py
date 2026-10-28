#!/usr/bin/env python3
"""
Nullability sweep for migration/modules/*.ts.

Finds the exact bug class already caught twice in earlier tiers of this
migration (DaArticle.qtRestant in tier 4; ProdRapportFabProduit/
FourEntre/FourSortie.tonnage in tier 6): a target Prisma field that is
NOT NULL (no `?` and no `@default`) but whose migration assignment
expression looks like it could produce null/undefined for some source
rows (uses toNumOrNull/toStrOrNull/toDate/numOrNull with no `?? <fallback>`
after it).

This is a heuristic scan, not a compiler — it flags candidates for
manual review, it doesn't prove a bug exists. False positives are
expected and fine (e.g. a field fed by a variable already guaranteed
non-null earlier); false negatives are the real risk, so this leans
toward over-flagging rather than under-flagging.

Verified against a positive control before trusting a clean run: a
deliberately-reintroduced copy of the tier-4 qtRestant bug was injected
as a scratch module and confirmed caught before relying on this script's
"no candidates" result on the real codebase — see
docs/12-schema-validation-findings.md §28 for that verification.

Run this alongside audit-field-names.py after writing or editing any
migration module, and re-run both whenever prisma/schema.prisma changes.

Usage: python3 migration/audit-nullability.py
"""
import re
import glob


def parse_schema_models(schema_path: str) -> dict[str, dict[str, bool]]:
    schema = open(schema_path).read()
    models: dict[str, dict[str, bool]] = {}
    for m in re.finditer(r"model\s+(\w+)\s*\{([^}]*)\}", schema, re.S):
        name = m.group(1)
        body = m.group(2)
        fields: dict[str, bool] = {}
        for line in body.splitlines():
            line = line.strip()
            if not line or line.startswith("//") or line.startswith("@@"):
                continue
            fm = re.match(r"(\w+)\s+(\w+)(\??)", line)
            if not fm:
                continue
            field_name, _type_name, optional = fm.groups()
            has_default = "@default(" in line
            is_id = "@id" in line
            required = (optional == "") and not has_default and not is_id
            fields[field_name] = required
        models[name] = fields
    return models


def camel_to_pascal(s: str) -> str:
    return s[0].upper() + s[1:]


def main():
    models = parse_schema_models("prisma/schema.prisma")
    risky_fns = ("toNumOrNull(", "toStrOrNull(", "toDate(", "numOrNull(")
    flagged = []

    for path in sorted(glob.glob("migration/modules/*.ts")):
        content = open(path).read()
        for call_m in re.finditer(r"prisma\.(\w+)\.(?:upsert|create)\(\{", content):
            model_pascal = camel_to_pascal(call_m.group(1))
            if model_pascal not in models:
                continue
            start = call_m.end()
            window = content[start : start + 2000]
            create_m = re.search(r"create:\s*\{", window)
            if not create_m:
                continue
            depth = 1
            i = create_m.end()
            while depth > 0 and i < len(window):
                if window[i] == "{":
                    depth += 1
                elif window[i] == "}":
                    depth -= 1
                i += 1
            create_block = window[create_m.end() : i - 1]

            for field_name, required in models[model_pascal].items():
                if not required:
                    continue
                fm = re.search(rf"\b{field_name}\s*:\s*([^\n]+?)(,\n|\n\s*\}})", create_block)
                if not fm:
                    continue
                expr = fm.group(1).strip().rstrip(",")
                uses_risky = any(fn in expr for fn in risky_fns)
                has_fallback = "??" in expr
                if uses_risky and not has_fallback:
                    flagged.append((path, model_pascal, field_name, expr))

    if not flagged:
        print("No candidates found — every NOT NULL field fed by a nullable-source helper has a fallback.")
        return

    print(f"{len(flagged)} candidate(s) found (heuristic — verify each manually):\n")
    for path, model, field, expr in flagged:
        print(f"  {path}: {model}.{field} = {expr}")


if __name__ == "__main__":
    main()
