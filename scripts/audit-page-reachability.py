#!/usr/bin/env python3
"""
Page reachability sweep for src/app/(dashboard)/**/page.tsx.

Checks that every page in the app has at least one inbound link,
redirect, or navigation reference somewhere else in the codebase. This
is the systematic version of a real bug found by hand earlier in this
project: the Diagnostics page (`/work-orders/[id]/diagnostic`) existed,
worked, and was fully wired to real actions — but nothing in the app
ever linked to it, so a user could never have discovered it. This script
exists so that class of bug gets caught by running a check, not by
someone happening to notice.

Extracts every plausible link target from the whole app/components tree:
  - JSX `href="..."` / `href={`...`}` / `href={"..."}`
  - object-literal `href: "..."` / `href: `...`` (e.g. PageHeader's
    `action={{ href: ..., label: ... }}` prop, used throughout this app
    for "+ New" buttons — missed entirely by a JSX-only pattern)
  - `redirect("...")` / `redirect(`...`)`
  - `const href = <expr>;` assignments (including multi-line ternaries
    with two template literals, the exact pattern used by this app's 4
    shared `*Tabs.tsx` components) followed by `href={href}` — traced
    generically rather than special-cased per component

Known, genuine limitation, not a bug in this script: the 4 shared tab
components (SupplierTabs, JobTabs, EquipementTabs, ReportTabs) build
their hrefs from a `${base}/${id}/${s.key}` template combined with a
`SECTIONS` array iterated at runtime. No single string in the source
ever spells out the full path — it only exists as the combination of a
template pattern and a separate data array, which no regex-based static
check can resolve automatically. Rather than write increasingly complex
regex to chase one specific coding pattern, the routes covered by these
4 components were manually verified by reading each component's
SECTIONS list directly and are explicitly allowlisted below with that
reasoning recorded, not silently special-cased.

Verified against a positive control before trusting a clean run: a
genuinely orphaned scratch page was created under
src/app/(dashboard)/scratch-orphan-test/, confirmed caught, then
removed. See docs/12-schema-validation-findings.md §30 for that
verification.

Usage: python3 scripts/audit-page-reachability.py
(run from the project root)
"""
import re
import glob

ROOT = "src/app/(dashboard)"

# Manually verified by reading each component's SECTIONS array directly —
# see the module docstring above for why these can't be resolved
# automatically.
KNOWN_REACHABLE_VIA_DATA_DRIVEN_TABS = {
    "/procurement/suppliers/[id]/banque",
    "/procurement/suppliers/[id]/adresse",
    "/procurement/suppliers/[id]/profil",
    "/workshop/jobs/[id]/suivi",
    "/workshop/jobs/[id]/qualite",
    "/production/[id]/preparation",
    "/production/[id]/fabrication",
    "/production/[id]/four",
    "/production/[id]/anomalies",
    "/production/[id]/fuel",
    "/production/[id]/gaz",
    "/production/[id]/qualite",
    "/production/[id]/emballage",
    "/equipements/[id]/technique",
    "/equipements/[id]/prevision",
    "/equipements/[id]/documents",
}


def collect_pages():
    pages = []
    for path in glob.glob(f"{ROOT}/**/page.tsx", recursive=True):
        rel = path[len(ROOT):]
        route = rel[: -len("/page.tsx")]
        if route == "":
            route = "/"
        pages.append((route, path))
    return pages


def collect_hrefs():
    all_source = ""
    for path in (
        glob.glob("src/app/**/*.tsx", recursive=True)
        + glob.glob("src/app/**/*.ts", recursive=True)
        + glob.glob("src/components/**/*.tsx", recursive=True)
    ):
        all_source += "\n" + open(path).read()

    hrefs = set()
    for m in re.finditer(r'href=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})', all_source):
        hrefs.add(next(g for g in m.groups() if g))
    for m in re.finditer(r'href:\s*(?:"([^"]*)"|`([^`]*)`)', all_source):
        hrefs.add(next(g for g in m.groups() if g))
    for m in re.finditer(r'redirect\((?:"([^"]*)"|`([^`]*)`)\)', all_source):
        hrefs.add(next(g for g in m.groups() if g))
    for stmt_m in re.finditer(r"const\s+href\s*=(.*?);", all_source, re.S):
        for lit_m in re.finditer(r"`([^`]*)`", stmt_m.group(1)):
            hrefs.add(lit_m.group(1))
    return hrefs


def route_to_pattern(route: str) -> re.Pattern:
    parts = route.split("/")
    regex_parts = []
    for p in parts:
        if p.startswith("[") and p.endswith("]"):
            regex_parts.append(r"(?:[^/]+|\$\{[^}]+\})")
        elif p == "":
            regex_parts.append("")
        else:
            regex_parts.append(re.escape(p))
    pattern = "/".join(regex_parts)
    return re.compile(rf"^{pattern}(?:[/?#]|$)")


def main():
    pages = collect_pages()
    hrefs = collect_hrefs()

    unreachable = []
    for route, path in pages:
        if route in ("/", ""):
            continue
        if route in KNOWN_REACHABLE_VIA_DATA_DRIVEN_TABS:
            continue
        pat = route_to_pattern(route)
        if not any(pat.match(h) for h in hrefs):
            unreachable.append((route, path))

    print(
        f"Checked {len(pages)} pages against {len(hrefs)} distinct href/redirect "
        f"targets ({len(KNOWN_REACHABLE_VIA_DATA_DRIVEN_TABS)} more verified "
        f"reachable via data-driven tabs).\n"
    )
    if not unreachable:
        print("Every page has at least one inbound link or redirect somewhere in the app.")
    else:
        print(f"{len(unreachable)} page(s) with NO inbound link/redirect found anywhere:")
        for route, path in unreachable:
            print(f"  {route}  ({path})")


if __name__ == "__main__":
    main()
