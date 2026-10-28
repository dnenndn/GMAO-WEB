# Production Module — Functional Spec (Phase 2)

Reverse-engineered from the legacy GMAO WinForms app (`prod_rapport*.cs`,
`prod_param_*.cs`, `prod_recap.cs`, `prod_rapport_fuel.cs`).

## 1. What this module is

Daily/per-shift production tracking for what is clearly a **brick / ceramics
manufacturing plant** (`prod_type_brique` tracks fired weight `poid` and
green/unfired weight `poid_vert` per brick type). The production line has
**4 fixed sections**, hardcoded in the legacy UI rather than stored as a
table:

```
Préparation  →  Fabrication  →  Four (kiln)  →  Emballage
(raw material)   (forming/pressing)  (firing)      (packaging)
```

Each piece of equipment is tagged with which section it belongs to
(`prod_equipement.unite_production`).

## 2. Core workflow: the shift report

1. A supervisor picks a **date** and a **shift** (`poste`: `Jour` / `Soir` /
   `Nuit` — day/evening/night) and creates a report
   (`prod_rapport_general`). One report per date+shift combination — the
   legacy app blocks duplicates ("Erreur : Rapport déjà ajoutée").
2. Creating the report **auto-generates empty entry rows** for every
   equipment × brick-type combination across Fabrication, Emballage, and
   Four (in/out) — all initialized to zero quantity. Operators then fill
   these in via per-section entry screens rather than creating rows
   themselves.
3. **Fabrication** entries: quantity + tonnage produced, per press/machine,
   per brick type.
4. **Four (kiln)** entries: tracked **both directions** — `four_entre`
   (unfired product going in) and `four_sortie` (fired product coming out) —
   this is what lets the plant compute firing loss/yield.
5. **Emballage** entries: quantity packaged, plus packaging consumables
   (`nbr_bobine_feuillard` = strapping-film rolls used, `nbr_pallette` =
   pallets used).
6. **Quality/measurement readings** are captured through a generic parameter
   system (`prod_saisie`) rather than one column per measurement — new
   measurement types can be added without a schema change. Parameters are
   scoped to a category (`cible`):
   - Préparation générale
   - Préparation A/S (two paired values per reading — legacy columns
     `valeur_a` / `valeur_s`, likely before/after or two sampling points —
     **worth confirming exact meaning with plant staff**)
   - Four qualité
   - Fabrication qualité
   - Fabrication horaire — **hourly** throughput captured in 8 buckets
     (h1–h8) per shift, presumably one per hour of the shift
7. **Fuel consumption** per shift across 6 fixed points, confirmed from
   `prod_recap.cs` column headers: **Séchoir 1, Séchoir 2, Séchoir 3** (dryers),
   **Four 1, Four 2** (kiln zones), and **Général** — all measured in tonnes.
8. **Production anomalies** can be logged per section, separate from the
   maintenance module's equipment breakdowns.
9. **Cross-module link**: recording fabrication output can increment an
   `equipement_compteur` (equipment counter) — this is the same counter
   type used by the Maintenance module's "Préventive Syst Compteur" plans,
   so production throughput can trigger preventive maintenance automatically
   (e.g. "service the press every 10,000 units produced").
10. **Chef d'équipe (shift team lead)**: each Fabrication and Emballage line
    can have a staff member (`Intervenant`) assigned per shift report
    (`prod_rapport_cf_fabrication` / `prod_rapport_cf_emballage`, both
    joining to `id_cf` → `intervenant.id`). This is what lets the recap
    dashboard attribute output to a responsible lead
    (`select_production_par_ce` in the legacy recap screen).

## 3. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `prod_rapport.cs` | `/production/reports/new` (pick date + shift, generates the report) | P0 |
| `prod_rapport_fabrication*.cs` | `/production/reports/[id]/fabrication` (entry grid) | P0 |
| `prod_rapport_four*.cs` | `/production/reports/[id]/four` (entrée/sortie entry grid) | P0 |
| `prod_rapport_emballage*.cs` | `/production/reports/[id]/emballage` (entry grid) | P0 |
| `prod_rapport_preparation.cs`, `prod_rapport_prep_general.cs` | `/production/reports/[id]/preparation` | P1 |
| `prod_rapport_fuel.cs` | `/production/reports/[id]/fuel` | P1 |
| `prod_rapport_anomalie.cs` | `/production/reports/[id]/anomalies` | P1 |
| `prod_recap.cs` | `/production/recap` — aggregated KPI dashboard (date-range filter) | Done |
| `prod_param_equipement.cs`, `prod_param_brique.cs`, `prod_param_saisie.cs` | `/production/settings/*` (reference data CRUD) | P2 |

**P0 = MVP (this phase)** — create a shift report and fill in the three main
production stages (Fabrication, Four, Emballage).

## 4. Notable business rules

- One report per (date, shift) — enforced with a unique constraint in the
  new schema (`@@unique([dateRapport, poste])`).
- Equipment↔section assignment (`unite_production`) is a fixed 4-value enum
  in the legacy app, not a real table — kept as a plain string for now, but
  worth promoting to a real lookup table in the web version since it's
  small and stable.
- The measurement/quality sub-schema is genuinely quirky in the original
  (three different row shapes: single value, paired A/S values, 8-hour
  buckets) — I modeled these as three separate tables
  (`ProdMesureRapport`, `ProdRapportPrepAS`, `ProdRapportHoraireFabrication`)
  rather than forcing one shape, to stay faithful to the source.
- Firing yield/loss (Four entrée vs sortie) and packaging consumable ratios
  are natural KPIs for the recap/dashboard screen once P0 is in.

## 5. Open questions for you

1. Can you confirm what **"A/S"** stands for in the Préparation readings
   (`valeur_a` / `valeur_s`)? This affects labeling in the UI — still not
   implemented pending this answer.
2. Are the **8 hourly buckets** (`h1`–`h8`) literally hours 1–8 of an
   8-hour shift, or something else (batches, machine cycles)?
3. ~~What are the exact 6 fuel consumption points~~ — **resolved**:
   confirmed from `prod_recap.cs` as Séchoir 1/2/3, Four 1/2, Général (tonnes).
4. Do you want the **counter-increment link to Maintenance** (production
   output triggering preventive-maintenance counters) wired up in Phase 2,
   or deferred?

## 6. Build status

All P0/P1 screens are implemented: shift reports, Fabrication/Four/Emballage
entry grids, Préparation and Qualité readings (kiln/fabrication quality,
hourly throughput, daily tonnage), Anomalies log, chef-de-fabrication /
chef-d'équipe assignment (Fabrication and Emballage lines), a date-ranged
Récapitulatif/KPI dashboard (production & kiln-yield totals, by-equipment
breakdowns, anomaly summary, fuel summary, production-by-team-lead), and
settings screens for equipment↔section assignment, brick types, and
measurement parameters. The four open questions above (§5) are the only
remaining gaps — everything else from `prod_rapport*.cs`, `prod_recap.cs`,
and `prod_param_*.cs` has a web equivalent.
