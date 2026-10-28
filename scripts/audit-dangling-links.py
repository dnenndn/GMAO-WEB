#!/usr/bin/env python3
"""
Dangling internal link sweep for the app — the reverse direction of
scripts/audit-page-reachability.py. That script checks every real page
has an inbound link; this one checks every link found in the app
actually points to a real page, catching stale references left behind
by a rename or a removed route.

Extracts the same set of link-like patterns as the reachability script
(JSX `href=`, object-literal `href:`, and `const href = <ternary>`
assignments), normalizes each one (strips query/hash, replaces
`${...}` interpolations with a wildcard), and checks it against every
real route derived from `src/app/(dashboard)/**/page.tsx`, treating a
route's `[id]`-style segments and a href's `${...}` segments as mutual
wildcards.

Verified against a positive control before trusting a clean run — and
the first control attempt was itself flawed (the target string being
"corrupted" didn't actually exist in the file being edited, so the
edit silently did nothing and the "clean" result proved nothing).
Caught by grepping the file after the edit to confirm the injection
actually took effect before treating the check's result as meaningful.
A second attempt, verified to actually modify the file, was correctly
caught. See docs/12-schema-validation-findings.md §31 for the full
account.

Usage: python3 scripts/audit-dangling-links.py
(run from the project root)
"""
import re
import glob

ROOT = "src/app/(dashboard)"

# Real app routes that exist outside src/app/(dashboard) (auth pages,
# etc.) — legitimate targets, not dangling, just not part of this
# script's page collection.
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


def collect_all_hrefs():
    file_map = []
    all_source = ""
    offset = 0
    for path in (
        glob.glob("src/app/**/*.tsx", recursive=True)
        + glob.glob("src/app/**/*.ts", recursive=True)
        + glob.glob("src/components/**/*.tsx", recursive=True)
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

    hrefs = []
    for m in re.finditer(r'href=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})', all_source):
        val = next(g for g in m.groups() if g)
        hrefs.append((val, path_for_offset(m.start())))
    for m in re.finditer(r'href:\s*(?:"([^"]*)"|`([^`]*)`)', all_source):
        val = next(g for g in m.groups() if g)
        hrefs.append((val, path_for_offset(m.start())))
    for stmt_m in re.finditer(r"const\s+href\s*=(.*?);", all_source, re.S):
        for lit_m in re.finditer(r"`([^`]*)`", stmt_m.group(1)):
            hrefs.append((lit_m.group(1), path_for_offset(stmt_m.start())))
    return hrefs


def normalize_for_matching(href: str):
    href = href.split("?")[0].split("#")[0]
    if not href.startswith("/"):
        return None  # external, mailto:, tel:, etc. — not our concern
    if href == "":
        href = "/"
    href = re.sub(r"\$\{[^}]+\}", "DYNAMIC", href)
    return href


def href_matches_any_route(href: str, routes) -> bool:
    href_parts = href.split("/")
    for route in routes:
        route_parts = route.split("/")
        if len(route_parts) != len(href_parts):
            continue
        ok = True
        for rp, hp in zip(route_parts, href_parts):
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
    hrefs = collect_all_hrefs()

    dangling = []
    seen = set()
    for href, source_file in hrefs:
        norm = normalize_for_matching(href)
        if norm is None or norm in KNOWN_EXTRA_ROUTES:
            continue
        if href_matches_any_route(norm, routes):
            continue
        key = (href, source_file)
        if key in seen:
            continue
        seen.add(key)
        dangling.append((href, source_file))

    print(
        f"Checked {len(hrefs)} href occurrences "
        f"({len(set(h for h, _ in hrefs))} distinct) against {len(routes)} real routes.\n"
    )
    if not dangling:
        print("No dangling internal links found.")
    else:
        print(f"{len(dangling)} possibly-dangling link(s):")
        for href, source_file in dangling:
            print(f"  {href}  (in {source_file})")


if __name__ == "__main__":
    main()
