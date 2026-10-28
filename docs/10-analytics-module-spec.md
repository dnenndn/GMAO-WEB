# Analytics Module — Functional Spec (Phase 10) — KPI / Pareto Reporting

Reverse-engineered from `ot_kpi_equipement.cs` / `ot_kpi_sous_equipement.cs`
/ `ot_kpi_zone.cs` / `ot_kpi_tous.cs` (reliability), `pareto_cout_*.cs` (7
files, cost ranking by different dimensions), `pareto_fiabilite_*.cs`
(reliability ranking variants), and `maintenance_backend.cs` (the
authoritative total-cost-per-work-order formula).

## 1. Two real bugs this pass fixed in the Maintenance/Inventory schema

Building this module required tracing exactly how cost gets computed,
which surfaced two things the earlier modules had gotten wrong:

1. **`Bsm.liOt`** — a real integer foreign key to `OrdreTravail`,
   confirmed via explicit `UPDATE bsm SET li_ot = ... WHERE ...`
   statements in `ordre_travail.cs` and `ot_general_bsm.cs`. The
   Inventory module (Phase 3) only modeled the loose text field `nOt`.
   Both coexist in the real app: `nOt` is what's typed in at BSM
   creation; a resolution step later matches it to a real work order and
   sets `liOt` — which is what **every single cost-reporting query
   actually joins on**, not `nOt`. This is now fixed.
2. **`OtOrdoIntervenant.coutHoraire`** — a real stored column (hourly
   rate snapshot at scheduling time) that Phase 1 missed entirely. Every
   labor-cost calculation in the legacy app multiplies this by scheduled
   duration; it's now added.

Two small new tables were also needed to complete the total-cost formula
found in `maintenance_backend.cs`: **`OtBl`** (links a subcontracting
delivery-note line to the OT it repaired parts for) and **`OtProjet`**
(project cost attributed directly to an OT).

## 2. Total cost per work order (confirmed formula)

```
cout_total = cout_pdr        -- parts: sum(bsm_article.quantite * prix_ht) via Bsm.liOt
           + cout_mo         -- labor: sum(cout_horaire * hours) via OtOrdoIntervenant
           + cout_reparation -- subcontracting repair, via OtBl -> DsLivraisonArticle
           + cout_projet     -- via OtProjet
```

This is computed live — **no stored total-cost column**, matching the
computed-dashboard pattern used everywhere else in this rebuild
(Inventory movements, Fleet expiry, Budget variance).

## 3. Reliability KPIs (MTTR / MTBF / TTR)

Computed per equipment level (Équipement / Sous-équipement / Organe /
Atelier), from closed, non-preventive work orders only (the legacy SQL
filters `type NOT LIKE '%Prév%'` — reliability metrics are meaningless
for planned maintenance):

- **TTR** (Total Time to Repair) = sum of repair durations (hours)
- **MTTR** (Mean TTR) = TTR / number of work orders
- **MTBF** (Mean Time Between Failures) = (total observation window −
  TTR) / (number of work orders, or number − 1 if the "up time" figure
  computes to exactly zero — a legacy edge-case guard preserved here)

## 4. Cost Pareto ranking

The legacy app has **7 near-identical screens**, one per ranking
dimension: Équipement, Famille, Sous-famille, Classe d'intervention,
Défaillance, Fonction, Intervenant. Each ranks that dimension by total
cost (parts + labor, using the same `Bsm.liOt` / `coutHoraire` joins) and
implicitly supports Pareto (80/20) analysis via descending sort — this
web version adds an explicit running cumulative-percentage column rather
than leaving that calculation to the reader, which the legacy screens
didn't do either.

**Consolidated into one page** (`/analytics/cost`) with a dimension
selector, rather than rebuilt as 7 separate screens — same information,
one implementation.

## 5. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `ot_kpi_equipement.cs`, `_sous_equipement`, `_zone`, `_tous` | `/analytics/reliability` — level selector | P0 |
| `pareto_cout_*.cs` (7 files) | `/analytics/cost` — dimension selector | P0 |
| `pareto_fiabilite_*.cs` (6 files) | Folded into `/analytics/reliability` (same underlying MTTR/MTBF calc, different grouping dimension) | P0 |
| `indicateur_maintenance.cs`, `acceuil_maintenance.cs` cost widgets | Total-cost summary cards on the analytics hub | P1 |

## 6. Notable business rules

- The preventive-maintenance exclusion (`type NOT LIKE '%Prév%'`) is
  applied consistently across every reliability query — reliability
  metrics describe unplanned failures, not scheduled work.
- Cost queries exclude a `type_stock <> @v` value on the BSM side —
  almost certainly excluding stock returns/adjustments from being
  double-counted as consumption cost. This web version applies the same
  exclusion, matching on `typeStock !== "Retour"` (best-effort — the
  exact excluded value wasn't recoverable from static analysis, since
  `@v`'s bound value is set elsewhere in the file than the query itself).

## 7. Open questions for you

1. Confirm the exact value excluded by `type_stock <> @v` in the cost
   queries — this pass assumes it's meant to exclude returns, but the
   literal string wasn't traceable in static analysis.
2. `ot_bl` and `ot_projet` — is there a UI in the legacy app for actually
   *creating* these records, or are they populated some other way (e.g.
   a stored procedure, or manual DB entry)? No creation screen was found
   for either during this analysis; only the read-side cost rollup.
