#!/usr/bin/env python3
"""
Orphaned-action sweep for the app — the mirror image of
scripts/audit-page-reachability.py. That script checks every page has an
inbound link; this one checks every exported server action is actually
imported somewhere, catching dead code left over from a refactor, or an
action written in anticipation of a feature whose UI was never finished.

Extracts every `export async function <name>(` from every `actions.ts`
file, then searches the rest of the app (pages, components, other
actions files, the seed script) for an `import { ..., <name>, ... }
from ".../actions"` referencing it — excluding the defining file itself,
since a function calling itself or a sibling in the same file isn't
"wired up" the way an external import is.

Verified against a positive control before trusting a clean run:
renamed a genuinely-used import (`recordDopFini`) to simulate it going
orphaned, confirmed the injection actually took effect via `grep` before
running the check, confirmed the check caught it, then restored the
file and verified byte-for-byte with `diff`.

This exact script found a real, pre-existing gap on its first real run
against the app: `markDopFiniDone` (Procurement) was written — complete
with its own `revalidatePath` call — but no page ever called it. This
matched an already-documented "not yet done" note from early in the
project (DopFini.fini's toggle UI), so the finding wasn't new, but this
script rediscovering it independently, via a completely different
method than the original manual note, is worth treating as corroborating
evidence for both. Fixed by adding the missing toggle button to the DOP
detail page rather than just re-confirming the gap. See
docs/12-schema-validation-findings.md §34 for the full account.

Usage: python3 scripts/audit-orphaned-actions.py
(run from the project root)
"""
import re
import glob


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"//[^\n]*", "", text)
    return text


def main():
    actions_by_file = {}
    for path in sorted(glob.glob("src/app/**/actions.ts", recursive=True)):
        content = strip_comments(open(path).read())
        fns = re.findall(r"export async function (\w+)\(", content)
        actions_by_file[path] = fns

    file_map = []
    for path in (
        glob.glob("src/app/**/*.tsx", recursive=True)
        + glob.glob("src/app/**/*.ts", recursive=True)
        + glob.glob("src/components/**/*.tsx", recursive=True)
        + glob.glob("prisma/seed.ts")
    ):
        file_map.append((path, open(path).read()))

    orphans = []
    checked = 0
    for def_path, fns in actions_by_file.items():
        for fn in fns:
            checked += 1
            found = False
            for path, text in file_map:
                if path == def_path:
                    continue
                if re.search(
                    rf'import\s*\{{[^}}]*\b{re.escape(fn)}\b[^}}]*\}}\s*from\s*["\'][^"\']*actions["\']',
                    text,
                ):
                    found = True
                    break
            if not found:
                orphans.append((def_path, fn))

    print(f"Checked {checked} exported action(s) across {len(actions_by_file)} actions.ts files.\n")
    if not orphans:
        print("Every exported action is imported somewhere.")
    else:
        print(f"{len(orphans)} action(s) exported but never imported anywhere:")
        for path, fn in orphans:
            print(f"  {path}: {fn}")


if __name__ == "__main__":
    main()
