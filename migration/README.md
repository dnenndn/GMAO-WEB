# Legacy Data Migration

Reads from your real `GMAO_NGES` SQL Server database and writes into the
Postgres database this web app runs on, preserving original row IDs
(explained below).

## ⚠️ Before you run this

**This has never been run against real data.** It was written entirely
from the confirmed schema export and decompiled-source column mappings
documented across `docs/01-*.md` through `docs/12-schema-validation-
findings.md`, in an environment with no live SQL Server reachable. Every
query and field mapping is a well-informed first draft, not a tested
pipeline.

**Do this first, in order:**

1. **Run against a throwaway/staging Postgres database, never production.**
   Create a fresh database, point `DATABASE_URL` in `.env` at it, run
   `npx prisma migrate dev --name init` against it (see the main README's
   "Database migrations" section — this itself has never been run either,
   for the same sandbox-network reason).
2. **Run with `--dry-run` first**: `npm run migrate:legacy -- --dry-run`.
   This connects to your real SQL Server, counts rows in every source
   table, and logs them — it writes nothing. Sanity-check the counts
   against what you know about your data before proceeding.
3. **Run for real against the staging database**, then spot-check:
   compare row counts between SQL Server and Postgres per table, open a
   handful of migrated records in the web app and compare against the
   original WinForms app, and check the console output for any errors
   (the script logs and continues past per-row failures rather than
   aborting the whole run — see "Error handling" below).
4. **Only then**, once you're satisfied, point `DATABASE_URL` at your
   real production Postgres database and run it there.

## Setup

```bash
cp migration/.env.migration.example migration/.env.migration
# fill in your real SQL Server connection details

npm install
npm run migrate:legacy -- --dry-run   # step 2 above
npm run migrate:legacy                # step 3/4 above
```

`DATABASE_URL` (the Postgres target) is picked up automatically from your
existing `.env` — Prisma Client loads it regardless of how the script is
invoked. You don't need to duplicate it in `.env.migration`.

## Why original IDs are preserved

Every foreign-key column in the legacy database already contains the
correct target row's ID. Rather than building an old-ID → new-ID lookup
map for all 162 tables (a huge additional surface for bugs), each
migration function inserts rows with `id: <the original SQL Server id>`
via Prisma's explicit-ID create. After a table is migrated, its Postgres
sequence is reset to `MAX(id) + 1` (see `resetSequence()` in
`migration/db.ts`) so the app's own future inserts don't collide with
migrated data.

This only works because — confirmed directly, not assumed — **the legacy
database has zero declared foreign-key constraints anywhere** (see
`docs/12-schema-validation-findings.md`), so there's no SQL Server–side
ordering requirement to preserve; any row can be read independently.

## ⚠️ A real limitation in this project's own verification method

Every "type-checked clean" claim in this document (including several
below, from earlier in this project) needs a correction: `npx tsc
--noEmit`, run in the sandbox this was written in, **does not actually
verify Prisma model or field names at all**. Confirmed empirically —
calling `prisma.thisModelDoesNotExistAtAll.create(...)` produces zero
type errors, because `@prisma/client`'s generated types in this sandbox
are frozen from before most of this migration was written (`npx prisma
generate` cannot reach `binaries.prisma.sh` here — the same network
limitation documented throughout this whole project) and its
`PrismaClient` delegate typing falls through permissively for anything
outside that stale shape. The type-check *is* still meaningful for
everything else — genuine syntax errors, wrong argument types on plain
functions, undefined variables (confirmed with the same empirical test)
— just not for the one thing that matters most in a migration script:
whether `prisma.prevSystEch.upsert(...)` is actually calling a real
model with real field names.

**What this means in practice**: the actual protection against wrong
model/field names in every tier of this migration has only ever been
manual cross-referencing against `schema.prisma`'s literal text and
`docs/12-schema-validation-findings.md` — done carefully throughout (and
it did catch several real bugs — see the tier-by-tier notes below), but
it is human-verified, not tool-verified, and should be trusted
accordingly.

**Before running this for real**, run `npx prisma generate` successfully
in an environment with real network access first, then re-run `npx tsc
--noEmit -p tsconfig.json` — that combination will give an actually
meaningful type-check that this sandbox could never produce. Treat every
"type-checked clean" note below as "passed the checks this sandbox was
capable of running," not as full confirmation.

## Three Python scripts stand in for what `tsc` can't verify here

Given the limitation above, three scripts do the real checking in this
sandbox — all three should be run after writing or editing any migration
module, and re-run whenever `prisma/schema.prisma` changes:

- **`migration/audit-field-names.py`** — parses every `model` block in
  the schema for its real field names, finds every
  `prisma.<model>.upsert(...)`/`.create(...)` call across every tier,
  and diffs the literal object keys used against the real schema. Introduced
  partway through this project after enough tiers had accumulated that
  manual cross-referencing alone felt too easy to get wrong at scale —
  see the tier-by-tier notes below for what it's caught.
- **`migration/audit-nullability.py`** — a narrower, later addition
  targeting a specific bug class already caught twice by manual review
  alone (`DaArticle.qtRestant` in tier 4; `ProdRapportFabProduit`/
  `FourEntre`/`FourSortie.tonnage` in tier 6): a target field that's
  `NOT NULL` in the schema but fed by a nullable-source helper
  (`toNumOrNull`, etc.) with no `?? <fallback>`. Flags candidates for
  manual review — it's a heuristic, not a compiler, so it can produce
  false positives but is written to lean toward over-flagging rather
  than missing a real instance.

  **Verified against a positive control before trusting a clean run**:
  before relying on this script's "no candidates found" result on the
  real codebase, a deliberately-reintroduced copy of the tier-4
  `qtRestant` bug was injected as a scratch module and confirmed caught.
  Only after that passed was the clean result on the real 25 tiers
  treated as meaningful — a negative result from a tool that's never
  been shown capable of a positive one isn't worth much. As of the tier
  it was introduced, all 25 tiers pass clean.

  A related, broader-scoped check (fields *entirely absent* from a
  `create` block, not just risky-but-present ones) was also tried and
  discarded — it couldn't distinguish relation-object fields (which
  Prisma resolves automatically from their scalar FK and should never be
  set directly) from genuine scalar fields, so it produced hundreds of
  false positives with no real signal. Not every check that runs clean
  or produces output is actually measuring something meaningful; this
  one wasn't kept because it failed that bar, not because its output was
  reassuring.
- **`migration/audit-sequence-resets.py`** — checks that every function
  which inserts rows with an explicit legacy `id: r.id` also calls
  `resetSequence()` for that table, since skipping it leaves Postgres's
  own autoincrement counter unaware of the migrated ids and risks a
  future collision the first time the app itself inserts a new row.

  **This script caught itself failing its own positive control on the
  first attempt** — worth recording in full rather than only the
  eventual clean result. The first control test was a scratch module
  missing the real `resetSequence()` call, with a comment saying so
  ("// deliberately missing resetSequence() call"). The script reported
  no problem — not because the check was fine, but because its naive
  substring match (`"resetSequence(" in body`) matched the *comment
  text*, not an actual function call. Caught by debugging why a
  deliberately-broken control passed instead of assuming the control
  itself was wrong. Fixed by stripping comments before matching and
  requiring a real call pattern (`resetSequence\s*\(`), then re-verified
  the same control was caught, then confirmed a comment-free version of
  the same control was *also* caught (ruling out the fix being
  comment-specific rather than actually correct). Only then was the
  clean result across the real 25 tiers (200 functions checked) trusted.

## Error handling

Each migration function processes rows one at a time and does not wrap
the whole table in a transaction — a single bad row (e.g. one violating
a NOT NULL constraint this schema enforces that the source data
happens to violate) will throw and stop that function, but rows already
inserted before it stay committed. Re-running is safe: every insert uses
`upsert` keyed on `id`, so already-migrated rows are skipped, not
duplicated. Fix the offending source row (or add a case to the relevant
migration function) and re-run.

## Coverage — what's migrated so far

This is a **first slice**, not full coverage of all 162 models. Built and
validated (structurally — see caveat above) so far:

**Tier: core** (`migration/modules/01-core-reference.ts`) — pure reference
data with no dependencies: Utilisateur, FonctionIntervenant,
ParametreClasseIntervention, ParametreAnomalie, Famille, SousFamille,
Secteur, TabType, Utilisation, Magasin, TypeVehicule, TypeCarburant,
Chauffeur, CategorieDeCharge, Symptome.

**Tier: master** (`migration/modules/02-master-data.ts`) — depends only on
the core tier: Fournisseur, Intervenant, Engin, Equipement (self-
referencing, migrated in two passes — see the module's comments),
Article.

**Tier: maintenance** (`migration/modules/03-maintenance.ts`) — depends on
core + master (needs Utilisateur, ParametreClasseIntervention,
Intervenant, ParametreAnomalie, Equipement already migrated):
GammeOperatoire, DemandeIntervention, OrdreTravail.

**Tier: inventory-procurement** (`migration/modules/04-inventory-
procurement.ts`) — depends on core + master (Article, Fournisseur,
Utilisateur): DemandeAchat, DaArticle, Commande, CommandeArticle,
Reception, ReceptionArticle, Bsm, BsmArticle, Brm, BrmArticle.
Status-code mappings for `Commande`/`DemandeAchat` are confirmed
(`docs/04-procurement-module-spec.md` §3), not guessed. Two source
columns (`reception.statut`, `reception_article.etat`) have no confirmed
meaning for their values — carried over as their raw string form rather
than inventing labels, flagged in the code where this happens.

**Tier: workshop** (`migration/modules/05-workshop.ts`) — depends on
core + master (Article, Equipement, Intervenant, Utilisateur):
AtelierMachine, AtelierParametrePiece/Priorite/Conception, AtelierCreer,
AtelierEtat, AtelierRetour, AtelierDonnees, AtelierPiece,
AtelierSuiviJournalier, AtelierBsm. Real discovery while writing this:
`atelier_donnees` and `atelier_piece` store numeric-looking values
(quantities, measurements, tolerances) as `varchar(150)` in the
source — free-text entry fields in the legacy UI despite this schema
correctly typing them as `Decimal`. Handled with a lenient parser
(`parseLenientNumber()`) that tolerates French-locale comma decimals and
blank/junk values, rather than a direct cast that would silently produce
`NaN`/crash on real data.

**Tier: production** (`migration/modules/06-production.ts`) — depends on
core + master (Equipement): ProdEquipement, ProdTypeBrique, ProdSaisie,
ProdAnomalie, ProdFabCompteur, ProdRapportGeneral, and every report
sub-table (FabProduit/EmbProduit/FourEntre/FourSortie/PrepAS/
HoraireFabrication/FabTonnage/Fuel/Gaz/CfFabrication/CfEmballage/
Anomalie), plus `ProdMesureRapport` — see below, the one table in this
whole migration that can't preserve original ids.

**`ProdMesureRapport` — a genuine exception to the id-preservation
strategy.** It consolidates 4 real source tables (already a documented
simplification in the Production spec), each with its own colliding id
sequence — 4 ids can't all become one target `id` without collisions.
Confirmed nothing else has an FK into this table (a pure leaf/log
table), so `migrateProdMesureRapport()` is the only function in the
whole migration that lets Postgres generate fresh ids via plain `create`
instead of `upsert`. **This means it is NOT safe to re-run** the way
every other function here is — guarded by skipping entirely if the
target table already has any rows, rather than risking silent
duplication.

`prod_fuel.type_saisie`/`prod_gaz.type_saisie` are `int` codes in the
source, but the target models the confirmed string labels
(`FUEL_POINTS`). The labels themselves were confirmed (from legacy
column headers), but the exact code→label ordinal mapping wasn't — the
migration assumes 0-indexed correspondence to `FUEL_POINTS`'s order,
flagged as an assumption in the code, not presented as fact.

**Tier: fleet** (`migration/modules/07-fleet.ts`) — depends on core +
master (Engin, TypeCarburant, Chauffeur): EnginAssurance, EnginVignette,
EnginVisiteTechnique, EnginSortieCarburant, EnginCompteurInitial,
EnginFichier, BonDeCarburant, Voyage, EnginParcLiaisonCarburant. Also
fills a real gap found while writing this — **`EquipementCompteur` had
never been migrated in any tier** despite `EnginCompteurInitial` (and,
later, `PrevCompteur`) depending on it — migrated first in this file
rather than left for whichever tier happened to need it next. Another
real naming mismatch caught here: target `EquipementCompteur.uniteMesure`
maps to `@map("unite_mesure")`, but the actual source column is just
`unite` — the `@map` annotation describes the target's own naming
convention, not necessarily a literal source column name, and this is
the one place in the whole schema so far where they diverge. Checked
directly against the schema export, not assumed from the `@map` value.

**Tier: budget** (`migration/modules/08-budget.ts`) — depends on core +
master (Famille, Fournisseur): Budget, BudgetCategorie,
BudgetFournisseur. `budget.categorie` is a real source column with no
corresponding field anywhere on the target `Budget` model — category
scoping is handled entirely through the separate `budget_categorie`
join table, which *is* migrated. Deliberately not carried over (there's
nowhere for it to go), flagged in the code rather than silently dropped.
Also confirmed `creation_auto` uses the "Oui"/"Non" varchar convention
while the other 3 boolean-ish columns on the same table
(`fournisseur_choix`/`categorie_choix`/`creer_nv`) use plain `int` —
checked each individually rather than assuming uniform representation
across similar-looking columns on the same table.

**Tier: procurement-quotes-invoicing** (`migration/modules/09-
procurement-quotes-invoicing.ts`) — depends on core + master (Article,
Fournisseur, Utilisateur) + inventory-procurement (Reception, needed by
BonLivraison): Dop, DopArticle, DopFournisseur, DopFini, Devis,
DevisArticle, DevisFournisseur, DevisFichier, BonLivraison, Facture,
FactureLivraison. No confirmed status-code mapping exists for
`dop.statut`/`devis.statut`/`bon_livraison.statut` — all three fall back
to the same "0 = En cours, else Clôturée" guess already used for
DemandeAchat's confirmed pattern, explicitly flagged as unconfirmed for
these three tables specifically.

**Tier: subcontracting** (`migration/modules/10-subcontracting.ts`) —
depends on core + master (Article, Fournisseur, Utilisateur,
Equipement): DemandeSousTraitance, ActiviteSousTraitance, DsDevis and
its 3 sub-tables, DsCommande and its sub-table, DsBonLivraison,
DsLivraisonArticle, DsFacture, DsFactureLivraison, DsMp, DsNvArticle,
MagasinSousTraitance, Signature. Real discrepancy found while writing
this: the target `DsBonLivraison.idCommande` has a real `@relation`, but
the actual source `ds_bon_livraison` table has **no `id_commande`
column at all** — confirmed against the schema export, not assumed from
the Prisma field's existence. The only real link from a delivery note
back to its order is indirect (through
`DsLivraisonArticle.idDsCommandeArticle`), so `idCommande` is left
`null` here rather than fabricated. `signature.designation` (a PIN hash)
gets the exact same security treatment as `Utilisateur.motPasse` — never
carried over from the source; every migrated signature gets a fresh
random 4-digit PIN, hashed the way this app's own check code expects,
reported to `migration-temporary-signature-pins.json` for out-of-band
distribution, mirroring `migration-temporary-passwords.json` exactly.

## A second real issue found — `createur` is a real FK to `Utilisateur.login`

While writing the maintenance tier, reading the actual Prisma
`@relation` definition (not assuming) showed `OrdreTravail.createur` /
`DemandeIntervention.createur` are genuine foreign keys to
`Utilisateur.login` in the target schema — but the source column is an
`int` (`Utilisateur.id`). Since Utilisateur is migrated with ids
preserved, resolving this is a single lookup (`id -> login`, built once
per tier run, not per row — see `buildUserLoginLookup()`). Falls back to
`null` (the field is optional) for any source `createur` id that doesn't
resolve, rather than inventing a placeholder user — simpler than it
sounds and consistent with how every other optional FK in this migration
is handled.

**No prior tier touched a `createur`-style field**, so this wasn't caught
until now — worth checking for again in every future tier that has one
(Production reports, Procurement, most transactional tables do).

## Audited (later session) — 3 real issues found and fixed

Resuming this in a later session, the tiers above were independently
audited — every `SELECT` column list diffed programmatically against the
confirmed real schema (`docs/12-schema-validation-findings.md`), not just
re-read and trusted:

1. **`Fournisseur.commentaire`** — a real source column, silently missing
   from the SELECT. Fixed.
2. **`FonctionIntervenant.code`** — a real `NOT NULL` source column that
   had never been modeled in the Prisma schema at all, not just missed
   here. Added to `schema.prisma` and wired into the migration.
3. **`Utilisateur.photo` / `Article.photo`** — real binary (`image`)
   columns, correctly modeled in Prisma as `Bytes?` but not migrated.
   Added `toBufferOrNull()` in `db.ts` and wired both in.

Also type-checked (`npx tsc --noEmit -p tsconfig.json`, filtered to
`migration/`) — zero errors, confirmed against the project's real
`tsconfig.json` (an earlier direct-file invocation gave false positives
by bypassing the config entirely — corrected methodology, not a real
problem). This only confirms syntax/type correctness, not runtime
behavior against a real SQL Server — that still requires the dry-run
process below.

**Tier: preventive-maintenance** (`migration/modules/11-preventive-
maintenance.ts`) — depends on core + master (Equipement,
EquipementCompteur) + maintenance (GammeOperatoire, OrdreTravail):
PrevSystematique, PrevSystEch, PrevConditionnelle, PrevMesure,
PrevCompteur, OtReinitCompteur, PrevAnnuel. **Added 3 models to
`schema.prisma` that had never been modeled at all** — `PrevSystEch`,
`PrevMesure`, `PrevAnnuel` are confirmed real tables, but the app's own
preventive-maintenance generation logic computes due dates/measurements
on the fly rather than reading them, so the gap never surfaced as an app
bug. Migrated for historical-data fidelity; **the current app UI does
not read from these 3 tables even though they're now in the database** —
a real, known limitation, not full feature parity. `PrevAnnuel.idRep`'s
relationship to the other Prev* tables was not established with
confidence and is left as a bare int rather than guessed at.

**Tier: da-action-history** (`migration/modules/12-da-action-history.ts`)
— depends on core + master (Utilisateur) + inventory-procurement
(DemandeAchat, DaArticle): DaAction, DaFichier, DaArticleEquipement.
`DaAction` consolidates 9 real source tables (confirm/refuse/report/
return/resend/close/modify/admin-send/view) — the same multi-source-
id-collision situation as `ProdMesureRapport` (tier 6), handled the same
way: fresh Postgres-generated ids via `create()`, guarded against
re-running by skipping entirely if the target already has rows.
**Added `DaFichier` to `schema.prisma`** — a confirmed real table (DA
file attachments) that had never been modeled at all, same class of gap
as `EquipementCompteur` (tier 7) and the 3 Prev* tables (tier 11).
`da_article_equipement.id_article` resolves to `DaArticle`, not
`Article` — confirmed by reading the actual `@relation` target rather
than assuming the obvious mapping. **Also extended `DaAction`** with
`cause`/`nouvelleDate` — 2 of the 9 source tables (`da_refuser`,
`da_reporter`) have a real extra column with nowhere to go on the
original model; found on a later audit pass by diffing each source
table's full column list against what the migration actually selected,
not just checking that what *was* selected mapped correctly. See the
"Tier 12 revisited" note near the end of this document.

**Tier: diagnostics** (`migration/modules/13-diagnostics.ts`) — depends
on core (Symptome, ParametreAnomalie) + maintenance (OrdreTravail):
OperationDiagnostic, RelationAnomalie, SymptomeDefaillance,
OtDiagnosticDef, OtDiagnosticDetection, OtDiagnosticM,
OtDiagnosticOperation, OtDiagnosticSymptome. A clean tier — every source
column matched its target field exactly on first check, no naming
mismatches or type surprises. `Symptome` itself (the base reference
table this whole tier hangs off) was already covered by tier 1, so this
was purely the remaining OT-level diagnostic-event tables plus 3
reference/lookup tables.

**Tier: article-characteristics-units**
(`migration/modules/14-article-characteristics-units.ts`) — depends on
core + master (SousFamille, Article): ParametreUniteArticle,
TableauArticleUnite, Caracteristique, CaracteristiqueOption,
CaracteristiqueTextbox, TableauArticleCaracteristique. Also clean — no
naming mismatches. `Caracteristique.type` and
`CaracteristiqueTextbox.type` are both confirmed enum-like strings (see
the schema comments — "TextBox"/"Select Unique"/etc. and "Chaîne de
caractères"/"Entier"/"Réel" respectively), passed through as-is rather
than needing a code→label mapping.

**Tier: equipement-detail-tabs**
(`migration/modules/15-equipement-detail-tabs.ts`) — depends on core +
master (Equipement): EquipementGenerale, EquipementTechnique,
EquipementImage, EquipementPdf, EquipementObservation,
EquipementPrevision. Two things worth flagging: `equipement_prevision`'s
`cout_arrêt`/`nbre_arrêt` columns genuinely have accented characters in
their real names (confirmed against the schema export, not an
artifact) — bracket-quoted in the SELECT the same way the legacy DDL
itself does, and confirmed that plain dot-notation property access on
the accented key (`r.cout_arrêt`) is valid JavaScript and compiles
cleanly (Unicode letters are valid in JS identifiers). `equipement_image.
photo` is a real binary (`[image]`) column, migrated with the same
`toBufferOrNull()` helper already used for `Utilisateur.photo`/
`Article.photo` (tier 1).

**Tier: gamme-ot-resources** (`migration/modules/16-gamme-ot-
resources.ts`) — depends on core + master (FonctionIntervenant, TabType,
Article) + maintenance (GammeOperatoire, OrdreTravail):
GammeRessourcesFonction, GammeRessourcesOutillage, GammeRessourcesPdr,
OtRessourcesFonction, OtRessourcesOutil, OtRessourcesPdr. **Extended
`OtRessourcesFonction`** with 5 real source columns
(`nbreRequis`/`minPlanif`/`typeCout`/`dateDebut`/`heureDebut`) that had
no home on the original model — same class of gap as
`DaAction.cause`/`nouvelleDate` (tier 12). Confirmed nothing in
`src/app/` references this model at all before extending it (all 5 new
fields optional, fully backward compatible).

**Tier: auto-reorder** (`migration/modules/17-auto-reorder.ts`) —
depends on core + master (Article): AcReapprovisionnement,
AcReapprovisionnementEch, AcRecompletement, AcRecompletementEch. Another
clean tier — every source column matched its target field exactly, no
naming mismatches, no type surprises.

**Tier: schema-ready-gap-closure** (`migration/modules/18-schema-ready-
gap-closure.ts`) — 19 tables that already had correct Prisma models
(built in separate earlier app-development work) but no migration
function: AtelierFichierAttachment, BsmEquipement,
CommandeModificationBase/CommandeModifierArticle, DsHistoriqueMvt,
ModificationArticle, OtBl, OtCentreCharge, OtOrdoIntervenant,
OtOrdoIntervention, OtProjet, ParametreIntervention, ProdCoefficientGaz,
ProdFourConsommationElectrique, ReceptionCommande,
TabLancementAffectation, ArticleFichier, TableauArticleSousFamille,
Outil. Two real schema gaps found and flagged rather than routed around
(`ot_bl.id_t`, `tab_lancement_affectation.motif` — no corresponding
target field for either). See tier 18's audit-trail entry for detail.

**Tier: fournisseur-reference** (`migration/modules/19-fournisseur-
reference.ts`, Phase 22) — new schema + app UI + migration together:
6 `tableau_fournisseur_*` links (activité/compte/devise/fichier/
livraison/règlement) + 5 `parametre_*_fournisseur` lookups. Built
`/procurement/settings/fournisseur-reference` and a new Profil tab on
the supplier detail page.

**Tier: article-reference** (`migration/modules/20-article-reference.ts`,
Phase 23) — same shape as tier 19: 8 of 9 tables (classification/
emplacement/stockage links + lookups, plus direct Equipement/Fournisseur
links). `parametre_image` deliberately left unmigrated — see its
audit-trail entry.

**Tier: notification** (`migration/modules/21-notification.ts`,
Phase 24) — Notification + NotificationAlerte. Built `/notifications`
and a live unread-count sidebar badge. Deliberately read/display only —
no automatic notification-generation trigger logic was found in the
source.

**Tier: activite-scoping** (`migration/modules/22-activite-scoping.ts`,
Phase 25) — extends the already-migrated ActiviteSousTraitance with
Famille/SousFamille scoping and an operations checklist. Extended the
existing Activités settings page rather than building a new one.

**Tier: ot-equipement-misc** (`migration/modules/23-ot-equipement-
misc.ts`) — ParametreCauseRealisation, ParametreCentreCharge,
OtCauseRealisation, EquipementCompteurHistorique, EquipementCompteurNv,
CompteurLiaison. Notably upgraded tier 18's `OtCentreCharge` from a bare
unrelated int to a real relation now that `ParametreCentreCharge`
exists — tier 18's own migration function needed no changes, since it
always wrote to the scalar FK column directly.

**Migration is complete, for all practical purposes: 214 of 215 real
tables migrated (26 tiers).** The only table not migrated is
`test_equip` — deliberately excluded, not deferred. Its shape breaks
every convention the other 214 real tables follow: a `varchar` primary
key instead of int identity, generic English-ish field names
(`created`/`modified`/`parentid`) instead of this app's consistent
French naming. Reads as a scratch/test artifact in the source database
itself, not a real application feature — modeling and migrating it would
mean guessing at a feature that most likely doesn't exist. If it turns
out to matter, confirm what it actually represents first, then follow
the same pattern as every tier above.

`parametre_image` (a single-row global config table with 3 fixed site
photos, no `id_article` or any FK at all) was migrated in tier 26 —
the data is now in the target database — even though no confirmed app
UI exists for it yet. Migrating the data cost nothing and means it
isn't lost; building a UI for it can happen later without needing to
re-run anything.

## A real risk found while building this: passwords

`Utilisateur.motPasse` in the legacy database is very likely plaintext or
a weak hash, not bcrypt (this app's expected format). **Migrating it
directly would either break login for everyone or silently create a
security downgrade.** `migrateUtilisateurs()` deliberately does NOT carry
over the real password — every migrated user gets an unusable placeholder
hash, and `role` defaults to `"Utilisateur"` except a user whose login is
literally `"admin"`. **You must reset every migrated user's password**
(via `/admin/users`, or a one-off follow-up script) before anyone can log
in. This was a deliberate safety choice made while writing the script,
not something to fix later.

## Resumed in a later session — one real bug found and fixed, tier 4 added

On resuming this work, a fresh `npm install` + `npx tsc --noEmit` re-check
confirmed the existing 3 tiers still type-check cleanly (no drift from
schema changes made elsewhere in between). Added tier 4
(inventory-procurement, see above).

**One real bug caught before it shipped**: `DaArticle.qtRestant` is
`NOT NULL` in the target schema, but the source `qt_restant` column is
nullable — an early draft of `migrateDaArticle()` would have passed
`null` through and failed on the constraint for every DA line where the
source never set that value. Fixed to fall back to the line's original
`qt` (i.e. "nothing ordered against this yet, full amount still
remaining") rather than 0, matching the field's evident purpose.
Caught by checking the actual Prisma field nullability against the
source's, not assumed.

## Tier 5 added — Workshop, with a genuine source-data-quality discovery

Added `migration/modules/05-workshop.ts` (AtelierMachine and its 3
parameter tables, AtelierCreer, and all 6 job sub-tables).

**Found while writing it**: `atelier_donnees` and `atelier_piece` store
numeric-looking data (received/approved/blocked quantities, nominal
measurements, tolerances, 6 sample readings) as `varchar(150)` in the
source — not a numeric column type at all, despite this schema correctly
modeling them as `Decimal`. A direct `Number()` cast would silently
produce `NaN` for any value using a comma decimal separator (common in
French-locale data entry) and crash or corrupt data for blank/junk
entries. Added `parseLenientNumber()` to handle both cases explicitly
rather than assuming the source data is clean.

`atelier_creer.id_demandeur` resolves to `Intervenant`, not
`Utilisateur` — confirmed by reading the actual target `@relation`
definition before assuming it needed the same login-lookup treatment as
`createur`. Since ids are preserved 1:1 throughout this whole migration,
it's a direct pass-through once `Intervenant` (tier: master) has run —
no lookup needed at all.

Type-checked clean after a fresh `npm install` (mssql/@prisma/client/
dotenv had to be reinstalled — unrelated to this change, just the normal
effect of the sandbox packaging step deleting `node_modules` between
sessions), and the full app test suite still passes (28/28).

## Tier 6 added — Production, and the first real exception to id-preservation

Added `migration/modules/06-production.ts` (19 tables: 5 reference
tables, the report header, and 13 report sub-tables).

**The most structurally significant thing found in this whole migration
so far**: `ProdMesureRapport` consolidates 4 real source tables, each
with its own independent id sequence. Every other consolidation already
handled in this project (`DaAction` from 6 action-log tables) hadn't yet
been migrated, so this is the first time the "preserve original ids"
strategy (see "Why original IDs are preserved" above) actually hit a
case it can't handle — 4 different source rows with id=7, say, can't all
become target row id=7. Resolved by confirming (not assuming) no other
table has a foreign key into `ProdMesureRapport.id`, then explicitly
breaking pattern for just this one function: fresh Postgres-generated
ids via `create`, with a rows-already-exist guard standing in for the
`upsert`-based idempotency every other function gets for free. **The
same issue will recur for `DaAction`** (also fed by multiple source
tables, not yet migrated) — flagged here so it isn't independently
rediscovered.

**Two more NOT NULL vs. nullable-source mismatches caught before
shipping**, same category of bug as the `DaArticle.qtRestant` one in
tier 4: `ProdRapportFabProduit.tonnage`, `ProdRapportFourEntre.tonnage`,
and `ProdRapportFourSortie.tonnage` are all `Decimal @default(0)` (NOT
NULL) in the target, but the source `tonnage` column is nullable in all
three. Fixed with `?? 0` on all three before this was ever run, not
after a failure.

Type-checked clean (0 migration/ errors) after reinstall; full app test
suite still passes (28/28).

## Tier 7 added — Fleet, and a real "never migrated at all" gap closed

Added `migration/modules/07-fleet.ts` (9 Fleet transactional tables plus
`EquipementCompteur`, migrated here since it turned out to have been
skipped entirely — see the file's header comment and the tier summary
above).

**How the gap was found**: before writing `EnginCompteurInitial`'s
migration function (which needs `EquipementCompteur` rows to exist
first), grepped all 6 prior tier files for any reference to it — none
existed. Worth doing this check before writing *every* new tier, not
just when something feels missing; this one wouldn't have surfaced from
reading the target schema alone, since `EquipementCompteur` looks like
an ordinary no-dependency reference table that easily could have been
covered by an earlier "core reference data" pass.

Type-checked clean (0 migration/ errors) after reinstall; full app test
suite still passes (28/28).

## Tier 8 added — Budget

Added `migration/modules/08-budget.ts` (Budget, BudgetCategorie,
BudgetFournisseur — the smallest tier so far, 3 tables).

**One real finding**: `budget.categorie` exists as a genuine source
column but has nowhere to go on the target `Budget` model — category
scoping there is handled entirely by the separate `budget_categorie`
join table (already migrated correctly as `BudgetCategorie`). Rather
than silently skip the column, the migration function's own comment
names it explicitly, so anyone reading the code (or wondering later "did
we lose data here?") can see it was a deliberate, documented omission,
not an oversight.

Type-checked clean (0 migration/ errors) after reinstall; full app test
suite still passes (28/28).

## Tier 9 added — Procurement quotes (Dop/Devis) and invoicing

Added `migration/modules/09-procurement-quotes-invoicing.ts` (11 tables:
Dop, DopArticle, DopFournisseur, DopFini, Devis, DevisArticle,
DevisFournisseur, DevisFichier, BonLivraison, Facture,
FactureLivraison).

No confirmed status-code mapping exists for `dop.statut`, `devis.statut`,
or `bon_livraison.statut` (unlike `Commande`/`DemandeAchat` in tier 4,
which do have confirmed mappings) — all three fall back to the same
conservative "0 = En cours, else Clôturée" guess already used for
DemandeAchat, explicitly flagged in the code as unconfirmed for these
three tables specifically, not presented as verified fact.

Type-checked clean (0 migration/ errors) after reinstall; full app test
suite still passes (28/28).

## Resumed again — nearly duplicated tier 9 from scratch

Before starting what was believed to be a new tier (Devis/Dop/Facture),
wrote a full independent implementation
(`08-procurement-devis-facture.ts`) without first checking whether
`run.ts`'s `TIERS` array already referenced it — it did, under tier 9's
actual name, plus a `budget` tier, neither of which had been reviewed
yet this session. Caught before committing to it by noticing `run.ts`
already imported `migrateBudget`/`migrateProcurementQuotesInvoicing`,
functions that hadn't been written in the current pass. Read both
existing files in full, confirmed tier 8 (Budget) checks out exactly
against the real schema, and found tier 9 nearly identical to the
independently-rewritten version — the only real difference being tier
9's `guessStatutFromCode()` (a 2-state simplification) versus a raw-
number passthrough, and tier 9's approach was kept as more consistent
with how `Commande`/`DemandeAchat` already model status elsewhere in
this codebase. The duplicate file was deleted rather than kept as a
second implementation of the same tier.

**Takeaway for future sessions**: always check `run.ts`'s current
`TIERS` array and `grep` `migration/modules/` before assuming a tier is
unbuilt, the same discipline already applied when picking up this whole
`migration/` effort in the first place (see the very first "resumed in a
later session" note above) — the lesson didn't fully carry over the
first time it would have mattered again.

## Tier 10 added — Subcontracting

Applied the lesson from the previous note immediately: checked `run.ts`
and `grep`'d `migration/modules/` for anything Subcontracting-related
before writing a line of code. Nothing existed — a clean, genuinely new
tier this time.

Added `migration/modules/10-subcontracting.ts` (16 tables covering the
full Sous-Traitance vertical: the request header, the activity reference
table, the quote/order/delivery/invoice chain, raw-material and
custom-item requests, the repair-tracking register, and PIN signatures).

**Two things worth flagging deliberately, not silently handled**:

1. `DsBonLivraison.idCommande` — the target schema has a real relation
   here, but the actual source table has no corresponding column at all.
   Rather than infer a value through the indirect line-item chain
   (`DsLivraisonArticle -> DsCommandeArticle -> DsCommande`) or leave it
   unaddressed, the migration explicitly sets it to `null` with a comment
   explaining why, so a future reader doesn't mistake the gap for an
   oversight.
2. `signature.designation` — treated with the exact same caution as
   `Utilisateur.motPasse`: never carry a legacy hash across into a schema
   whose own verification code expects a specific bcrypt format it
   produced itself. Fresh PINs generated and reported out-of-band, same
   mechanism as the password reset flow from tier 1.

Type-checked clean (0 migration/ errors) after reinstall; full app test
suite still passes (28/28).

## Tier 11 added — Preventive Maintenance, and a serious verification gap found

Before writing anything, ran a full diff of every real source table
against everything referenced across tiers 1–10 (`grep -oh "FROM
[a-z_]*"` across every module, deduplicated, diffed against the real
215-table list, false positives from `ProdMesureRapport`'s
multi-source consolidation manually excluded) — this is what surfaced
the 109-table real gap noted above, and confirmed no prior work existed
for Preventive Maintenance specifically before starting.

**While adding the 3 missing Prev* models to `schema.prisma`, discovered
that this project's own verification method has a real, serious hole**:
`npx tsc --noEmit`, in this sandbox, does not actually check Prisma
model or field names at all. Confirmed empirically —
`prisma.thisModelDoesNotExistAtAll.create(...)` produces zero type
errors, because the generated `@prisma/client` here is frozen from
before most of this migration was written (`prisma generate` cannot
reach `binaries.prisma.sh`, tried again explicitly with
`PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` and it still fails — same
network limitation as everywhere else in this project) and falls
through permissively for anything outside that stale shape. Confirmed
separately that the check *does* still catch normal TypeScript errors
(wrong argument types, undefined variables), so it hasn't been
worthless — just silently blind to the one thing that matters most
here. See the new "⚠️ A real limitation" section near the top of this
file for the full explanation and what running this for real requires.

**Given the type-check couldn't be trusted, wrote an actual field-name
auditor** — a script that parses every `model` block in `schema.prisma`
for its real field names, finds every `prisma.<model>.upsert/create(...)`
call across every migration module, extracts the literal object keys
passed to each, and diffs them against the real fields. Ran it across
**the entire migration, all 11 tiers, not just this one** — this
approach found problems that manual reading (the method relied on
throughout every previous tier) had missed:

1. **A real bug**: `migrateAtelierCreer` (tier 5, written 2 sessions
   ago) tried to write a `commentaire` field directly onto
   `AtelierCreer` — but that model has no such field. Comments live in a
   separate one-to-many table, `AtelierCommentaire`. This would have
   failed with a real Prisma "unknown argument" error on every row with
   a non-null source comment, the first time this ran against an
   actually-generated client. Fixed: the job row now migrates without
   that key, and a linked `AtelierCommentaire` row is created afterward
   when the source value is non-empty.
2. A flagged false positive (`ProdMesureRapport`, tier 6) turned out to
   be a bug in the *auditor script itself*, not the migration — it
   assumed every Prisma call uses a `create:` key, but plain `.create()`
   calls use `data:` instead, so it was reading an unrelated, later
   `create:` block from a different function entirely. Fixed the script
   to scope each call's own arguments correctly before trusting its
   output, then re-ran clean.

Final pass: **111 create/upsert calls checked across all 11 tiers, 0
remaining problems.** This is a stronger confidence claim than any
previous "type-checked clean" note in this document, and it's the
standard future tiers should be held to — not just a `tsc` pass.

Type-checked clean (0 migration/ errors — with the caveat above) after
reinstall; full app test suite still passes (28/28).

## Tier 12 added — DA action history

Applied tier 11's own recommendation immediately: this tier was picked
directly off the tracked 109-table gap list rather than guessed at, and
the field-name auditor (not just `tsc`) was run from the start rather
than added after the fact.

Added `migration/modules/12-da-action-history.ts` (`DaAction` — the
9-source consolidation flagged as a known future issue back in tier 6's
notes — plus `DaFichier` and `DaArticleEquipement`). One real omission
caught and fixed before the auditor even ran: the first draft forgot
`resetSequence()` calls for `DaFichier`/`DaArticleEquipement` (both
manually set `id`, which desyncs Postgres's sequence counter the same
way every other id-preserving table in this migration needs guarding
against) — `DaAction` itself correctly has no such call, since it uses
fresh auto-generated ids and never sets `id` manually.

Ran the field-name auditor across **all 12 tiers**: 114 create/upsert
calls checked, 0 problems. Type-checked clean (0 migration/ errors, same
caveat as always) after reinstall; full app test suite still passes
(28/28).

## Tier 12 revisited — a real gap the field-name auditor structurally can't catch, and the auditor itself saved as a reusable script

Picked up this session by checking `run.ts` and `grep`ing
`migration/modules/` first, per the standing lesson (tier 9's near-
duplication) — found tiers 8 through 12 already complete, all matching
the real schema exactly on a full re-audit of every SELECT column list
against `docs/12-schema-validation-findings.md`.

**One genuine finding, from a different angle than the field-name
auditor covers**: the auditor validates that *fields the migration
writes* actually exist on the target model — it can't catch the inverse
case, a *source column that was never selected at all*. Checking
`da_refuser`'s and `da_reporter`'s full column lists against tier 12's
SELECT statements (not just re-reading the code) turned up `cause` and
`nouvel_date` — real columns, silently absent from both the query and
the original `DaAction` model, which had no field for either. This is
the same root cause as `Fournisseur.commentaire` (the very first bug
this whole effort found, back in tier 1) — a column missing from a
SELECT — just one the auditor's methodology can't structurally detect,
since there's nothing wrong with the *fields that are written*, only
with what's silently absent from the query. **Worth checking for on
every future tier**: diff the source table's full column list against
the SELECT, not just against the target model's fields.

Fixed by extending `DaAction` with `cause`/`nouvelleDate` (both
optional — confirmed via `grep` that nothing in `src/app/` reads or
writes any `DaAction` field beyond `idDa`/`type`/`par`, so this is fully
backward compatible) and populating both from the two source tables that
have them.

**The field-name auditor itself was never saved as a file** in any prior
session — it was described in this document as having been run, but
existed only as an ad-hoc script each time. Saved properly this time as
`migration/audit-field-names.py`, with a `where:`-clause check added
(the previous version only checked the `create`/`data` block, missing a
whole other place a bad field name could hide in an `upsert` call).
Re-run against all 12 tiers after the `DaAction` schema change: **114
calls checked, 0 problems.**

Type-checked clean (0 migration/ errors, same frozen-client caveat as
always) after reinstall; full app test suite still passes (28/28).

## Tier 13 added — Diagnostics

Checked `run.ts` and `migration/modules/` first (no surprise prior
work this time), then re-ran the source-table diff described in tier
11's note to pick the next target rather than guess: 91 tables remained
after excluding the two known dynamic-`FROM`-clause false-positive
groups (`DaAction`'s 9 sources, `ProdMesureRapport`'s 4 — neither
literal-greppable). Diagnostics was the cleanest, most self-contained
piece of that list — 8 tables, already fully supported by an existing
app feature (built much earlier in this project), with `Symptome`
itself already migrated in tier 1.

Added `migration/modules/13-diagnostics.ts`. Nothing noteworthy went
wrong — every source column matched its target field on first check,
confirmed by reading `docs/12-schema-validation-findings.md` and the
real schema export directly rather than trusting memory. Ran the
field-name auditor (`migration/audit-field-names.py`) across all 13
tiers: **122 calls checked, 0 problems.** Type-checked clean (0
migration/ errors) after reinstall; full app test suite still passes
(28/28).

## Tier 14 added — Article Characteristics/Units

Checked `run.ts` and `migration/modules/` first (no surprise prior
work), then re-ran the source-table diff (excluding the two known
dynamic-`FROM`-clause false-positive groups): 83 tables remained.
Article Characteristics/Units was the next cleanest, most self-contained
target — 6 tables, corresponding to an existing, already-built app
feature (the dynamic per-sous-famille custom-field system).

Added `migration/modules/14-article-characteristics-units.ts`. Another
clean tier — every source column matched its target field exactly, no
naming mismatches, no type surprises. Ran the field-name auditor across
all 14 tiers: **128 calls checked, 0 problems.** Type-checked clean (0
migration/ errors) after reinstall; full app test suite still passes
(28/28).

## Tier 15 added — Equipment detail tabs

Checked `run.ts` and `migration/modules/` first (no surprise prior
work), re-ran the source-table diff: 77 tables remained. Equipment
detail tabs was next — 6 tables, corresponding to an existing app
feature (the equipment tab UI built earlier in this project).

Added `migration/modules/15-equipement-detail-tabs.ts`. One thing worth
double-checking rather than assuming would just work:
`equipement_prevision.cout_arrêt`/`nbre_arrêt` genuinely have accented
characters in their real column names. Bracket-quoted them in the
SELECT (same convention the legacy DDL itself uses), then actually
tested — not assumed — that plain dot-notation access on the resulting
JS object property (`r.cout_arrêt`) is syntactically valid and compiles
cleanly, since accented letters are valid Unicode identifier characters
in JavaScript. `equipement_image.photo` (a real binary column) reused
the existing `toBufferOrNull()` pattern from tier 1 rather than
reinventing it.

Ran the field-name auditor across all 15 tiers: **134 calls checked, 0
problems.** Type-checked clean (0 migration/ errors) after reinstall;
full app test suite still passes (28/28).

## Tier 16 added — Gamme resource planning & OT resource usage

Checked `run.ts` and `migration/modules/` first (no surprise prior
work), re-ran the source-table diff: 71 tables remained. Picked
Gamme/OT resources next — 6 tables, corresponding to an existing app
feature (Gamme staffing/tooling/parts planning, plus actual OT-level
resource usage tracking).

**One real gap found**: `ot_ressources_fonction` has 5 real source
columns with no home on the original `OtRessourcesFonction` model
(`nbre_requis`/`min_planif`/`type_cout`/`date_debut`/`heure_debut`) —
the same class of finding as `DaAction.cause`/`nouvelleDate` (tier 12).
Confirmed nothing in `src/app/` references `OtRessourcesFonction` at
all before extending the model (all 5 new fields optional, fully
backward compatible), then wired the migration to populate them.

Ran the field-name auditor across all 16 tiers: **140 calls checked, 0
problems.** Type-checked clean (0 migration/ errors) after reinstall;
full app test suite still passes (28/28).

## Tier 17 added — Auto-reorder

Checked `run.ts` and `migration/modules/` first (no surprise prior
work), re-ran the source-table diff: 65 tables remained. Auto-reorder
was next — 4 tables, corresponding to an existing app feature
(Réapprovisionnement/Recomplétement recurring reorder planning).

Added `migration/modules/17-auto-reorder.ts`. Clean — every source
column matched its target field exactly, no naming mismatches, no type
surprises. Ran the field-name auditor across all 17 tiers: **144 calls
checked, 0 problems.** Type-checked clean (0 migration/ errors) after
reinstall; full app test suite still passes (28/28).

## Tier 18 added — closing every table that already had a model waiting

Re-ran the diff process tier 11 established (`grep -oh "FROM
[a-z_]*"` across every module — extended this time to also catch tables
referenced via a dynamic `table:` field, like `ProdMesureRapport`'s and
`DaAction`'s multi-source consolidations, which the original literal-
`FROM`-only grep would have missed and silently mis-reported as
uncovered) — found 61 tables genuinely remaining, down from 109 before
tier 11. Cross-referencing that list against `schema.prisma`'s `@@map()`
targets split it cleanly: 19 tables already had a correct model waiting
(built in earlier, separate app-development work, never migrated), 42
need new schema modeling first. Migrated all 19 in this tier rather than
leaving the schema-vs-migration gap sitting there — it's genuinely lower
risk than any new-schema tier, since the "does this data have anywhere
to go" question is already answered.

Two real, if narrow, schema gaps found and flagged rather than routed
around: `ot_bl.id_t` and `tab_lancement_affectation.motif` both exist in
the source with real data, but neither has a corresponding field on its
target model. Left unmapped, with a comment at both the file header and
the specific `SELECT` explaining why — a genuine "someone should add a
field for this" note, not a migration bug.

`outils.prix_achat` turned out to be `varchar(50)` despite being
conceptually numeric — same category of issue as tier 5's
`atelier_donnees`/`atelier_piece`, and handled the same way
(`parseLenientNumber()`, reused verbatim rather than reinvented).

Ran the field-name auditor across all 18 tiers: **163 calls checked, 0
problems.** Type-checked clean (0 migration/ errors) after reinstall;
full app test suite still passes (28/28). Re-ran the table-coverage diff
one more time after this tier: **175 of 215 real tables now covered, 42
genuinely remaining** — see the updated "Not yet built" note above.

## Tier 19 added — Fournisseur reference-data (new schema + app UI + migration)

Unlike tier 18, this is the first tier since the app-development work
resumed that required a full new feature pass, not just a migration
function for an already-modeled table: 6 confirmed real tables
(`tableau_fournisseur_*` — activité/compte/devise/fichier/livraison/
règlement) linking `Fournisseur` to 5 fixed reference-data categories,
plus the 5 `parametre_*_fournisseur` lookup tables themselves. Added the
Prisma models (Phase 22 in `schema.prisma`), a settings page
(`/procurement/settings/fournisseur-reference`) for the 5 lists, a new
"Profil" tab on the supplier detail page for the associations, and this
migration module — same order every prior "new schema" tier in this
project has followed (schema → app feature → migration → validation),
not migration-only.

**A real path bug caught before shipping**, same category as tier 7's
naming-mismatch finding but on the *app* side this time: every new
server action was written against `/procurement/fournisseurs/${id}`
— matching the Prisma model name (`Fournisseur`) rather than the actual
Next.js route, which is `/procurement/suppliers/${id}`. Caught by
checking the real directory structure before wiring up the UI (not
after a broken link surfaced) — 16 occurrences fixed in one pass.

Ran the field-name auditor across all 19 tiers: **174 calls checked, 0
problems.** Type-checked clean (0 migration/ errors) after reinstall;
full app test suite still passes (28/28). Seed data added and
re-validated for the new demo fournisseur associations.

## Tier 20 added — Article reference-data (new schema + app UI + migration)

Same shape as tier 19: 8 confirmed real tables — 3
`tableau_article_*` links to fixed-category `parametre_*` lookups
(classification/emplacement/stockage), plus 2 direct links
(`tableau_article_equipement` — which equipment this part fits;
`tableau_article_fournisseur` — a standing "usual suppliers" list,
confirmed complementary to rather than a duplicate of the DOP/Devis
price-survey workflow tier 9 already covers). Added the Prisma models
(Phase 23), a settings page for the 3 lists, and 5 new association
sections on the Article detail page (reused the exact `LinkSection` UI
pattern from tier 19's supplier Profil tab rather than inventing a new
one) — no dedicated new route needed here, unlike Fournisseur, since
Article's detail page already had room.

**A ninth table, `parametre_image`, was deliberately left out of both
the app UI and this migration** — found while confirming the other 8's
structure, it's a genuine outlier: no `id_article` or any FK at all, a
single-row global config table holding 3 fixed site photos. Modeled in
`schema.prisma` for completeness (so it isn't lost track of), but no
migration function or UI was built for it — no confirmed usage context
was found anywhere in the decompiled source for which screen actually
displays these photos, and guessing would mean inventing both a UI and
a migration for a feature whose real shape isn't actually known yet.

Ran the field-name auditor across all 20 tiers: **182 calls checked, 0
problems.** Type-checked clean (0 migration/ errors) after reinstall;
full app test suite still passes (28/28). Seed data added and
re-validated for the new demo article associations.

## Tier 21 added — Notification system (new schema + app UI + migration)

Re-ran the coverage diff fresh before picking a target (rather than
trusting the previous "Not yet built" summary) — this caught 2 tables
missing from that summary (`operation_maintenance`,
`parametre_cause_realisation`/`parametre_centre_charge`), corrected in
the note above. Picked Notification: 2 confirmed real tables —
`Notification` (the event, polymorphic `idN`+`type` reference to
whatever triggered it, no real FK) and `NotificationAlerte` (a
follow-up/escalation alert tied back to a specific Notification).

**A deliberate modeling distinction, not an inconsistency**: `idUtilisateur`
on both tables is a real FK to `Utilisateur.id`, unlike the login-string
pattern used for `createur`-style fields everywhere else in this
migration. The difference is real — those fields are an audit trail of
who performed an action; these represent who should currently see a
notification, a genuine targeting relation. Worth remembering as the
rule going forward: audit "who did this" → login string; ownership/
targeting "this belongs to" → real FK.

Built `/notifications` (list, mark-read, mark-all-read) and a sidebar
badge showing the live unread count. **Deliberately did not build
automatic notification generation** — no trigger logic (e.g. "notify on
overdue OT") was found anywhere in the decompiled source, and inventing
one would mean guessing at business rules rather than confirming them.
This covers read/display/acknowledge only, which is what's confirmed to
exist.

Ran the field-name auditor across all 21 tiers: **184 calls checked, 0
problems.** Type-checked clean (0 migration/ errors) after reinstall;
full app test suite still passes (28/28). Seed data added and
re-validated for the new demo notification/alerte.

## Tier 22 added — Activité scoping & operations checklist

Re-ran the coverage diff fresh (21 tables confirmed remaining, matching
the corrected count from tier 21's update — no further drift this
time). Picked Activité scoping: 3 tables extending the already-migrated
`ActiviteSousTraitance` (Subcontracting, tier 10) with which
Famille/SousFamille an activity applies to, plus a repeatable operations
checklist.

Extended the existing Activités settings page rather than building a
parallel one — each row now links to a detail page with the
Famille/SousFamille associations, reusing the same `LinkSection`-style
UI pattern from tiers 19/20 (Fournisseur/Article profiles) for the third
time rather than reinventing it again.

Ran the field-name auditor across all 22 tiers: **187 calls checked, 0
problems.** Type-checked clean (0 migration/ errors) after reinstall;
full app test suite still passes (28/28). Seed data added and
re-validated for the new demo activité scoping.

## Tiers 23-24 — retroactive entries (built without a matching README update at the time)

Both tiers exist and pass the field-name auditor, but neither got its
own entry here when built — filling that gap now rather than leaving it
undocumented, same reasoning as the retroactive entry in
`docs/12-schema-validation-findings.md` §25.

**Tier 23** (`23-ot-equipement-misc.ts`): `ParametreCauseRealisation`/
`OtCauseRealisation`, `ParametreCentreCharge`, `EquipementCompteurHistorique`
vs. `EquipementCompteurNv` (confirmed as two distinct concepts from the
source's own separate tables, not a duplicate), and `CompteurLiaison`.
Also fixed a real gap: `OtCentreCharge` (tier 18) had a bare, unrelated
`idCentreCharge` int before `ParametreCentreCharge` existed to give it a
real relation — fixed once the lookup table existed, same precedent as
`EquipementCompteur` in tier 7.

**Tier 24** (`24-production-remaining.ts`): `ProdMesure`,
`ProdRapportChefEquipe`, `ProdRapportHeure`. No app UI built — same
reasoning as `parametre_image` (tier 20): no confirmed UI destination
found in the decompiled source for this pass.

## Tier 25 added — `LivraisonArticle` correction, plus 6 more small tables

Re-ran the coverage diff fresh, as always, before picking a target —
this is the tier that found the correction below.

**A real correction, not a new discovery.** An earlier pass (tier 4 /
Phase 16) modeled `BonLivraison` as having no line items of its own,
assuming it just displayed its linked `Reception`'s items instead. That
assumption was wrong — confirmed directly against `creer_bl.cs`'s actual
insert statement, which writes a genuine `livraison_article` row with
its own qty/price/discount, independent of `reception_article`. Fixed
the schema (added `LivraisonArticle`, a real relation to `BonLivraison`)
and the app: the `BonLivraison` detail page now has real add/list line-
item UI with a computed total, and the `Facture` detail page now shows a
real computed total instead of the "not tracked digitally" disclaimer it
carried before this — that disclaimer was correct *at the time*, given
what was known then, but this correction makes it outdated.

Also migrated 6 more small tables found in the same diff re-run:
`AtelierReception`, `GammeCentreCharge`, `OperationMaintenance`,
`OutilUtilisation`, `PlanMaintenance`, and `ReclamationAnomalie` (built a
full page for this one, `/fleet/reclamations`, since it's genuinely
user-facing — the others got schema + migration only, no UI, since
they're config/log-style tables with no confirmed UI destination for
this pass).

**`test_equip` deliberately excluded entirely** — not modeled, not
migrated. Its shape breaks every convention the other 214 real tables in
this schema follow: a `varchar` primary key instead of int identity, and
generic English-ish field names (`created`/`modified`/`parentid`)
instead of this app's consistent French naming. Reads as a scratch/test
artifact in the source database itself.

**A real documentation bug found and fixed while writing this update**:
`docs/12-schema-validation-findings.md` had duplicate section numbers
(§15-18 used twice for genuinely different content) and no entry at all
for tier 24. Fixed both — renumbered and added the missing section.
Worth remembering this doc can accumulate its own errors across many
sessions, same as the code it documents; verify before writing new
claims about state, don't just append.

Ran the field-name auditor across all 25 tiers: **203 calls checked, 0
problems.** Type-checked clean (0 migration/ errors) after reinstall;
full app test suite still passes (28/28). Seed data added and
re-validated for all 7 new tables. Re-ran the table-coverage diff:
**213 of 215 real tables now covered** — verified by actually re-running
the diff, not estimated, given how much this update already talks about
the value of checking rather than asserting. Table coverage for this
migration is effectively complete.

## Post-tier-25 — `GammeCentreCharge` corrected, app UI added for 4 tables

With table coverage effectively complete, went back and built real app
UI for the tables tier 23-25 had only given a migration function to.

**`GammeCentreCharge`'s migration function needed a small update**: the
schema was corrected after the fact (see
`docs/12-schema-validation-findings.md` §27) to use a real
`ParametreCentreCharge` relation instead of a bare `idCentreCharge` int
— the exact gap `OtCentreCharge` (tier 18) had before tier 23 fixed it.
The migration function's SQL and transform logic didn't need to
change (the source column was always a plain int id; only the Prisma
side's treatment of it changed), but the comment explaining why was
added so the reasoning doesn't have to be rediscovered from the diff
alone.

Built UI for `GammeCentreCharge` (Gamme detail page), `OperationMaintenance`
(new `/work-orders/settings/interventions` area — `ParametreIntervention`
had no settings page at all before this), `PlanMaintenance` (standalone
settings list), and `AtelierReception` (Workshop job detail page).
Checked `OutilUtilisation` first rather than assuming it needed the same
treatment — it was already fully built from earlier work, so nothing was
added there.

Ran the field-name auditor across all 25 tiers: **203 calls checked, 0
problems** (unchanged from before — the `GammeCentreCharge` schema
correction changed its shape, not its migration call count).
Type-checked clean (0 migration/ errors) after reinstall; full app test
suite still passes (28/28). Seed data added for all 4 new-UI features
and re-validated.

## Tier 26 added — `ParametreImage`, closing the last real, sensible table

Requested explicitly: finish table coverage so testing against real
data can start. Added `migration/modules/26-parametre-image.ts` for the
one remaining real, sensible table — `parametre_image`, previously
deferred (not excluded) since no confirmed UI destination existed for
its 3 site photos. Migrating the data now costs nothing and doesn't
block on that UI question ever getting answered; the data simply won't
be lost.

`test_equip` remains deliberately excluded, not migrated — see the
"Not yet built" note above for why (a scratch/test artifact in the
source database's own shape, not a real feature).

Ran all 9 verification scripts (6 app-layer, 3 migration-layer): all
clean, including a fresh re-run of the table-coverage diff —
**214 of 215 real tables now migrated.** Type-checked clean (0
migration/ errors) after reinstall; full app test suite still passes
(28/28).

## Running this for real

1. Restore a copy of the real SQL Server database to a **staging**
   instance — never point this at production. Confirm you're connected
   to the copy, not the original, before continuing.
2. `cp migration/.env.migration.example migration/.env.migration` and
   fill in your real connection details.
3. Point `DATABASE_URL` (in your regular `.env`) at a **fresh** Postgres
   database — `npx prisma db push` to create the schema there first.
4. Dry run first: `npm run migrate:legacy -- --dry-run` — reads
   everything, writes nothing, logs row counts per table. Skim the
   output for anything that looks obviously wrong (a table with 0 rows
   you expected data in usually means a connection/permissions issue,
   not a bug in this script).
5. Run for real: `npm run migrate:legacy`. Takes a while — 26 tiers,
   over 200 tables. Watch for `⚠` warnings in the per-row error output;
   a handful of skipped rows on legacy data with known inconsistencies
   is expected and fine (see "Error handling" above), but a tier
   failing outright is not — stop and investigate rather than continuing
   past it.
6. **Every migrated user's password needs resetting** before anyone can
   log in — this isn't a follow-up task, it's required for day one.
   `Utilisateur.motPasse` in the legacy DB is very likely plaintext or
   weakly hashed, and this app expects bcrypt, so no legacy password is
   carried over at all: every migrated user gets a single, deliberately
   unusable placeholder hash. Reset each one via `/admin/users` (or a
   one-off follow-up script) before anyone can log in — there's no
   generated-password file to check for this part, by design.

   Separately, if you migrated the Subcontracting module's e-signature
   PINs (tier 10), those *are* individually regenerated and reported to
   `migration-temporary-signature-pins.json` in your working directory —
   distribute those out-of-band and delete the file afterward.
7. Spot-check: open a handful of real records across a few different
   modules in the app itself and confirm they look right — this
   migration has been verified as thoroughly as static analysis and
   careful reading of decompiled source allow, but it has never been
   run against real data (see the limitation noted at the top of this
   file), so this first real run is also its first real test.
8. If something looks wrong in a specific table, `npm run migrate:legacy
   -- --only=<tier-name>` re-runs just that tier — every tier is
   idempotent (upsert-based) except `ProdMesureRapport`'s consolidation
   function, which is explicitly guarded against re-running — see its
   code comment in `migration/modules/06-production.ts`.
