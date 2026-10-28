# Schema Validation Findings — Real Database Cross-Check

Unlike every other spec doc in this project, this one isn't based on static
code analysis — it's based on an actual schema export (`Generate Scripts`,
schema-only) from the real `GMAO_NGES` SQL Server database. This is the
first and only point in the whole rebuild where the reverse-engineered
schema could be checked against ground truth rather than inferred from
decompiled C#.

## Scale of the comparison

- **215 real tables** in the live database.
- **107 models** in this project's Prisma schema before this pass.
- **116 real tables never modeled at all** (see §3 — a prioritized roadmap,
  not built yet).
- **8 models in this schema with no real counterpart** — all but one were
  deliberate, already-documented design choices (see §2).

## 1. Confirmed and fixed in this pass

| Issue | What was wrong | Fix |
|---|---|---|
| `Ds` (Subcontracting) | Modeled as a real parent table with a relation. Believed at the time that **no `ds` table exists at all** — but this conclusion was itself wrong, see the correction in §16 below. | *(Superseded — see §16. This row is kept for the record rather than deleted, since the "fix" described here was itself later found to be incomplete.)* |
| `Bsm.liOt` | Modeled as `Int?` with a real FK relation to `OrdreTravail` — this was stated as "confirmed" in the Analytics module work, based on seeing `UPDATE bsm SET li_ot = ...` in the source. | It's actually `varchar(100)`. The Analytics cost-reporting query that joined on it as an integer has been rewritten to match on `Bsm.nOt` / `OrdreTravail.nOt` string equality instead. **Why the app has both `nOt` and `li_ot` as separate string columns is still unclear** — worth asking whoever knows the business logic. |
| `Article.stockReparableManuel` | Missing entirely — the "three-way stock split" (neuf/usé/rebuté) flagged as an open question in the Inventory spec is actually **four-way**. | Added. Not yet wired into any UI — the article list/detail pages still only show the original three. |
| `Fournisseur.fodec` | Modeled as `Boolean`. Real column is `real` — a rate/amount, not a flag. | Fixed to `Decimal?`. Updated the banking-tab edit form (checkbox → number input) and its action. |
| `Article.modificationQt` | Modeled as `Boolean`. Real column is `date`. | Fixed to `DateTime?`. Wasn't referenced anywhere in the app yet, so no cascading changes needed. |
| `PrevConditionnelle` | Missing `mesure` (varchar(2000), a description of what's being measured) and `unite` (the unit of measure). | Added both as optional strings. Not yet surfaced in the `/work-orders/preventif` UI. |

## 2. Models with no real table — reviewed one by one

- `DaAction` — deliberate consolidation of 6 real tables
  (`da_confirmer`/`da_refuser`/`da_reporter`/`da_retourner`/`da_reenvoyer`/
  `da_cloturer`), already documented in the Procurement spec as a design
  choice. **Confirmed correct**, not a bug — all 6 real tables do exist,
  each is just a one-column audit-log insert, and folding them into one
  table with a `type` discriminator loses nothing.
- `ProdMesureRapport` — similarly, a deliberate consolidation of 4 real
  tables (`prod_rapport_fabrication_qualite`, `prod_rapport_four_qualite`,
  `prod_rapport_prep_general`, `prod_rapport_prep_qualite`), already
  documented in the Production spec. **Confirmed correct.**
- `ArticleCommentaire`, `ArticleFichier`, `AtelierCommentaire`,
  `OtCommentaire`, `OtFichier` — these are **pure additions with no legacy
  equivalent at all**. The real database has no comment/file-attachment
  tables for `article`, `atelier_creer`, or `ordre_travail` (it does have
  `atelier_fichier` for a *different* purpose — file attachments per
  workshop job description, already captured — and `tableau_article_fichier`
  for articles, which duplicates what `ArticleFichier` was meant to do —
  **not yet reconciled**, see §3).
- `Ds` — the one genuine bug, fixed in §1.

## 3. The 116 undiscovered tables — a prioritized roadmap, not yet built

Grouped by what they represent, roughly in order of how much they'd change
existing behavior if built:

**Would change/correct existing modules (highest priority):**
- `tableau_article_fichier`, `tableau_article_unite`, `parametre_unite_article`,
  `caracteristique`, `caracteristique_option`, `caracteristique_textbox`,
  `tableau_article_caracteristique` — the real Article characteristics/units
  system. **`ArticleFichier` (added this pass) should likely be replaced by
  `tableau_article_fichier`** once this whole area gets a proper pass.
  **Built** — see the update at the end of this doc. Turned out to be a
  genuine dynamic form-builder, confirmed directly in the decompiled
  source (`ajouter_caractéristique.cs`'s field-type dropdown), not a
  simple flat characteristics table.
- `devis`, `devis_article`, `devis_fournisseur`, `devis_fichier` — a
  **separate quote step for regular Procurement**, parallel to
  `ds_devis`/etc. for Subcontracting. This project currently goes straight
  from `DemandeAchat` to `Commande` with no quote/bidding step — the real
  app has one. This is a genuine missing workflow stage, not a minor gap.
  **Built** — see the update at the end of this doc.
- `gamme_ressources_fonction`, `gamme_ressources_outillage`,
  `gamme_ressources_pdr` — real resource-planning sub-tables for
  `GammeOperatoire` (staffing, tooling, and spare-parts requirements per
  operating procedure). Currently `GammeOperatoire` is a flat table with
  no resource planning at all. **Built** — see the update at the end of
  this doc.
- `ot_ressources_outil`, `ot_ressources_pdr` — the OT-side counterparts
  (actual tool/parts usage), paralleling `OtRessourcesFonction` which
  already exists. **Built** alongside the above.
- `equipement_generale`, `equipement_technique`, `equipement_image`,
  `equipement_pdf`, `equipement_observation`, `equipement_prevision` — a
  whole equipment-detail-tabs sub-schema. `Equipement` is currently a bare
  hierarchy table with none of this. **Built** — see the update at the
  end of this doc, which also resolves the Fleet module's biggest open
  question (whether vehicles live in the Equipement tree).

**Whole features never touched:**
- `ot_diagnostic_def`, `ot_diagnostic_detection`, `ot_diagnostic_operation`,
  `ot_diagnostic_symptome`, `operation_diagnostic`, `symptome_defaillance`,
  `relation_anomalie` — the full Ishikawa/AMDEC diagnostics system, already
  flagged as "not yet built" in the Maintenance spec, now with its real
  table structure known. **Built** (schema + `/work-orders/[id]/diagnostic`
  + `/work-orders/settings/diagnostic` for the reference data) — see the
  update at the end of this doc. This entry was corrected after review
  found the schema/pages already existed but this doc hadn't been updated
  to reflect it, and the diagnostic page had no navigation link pointing
  to it anywhere in the app — both are now fixed.
- `facture`, `facture_livraison`, `ds_facture`, `ds_facture_livraison` —
  invoicing for both regular Procurement and Subcontracting. **Built** —
  see the update at the end of this doc, which also surfaced a real
  delivery-note table (`bon_livraison`) that a guessed line-items table
  (`bon_livraison_article`) turned out not to exist for.
- `dop`, `dop_article`, `dop_fini`, `dop_fournisseur` — referenced by
  `bon_dop.cs` in the original module inventory, never investigated.
- `notification`, `notification_alerte` — the real notification-routing
  tables (confirms, again, that this is notification infrastructure, not
  an authorization system — consistent with the Authorization section's
  findings).
- `prod_gaz`, `prod_coefficient_gaz`, `prod_four_consommation_electrique` —
  gas/electricity consumption tracking for the kiln, missing from the
  Production module entirely. **Built** — see the update at the end of
  this doc.
- `bon_de_carburant`, `voyage`, `engin_parc_liaison_carburant` — additional
  Fleet tables beyond what was built (trip/journey tracking, a different
  fuel-voucher concept than `EnginSortieCarburant`). **Built** — except
  `engin_parc_liaison_carburant`, deliberately left schema-only (see the
  update at the end of this doc for why).
- `ac_reapprovisionnement`, `ac_reapprovisionnement_ech`,
  `ac_recompletement`, `ac_recompletement_ech` — an automatic
  reorder/replenishment system for Inventory, never investigated at all
  (not even flagged as a gap before this). **Built** — see the update at
  the end of this doc.
- `commande_modification_base`, `commande_modifier_article`,
  `modification_article` — order/article modification history tracking.
  **Built** — see the update at the end of this doc, which also adds a
  genuinely missing capability: editing an existing order line at all
  (the app previously only supported adding new lines).
- `reception_commande` — a reception↔order linking table distinct from how
  `ReceptionArticle.idCommande` currently works; needs investigation to see
  if it changes the Reception↔Commande relationship. **Investigated and
  built** — see the update at the end of this doc; it's a complementary
  header-level link, not a replacement for the existing line-item one.
- `ds_mp`, `ds_nv_article` — subcontracting raw-material consumption
  (`ds_mp`, already flagged as unmodeled in the Inventory spec's stock-
  movements note) and custom/one-off items (`ds_nv_article`, now confirmed
  as the likely target when `DsDevisArticle.source` disambiguates `id_t`
  away from the regular article catalog). **Built** — see the update at
  the end of this doc.

## 4. What this means going forward

This cross-check should be treated as **higher-confidence than any prior
static-analysis finding** in this project — it's the only point where
assumptions were checked against a real, live schema rather than inferred
from decompiled UI code. Any future work on the modules touched here
(Subcontracting, Analytics, Inventory, Procurement) should treat this doc
as more authoritative than the earlier phase-specific spec docs where they
conflict.

## 5. Update — Procurement quote step built (DOP/Devis)

Built after this doc's first pass, using the same real-schema-derived
approach:

- **Dop** (Demande d'Ouverture de Prix): survey pricing from multiple
  suppliers for a set of articles.
- **DopFini**: the price-comparison matrix (one row per article ×
  supplier), shown as an editable grid on `/procurement/dop/[id]` with
  running per-supplier totals.
- **Devis**: formalizes one supplier's quote by copying the chosen
  `DopFini` rows into `DevisArticle` lines.
- Confirmed **zero FK constraints anywhere in the entire 215-table
  database** — every relation in this legacy app is enforced at the
  application layer only. `Dop`/`Devis` are not linked to
  `DemandeAchat`/`Commande` by any declared relation, modeled as a
  standalone price-survey tool rather than forcing a fake connection.
- **Not yet done**: `DopFini.fini`'s exact semantics weren't confirmed
  (modeled as a simple boolean "settled" flag); no UI was built to toggle
  it. The other 115 tables from §3 remain unbuilt.

## 6. Update — Article characteristics & units built

- Confirmed this is a genuine **dynamic form-builder scoped per
  SousFamille** — directly verified in the decompiled source rather than
  guessed: `ajouter_caractéristique.cs` has a field-type dropdown
  ("TextBox" | "Select Unique" | "Select Multiple" | "CheckBox" | "Radio
  Button"), and `modifier_caracteristique_textbox.cs` has a value-type
  dropdown ("Chaîne de caractères" | "Entier" | "Réel") for the TextBox
  variant specifically.
- Fixed the mapping bug flagged above: `ArticleFichier` now correctly
  targets the real `tableau_article_fichier` table instead of a
  fictional `article_fichier`.
- Built `/inventory/settings/caracteristiques` (define fields per
  sub-family, with type-specific config: options list for Select/Radio,
  value-type + default for TextBox) and `/inventory/settings/unites`.
- Article detail page now renders the relevant characteristics
  dynamically based on the article's sous-famille, with the correct
  input type per characteristic (text/select/checkbox), plus a unit-of-
  measure assignment.
- **"Select Multiple" fully implemented**: renders as a native multi-select
  and the update action collects all selected values via `formData.getAll()`
  (a fix that also uniformly improved the other field types' value
  collection, not just this one).

## 7. Update — Gamme resource planning & OT resource usage built

- Confirmed 3 more `GammeOperatoire` column type mismatches while
  building its first-ever management UI: `duree` and `pTyppe` are `int`
  (were modeled as `Decimal?`/`String?`), and `varDuree` is `varchar(20)`
  (was modeled as `Decimal?` — it's a tolerance descriptor string, not a
  number). All fixed; nothing in the app referenced these fields yet, so
  no cascading changes were needed.
- Built `GammeRessourcesFonction`/`GammeRessourcesOutillage`/
  `GammeRessourcesPdr` (planning) and `OtRessourcesOutil`/`OtRessourcesPdr`
  (actual usage) — ties Maintenance, Tooling (`TabType`), and Inventory
  (`Article`) together for the first time.
- Built `/work-orders/gammes` (list, create, detail with all 3 resource
  sub-sections) since no Gamme management page existed at all before this
  — it had only ever been referenced as a dropdown source on the
  preventive-maintenance page.
- Added a "Ressources utilisées" section to the Work Order detail page for
  recording actual tool/parts consumption.
- **Not yet done**: `minPlanif`'s unit (assumed minutes) and `type_cout`'s
  full value set (assumed "Interne"/"Externe") aren't confirmed — no
  dropdown enumeration was found for either in the decompiled source.

## 8. Update — Equipment detail tabs built, Fleet assumption resolved

- **Resolved the Fleet module's biggest open question.** Phase 6 flagged
  as an unconfirmed assumption "does a vehicle live in the shared
  Equipement tree?", modeling a speculative `Engin.idEquipement` field
  with no evidence for its direction. The real schema confirms: **yes**,
  but the link is the *opposite* direction — `equipement.engin` points to
  `engins.id`, not the other way around. Fixed: removed the speculative
  field (unused anywhere in the app, so no cascading changes), added the
  real `Equipement.engin` column with its relation.
- Also discovered two more real `Equipement` columns with no prior model:
  `tec_geo` and `type_equip` (both `int`, exact meaning/reference table
  unconfirmed for either).
- Built all 6 detail tables: `EquipementGenerale` (purchase/warranty/
  depreciation info — confirmed `cout_achat` is stored as free-text
  varchar, not numeric, matching a pattern already seen with
  `Fournisseur`/`Article` fields elsewhere), `EquipementTechnique`
  (repeatable free-form specs), `EquipementImage`, `EquipementPdf`,
  `EquipementObservation`, and `EquipementPrevision` (downtime-cost/
  failure-rate forecasting, same `periodeNbr`+`periode` recurrence
  pattern already used by `PrevSystematique`).
- Built `/equipements` from scratch (list + detail with 4 tabs:
  Aperçu/Technique & Observations/Documents/Prévision) — no equipment
  management UI existed at all before this; it had only ever been
  referenced as a dropdown source across every other module.
- **Not yet done**: `EquipementImage` (photo uploads) has no UI yet —
  actual file/image upload handling is an infrastructure concern this
  project has deferred everywhere (see the `Fichier`-style models
  elsewhere, all path/URL references only, same pattern here).

## 9. Update — Diagnostics (Ishikawa/AMDEC) confirmed complete and reconnected

On resuming work on the roadmap, this section's schema and pages were
found already built (9 models: `Symptome`, `SymptomeDefaillance`,
`OperationDiagnostic`, `RelationAnomalie`, `OtDiagnosticDef`,
`OtDiagnosticDetection`, `OtDiagnosticOperation`, `OtDiagnosticSymptome`,
`OtDiagnosticM`) — but two real gaps were found and fixed:

- **The diagnostic page was orphaned** — `/work-orders/[id]/diagnostic`
  existed and worked, but nothing in the app linked to it. A user could
  never have discovered this feature through the UI at all. Added a link
  from the Work Order detail page, and a back-link from the diagnostic
  page itself.
- **No reference-data management existed** — the diagnostic page lets you
  select symptoms and diagnostic operations, but nothing let you *create*
  them, or define which symptoms/operations apply to which failure mode,
  or build the anomaly parent/child cause-tree (`RelationAnomalie`).
  Without this, the feature would render essentially empty on first use.
  Built `/work-orders/settings/diagnostic` covering all of it.
- This doc itself was stale — still listing diagnostics as unbuilt in §3
  above (now corrected) despite the underlying work already existing,
  most likely from a session compaction losing track of an earlier pass.
  Worth remembering: verify actual repo state before trusting this doc's
  "not yet built" lists at face value in future sessions.

## 10. Update — Invoicing built (Procurement)

- Confirmed `bon_livraison` is a genuine formal delivery-note step,
  distinct from `Reception` — it wraps an existing Reception via a real
  FK (`id_reception`) rather than duplicating its line items. A guess
  that a `bon_livraison_article` table would exist for its own line
  items was checked directly against the schema export and **disproven**
  — no such table exists. `BonLivraison` in this schema correctly has no
  line-items relation, deferring to its linked `Reception`.
- Built `BonLivraison` → `Facture`/`FactureLivraison` for Procurement:
  `/inventory/receptions/[id]` gets a "Créer un bon de livraison" action,
  `/inventory/livraisons/[id]` shows the delivery note, and
  `/procurement/factures` lets you create an invoice against one or more
  not-yet-invoiced delivery notes.
- **Caught a real bug before shipping**: initially wrote the invoice
  detail page to compute a total from a `ReceptionArticle.prixUnitaire`
  field that doesn't exist on that model — checked the actual schema
  before assuming it would work, found no pricing at all lives at the
  reception-line level, and confirmed the real `facture` table itself
  has **no total-amount column either**. Rewrote the page to say so
  explicitly rather than fabricate a number — invoice totals appear to be
  verified against the paper invoice, not tracked digitally, in the
  legacy app.
- **Update**: the parallel Subcontracting invoicing UI
  (`DsFacture`/`DsFactureLivraison`) was deferred at the time this section
  was written, but was in fact built in the same session, in a batch of
  work that got lost track of across a context compaction (same root
  cause as the Diagnostics feature in §9). See §15 for the verification
  pass that confirmed it's correct and complete.

## 11. Update — Gas & electricity consumption tracking built (Production)

- `ProdGaz` follows the exact shape of the already-confirmed `ProdFuel`
  (per-shift-report, one row per measurement point) — but **unlike
  `ProdFuel`'s 6 points (confirmed from legacy column headers)**, no
  equivalent confirmation was found for gas measurement points in the
  decompiled source. Modeled with a plausible guess (`GAZ_POINTS` in
  `constants.ts`), explicitly flagged in code comments and on the page
  itself as unconfirmed, unlike the fuel points which carry no such
  caveat because they were actually verified.
- `ProdFourConsommationElectrique`'s 4 time-of-day buckets
  (matin/pointe/nuit/soir) match Tunisia's standard STEG industrial
  tariff periods — a well-known convention, not a guess, so this one
  ships without a confidence caveat.
- Rows auto-generate at report-creation time, matching the exact pattern
  already used for `ProdFuel` — added `/production/[id]/gaz` as a new
  report tab. Kiln electricity is tracked separately by date (not tied to
  a specific shift report, matching the real `id_rapport`-free schema) at
  `/production/electricite`.
- `ProdCoefficientGaz` (an effective-dated pricing/conversion coefficient)
  is modeled but has no UI yet — it's a bare lookup table with no other
  columns to build a meaningful management screen around until its exact
  purpose (cost calculation? m³-to-kWh conversion?) is confirmed.

## 12. Update — `reception_commande` investigated + auto-reorder built

- **`reception_commande` resolved**: it's a genuine **header-level** link
  between a Reception and one or more Commandes — complementary to, not a
  replacement for, the existing `ReceptionArticle.idCommande` (which
  matches an individual received line to a specific order line for
  DA/PO reconciliation). A single delivery can span several small orders;
  this table tags the whole delivery event, the other reconciles line by
  line. Both now coexist correctly. Added a "Commandes correspondant à
  cette livraison" section on the Reception detail page.
- **Auto-reorder built**: two distinct recurring methods, confirmed
  structurally distinct from the schema — `AcReapprovisionnement` orders
  a **fixed quantity** each cycle; `AcRecompletement` has no quantity
  column at all, implying it replenishes to a target level instead
  (presumably `Article.stockMaxi`, though no direct FK confirms this).
  Both share the same recurrence shape already used by
  `PrevSystematique`, and each has a parallel "_ech" (échéance) table
  logging when a cycle actually came due — mirroring how
  `OtReinitCompteur` tracks preventive-maintenance triggers. Built
  `/inventory/reapprovisionnement` with manual "Vérifier les échéances"
  buttons for both (same reasoning as every other manual-trigger feature
  in this project: no scheduler infrastructure is set up here, so this is
  a deliberate stand-in, not a missed automation).
- **Not yet built**: nothing consumes a logged "échéance" automatically —
  no DA/Commande gets auto-created when a cycle comes due. No evidence in
  the source suggested that link exists either (no FK from either `_ech`
  table to anything purchase-related), so this may genuinely just be a
  notification/reminder log for staff to act on manually, not an actual
  auto-purchasing pipeline. Worth confirming with whoever knows the real
  business process before building further here.

## 13. Update — Fleet extras built (Bons de carburant, Voyages)

- Both confirmed directly against the decompiled source
  (`saisie_de_bons_carburants.cs`, `saisie_voyage.cs`), not just the
  schema export — exact column lists match the real `insert into`
  statements found in each screen.
- **`BonDeCarburant` is a fuel voucher/authorization**, not a duplicate of
  the existing `EnginSortieCarburant`: it has a driver and a `nom` label
  but no odometer reading, while `EnginSortieCarburant` (built in Phase 6)
  has an odometer reading but no driver column. These are genuinely
  different real-world events — an authorization slip vs. an actual
  dispensing transaction — and both now exist correctly as separate
  models. Built `/fleet/bons-carburant`.
- **`Voyage`** is a straightforward trip log (route + driver + vehicle +
  distance + times). Built `/fleet/voyages`.
- **`EnginParcLiaisonCarburant` deliberately left schema-only.** Checked
  the raw SQL directly (not just the parsed summary) to make sure the
  parser hadn't dropped columns — it hadn't. The real table genuinely has
  only `id_carburant` and `deleted`, no `id_engin`/`id_parc` despite the
  name. With no vehicle/fleet link at all, it's most likely a simple
  active/inactive toggle for which fuel types apply fleet-wide, largely
  redundant with `TypeCarburant.deleted`. Modeled minimally; no UI built
  around it since there's nothing meaningful to manage.

## 14. Update — Order & article modification history built

- **Two distinct audit mechanisms**, confirmed structurally different
  from the schema: `CommandeModificationBase`/`CommandeModifierArticle`
  is a full event log (who, when, and a line-level before/after snapshot)
  for purchase-order edits; `ModificationArticle` is a simpler, passive
  log of Article pricing/stock changes with **no user column at all** —
  date only. Modeled and treated as genuinely different in kind, not
  forced into the same shape.
- **This surfaced a real functional gap while building it**: the app had
  no way to edit an existing order line at all — only add new ones. Since
  the audit table exists specifically to log such edits, building the
  audit trail meant building the edit capability itself. Added
  `updateCommandeLigne` (admin-gated, matching the rest of this project's
  permission gating for order mutations) plus inline-editable quantity/
  price/discount fields on the order detail page, wired to write both the
  audit header and line snapshot in one transaction.
- Hooked `ModificationArticle` logging into the existing
  `updateArticleStock` action — every stock edit now leaves a trail,
  shown on the Article detail page.
- **Not yet done**: nothing currently prunes or paginates either history
  beyond a `take: 10` limit on both display queries — fine for a demo,
  would need real pagination for a long-lived production article/order.

## 15. Update — Subcontracting invoicing & raw-material tracking confirmed complete

On resuming the roadmap, both `DsFacture`/`DsFactureLivraison` UI and
`DsMp`/`DsNvArticle` were found already built — same situation as
Diagnostics in §9, most likely lost track of across the same context
compaction. This time, verification found **no bugs and nothing
orphaned**:

- All pages (`factures/page.tsx`, `factures/new/page.tsx`,
  `factures/[id]/page.tsx`, `matiere-premiere/page.tsx`) are correctly
  linked from the Sous-Traitance hub — unlike the Diagnostics situation,
  there was no orphaned-page problem here.
- The invoice detail page correctly computes a real total from
  `DsLivraisonArticle`'s `prixHt`/`remise` fields — verified this is
  legitimate and not a repeat of the fabricated-total mistake caught in
  the regular Procurement invoicing work, since `DsLivraisonArticle`
  (unlike `ReceptionArticle`) genuinely has pricing fields.
- `DsMp`/`DsNvArticle` pages consistently apply the same "no FK
  constraint, enter the reference number manually" honesty already
  established for `id_ds` and other unconstrained fields elsewhere in
  this schema.
- Full project-wide validation (structural schema check — 160 models,
  every `prisma.model.method()` call, every action import) passed clean.
- What was actually stale: this doc's own §3 and §10 entries (now fixed
  above) and the README, which had no mention of any of this — added.
- Added seed data for the full chain (`DsCommande` → `DsBonLivraison` →
  `DsFacture`/`DsFactureLivraison`, plus one `DsMp` and one `DsNvArticle`
  row) since none existed before.

## 16. Correction — §1's "no `ds` table" finding was wrong

While investigating Sous-Traitance quote edit/history (`modifier_devis_st.cs`
/`historique_devis_st.cs`), those screens' own SQL revealed
`inner join demande_sous_traitance on ds_devis.id_ds = demande_sous_traitance.id`
— a real parent table, just **not named `ds`**. §1's original conclusion
was based on searching only for a table literally named `ds`; it never
searched for a differently-named candidate before declaring the entity
fictional. That was a real mistake, not a defensible simplification.

**The good news**: the actual schema and code had *already been corrected*
— `model DemandeSousTraitance` (mapped to the confirmed real
`demande_sous_traitance` table: `id`, `date_creation`, `heure_creation`,
`createur`, `statut`) exists, `DsDevis.idDs`/`DsCommande.idDs` are real
relations to it, and `createDemandeSousTraitance()` in the Sous-Traitance
actions file creates real rows. This appears to have been fixed in an
earlier pass whose work outlived the mistaken §1 entry — the code moved
on, but this doc and the README's "Ds parent entity question is
resolved" pointer (which pointed at the *wrong* resolution) never caught
up. Both are corrected now.

Also discovered in the same investigation: `magasin_sous_traitance` — a
real table tracking a physical item/tool sent to a subcontractor through
its lifecycle (current demande, current activity, current location,
current equipment, repair count). `ds_devis_article.id_t` /
`ds_commande_article.id_t` resolve to this table (via the `source`
disambiguator) for at least one of their polymorphic targets, alongside
`ds_nv_article` already built. **Not yet modeled or built** — a
reasonable next step, separate from this correction.

**Takeaway for future sessions**: when a "this entity doesn't exist"
conclusion rests on a name-based search, broaden the search (synonyms,
related screens' SQL) before treating the absence as confirmed, the same
diligence already applied to confirming presence.

## 17. Update — `MagasinSousTraitance` built; a real bug found and fixed

On resuming this roadmap in a later session, §16's "not yet modeled or
built" note for `MagasinSousTraitance` turned out to be stale — the
model, `createMagasinSousTraitance`/`updateMagasinSousTraitance` actions,
and a `/sous-traitance/magasin` page all already existed (built in a pass
this doc never got updated to reflect, the same class of staleness
already seen once before with Diagnostics in §9 — worth continuing to
verify actual repo state rather than trusting this doc's gaps at face
value).

**A genuine, live bug was found and fixed while auditing this**:
`createCommandeSt` called `nextDsGroupNumber()` — a function that no
longer existed anywhere in the file. It was the old workaround from
before §16's `Ds` correction, evidently left behind when `createDevis`
was updated to call the new `createDemandeSousTraitance()` but the same
fix wasn't applied to `createCommandeSt`. This would have crashed with a
`ReferenceError` on every attempt to create a subcontracting order not
sourced from an existing devis. Fixed to call
`createDemandeSousTraitance()` consistently, matching `createDevis`.

This was caught by a targeted scan (every `actions.ts` file, every
locally-called function checked against local definitions and imports)
run specifically because this kind of stale-reference bug had just been
found once already — worth running this check routinely rather than only
after finding one instance.

Full validation after the fix: structural schema check (162 models,
balanced, no duplicates, no broken relations), every `prisma.model.method()`
call project-wide, every action import, brace/paren balance on all 21
Sous-Traitance files, dependency reinstall, full test suite.

## 18. Update — Migration script audited, 1 more real schema gap found

The `migration/` directory (a SQL Server → Postgres data-migration
script, self-documented as untested against real data) was audited by
programmatically diffing every migrated table's SELECT column list
against the confirmed real schema, rather than re-reading and trusting
it. Found and fixed 3 issues, one of them a genuine schema gap that had
nothing to do with the migration script itself:

- **`FonctionIntervenant.code`** — a real `NOT NULL` source column,
  never modeled in `schema.prisma` at all until now. Added.
- `Fournisseur.commentaire` and the `photo` (binary) columns on
  `Utilisateur`/`Article` were correctly modeled already but silently
  omitted from the migration script's SELECTs — fixed there.

Also ran a real `tsc --noEmit` type-check against the project's actual
`tsconfig.json` (not a bare CLI invocation, which bypasses the config and
gives false positives — corrected that methodology mistake mid-check):
zero errors from `migration/`, confirming syntactic/type correctness
without needing a live SQL Server connection. The 408 errors elsewhere in
the project are 100% the pre-existing, already-documented Prisma-client-
generation limitation (every `prisma.model.property` access typed as
`{}` since the client was never generated in this sandbox) — unrelated
to this audit.

## 19. Update — Maintenance migration tier built; a real app bug found via `tsc`

- Built `migration/modules/03-maintenance.ts` (GammeOperatoire,
  DemandeIntervention, OrdreTravail), registered in `run.ts`. Discovered
  a second real gap while writing it: `createur` fields are genuine FKs
  to `Utilisateur.login` (confirmed by reading the actual `@relation`
  definition), not display strings — no prior migration tier had touched
  a `createur` field, so this hadn't been caught. Resolved via a single
  `id -> login` lookup built once per tier run; falls back to `null`
  (the field is optional) rather than inventing a placeholder user. Full
  detail in `migration/README.md`.

- **A more significant finding, unrelated to the migration script**:
  running `tsc --noEmit` against the whole project for what was — after
  checking — genuinely the first time this session, 17 real broken
  relative imports turned up across nearly every module's `.../new/page.tsx`
  file (e.g. `inventory/articles/new/page.tsx` importing `"../actions"`
  when its actual depth requires `"../../actions"`). These are genuine
  build-breaking errors, not the pre-existing Prisma-stub-type noise —
  confirmed by filtering `tsc`'s output and finding they disappeared
  entirely after fixing the paths, while the ~391 unrelated Prisma-stub
  errors remained unchanged.

  **This is a real blind spot in this project's own validation
  methodology**, used throughout the entire session: the regex-based
  "action import" checker (run after nearly every module built) verified
  that an imported name existed *somewhere* in an `actions.ts` file
  within the module's directory tree, but never verified the **relative
  path depth actually resolves** to that specific file — a check only a
  real module resolver (i.e. the actual TypeScript compiler) performs.
  Every one of those 17 files would have failed to build in a real
  Next.js environment despite passing this project's own validation
  every single time it ran.

  Fixed all 17 (mechanical, verified each one's correct target depth
  before batch-fixing, not just pattern-matched). Re-ran `tsc
  --noEmit`: zero `Cannot find module` errors remaining anywhere in the
  project. Re-ran the full test suite: still 28/28.

  **Takeaway for future sessions**: the regex-based project validators
  used throughout this project (model-reference checks, action-import
  checks) are a reasonable fast substitute for a real compiler when one
  isn't available, but they are not a substitute for actually running
  `tsc --noEmit` when it *is* available — as it always has been in this
  sandbox, and simply was not run against the whole project until this
  point. Worth running it routinely from here on, not just when
  something prompts a full audit.

## 20. Update — Supplier reference-data / profile built (Phase 22)

- Confirmed via the real schema export: 6 tables linking `Fournisseur`
  to fixed reference-data categories — business activity, an internal
  account with a periodic spend estimate (same recurrence shape as
  `Budget`/`PrevSystematique`), currency, delivery terms, payment terms,
  and file attachments. This is exactly what the Procurement spec had
  already flagged as a related unbuilt gap ("the separate multi-contact
  list... remains unbuilt") — a parallel but distinct capability, now
  closed for these 5 categories.
- Built `/procurement/settings/fournisseur-reference` (manage the 5
  fixed-category lists) and a new "Profil" tab on the supplier detail
  page (`/procurement/suppliers/[id]/profil`) for associating/removing
  each category plus file attachments — same association-list UI pattern
  already used for Article characteristics (Phase 12).
- **Caught a real path bug before it shipped**: wrote the new actions
  using `/procurement/fournisseurs/${id}` throughout, following the
  model name (`Fournisseur`) rather than checking the actual route —
  which is `/procurement/suppliers/${id}`. Found by checking the real
  directory structure before wiring up the UI, not after a broken link
  surfaced. Fixed all 16 occurrences.
- Data migration: `migration/modules/19-fournisseur-reference.ts`
  (tier 19), all 11 tables. Ran the field-name auditor (174 calls
  checked across all 19 tiers, 0 problems) — see `migration/README.md`
  for the full migration-side account.

## 21. Update — Article reference-data / profile built (Phase 23)

- Parallel in shape to the Fournisseur reference-data work (§15): 3
  tables link `Article` to a fixed-category `parametre_*` lookup
  (classification/emplacement/stockage), and 2 link `Article` directly
  to another real entity — `Equipement` (which equipment this part
  fits/is used on) and `Fournisseur` (a standing "usual suppliers" list,
  confirmed as complementary to, not a duplicate of, the DOP/Devis
  price-survey workflow, which is about specific price quotes rather
  than a general supplier association).
- Found a genuine outlier while confirming these: `parametre_image` has
  no `id_article` or any FK at all — a single-row global config table
  holding 3 fixed site photos (parc/atelier/usine). Modeled in schema
  for completeness, but deliberately **not** given a migration function
  or UI — no confirmed usage context (which screen displays these?) was
  found anywhere in the decompiled source, unlike everything else built
  in this pass. Flagged rather than guessed at.
- Built `/inventory/settings/article-reference` (the 3 lists) and a new
  associations section on the Article detail page (5 link types,
  reusing the same `LinkSection` UI pattern as the Fournisseur Profil
  tab) — no separate route needed since Article's detail page already
  had room for it, unlike Fournisseur which needed a dedicated new tab.
- Data migration: `migration/modules/20-article-reference.ts` (tier 20),
  8 of the 9 tables (all but `parametre_image`, per above). Ran the
  field-name auditor (182 calls checked across all 20 tiers, 0
  problems).

## 22. Update — Notification system built (Phase 24)

- Confirmed via the real schema export: `Notification` (the event, with
  a polymorphic `idN`+`type` reference to whatever triggered it — no
  real FK, matching the zero-FK-constraint pattern everywhere else;
  exact `type` values and which table each maps to aren't confirmed) and
  `NotificationAlerte` (a follow-up/escalation alert tied back to a
  specific Notification via `idNot`).
- `idUtilisateur` on both is modeled as a **real FK to `Utilisateur.id`**,
  not the login-string pattern used for `createur`-style audit fields
  elsewhere in this schema — a deliberate distinction: this represents
  genuine "who should see this" targeting, not an audit trail of who
  performed an action, so the different representation is correct, not
  an inconsistency.
- Built `/notifications` (list, mark-one-read, mark-all-read for the
  current session user) and a sidebar nav entry with a live unread-count
  badge (`Notification` + `NotificationAlerte` unread counts, summed).
  **Deliberately did not build automatic notification generation** — no
  trigger logic (e.g. "notify on overdue OT") was found anywhere in the
  decompiled source for this pass, and inventing one would mean guessing
  at business rules rather than confirming them; this covers the
  read/display/acknowledge side only, which is what's confirmed.
- Data migration: `migration/modules/21-notification.ts` (tier 21), both
  tables. Ran the field-name auditor (184 calls checked across all 21
  tiers, 0 problems).

## 23. Update — Activité scoping & operations checklist built (Phase 25)

- Confirmed via the real schema export: 3 tables extending the
  already-migrated `ActiviteSousTraitance` (Subcontracting) — which
  `Famille`/`SousFamille` of articles a subcontracting activity applies
  to, plus a repeatable text checklist of operations that activity
  involves.
- Extended the existing Activités settings page rather than building a
  new one from scratch: each row now links to a detail page
  (`/sous-traitance/settings/activites/[id]`) with the Famille/
  SousFamille associations (same `LinkSection`-style UI already used
  twice before, for Fournisseur and Article profiles) and an operations
  checklist.
- Data migration: `migration/modules/22-activite-scoping.ts` (tier 22),
  all 3 tables. Ran the field-name auditor (187 calls checked across all
  22 tiers, 0 problems).

## 24. Update — OT/Equipement odds-and-ends built (Phase 26)

- Confirmed via the real schema export: `ParametreCauseRealisation`/
  `OtCauseRealisation` (root-cause lookup for an OT's outcome),
  `ParametreCentreCharge` (cost-center lookup, with a budget field),
  `EquipementCompteurHistorique` (routine counter-reading history) vs.
  `EquipementCompteurNv` (reset/recalibration events specifically —
  confirmed as two distinct concepts, not a duplicate, from the source's
  own separate tables), and `CompteurLiaison` (which counter governs a
  given organe+intervention-type combination).
- **Filled a real gap**: `OtCentreCharge` (migrated tier 18, before
  `ParametreCentreCharge` existed) had a bare, unrelated
  `idCentreCharge` int. Fixed the schema to add the real relation now
  that the lookup table exists — same precedent as `EquipementCompteur`
  in tier 7. Confirmed tier 18's own migration function needed no
  changes, since it always wrote to the scalar FK column directly.
- Built `/work-orders/settings/cause-centre-charge` (the 2 lookup lists)
  and a small section on the Work Order detail page for
  selecting/displaying both per-OT.
- **Deliberately left `EquipementCompteurHistorique`/`EquipementCompteurNv`/
  `CompteurLiaison` without dedicated browsing UI** — these read as
  operational logs and a rule-mapping table respectively, not something
  a user would browse directly, and no dedicated screen for them was
  found in the decompiled source. Modeled and migrated for
  completeness; a UI can be added once a real need surfaces, same
  reasoning already applied to `ParametreImage`.
- Data migration: `migration/modules/23-ot-equipement-misc.ts`
  (tier 23), all 6 tables. Ran the field-name auditor (193 calls checked
  across all 23 tiers, 0 problems).

## 25. Update — Production remaining pieces built (Phase 26) — retroactive entry

This section covers tier 24 (`migration/modules/24-production-remaining.ts`),
built in the same pass as tier 23 but never given its own findings-doc
entry — filling that gap now rather than leaving tier 24 undocumented.
3 tables: `ProdMesure`, `ProdRapportChefEquipe`, `ProdRapportHeure`.
Deliberately no app UI built for any of them, same reasoning as
`ParametreImage` (tier 20/§20-equivalent) — config/reference-style
tables with no confirmed UI destination in the decompiled source for
this pass. Migrated so the data isn't lost; UI can follow once a real
need surfaces.

## 26. Update — `LivraisonArticle` correction, plus 6 more small tables

- **A real correction, not a new discovery.** An earlier pass (Phase 16)
  modeled `BonLivraison` as having no line items of its own, assuming it
  just displayed its linked `Reception`'s items instead. That assumption
  was wrong — confirmed directly against `creer_bl.cs`'s actual insert
  statement, which writes a genuine `livraison_article` row with its own
  qty/price/discount, independent of `reception_article`. Fixed the
  schema (added `LivraisonArticle` with a real relation to
  `BonLivraison`), and since real pricing data exists here, rewrote both
  the `BonLivraison` detail page (now has real add/list line-item UI
  with a computed total) and the `Facture` detail page (now shows a real
  computed total instead of the "not tracked digitally" disclaimer that
  page carried before this — that disclaimer was correct *at the time*,
  given what was known then, but is now outdated by this correction).
- Also modeled and migrated 6 more small tables found in the same
  re-run of the coverage diff: `AtelierReception` (workshop-job receipt
  log), `GammeCentreCharge` (cost-center scoping for a Gamme, same bare-
  int pattern as `OtCentreCharge` before §24's fix gave it a real
  lookup), `OperationMaintenance` (maintenance-operation checklist per
  intervention type, parallel to `ActiviteOperation`), `OutilUtilisation`
  (usage-purpose log for a tool), `PlanMaintenance` (standalone plan
  template list, no confirmed incoming FK from anywhere), and
  `ReclamationAnomalie` (driver-reported vehicle complaints — built a
  full page for this one, `/fleet/reclamations`, since it's genuinely
  user-facing).
- **`test_equip` deliberately excluded entirely** — not modeled, not
  migrated. Its shape breaks every convention the other 214 real tables
  in this schema follow: a `varchar` primary key instead of an int
  identity column, and generic English-ish field names
  (`created`/`modified`/`parentid`) instead of this app's consistent
  French naming. Reads as a leftover scratch/test artifact in the source
  database itself, not a real application feature — excluded on that
  basis rather than modeled on a guess.
- **A real documentation bug found and fixed while writing this
  section**: this doc had duplicate section numbers (§15-18 used twice,
  for genuinely different content each time), and tier 24 had no entry
  at all. Renumbered the second set to §20-23 and added §25 above to
  close the gap — worth remembering this doc can accumulate its own
  small errors across many sessions, same as the code it documents.
- Data migration: `migration/modules/25-remaining-small-tables.ts`
  (tier 25), all 7 tables (`LivraisonArticle` + the 6 above). Ran the
  field-name auditor (203 calls checked across all 25 tiers, 0
  problems). Re-ran the full table-coverage diff after this tier —
  checked the actual number rather than estimating it, given this
  section's own point about accuracy: **213 of 215 real tables now
  covered.** The only 2 remaining are both deliberate, already explained
  above: `parametre_image` (deferred, no confirmed UI destination) and
  `test_equip` (excluded, not a real feature). This migration's table
  coverage is effectively complete.

## 27. Update — UI depth for tables that only had schema + migration

With table coverage effectively complete, went back through tiers 23-25
and built real UI for the tables that had only gotten a migration
function so far — checking each one first rather than assuming it
needed work, since two of them turned out to already be fully built.

- **`GammeCentreCharge` corrected before it shipped a known gap.** While
  wiring up its UI, noticed it had been modeled with a bare
  `idCentreCharge` int — the exact same gap `OtCentreCharge` had *before*
  §24's fix gave it a real `ParametreCentreCharge` relation. Rather than
  repeat a mistake I already knew the fix for, corrected the schema and
  migration to use the real relation from the start. Added a "Centre de
  charge" section to the Gamme detail page.
- **`OperationMaintenance`**: `ParametreIntervention` had no settings
  page in the app at all before this (only used as a dropdown source).
  Built one (`/work-orders/settings/interventions`, list + detail) with
  an operations checklist per intervention type, same pattern as
  `ActiviteOperation` (§23).
- **`PlanMaintenance`**: a standalone reference list with no confirmed
  incoming FK from anywhere — built a simple settings page
  (`/work-orders/settings/plans-maintenance`).
- **`AtelierReception`**: confirmed via an empty grep that this genuinely
  had no UI anywhere before building a "Réceptions" section on the
  Workshop job detail page.
- **`OutilUtilisation` and `AtelierReception`'s sibling check both mattered
  in the other direction too**: before writing anything for
  `OutilUtilisation`, checked the app first and found it was already
  fully built — actions and rendering both present — from earlier work.
  Nothing added; confirming this took one grep, writing a duplicate would
  have taken much longer.
- Full validation after all of the above: project-wide model/action-
  import check (clean), schema structural check (207 models, no broken
  relations, no missing back-relations), field-name auditor (203 calls,
  0 problems — the schema/migration correction to `GammeCentreCharge`
  didn't change its call count, only its shape), reinstall, `tsc
  --noEmit` (0 errors), full test suite (28/28). Seed data added for all
  4 new-UI features and re-validated.

## 28. Update — Systematic sweep for the `qtRestant`-class bug, verified with a positive control

With table coverage and UI depth both effectively complete, went back
and swept for the specific bug class already caught twice by manual
review alone (a `NOT NULL` target field fed by a nullable-source helper
with no fallback) across all 25 migration tiers at once, rather than
relying on catching each instance individually while writing that
tier's code.

Built `migration/audit-nullability.py` for this. **Before trusting its
"no candidates found" result on the real codebase, verified the script
actually works**: injected a deliberately-reintroduced copy of the
tier-4 `qtRestant` bug as a scratch module and confirmed the script
caught it, then removed the scratch file. Only after that positive
control passed was the clean result on the real 25 tiers treated as
meaningful evidence rather than a possibly-broken check silently doing
nothing — a negative result only means something once you've seen the
same tool produce a positive one.

**Result: no further instances of this bug class found** across all 25
tiers. A second, broader check (fields entirely missing from a `create`
block) was also tried and discarded — it couldn't distinguish relation-
object fields (which Prisma resolves from their scalar FK automatically
and should never be set directly) from genuine required scalars, so it
produced ~500 false positives with no real signal. Worth recording that
this was tried and rejected, not just the check that worked — a script
producing output isn't the same as a script measuring something real.

See `migration/README.md`'s "Three Python scripts stand in for what
`tsc` can't verify here" section for the full account, including how
this fits alongside the existing `audit-field-names.py`.

## 29. Update — a third auditor, and the auditor itself failed its own test first

Built `migration/audit-sequence-resets.py`: checks that every function
preserving explicit legacy ids (`id: r.id`) also calls `resetSequence()`
for that table — skipping it leaves Postgres unaware of the migrated
ids, risking a collision the first time the app inserts a new row after
migration.

**Genuinely worth recording in detail, not just the eventual pass**:
this script failed its own positive control on the first attempt. The
control was a scratch module deliberately missing the real
`resetSequence()` call, with a comment noting so. The script reported no
problem — its naive substring check matched the *comment text itself*,
not an actual function call. This wasn't caught by assuming the control
must be wrong; it was caught by debugging why a deliberately-broken
control passed. Fixed by stripping comments before matching and
requiring a real call pattern, then re-verified against the same
control (now correctly caught) and a comment-free version of it (also
caught, ruling out the fix being comment-specific rather than actually
correct). Only then was the clean result on the real 25 tiers (200
functions checked, all correct) trusted.

This is the same discipline as §28's positive-control verification,
applied one level deeper — verifying not just that a check exists and
runs clean, but that a *known-broken* input actually breaks it, and
continuing to dig when the first version of that verification itself
doesn't behave as expected rather than accepting a convenient result.

## 30. Update — Page reachability sweep for the main app, and a real methodology lesson repeated twice in one script

The Diagnostics page (`/work-orders/[id]/diagnostic`, found orphaned in
§9) was a real bug caught by hand: it existed, worked, and was fully
wired to real actions, but nothing in the app ever linked to it. Built
`scripts/audit-page-reachability.py` to make that class of bug something
a check catches, not something someone happens to notice.

**The first version of this check was badly wrong in a way that would
have been embarrassing to publish**: a naive `href="..."` regex found 67
of 146 pages "unreachable." Before treating that number as real, checked
whether it was plausible — it wasn't; this app uses a `PageHeader
action={{ href: ..., label: ... }}` prop for every "+ New" button, an
object-literal `href:` that a JSX-only pattern can't see at all. Widened
the pattern; the count dropped to 16.

**Those 16 needed a second round of the same scrutiny, not just
acceptance at a smaller number.** All 16 turned out to be sub-tab pages
under 4 shared components (`SupplierTabs`/`JobTabs`/`EquipementTabs`/
`ReportTabs`), which build their links as `const href = s.key ?
\`${base}/${id}/${s.key}\` : ...;` — a variable, not an inline literal,
and a multi-line ternary at that. Two further rounds of widening the
extraction (tracing `const href = ...` assignments; then tracing
*inside* multi-line ternary bodies rather than assuming a single
template right after `=`) still left all 16 flagged, which turned out to
be a genuine, permanent limit rather than a further regex gap: these 4
components build their hrefs from a runtime `SECTIONS` array, so no
single string in the source ever spells out the full path — it only
exists as the combination of a template pattern and a separate data
array no regex can join. Rather than keep chasing one specific coding
pattern with more regex, manually verified all 16 by reading each
component's `SECTIONS` list directly (confirming every flagged route has
a matching `key:` entry) and recorded them as an explicit, documented
allowlist with the reasoning written down — not a silent special-case.

**Verified the finished script the same way as §28/§29**: created a
genuinely orphaned scratch page with no links anywhere, confirmed the
script caught it, then removed the scratch page. Only then was the
clean result on the real app (146 pages, all reachable) trusted.

**Result: no orphaned pages found** in the current app — the Diagnostics
bug was a one-off that's since been fixed, not a symptom of a wider
pattern. The value here is durable, not a one-time finding: this check
now exists to catch the *next* page that gets built without being wired
up, which is a mistake that's easy to make once and had already
happened once in this project.

## 31. Update — Dangling-link sweep, and a flawed positive control caught before it mattered

Built `scripts/audit-dangling-links.py` — the reverse of §30's check.
That one confirms every real page has an inbound link; this one
confirms every link found in the app actually points to a real page,
catching stale references a rename or removed route could leave behind.
Reuses the same href-extraction logic as §30's script rather than
reimplementing it, then checks each one against the real route list
with `[id]`-segment and `${...}`-segment treated as mutual wildcards.

**The first positive-control attempt was itself broken, and it mattered
that this was caught rather than assumed away.** The plan was to corrupt
a real link in `inventory/page.tsx`, confirm the script flagged it, then
restore the file. The `sed` edit ran without error and the script
reported no dangling links — which looked like a pass, but wasn't: a
quick `grep` for the "corrupted" text turned up nothing, meaning the
target string never existed in that file to begin with (that page
builds its links from a data array, not an inline literal). The edit
silently did nothing; the clean result proved nothing about the script,
only that a no-op leaves the file unchanged. This is the same category
of mistake as §29's comment-poisoned control, on the opposite side —
there it was a control that looked broken but wasn't; here it was a
control that looked like it ran but didn't actually inject anything.
Both were caught the same way: not accepting a result, convenient or
not, without checking that the setup behind it actually did what it was
supposed to.

Redid the control properly on a file confirmed to contain a genuine
literal `href:` string, verified with `grep` that the edit actually took
effect, ran the check (correctly flagged the broken link), restored the
file, and verified byte-for-byte with `diff` that the restore was
complete before treating the file as clean again.

**Result: no dangling links found** in the current app. Combined with
§30, both directions of link integrity — pages with no way in, and links
with nowhere to go — are now checked, not just assumed.

## 32. Update — revalidatePath target sweep, verified without repeating §31's mistake

Built `scripts/audit-revalidate-paths.py`. Different risk from §31's
navigation links: a typo'd or stale `revalidatePath("...")` doesn't
error — Next.js happily "revalidates" a route that doesn't exist,
silently doing nothing — so the failure mode is a page that quietly
shows stale data after a mutation, with nothing pointing at the cause.
270 calls found across the app.

**Applied §31's lesson directly this time rather than repeating it**:
before running the positive control, explicitly confirmed the injected
broken `revalidatePath` call actually appeared in the file — printed the
modified line back out and read it — before running the check against
it. Only then was the check's result (correctly flagging the injected
bug) treated as meaningful. Restored the file and verified byte-for-byte
with `diff` that nothing was left behind, same as §31.

**Result: all 270 calls target real routes.** Three directions of this
kind of integrity are now checked across the app: pages with no way in
(§30), links with nowhere to go (§31), and cache invalidations that
point nowhere (this section) — each verified with its own confirmed-
working positive control, not assumed clean because the code "looks
right."

## 33. Update — missing-revalidation sweep, and a second control-setup mistake caught before it mattered

Built `scripts/audit-missing-revalidation.py` — a more severe cousin of
§32: that checked a `revalidatePath()` target was real, this checks a
mutation calls `revalidatePath()`/`redirect()` **at all**. A mutation
with neither doesn't error; the write succeeds but nothing tells
Next.js's cache to invalidate, so the UI can keep showing stale data
indefinitely after a successful save — arguably worse than a
mistargeted call, since there's no invalidation happening whatsoever.
256 mutation functions found across every `actions.ts` file.

**The positive control setup failed again, differently, and was caught
the same way as before**: applying §32's exact lesson, tried to remove
a real `revalidatePath()` call from `updateArticleStock` and confirm the
removal *before* running the check. The first `sed` command used a
guessed line number — off by one from the real file — so the line was
untouched. This was caught immediately because the plan was followed
literally: grep for the target line *before* running the check, and its
still-succeeding match meant the edit hadn't happened. Found the actual
line number with a fresh `grep`, deleted the correct line, reconfirmed
with `grep`'s exit code (1, meaning no match — genuinely gone this
time), then ran the check and got the expected flag. Restored the file
and verified byte-for-byte with `diff`.

**This makes three verification-script sessions in a row where the
first control attempt had a setup mistake** (§31: edited a file that
never contained the target string at all; §32 avoided it by checking
first; this section: checked first as instructed, and the check
correctly revealed the first edit attempt hadn't worked, which is
exactly what checking-first is *for*). Worth stating plainly: this
isn't a pattern of the underlying checks being unreliable — every one
of them, once verified, has held up. It's that manually orchestrating
"corrupt a real file, check, restore" by hand is itself fiddly and
error-prone, and doing it carefully — confirming each step actually
happened rather than assuming a command that exited 0 did what it was
supposed to — is exactly what caught every one of these before it
produced a false conclusion.

**Result: all 256 mutation functions call `revalidatePath()` or
`redirect()`.** Four directions of link/cache/revalidation integrity are
now systematically checked across the app (§30-33), plus the migration
layer's three (field names, nullability, sequence resets) — seven
scripts total, every one control-verified.

## 34. Update — the README's own "Not yet built" list was stale, and two real admin-gating gaps found while checking it

Rather than build another heuristic auditor, applied the same
don't-trust-a-summary discipline to `README.md`'s "Not yet built"
section, which by this point had been accumulating corrections across
many sessions.

- **One claim was flat wrong**: "whether `Utilisation` actually links to
  anything is unconfirmed" — but `OutilUtilisation` (built in Phase 26,
  tier 25 of the migration, several sessions after that README line was
  last touched) confirms it does, with full UI on the tool detail page.
  Corrected in place.
- **Two claims were re-verified and confirmed still accurate**: no
  creation screen exists for `OtBl`/`OtProjet` (checked — genuinely no
  app-side UI, migration-only), and the Fleet vehicle↔work-order
  cross-link remains unbuilt (checked — no trace of it anywhere).
  Recorded as verified, not just left alone on the assumption they were
  still true.
- **A third claim ("UI-side button hiding is incomplete for the
  settings-page delete actions") led to a real, concrete finding**:
  systematically checked every settings page with a delete button for
  the established `isAdmin &&` UI-hiding pattern. 19 pages had it
  correctly; 5 didn't — and all 5 were pages built in recent sessions
  (tiers 18/22 of the migration work), meaning recent work had been
  *adding* to this known gap rather than closing it.
- **Digging into those 5 surfaced something more serious than missing
  UI**: 2 of them (`deleteCentreCharge`, `deleteCauseRealisation`) had no
  `requireAdmin()` call in the backend action at all — a genuine
  authorization gap, not just a cosmetic one, since anyone could have
  triggered these deletes directly regardless of what the UI showed.
  Fixed both.
- **The other 3 flagged pages needed no backend fix** — checked the
  precedent first: association-unlink actions across this entire app
  (`unlinkArticleClassification`, `unlinkFournisseurActivite`, and
  others) are consistently *not* admin-gated anywhere, which turned out
  to be the deliberate, established convention (removing a link you just
  made vs. deleting shared reference data are treated differently by
  design). `unlinkActiviteFamille`/`unlinkActiviteSousFamille`/
  `removeActiviteOperation`/`removeOperationMaintenance` correctly follow
  that convention already — flagged by the same automated scan, but
  confirmed *not* bugs before touching anything, rather than "fixed" to
  match a rule that doesn't actually hold everywhere.
- Added the missing `isAdmin` UI-hiding to the 2 genuinely-fixed pages'
  delete buttons (`cause-centre-charge`) plus the 2 pages whose backend
  already correctly required admin but whose UI didn't reflect it
  (`interventions`, `plans-maintenance`) — 3 pages total, matching the
  exact pattern already used by the other 19.

Full validation after all of the above: project-wide model/action-import
check (clean), all 7 verification scripts re-run (all clean, confirming
the fixes didn't disturb anything they check), reinstall, `tsc --noEmit`
(0 errors), full test suite (28/28).

## 35. Update — orphaned-action sweep found and fixed a real, pre-existing gap

Built `scripts/audit-orphaned-actions.py` — the mirror of §30's page-
reachability check, but for the action layer: every exported server
action should be imported somewhere, or it's dead code (or a feature
whose UI was never finished).

**First real run against the app found a genuine hit**: `markDopFiniDone`
(Procurement) — complete with its own `revalidatePath` call, clearly
written with intent — was never imported anywhere. Before treating this
as new, checked the doc's own earlier notes: `DopFini.fini`'s toggle UI
had already been flagged as "not yet done" from very early in the
project (the original DOP/Devis phase work). This wasn't a fresh
discovery, it was the same gap independently rediscovered by a
completely different method — static analysis this time, a manual note
originally — which is worth treating as corroborating evidence for both,
not just a re-statement of something already known.

**Fixed it rather than re-confirming it.** Added a "Marquer terminé"
toggle to each supplier-quote cell on the DOP detail page, wired to the
already-written `markDopFiniDone` action, disabled once already marked
done. Re-ran the orphan sweep: clean.

**Verified the checker itself before trusting its first result**, same
discipline as §31-33: renamed a genuinely-used import
(`recordDopFini`) to simulate it going orphaned, confirmed via `grep`
that the rename actually took effect before running the check (not
after — the exact fix §33 introduced), confirmed the check caught it
alongside the real `markDopFiniDone` gap, restored the file, and
verified byte-for-byte with `diff` that nothing was left behind.

Full validation after the fix: project-wide model/action-import check
(clean), all 8 verification scripts now passing (the 7 from §28-33 plus
this one), reinstall, `tsc --noEmit` (0 errors), full test suite (28/28).
No trace of any scratch/renamed test identifier left in the source tree,
confirmed by grep before packaging.

## 36. Update — a ninth auditor, a real gap it found on its first run, and a duplicate-section-number repeat

Built `scripts/audit-admin-gating.py`: this app's established, verified
pattern is that creating a `Parametre*` settings entry is never
admin-gated, but deleting/deactivating one always is. Checked every
`delete*`/`deactivate*` function targeting a `Parametre*` model for a
`requireAdmin()` call.

**Found a real gap on the very first real run, not just a scratch
control**: 8 settings lists built across two earlier passes (Fournisseur
reference data, Phase 22; Article reference data, Phase 23) had create
actions and a settings page already filtering `where: { deleted: false
}` — but no delete action had ever been written for any of them. The
filter implied deletability was always the intent; there was simply no
way to act on it. Fixed by adding all 8 delete actions (admin-gated,
per the pattern the checker itself is built around) and wiring up
delete buttons on both settings pages.

**Caught my own inconsistency before finishing, by reading §34 rather
than assuming my fix was complete once the backend was gated.** §34
(written earlier this session) had already established that admin-only
delete buttons must also be hidden behind `isAdmin &&` in the UI, not
just gated on the backend — and had fixed exactly this gap on other
pages. My first draft of the 8 new delete buttons was backend-correct
but UI-inconsistent with that already-established convention. Added
`getSession()`/`isAdmin` to both settings pages and threaded `isAdmin`
through each page's shared `List` component before considering the fix
done.

**This doc's section numbering collided again** — the exact same
mistake as an earlier session (see the tier-25 migration note): two
sections were both independently numbered §34 by two different passes
that didn't check the doc's current end state first. Renumbered the
second one to §35 before adding this section as §36. Worth restating
plainly since it's now happened more than once: append-only documentation
across many long sessions needs its own end-of-file check before adding
new numbered sections, the same discipline already applied to code.

Full validation after all of the above: project-wide model/action-import
check (clean), all 9 verification scripts passing (the 8 already
established plus this one), reinstall, `tsc --noEmit` (0 errors), full
test suite (28/28).

## 37. Update — migration finished for real use, plus a stale comment caught while writing run-instructions

Explicit request: finish the migration so testing against real data can
start. Added tier 26 (`ParametreImage` — see `migration/README.md`'s
own tier-26 entry for the full account) and wrote a concrete step-by-
step "Running this for real" section in the migration README, since
everything up to this point had been about correctness, not about
actually walking someone through executing it.

**Writing that walkthrough surfaced a real, if minor, documentation bug
while cross-checking each claim against the actual code rather than
against memory**: a comment in tier 10
(`migrateSignature`) claimed the Utilisateur password-reset mechanism
(tier 1) writes a `migration-temporary-passwords.json` file "exactly"
like the signature-PIN mechanism does. It doesn't — tier 1 sets a single
fixed unusable placeholder hash for every migrated user with no file
involved at all; only the signature-PIN migration generates and reports
individual values to a file. Caught by trying to write an accurate
instruction referencing that file and finding, on grepping for the
actual `writeFileSync` call, that it didn't exist where the comment said
it would. Fixed the stale comment in the code and made sure the
README's run-instructions describe both mechanisms correctly and
separately rather than conflating them.

**Final state: 214 of 215 real tables migrated (26 tiers), only
`test_equip` deliberately excluded.** All 9 verification scripts clean,
`tsc --noEmit` 0 errors, full test suite 28/28.

## 38. Update — a real bug found by an actual user, and a genuine gap in this project's own verification

The user running this migration for the first time hit `npx prisma
generate` failing outright: `OrdreTravail.diagnostics` referenced a
model called `OtDiagnostic[]` — which didn't exist. An earlier pass had
modeled a single, guessed `OtDiagnostic` table, then correctly replaced
it with the real 5-table diagnostic system (`OtDiagnosticSymptome`/
`OtDiagnosticDef`/`OtDiagnosticDetection`/`OtDiagnosticOperation`/
`OtDiagnosticM` — see §9) once the real schema was confirmed. But the
back-relation field on `OrdreTravail` was never updated to match — it
kept pointing at the now-deleted model. Fixed by replacing that one
stray field with 5 correct back-relation fields, one per real model,
matching exactly what each of the 5 models' own `ordreTravail` relation
already expected.

**This is genuinely the first bug in this entire project found by
someone other than the verification process itself** — every other
finding across 37 prior sections came from static analysis, careful
reading of decompiled source, or systematic auditor scripts, all run in
a sandbox that never had real network access to actually run `npx
prisma generate`. That gap was known and stated plainly throughout
`migration/README.md`'s "before you run this" warnings — but it meant
this specific class of error (a schema field referencing a model that
doesn't exist) had a real, unclosed blind spot: none of the 9 existing
verification scripts checked the schema's own internal consistency
against itself. They all checked *app code* or *migration code* against
the schema — never the schema against itself.

**Built `scripts/audit-schema-consistency.py` to close that gap** — the
exact class of check `prisma generate` performs, done as pure text
analysis so it doesn't need a live Prisma Client or network access at
all, meaning it could have caught this specific bug in the sandbox the
entire time. Verified against a positive control (a scratch broken
field injected into a real model, confirmed caught, file restored and
verified byte-identical) before trusting the clean result on the real
schema — same discipline as every other auditor in this project.

**Scanned for other instances of the same bug class while fixing this
one, not just the reported case**: checked every field type across
every one of the 207 models against the real model list. Found zero
other instances — this was a genuinely isolated leftover from one
specific refactor, not a symptom of a wider pattern.

This is worth stating plainly rather than glossing over: a category of
verification was missing for the entire duration of this project, and
it took a real user's first real run to surface it. The other 9
scripts, however thorough, were never a complete substitute for
actually running the tool the schema is written for. Now that this
script exists, run all 10 together after any schema change, not just
the app/migration-facing ones.

## 39. Update — the §38 fix was itself wrong, caught by the same user's very next run

Applying §38's fix — replacing the one broken `OtDiagnostic[]` field
with 5 correct back-relations — was done by grepping for
`OtDiagnostic\b` across the whole file and finding only the one broken
line. That grep was silently wrong: the word-boundary `\b` right after
"OtDiagnostic" does not match before a following letter, so it could
never have matched `OtDiagnosticM`, `OtDiagnosticDef`, or any of the
other 4 real model names — all of which start with "OtDiagnostic" but
continue with more letters. The search that was supposed to rule out
"do these fields already exist elsewhere" never actually looked in the
right place, and the fix added 5 new fields that already existed,
correctly, further down in the same model — under singular names
(`diagnosticSymptome`) where the new ones were plural
(`diagnosticSymptomes`). `npx prisma generate` caught this immediately
on the user's very next attempt, the same run the fix was meant to
unblock.

**Fixed properly this time**: read `OrdreTravail`'s entire body directly
rather than trusting any grep pattern's coverage, found the pre-existing
correct set, confirmed nothing in the app or migration code referenced
the newly-invented (and wrong) plural field names, and deleted exactly
the 5 duplicate lines just added — restoring the model to what it
should have been: one correct set of 5 relations, not two.

**Extended `audit-schema-consistency.py` to catch this exact class going
forward**, rather than treating it as a one-off: it now also checks for
duplicate field names within any model, the specific error `prisma
generate` reported. Verified with the same discipline as every other
auditor in this project — reintroduced the actual duplicate that had
just shipped, confirmed the script caught it, restored the file, and
confirmed byte-for-byte with `diff` that the restore was complete,
before trusting the clean result on the real, corrected schema.

**Worth being fully direct about this rather than minimizing it**: two
mistakes shipped to a real user in a row, on the same file, within the
same fix. The first (§38) was a genuine, unavoidable-until-tested gap in
this project's verification — no sandbox check could have caught a
missing back-relation without running `prisma generate` itself. The
second (this section) was not that — it was a search assumed to be
correct without being verified, in a project that has otherwise
insisted on verifying every check against a positive control before
trusting it. That standard should have applied to a quick grep during a
live fix just as much as to a purpose-built script. It didn't, and a
real user caught it. Full validation after this fix: all 10
verification scripts clean, `tsc --noEmit` 0 errors, full test suite
28/28.
