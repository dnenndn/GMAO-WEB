#!/usr/bin/env python3
"""
Missing-revalidation sweep for the app.

A more severe cousin of scripts/audit-revalidate-paths.py: that script
checks a `revalidatePath()` call points somewhere real; this one checks
that every mutation action calls `revalidatePath()` (or `redirect()`,
which forces a fresh render on its own) *at all*. A mutation with
neither doesn't error — the write succeeds, but Next.js's cache for
whatever page displays that data is never invalidated, so the UI can
keep showing stale data indefinitely after a successful save. This is
arguably worse than a mistargeted revalidatePath (§32), since there's no
cache invalidation happening whatsoever, not just the wrong one.

Extracts every `export async function` in every `actions.ts` file,
identifies which ones perform a Prisma write
(create/update/delete/upsert/createMany/updateMany/deleteMany), strips
comments first (the exact flaw found and fixed in
migration/audit-sequence-resets.py — a comment merely mentioning
"revalidatePath" would otherwise satisfy a naive substring check), and
flags any mutation function with no `revalidatePath(` or `redirect(`
call anywhere in its body.

Verified against a positive control before trusting a clean run —
applying the lesson from docs/12-schema-validation-findings.md §31/§32
directly: the first attempt at removing a real `revalidatePath` call
used a guessed line number that turned out to be wrong for the actual
file, and the line was still present after the "edit." Caught by
grepping for the target line and confirming its exit code *before*
running the check, not after — found the correct line number, deleted
it, reconfirmed via grep that it was actually gone, then ran the check
and confirmed it was caught. See §33 for the full account.

Usage: python3 scripts/audit-missing-revalidation.py
(run from the project root)
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

    for path in sorted(glob.glob("src/app/**/actions.ts", recursive=True)):
        content = open(path).read()
        for fn_m in re.finditer(r"export async function (\w+)\([^)]*\)\s*\{", content):
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

            is_mutation = (
                re.search(
                    r"prisma\.\w+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\w*\s*\(",
                    body,
                )
                is not None
            )
            if not is_mutation:
                continue
            checked += 1

            has_revalidate = "revalidatePath(" in body
            has_redirect = re.search(r"\bredirect\s*\(", body) is not None
            if not has_revalidate and not has_redirect:
                flagged.append((path, fn_name))

    print(f"Checked {checked} mutation function(s) across all actions.ts files.\n")
    if not flagged:
        print("Every mutation function calls revalidatePath() or redirect() at least once.")
    else:
        print(f"{len(flagged)} mutation function(s) with NO revalidatePath()/redirect() call:")
        for path, fn in flagged:
            print(f"  {path}: {fn}")


if __name__ == "__main__":
    main()
