#!/usr/bin/env python3
"""
revalidatePath() target sweep for the app.

Every mutation action in this app calls `revalidatePath("...")` after
writing, to invalidate Next.js's cache for that route. A typo'd or
stale path here doesn't error — Next.js will happily "revalidate" a
route that doesn't exist, silently doing nothing — so the failure mode
is a page that quietly shows stale data after a mutation, with no error
anywhere to point at the cause. This is a different, cache-specific
risk from scripts/audit-dangling-links.py (which checks navigation
`href`s, not cache-invalidation targets), so it's a separate script
rather than folded into that one.

Extracts every `revalidatePath("...")` / `revalidatePath(`...`)` call
across the app, normalizes it the same way as the dangling-links script
(strip query/hash, treat `${...}` as a wildcard), and checks it against
every real route derived from `src/app/(dashboard)/**/page.tsx`.

Verified against a positive control before trusting a clean run —
learned from a mistake made verifying the sibling dangling-links script
(docs/12-schema-validation-findings.md §31): confirmed the injected
broken call actually appeared in the file *before* running the check
against it, not after, so a silent no-op edit couldn't be mistaken for
a passing test. See §32 for the full account.

Usage: python3 scripts/audit-revalidate-paths.py
(run from the project root)
"""
import re
import glob

ROOT = "src/app/(dashboard)"
KNOWN_EXTRA_ROUTES = {"/login", "/"}


def collect_route_patterns():
    patterns = []
    for path in glob.glob(f"{ROOT}/**/page.tsx", recursive=True):
        rel = path[len(ROOT):]
        route = rel[: -len("/page.tsx")]
        if route == "":
            route = "/"
        patterns.append(route)
    return patterns


def collect_revalidate_calls():
    file_map = []
    all_source = ""
    offset = 0
    for path in glob.glob("src/app/**/*.ts", recursive=True) + glob.glob(
        "src/app/**/*.tsx", recursive=True
    ):
        text = open(path).read()
        file_map.append((offset, path))
        all_source += text + "\n"
        offset += len(text) + 1

    def path_for_offset(pos):
        best = file_map[0][1]
        for start, p in file_map:
            if start <= pos:
                best = p
            else:
                break
        return best

    calls = []
    for m in re.finditer(r'revalidatePath\((?:"([^"]*)"|`([^`]*)`)', all_source):
        val = next(g for g in m.groups() if g)
        calls.append((val, path_for_offset(m.start())))
    return calls


def normalize(path_str: str) -> str:
    path_str = path_str.split("?")[0].split("#")[0]
    if path_str == "":
        path_str = "/"
    path_str = re.sub(r"\$\{[^}]+\}", "DYNAMIC", path_str)
    return path_str


def matches_any_route(path_str: str, routes) -> bool:
    parts = path_str.split("/")
    for route in routes:
        rparts = route.split("/")
        if len(rparts) != len(parts):
            continue
        ok = True
        for rp, hp in zip(rparts, parts):
            if rp.startswith("[") and rp.endswith("]"):
                continue
            if hp == "DYNAMIC":
                continue
            if rp != hp:
                ok = False
                break
        if ok:
            return True
    return False


def main():
    routes = collect_route_patterns()
    calls = collect_revalidate_calls()

    bad = []
    seen = set()
    for val, src in calls:
        norm = normalize(val)
        if norm in KNOWN_EXTRA_ROUTES:
            continue
        if matches_any_route(norm, routes):
            continue
        key = (val, src)
        if key in seen:
            continue
        seen.add(key)
        bad.append((val, src))

    print(
        f"Checked {len(calls)} revalidatePath() calls "
        f"({len(set(c for c, _ in calls))} distinct) against {len(routes)} real routes.\n"
    )
    if not bad:
        print("Every revalidatePath() call targets a real route.")
    else:
        print(f"{len(bad)} revalidatePath() call(s) targeting a route that doesn't exist:")
        for val, src in bad:
            print(f"  {val}  (in {src})")


if __name__ == "__main__":
    main()
