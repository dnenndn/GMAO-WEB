# Tooling Module — Functional Spec (Phase 9) — "Outillage"

Reverse-engineered from the legacy GMAO WinForms app (`liste_outillage.cs`,
`Outillage_utilisation_lancement.cs`, `outillage_date_heure_fin.cs`,
`outillage_parametre_type.cs`, `outillage_parametre_secteur.cs`,
`outillage_parametre_utilisation.cs`).

## 1. What this module is

Tool/equipment checkout tracking — a tool room lending physical tools
(measuring instruments, hand tools, etc.) out to staff, tracked with a
start/end timestamp per checkout.

## 2. Core entities

- **Outil** (the tool itself): confirmed via `liste_outillage.cs`'s
  `SELECT` joining `outils`/`secteur`/`tab_type` — code, designation,
  serial number, model number, manufacturer, purchase date, warranty end,
  commissioning date, purchase price, and a boolean-ish `statut`
  (available / checked out).
- **Secteur**: sector/zone reference data.
- **TabType**: tool type reference data.
- **Utilisation**: a usage/purpose reference list — **no confirmed link**
  to `Outil` or the checkout log was found in static analysis (see §5).
  Modeled standalone.
- **TabLancementAffectation**: the checkout/return log — who
  (`Intervenant`), which tool, when checked out, when returned
  (`encours` flags an active checkout), and an optional loose text link
  to a Maintenance work order (`nOt`, same pattern as `Bsm.nOt` elsewhere).

## 3. Workflow

1. Staff checks out a tool: `TabLancementAffectation` row created with
   `encours = true`, `dateFin`/`heureFin` null. `Outil.statut` flips to
   unavailable.
2. On return (`outillage_date_heure_fin.cs`): `encours` set to `false`,
   `dateFin`/`heureFin` recorded, and `Outil.statut` flips back to
   available — confirmed directly from the legacy UPDATE statements.

## 4. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `liste_outillage.cs` | `/tooling/outils` (list), `/new`, `/[id]` | P0 |
| `Outillage_utilisation_lancement.cs` | Checkout action, from tool detail or a dedicated `/tooling/checkout` | P0 |
| `outillage_date_heure_fin.cs` | Return action | P0 |
| `outillage_utilisation_historique.cs` | Checkout history, folded into tool detail | P0 |
| `outillage_parametre_secteur.cs`, `outillage_parametre_type.cs`, `outillage_parametre_utilisation.cs` | `/tooling/settings/*` | P0 |

**P0 = this pass** — the whole module is small enough to build in full on
this pass rather than splitting into phases.

## 5. Open questions for you

1. **`Utilisation`'s actual link**: no foreign key from `Outil` or
   `TabLancementAffectation` to `utilisation` was found. Is this reference
   list actually used elsewhere (perhaps a column this analysis missed),
   or is it effectively dead/unused in the current application?
2. Confirm whether `Outil.statut` is purely derived from the latest
   checkout state (as modeled) or can be manually overridden (e.g. a tool
   marked unavailable for maintenance/calibration, independent of any
   checkout).
