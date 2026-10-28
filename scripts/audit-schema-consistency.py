#!/usr/bin/env python3
"""
Schema internal-consistency sweep for prisma/schema.prisma.

Checks two things `npx prisma generate` would catch, done here as pure
text analysis so it needs no live Prisma Client or network access:

1. Every field's type across every model actually refers to a real
   defined model (or a Prisma scalar) — not a deleted/renamed one.
2. No model defines the same field name twice.

Both checks exist because of the same real incident, found the hard way
by an actual user rather than by this project's own verification:
`OrdreTravail.diagnostics` referenced a deleted model (`OtDiagnostic[]`)
left over from an earlier refactor — caught by check #1. The fix for
that was applied without first reading the model's *entire* body, so it
duplicated 5 relation fields that already existed correctly further
down under slightly different names (singular vs. plural) — a second,
different real mistake that check #2 exists specifically to catch,
caught only when the user ran `prisma generate` a second time. See
docs/12-schema-validation-findings.md §38-39 for the full account of
both.

Usage: python3 scripts/audit-schema-consistency.py
(run from the project root)
"""
import re

SCALAR_TYPES = {"String", "Int", "Boolean", "DateTime", "Decimal", "Bytes", "Float", "BigInt", "Json"}


def main():
    schema = open("prisma/schema.prisma").read()

    models = set(re.findall(r"^model\s+(\w+)\s*\{", schema, re.M))
    print(f"Total models defined: {len(models)}")

    broken = []
    duplicate_fields = []
    for m in re.finditer(r"^model\s+(\w+)\s*\{([^}]*)\}", schema, re.S | re.M):
        owner = m.group(1)
        body = m.group(2)

        seen_fields: dict[str, str] = {}
        for line in body.splitlines():
            line = line.strip()
            if not line or line.startswith("//") or line.startswith("@@"):
                continue
            fm = re.match(r"(\w+)\s+([A-Z]\w*)(\[\])?\??", line)
            if not fm:
                continue
            field_name, type_name = fm.group(1), fm.group(2)

            if field_name in seen_fields:
                duplicate_fields.append((owner, field_name, seen_fields[field_name], line))
            else:
                seen_fields[field_name] = line

            if type_name in SCALAR_TYPES:
                continue
            if type_name not in models:
                broken.append((owner, line, type_name))

    print(f"\nBroken model references: {len(broken)}")
    if not broken:
        print("Every field type in every model refers to a real model or scalar.")
    else:
        for owner, line, type_name in broken:
            print(f"  {owner}: '{line}' -> unknown model '{type_name}'")

    print(f"\nDuplicate field names: {len(duplicate_fields)}")
    if not duplicate_fields:
        print("No model defines the same field name twice.")
    else:
        for owner, field_name, first_line, second_line in duplicate_fields:
            print(f"  {owner}.{field_name} defined twice:")
            print(f"    first:  {first_line}")
            print(f"    second: {second_line}")


if __name__ == "__main__":
    main()

