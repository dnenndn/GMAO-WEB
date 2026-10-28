# GMAO Web — Full Rebuild (All Modules + Authentication)

Web re-implementation of the legacy WinForms GMAO app. Covers every module
identified in the original codebase: Maintenance, Production, Inventory,
Procurement, Workshop, Fleet, Budget, and Subcontracting, plus real
authentication.

See `docs/01-*.md` through `docs/08-*.md` for the functional spec each
module was built from — each documents the reverse-engineering decisions,
assumptions, and open questions for that module specifically.

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS
- Signed httpOnly session cookies (Node `crypto`, no auth library dependency)

## Getting started

```bash
npm install

# Set up your database
cp .env.example .env
# edit .env with your PostgreSQL connection string, and set a real
# SESSION_SECRET (see Authentication section below)

npx prisma migrate dev --name init
npm run prisma:seed   # creates demo admin user + sample data across all modules

npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`.
Demo credentials: **admin / demo1234**.

## Database migrations

This repo ships with `prisma/schema.prisma` but **no committed
`prisma/migrations/` directory yet** — the sandbox this project was built
in couldn't reach Prisma's engine-binary CDN (`binaries.prisma.sh`), so
`prisma generate`/`migrate dev` could never actually be run here, despite
having a real local Postgres available to test against. The schema itself
was validated by other means (structural checks: balanced braces, no
duplicate models, every `@relation` pointing at a real field with a
matching back-relation, every `prisma.model.method()` call in the app
checked against the schema — see the commit history / spec docs for
detail) — but **it has never been run through the real Prisma
engine**, so treat the first migration as the actual moment of truth.

**Update**: a real schema export from the actual legacy SQL Server
database (`GMAO_NGES`) was later obtained and cross-checked against this
Prisma schema — see `docs/12-schema-validation-findings.md`. Several real
bugs were found and fixed this way (a fictional `Ds` table, a wrong column
type on `Bsm.liOt` that had broken the Analytics cost report, missing
fields on `Article`/`Fournisseur`/`PrevConditionnelle`), and **116 real
tables were found that this project never modeled at all** — that doc
has the full prioritized list, including a whole missing Procurement
quote/bidding step (`devis`/`devis_article`) that isn't a minor gap.

Run this once, in a normal environment with network access:

```bash
npx prisma migrate dev --name init
```

Commit the resulting `prisma/migrations/` folder. After that, the CI
workflow's schema check can be switched to the stricter
`prisma migrate deploy` (a note for exactly where is inline in that file).

## Migrating your real legacy data

If you have access to the actual `GMAO_NGES` SQL Server database, a
migration script exists to bring your real data into this schema — see
**`migration/README.md`** for the full process, required verification
steps, and current coverage (a first slice: core reference data + master
data; the transactional modules aren't built yet). Read the "before you
run this" section there before doing anything — like the rest of this
schema, the migration scripts have never been run against real data.

## Testing

```bash
npm test        # runs the unit test suite once
npm run test:watch
```

Covers the pure business-logic helpers that don't need a database:
session token signing/verification and role-check logic
(`src/lib/session-token.test.ts` — round-trip, tampering detection,
expiry, malformed input, admin-role comparison) and the budget-period/
status-color calculations (`src/lib/constants.test.ts`). Deliberately
does **not** attempt to mock Prisma for integration-style tests — with a
real `prisma/migrations/` in place (see above), a proper next step would
be integration tests against a real test database rather than a mocked
Prisma client.

**`scripts/audit-page-reachability.py`** (run with `python3
scripts/audit-page-reachability.py` from the project root) checks that
every page under `src/app/(dashboard)/` has at least one inbound link or
redirect somewhere in the app — the systematic version of a real bug
found once by hand (a fully-built, fully-functional Diagnostic page that
nothing ever linked to). Run it after adding any new page.

**`scripts/audit-dangling-links.py`** does the reverse check: every link
found in the app actually points to a real page, catching stale
references a rename or removed route could leave behind. Run it after
renaming or removing any page.

**`scripts/audit-revalidate-paths.py`** checks every `revalidatePath(...)`
call in the app against the same real route list — a stale or typo'd
target here doesn't error, it just silently leaves cached UI stale after
a mutation. Run it after renaming or removing any page, alongside the
dangling-links check.

**`scripts/audit-missing-revalidation.py`** checks the more severe
version of the same risk: does every mutation action call
`revalidatePath()`/`redirect()` at all, not just at a valid target. A
mutation with neither succeeds silently but never invalidates any
cache, so the UI can keep showing stale data indefinitely. Run it after
writing any new mutation action.

**`scripts/audit-orphaned-actions.py`** is the mirror of the page-
reachability check for the action layer: every exported server action
should be imported and called from somewhere, or it's dead code (or a
feature whose UI was never finished — this exact script found and fixed
one real instance of that on its first run). Run it after writing any
new action or removing a page that used one.

**`scripts/audit-admin-gating.py`** checks this app's established
pattern (creating a `Parametre*` settings entry is never admin-gated;
deleting/deactivating one always is) by verifying every matching
`delete*`/`deactivate*` function calls `requireAdmin()`. Found a real
gap on its first run — 8 settings lists had create actions but no
delete action had ever been written for any of them. Run it after
adding a delete/deactivate action for any settings-style reference
table.

**`scripts/audit-schema-consistency.py`** checks that every field type
across every model in `prisma/schema.prisma` refers to a real model or
scalar — the same class of check `npx prisma generate` performs, done
here as pure text analysis. This is the one check in this project that
found a bug no one had — a stale back-relation field left over from an
earlier model rename, caught only when a real user ran `npx prisma
generate` for the first time. Run this after any schema edit, alongside
`npx prisma generate` itself — this script doesn't replace that step,
it just catches the same class of error without needing network access.

## Deployment

No Docker setup is included — deploy this like any standard Next.js app:

```bash
npm install
npm run build
npm start        # serves on port 3000 by default
```

Point `DATABASE_URL` at your production Postgres and set a real
`SESSION_SECRET` — see `.env.example`. Run migrations before starting the
app (`npx prisma migrate deploy` once a real migration exists — see
"Database migrations" above; `npx prisma db push` in the meantime).
Beyond that, hosting is up to you — a plain VPS with a process manager
(PM2, systemd), or a platform that runs Next.js natively (e.g. Vercel)
both work without any changes to the app itself.

`.github/workflows/ci.yml` runs lint, unit tests, a schema-validity check,
and a production build on every push/PR — this is unaffected by the
deployment choice above.

## Authentication

Real login replaces the earlier hardcoded single-user assumption:

- `src/lib/auth.ts` — session creation/verification (HMAC-signed cookie,
  bcrypt password hashing), no external auth library.
- `src/middleware.ts` — protects every route except `/login`. **Must live
  under `src/`, not the project root**, since this project uses a `src/`
  directory — double-check this after any restructuring.
- `/admin/users` (Admin role only) — create/deactivate/reactivate users.
- Every `actions.ts` across all modules now records the **real logged-in
  user** (`currentUserLogin()`) instead of a hardcoded `"admin"` string.
- **Set a real `SESSION_SECRET` env var in production** — it falls back to
  an insecure default for local/demo convenience only.
- Routes live under a `(dashboard)` route group so `/login` renders
  without the sidebar; `/login` and `/admin/users` are the only
  auth-aware pages, everything else assumes middleware already gated access.

## Authorization (role-based permissions)

**Important context**: the legacy WinForms app has **no real authorization
system**. `utilisateur.fonction` is a free-text job-title field used only
for notification routing ("alert whoever has `fonction = 'Responsable
Achat'`") — confirmed by reading `page_loginn.cs`, where it's never used
as an access gate. Any logged-in user there can do anything. So everything
below is a **deliberate modernization**, not something reverse-engineered
— worth knowing if you're comparing behavior against the original app.

- `requireAdmin()` in `src/lib/auth.ts` throws `ForbiddenError` if the
  current session isn't `role: "Admin"`. Call it at the top of any server
  action that should be admin-only.
- Gated: the DA approval workflow (confirm/refuse/report/close), purchase
  and subcontracting order status transitions, BSM validation, budget
  creation, and every reference-data delete action across every module's
  settings pages.
- `src/app/(dashboard)/error.tsx` catches `ForbiddenError` and shows a
  friendly message instead of Next's generic crash overlay. It matches on
  `error.message` content (not just `error.name`), since custom `Error`
  subclass identity isn't guaranteed to survive the server→client
  serialization boundary for Server Action errors across all Next.js
  versions — this wasn't independently verified in this environment, so
  treat it as a reasonable defensive choice rather than a confirmed fact.
- UI-side button hiding (in addition to the backend gate, which is the
  real security boundary) is done for the highest-traffic screens — DA
  detail, both purchase-order detail pages, BSM detail — but **not** for
  the settings-page delete buttons across Inventory/Production/Workshop/
  Fleet/Sous-traitance/Tooling. Non-admins hitting those will get the
  friendly error page rather than a disabled button; the backend gate
  still blocks the action either way. Finishing the UI-hiding pass is a
  reasonable next step, not a security gap.
- `isAdminRole()` (the pure role-comparison logic) is unit-tested in
  `src/lib/session-token.test.ts`.

## What's implemented

**Maintenance (Phase 1)**
- **Demandes d'intervention (DI)**: list, create, detail, confirm → auto-creates
  an OT (mirrors legacy `da_confirmer` flow), refuse.
- **Ordres de travail (OT)**: list with status filters, create, detail with
  status-transition workflow and comments.
- **Preventive maintenance generation** (`/work-orders/preventif`,
  added later — see `docs/11-preventive-maintenance-addendum.md`): three
  independent trigger mechanisms reconstructed from
  `lancement_ot_preventive.cs` — systematic (calendar-based, with a
  configurable lead time), counter-based (compares a live equipment
  counter against a threshold, with immediate-or-deferred counter reset
  on trigger, using the confirmed real `ot_reinit_compteur` dedup table),
  and conditional (manually-entered measurement against a threshold).
  Manual "Générer les OT dus" trigger rather than a scheduled job — see
  the addendum for why.
- **Gammes opératoires & resource planning** (Phase 13, added after the
  real-DB cross-check found `GammeOperatoire` had no resource planning at
  all): `/work-orders/gammes` — define staffing, tooling, and spare-parts
  requirements per operating procedure. Work Orders get a matching
  "Ressources utilisées" section for recording *actual* tool/parts
  consumption, tying Maintenance, Tooling, and Inventory together.
- **Diagnostic (Ishikawa/AMDEC)** (Phase 15): `/work-orders/[id]/diagnostic`
  — record observed symptoms, diagnosed failure mode(s), detection method,
  and diagnostic operations performed with timing, per Work Order.
  `/work-orders/settings/diagnostic` manages the reference data (symptoms,
  operations per failure mode, and an anomaly parent/child cause-tree for
  root-cause analysis).

**Production (Phase 2 — complete)**
- **Shift reports**: create a report by date + shift (`poste`); auto-generates
  zeroed entry rows for every equipment × brick-type combination across
  Fabrication, Four (entrée/sortie), and Emballage, **plus** the
  quality/measurement readings (kiln quality, fabrication quality, hourly
  throughput, préparation readings, daily tonnage, line-operator slots) —
  mirrors the full legacy `prod_rapport` batch-insert behavior.
- **Fabrication** entry grid + **chef d'équipe (line operator) assignment**
  per equipment.
- **Four** entrée/sortie entry grids. **Emballage** entry grid with packaging
  consumables. **Préparation** readings. **Qualité** page (kiln/fabrication
  quality, hourly throughput grid, daily tonnage). **Fuel** consumption entry.
- **Gaz** consumption entry (Phase 17, per-report, mirrors Fuel's shape —
  but unlike Fuel's 6 confirmed measurement points, the gas points are an
  unconfirmed guess, flagged as such on the page). **Électricité (four)**
  (Phase 17, `/production/electricite`): daily kiln electricity tracking
  across Tunisia's 4 standard STEG tariff periods, independent of shift
  reports.
- **Anomalies**: log/remove production anomalies per report.
- **Report overview**: totals per section + kiln yield (sortie/entrée %).
- **Récapitulatif (recap dashboard)**: date-range KPI view aggregating
  fabrication (by day/equipment/product), kiln entrée/sortie/perte,
  packaging, fuel, anomalies, and fabrication-by-operator — reimplements
  the legacy `prod_recap.cs` screen.
- **Settings**: equipment↔section assignment, brick types, and measurement
  parameters (`prod_saisie`), all now manageable through the UI.

Dashboard with live counts across both modules.

**Inventory / Stock (Phase 3 — new)**
- **Articles**: item master with stock tracking (neuf/usé/rebuté/réparable
  manuel — confirmed as four-way via the real DB cross-check, not three as
  first assumed), reorder thresholds, family/sub-family categorization,
  and warehouse assignment.
- **Caractéristiques & Unités** (Phase 12, added after the real-DB
  cross-check): a genuine dynamic form-builder confirmed directly in the
  decompiled source — each product sub-family can define its own custom
  fields (TextBox/Select Unique/Select Multiple/CheckBox/Radio Button,
  with type-specific config), rendered dynamically on the article detail
  page with the correct input per field type. Plus unit-of-measure
  assignment per article.
- **Article photo**: upload/view/delete, using the `photo` column already
  on `article` — confirmed via `article_image.cs` that this was never a
  separate images table, just a single-image field with no stored
  content-type; MIME is sniffed from magic bytes to render it.
- **BSM (Bon de Sortie Magasin — stock issue)**: create, add line items
  (auto-decrements stock), validate. Can be linked to a Work Order (`n_ot`)
  — the parts-consumption bridge to the Maintenance module.
- **BRM (Bon de Retour Magasin — stock return)**: create, add line items
  (auto-increments stock), loosely linked to the originating BSM.
- **Receptions (goods receipt)**: create, add line items (auto-increments
  stock), can link to a real Procurement `Commande` at the line-item level
  (see Procurement section) **and** at the header level (Phase 18's
  `ReceptionCommande` — a confirmed real table, complementary to the
  line-item link: one delivery can span several orders). A reception can
  be formalized into a **Bon de Livraison** (Phase 16 — a real delivery-
  note step confirmed via the schema cross-check, wrapping the reception
  rather than duplicating its line items), which can then be attached to
  an invoice.
- **Réapprovisionnement automatique** (Phase 18): two recurring reorder
  methods — fixed-quantity (`Réapprovisionnement`) and replenish-to-target
  (`Recomplétement`, no fixed quantity) — at
  `/inventory/reapprovisionnement`. Manual "Vérifier les échéances"
  trigger, same reasoning as this project's other manual-trigger features
  (preventive maintenance, budget auto-renewal): no scheduler
  infrastructure is set up here.
- **Article change history** (Phase 20): stock edits are now logged to a
  real audit table (`ModificationArticle`, confirmed date-only/no-user —
  a genuinely simpler mechanism than the Commande audit trail above, not
  forced into the same shape), shown on the article detail page.
- **Mouvements de stock**: a *computed* movement ledger (date-range
  filterable), reimplementing `mvt_stock.cs` — there is no physical
  ledger table in the legacy app or this schema; movements are derived
  from receptions/BSM/BRM at query time, same as the original design.
- **Settings**: Familles, Sous-familles, Magasins, Caractéristiques, Unités.

**Procurement / Achats (Phase 4 — new)**
- **Fournisseurs (suppliers)**: master data with contact/banking details
  (organized into Aperçu/Adresse/Banque tabs, each independently editable),
  order history per supplier.
- **Demandes d'Achat (DA — purchase requests)**: create, add line items,
  full approval workflow (Confirmer/Refuser/Reporter/Clôturer) with an
  audit trail — folds the legacy app's 5 separate per-action tables into
  one unified log.
- **Commandes (purchase orders)**: create against a supplier, add line
  items sourced from *confirmed DA lines only* (preserving the legacy
  traceability chain — an order line always points back to the request
  line that justified it), status workflow (En attente/En cours/Annulée/
  Clôturée). Existing lines are also editable (quantity/price/discount,
  admin-only), with every edit logged to a real audit trail (Phase 20 —
  `CommandeModificationBase`/`CommandeModifierArticle`, shown on the
  order detail page). This capability didn't exist before Phase 20; the
  audit table's existence in the real schema is what surfaced the gap.
- **Closes the loop with Inventory**: `Reception` can now link to a real
  `Commande` and automatically resolves the originating `DemandeAchat`
  line — these were placeholder integers in the Inventory module until
  this module existed.
- **DOP / Devis (price survey & quote)** (Phase 11, added after a real
  database cross-check revealed this workflow stage was missing entirely
  — see `docs/12-schema-validation-findings.md`): survey multiple
  suppliers' pricing for a set of articles (`Dop`/`DopFini`, an editable
  comparison matrix with running per-supplier totals), then formalize the
  chosen supplier's pricing into a `Devis`. Confirmed **zero FK
  constraints exist anywhere in the real 215-table database** — this
  step is intentionally not linked to `DemandeAchat`/`Commande` by any
  relation, matching the source.
- **Factures (invoices)** (Phase 16): `/procurement/factures` — create an
  invoice against one or more not-yet-invoiced delivery notes (see
  Inventory section for `BonLivraison`). Deliberately doesn't show a
  computed total — neither the real `facture` table nor `reception_article`
  track pricing, so a fabricated total would misrepresent the source data;
  the page says so explicitly.

**Workshop / Atelier (Phase 5 — new)**
- **Ordres de fabrication (jobs)**: create, full état state machine (8
  states, with one — "Terminé" — added beyond what was confirmed in the
  source; see spec doc) with a complete history log, technical drawing
  reference (plan/révision), and equipment linkage.
- **Suivi journalier**: daily time-tracking entries per job — machine,
  operator, start/end time, remaining quantity.
- **Qualité**: QC reception data (approved/blocked quantities, release
  sign-off) and dimensional first-article-inspection records (nominal +
  tolerance + 6 sample readings) — genuine machine-shop metrology,
  reused faithfully from the source.
- **Reuses existing modules** rather than duplicating them: raw-material
  consumption links to the Inventory module's `Bsm`, and a completed job
  can be linked to a real Inventory `Article`.
- **Settings**: Machines, Types de pièce, Priorités, Types de conception.

Dashboard redesigned to show the 6 most actionable cross-module KPIs plus
a shortcut row to all 7 modules.

**Fleet / Flotte (Phase 6 — new)**
- **Vehicles (Engin)**: master data (plate, fuel card, type, driver, load
  category).
- **Compliance documents**: insurance, road-tax sticker (vignette), and
  technical inspection — each with expiry tracking. The fleet hub computes
  an "expiring within 30 days" panel on the fly (same computed-view
  approach as the Inventory movements ledger) rather than relying on the
  legacy app's background-job-populated notification table.
- **Fuel log**: dispensing records with unit/total price and odometer
  reading at fill-up.
- **Bons de carburant** (Phase 19): fuel authorization vouchers — a
  distinct real-world event from the fuel log above (a driver-issued
  authorization slip, no odometer reading, vs. an actual dispensing
  transaction with one). Confirmed as genuinely separate via both the
  schema export and the decompiled source.
- **Voyages** (Phase 19): trip log (route, driver, vehicle, distance,
  times).
- **Cross-module link, now confirmed**: a vehicle's odometer counter uses
  the *same* `equipement_compteur` table as Maintenance's counter-based
  preventive plans and Production's fabrication counters. The original
  spec flagged the link direction as an unconfirmed assumption
  (`Engin.idEquipement`); a real schema cross-check later confirmed the
  link is the *opposite* direction — `Equipement.engin` points to
  `Engin.id` — and the schema/model has been corrected accordingly (see
  `docs/12-schema-validation-findings.md` §8).
- **Settings**: Types de véhicule, Chauffeurs, Types de carburant,
  Catégories de charge.

Dashboard extended to 7 KPI cards plus a shortcut row to all 8 modules.

**Budget (Phase 7 — new, final module)**
- **Budget envelopes**: create a recurring spending envelope (amount +
  recurrence period — daily through annual), optionally scoped to a
  category (product family) or a supplier. Editable after creation (name,
  description, recurrence, amount, auto-renewal flag) — start date and
  scope type are deliberately locked post-creation since changing either
  would corrupt the variance calculation.
- **Live variance page**: budget-vs-actual is computed **on the fly**
  from the existing Procurement data (`Commande`/`CommandeArticle`) —
  no separate spend-ledger table, same principle as the Inventory
  movements ledger and Fleet expiry panel. Shows allocated/spent/remaining
  with a consumption bar, plus the actual list of orders counted.
- **Scope management**: add/remove categories or suppliers from a budget's
  scope directly on the detail page.
- Auto-renewal fields (`creationAuto`/`creerNv`) are modeled but the
  actual recurring-instance scheduler is **not** built — flagged
  explicitly in the spec doc as needing a scheduled job, which is
  infrastructure-dependent and out of scope for this pass.

This completes all modules identified in the original legacy codebase
inventory (Maintenance, Production, Inventory, Procurement, Workshop,
Fleet, Budget).

**Subcontracting / Sous-Traitance (Phase 8 — new)**
- **Devis (quotes)**: create a quote, invite multiple suppliers to bid,
  add line items (prestation/quantity/price), edit an existing line's
  price/discount (Phase 21 — confirmed via `modifier_devis_st.cs`'s real
  UPDATE statement; quantity isn't part of that update in the source, so
  it isn't editable here either, matching the legacy behavior exactly).
  `/sous-traitance/devis/historique` (Phase 22) reimplements
  `historique_devis_st.cs`'s filtered listing (date range, devis/demande
  number search) — confirmed the screen excludes demandes whose parent
  request is still active (`statut = 0`), showing only requests that have
  moved past "in progress".
- **Magasin sous-traitance** (Phase 21): `/sous-traitance/magasin` —
  tracks a physical item/tool sent to a subcontractor through its
  lifecycle (current demande, activity, location, equipment, repair
  count). Confirmed real table, discovered while investigating quote
  edit/history; resolves one path of the `id_t`/`source` polymorphism on
  quote/order lines, alongside `DsNvArticle`.
- **Commandes**: orders sourced from quote lines (mirrors Procurement's
  Commande/DemandeAchat traceability pattern), status workflow (En
  attente/En cours/Annulée/Clôturée).
- **Livraisons (delivery notes)**: track subcontracted work/parts coming
  back, against specific order lines, with quantity-received tracking.
- **Mouvements**: unlike Inventory's *computed* stock ledger, this one
  queries a **real stored table** (`ds_historique_mvt`) tracking physical
  location (Usine/Magasin/Réparation) — confirmed from the legacy source.
- **Known gap, resolved (corrected twice)**: the parent `Ds` (Demande
  Sous-Traitance) entity was originally modeled as a real table with an
  optional link to a Maintenance work order, flagged prominently as
  unconfirmed since no `insert into ds` was ever found in the decompiled
  source. A first schema cross-check wrongly concluded no such table
  existed at all (it only searched for a table literally named `ds`).
  The real answer, found while investigating quote edit/history: the
  entity is genuinely real, just named **`demande_sous_traitance`**, with
  columns `date_creation`/`heure_creation`/`createur`/`statut` — modeled
  as `DemandeSousTraitance`, with `DsDevis.idDs`/`DsCommande.idDs` as real
  relations to it. See `docs/12-schema-validation-findings.md` §16 for
  the full correction, including why the first "correction" was itself
  wrong.
- **Factures (invoices)** (Phase 16): `/sous-traitance/factures` — same
  pattern as regular Procurement, but the total *is* computed and shown
  (unlike the Procurement invoice page), since `DsLivraisonArticle`
  genuinely carries pricing fields that `ReceptionArticle` doesn't.
- **Matière première & pièces nouvelles** (Phase 15):
  `/sous-traitance/matiere-premiere` — raw material handed to a
  subcontractor (`DsMp`) and custom/one-off fabrication requests against
  a base article (`DsNvArticle`, the likely target when
  `DsDevisArticle.source` disambiguates `id_t` away from the regular
  article catalog).
- **Settings**: Activités (types of subcontracted services).

**Tooling / Outillage (Phase 9 — new, final module)**
- **Outils (tools)**: master data confirmed directly from the legacy
  list screen's SQL join — code, designation, serial/model number,
  manufacturer, sector, and type.
- **Checkout/return workflow**: confirmed directly from the legacy
  UPDATE statements — checking out a tool flips `Outil.statut` to
  unavailable and logs a `TabLancementAffectation` row; returning it
  flips `statut` back and records the return timestamp. Can optionally
  reference a Maintenance work order (`nOt`, same loose-text pattern as
  `Bsm.nOt`).
- **Settings**: Secteurs, Types d'outils, Utilisations (this last one
  flagged as having no confirmed link to anything else in the schema —
  modeled standalone, not force-connected to something unconfirmed).

**Équipements (Phase 14 — new)**
- Built after a real schema cross-check showed `Equipement` was a bare
  hierarchy table with no detail tabs at all, despite being referenced
  everywhere as a dropdown across every module. `/equipements` — list +
  4-tab detail (Aperçu/Technique & Observations/Documents/Prévision):
  purchase/warranty/depreciation info, repeatable technical specs,
  observation notes, PDF attachments, and downtime-cost forecasting.
- Also resolved the Fleet module's biggest open assumption in the
  process — see the Fleet section above.

This is genuinely everything identified in the original codebase
inventory, module for module.

**Analytics / KPI (Phase 10 — new)**
- **Two real bugs fixed** in earlier modules while tracing how cost
  actually gets computed: `Bsm` was missing `liOt`, a real integer FK to
  `OrdreTravail` confirmed via explicit `UPDATE bsm SET li_ot = ...`
  statements (only the loose text `nOt` had been modeled) — **this is
  what all cost reporting actually joins on**. `OtOrdoIntervenant` was
  missing `coutHoraire`, a real stored hourly-rate column used in every
  labor-cost calculation. Both are now fixed, plus two small new tables
  (`OtBl`, `OtProjet`) needed to complete the total-cost-per-OT formula.
- **Reliability** (`/analytics/reliability`): MTTR/MTBF/TTR computed live
  from closed, non-preventive work orders, selectable by equipment level
  (Équipement/Sous-équipement/Organe/Atelier) — consolidates what were 10
  near-identical legacy screens into one.
- **Cost Pareto** (`/analytics/cost`): cost ranking with running cumulative
  percentage, selectable across 9 dimensions — consolidates 7 legacy
  screens into one. Faithfully reflects what the source actually computes
  per dimension (some are parts-cost only, some labor-cost only, some
  both) rather than assuming uniform coverage.

## Not yet built

- Maintenance: Planning/Gantt view, PDF work-order printouts. (KPI/Pareto
  reporting is now built — see Analytics. Automatic preventive-maintenance
  generation is now built — see below and
  `docs/11-preventive-maintenance-addendum.md`. Ishikawa/AMDEC diagnostics
  is also now built — see below and `docs/12-schema-validation-findings.md` §9.)
- Production: the "A/S" paired-value préparation readings are now
  implemented at `/production/[id]/preparation` — report creation was
  silently skipping `cible = 2` parameters entirely (only 1, 3, 4, 5 were
  ever auto-generated), fixed alongside adding the UI. The exact meaning
  of "A"/"S" is still genuinely unconfirmed in the source (see spec doc
  §5), so the UI uses neutral "Valeur A" / "Valeur S" labeling rather than
  guessing. Also fixed a schema bug found while building this:
  `ProdRapportPrepAS.idSaisie` had no actual Prisma relation to
  `ProdSaisie` defined despite the field existing.
- Inventory: article characteristics are implemented (Phase 12 —
  `Caracteristique`/`TableauArticleCaracteristique`, dynamic per-sous-
  famille custom fields). Comments and file attachments are also
  implemented (`ArticleCommentaire`/`ArticleFichier`). `article_image.cs`
  turned out not to need a separate table at all — it reads/writes a
  single `photo` column directly on `article` (confirmed directly from
  the decompiled screen: `select photo from article` /
  `update article set photo = ...`), a field this schema already had.
  Only the upload/display UI was missing; now built on the article detail
  page. Subcontracting stock variant (`*_st.cs` files) — deferred, folded
  into the Subcontracting module's own stock-location tracking instead.
- Procurement: supplier address and banking tabs are now implemented; the
  price-verification screen (`bon_dop.cs`) remains unbuilt. Delivery notes
  and invoicing are now implemented — see the Procurement/Inventory
  sections above. `Fournisseur_contact.cs` (previously listed here as an
  unbuilt multi-contact list) turned out to be an **empty stub form in the
  legacy app itself** — 18 lines, no SQL of any kind, never wired to a
  database. Confirmed no `fournisseur_contact` table (or anything
  containing "contact") exists anywhere in the real 215-table database.
  There is nothing to build here; the original app never finished this
  screen either.
- Workshop: comments and file attachments are now implemented
  (`AtelierCommentaire`/`AtelierFichierAttachment`); the `id_nv` field on
  `AtelierRetour` remains unimplemented pending clarification of its
  meaning (see module spec doc).
- Fleet: file attachments tab is now implemented (`EnginFichier`, on the
  vehicle detail page). The vehicle↔work-order cross-link
  (`engin_tab_intervention.cs`, depends on the Equipement-link assumption
  being confirmed — now resolved, see spec doc and Fleet section above)
  and reporting/analytics (`engin_recap.cs` and the various Crystal
  Reports) remain unbuilt.
- Budget: auto-renewal scheduler (fields modeled, job not built — see spec
  doc §4), the "all budgets" recap screen, and the investment budget
  variant (`budget_investissement.cs` — appears to reuse the same table,
  unconfirmed). Edit is now implemented (deliberately excludes changing
  the start date or scope type post-creation, since either would corrupt
  the variance calculation).
- Subcontracting: quote line editing and the "historique" filtered-listing
  screen (`historique_devis_st.cs`) are now implemented (see above); the
  order signature step remains unbuilt (P2 in spec doc). Invoicing is
  now implemented (see above). The `Ds` parent entity question had a
  **corrected** resolution — see `docs/12-schema-validation-findings.md`
  §16: the entity is real, named `demande_sous_traitance` (not `ds`), and
  the code already uses it correctly (`DemandeSousTraitance`). An earlier
  finding claiming no such table existed was itself wrong.
- Tooling: `Utilisation` **does** link to something — confirmed real via
  `OutilUtilisation` (Phase 26, tier 25), a genuine usage-purpose log
  linking a specific `Outil` to one or more `Utilisation` entries, with
  full UI on the tool detail page. This entry previously said the link
  was unconfirmed and modeled standalone; that was accurate at the time
  it was written but is now stale — corrected here rather than left to
  mislead a future reader.
- Analytics: the exact `type_stock <> @v` exclusion value in the legacy
  cost queries wasn't traceable (assumed to mean "exclude returns"); no
  creation screen was found anywhere for `OtBl`/`OtProjet` in the legacy
  app, only the read-side cost rollup — see spec doc §7.
- The Crystal Reports themselves (~75 `.rpt` files) were never rebuilt as
  literal report reproductions; several modules got computed dashboards as
  *replacements* instead (Production recap, Fleet expiry, Budget variance,
  and now Analytics).
- Real permissions/authorization: role-based (Admin/Utilisateur) gating is
  now implemented for the highest-value actions (see "Authorization"
  section above) — but there's still no per-module or per-action
  granularity beyond that binary split. UI-side button hiding for
  settings-page delete actions was audited (see
  `docs/12-schema-validation-findings.md` §34): 19 of 24 such pages
  already had it; the other 5 were fixed. That same audit also found and
  fixed 2 real backend gaps (`deleteCentreCharge`/`deleteCauseRealisation`
  were missing `requireAdmin()` entirely, not just the UI hiding) — worth
  noting since it means this list itself had gone stale enough that
  recent work was adding to a known gap rather than closing it.

## Data model

`prisma/schema.prisma` is reverse-engineered directly from the legacy app's
embedded SQL — French column/table names are preserved (via Prisma `@map`) so
a future export of the real SQL Server database can be migrated in without
renaming everything.
