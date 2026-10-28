# Fleet Module — Functional Spec (Phase 6) — "Parc Engin"

Reverse-engineered from the legacy GMAO WinForms app (`ajouter_engins.cs`,
`engin_assurance.cs`, `engin_vignette.cs`, `engin_visite_technique.cs`,
`engin_sortie_carburant.cs`, `engin_compteur_initial.cs`,
`type_de_vehicule.cs`, `type_de_carburant.cs`, `ajouter_chauffeur.cs`,
`parc_engin_notification.cs`).

## 1. What this module is

Fleet/vehicle management ("Parc Engin" — vehicle park). Tracks company
vehicles (`Engin`): plate number, fuel card, assigned driver, vehicle type,
and load category (for trucks/heavy equipment — `categorie_de_charge`
suggests tonnage-class categorization).

## 2. Cross-module link — vehicle odometer feeds Maintenance

The most important discovery: `engin_compteur_initial.id_compteur`
references **the exact same `equipement_compteur` table** used by:
- The Maintenance module's "Préventive Syst Compteur" plans (service every
  N units of counter movement)
- The Production module's fabrication-output counter increments

This means a vehicle's **odometer can drive preventive-maintenance
scheduling** exactly like a production machine's cycle counter (e.g. "oil
change every 10,000 km"), and fuel fill-ups record the odometer reading
(`EnginSortieCarburant.compteur`) as a natural update point for that
counter.

**Assumption, not confirmed in source**: `equipement_compteur` requires an
`id_equipement`, which implies a vehicle may need to also exist as a row
in the shared `Equipement` tree to have a working counter. This schema
adds an **optional** `Engin.idEquipement` link to support that — but no
direct evidence in the legacy code confirms vehicles are actually
registered there. Worth confirming with whoever knows the real database.

## 3. Core entities

- **Engin**: the vehicle itself.
- **TypeVehicule, Chauffeur, CategorieDeCharge, TypeCarburant**: simple
  reference/lookup data.
- **Three parallel compliance-document types** — insurance
  (`EnginAssurance`), road-tax sticker (`EnginVignette`), and technical
  inspection (`EnginVisiteTechnique`) — all sharing the same shape
  (start/expiry date, price, "notify N days before expiry"). Kept as 3
  separate tables matching the source (each has its own dedicated legacy
  screen and report) rather than unifying into one generic "document"
  table.
- **EnginSortieCarburant**: fuel dispensing log, with unit price, total
  price, and odometer reading — enables consumption-per-km reporting.
- **EnginCompteurInitial**: the vehicle's starting odometer value (see §2).

## 4. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `ajouter_engins.cs`, `liste_des_engins.cs` | `/fleet/vehicles` (list), `/new`, `/[id]` | P0 |
| `engin_assurance.cs`, `engin_vignette.cs`, `engin_visite_technique.cs` | Tabs on vehicle detail: Assurance / Vignette / Visite technique | P0 |
| `engin_sortie_carburant.cs` | `/fleet/fuel` (log), tab on vehicle detail | P0 |
| `type_de_vehicule.cs`, `type_de_carburant.cs`, `ajouter_chauffeur.cs` and the load-category admin screen | `/fleet/settings/*` | P0 |
| `parc_engin_notification.cs` | `/fleet` — computed "expiring soon" panel (see §5) rather than a stored notification table | P0 |
| `engin_compteur_initial.cs` | Counter setup, folded into vehicle detail | P1 |
| `engin_tab_intervention.cs` | Cross-link to Maintenance work orders for this vehicle's equipment — deferred, depends on the assumption in §2 being confirmed | P1 |
| `engin_recap.cs`, `parc_engin_rapport.cs`, and the various `crysrpt_engin_*` Crystal Reports | Reporting/analytics — deferred | P2 |
| `engin_fichier.cs` | File attachments tab | P2 |

**P0 = this pass** — vehicle master data, the 3 compliance documents with
an expiry dashboard, fuel logging, and reference-data settings.

## 5. Notable business rules

- `parc_engin_notification.cs` reads from a generic `notification_alerte`
  table rather than computing expiries on the fly — implying a background
  job or database trigger populates it in the legacy system. This schema
  **does not** replicate that generic notification table; instead, the web
  app computes "documents expiring within N days" directly from the 3
  document tables at page-load time, the same approach used for the
  Inventory module's stock-movements ledger. Simpler, always accurate, no
  background job needed — a deliberate improvement, not a missed feature.
- `notAvant` (days before expiry to notify) is stored **per document
  instance**, not as a global setting — different insurance policies or
  inspection types could have different lead times.

## 6. Open questions for you

1. Are vehicles actually registered in the main `Equipement` tree in the
   real database (confirming the assumption in §2), or is the vehicle
   odometer tracked in a way this schema hasn't captured?
2. What does `Engin.liaison` mean? No lookup or clear usage pattern was
   found beyond it being a free-text/short field on the vehicle record.
3. Is `categorie_de_charge` (load category) tonnage-based, or something
   else (e.g. vehicle class for insurance purposes)?
