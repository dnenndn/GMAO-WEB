# Workshop Module — Functional Spec (Phase 5) — "Atelier"

Reverse-engineered from the legacy GMAO WinForms app (`atelier_creer.cs`,
`atelier_historique.cs`, `atelier_fiche_reception_controle_piece.cs`,
`atelier_suivi_journalier.cs`, `atelier_liste_bsm.cs`,
`atelier_parametre_*.cs`).

## 1. What this module actually is

⚠️ **Naming collision with the Production module**: despite sharing the
word "atelier," this is **not** the same concept as Production's
`unite_production` (a fixed processing stage — Préparation/Fabrication/
Four/Emballage). This "Atelier" is an **internal machine shop / tool room**
that fabricates **custom spare parts from technical engineering drawings**
— much closer to a job-shop manufacturing tracker than a production line.

The clearest evidence: `atelier_piece`, a genuine **dimensional
first-article-inspection record** — a nominal measurement, a tolerance
band (`plus`/`tire`), and up to 6 sample readings (`p1`–`p6`) per
characteristic being measured. This is standard machine-shop quality
control, not anything the Production module does.

## 2. Workflow

1. A **job** is created (`AtelierCreer`) when a part needs fabricating —
   references the equipment it's for (atelier/équipement/sous-équipement/
   organe, same 4-level tree as Maintenance), a requester (`demandeur`),
   a **technical drawing reference** (`nPlan`/`nRevision` — plan number
   and revision), quantity, and dimension.
2. Classified by 3 reference-data axes: **piece type**
   (`ParametrePiece`), **priority** (`ParametrePriorite`), and
   **conception type** (`ParametreConception`) — all simple lookup lists.
3. The job moves through a **state machine** (`etat`), tracked with a full
   history log (`AtelierEtat`):
   - `En Attente` — waiting
   - `En Attente MP` — waiting for raw material (MP = Matière Première)
   - `En Attente Achat` — waiting on a purchase (links conceptually to the
     Procurement module, though no hard FK was found in the source)
   - `En Cours Méthode` — in progress, planning/methods stage
   - `En Cours Atelier` — in progress, actual machining
   - `Op Exeternalisée` — operation externalized/subcontracted
   - `A Vérifié` — awaiting QC verification
4. **Raw material consumption**: a job can be linked to one or more `Bsm`
   (stock issue slips) via `AtelierBsm` — reusing the existing Inventory
   module rather than building a parallel stock-issue mechanism.
5. **Daily time tracking** (`AtelierSuiviJournalier`): logs which machine
   and operator worked the job on a given day, with start/end time and
   remaining quantity (`qtSolde`) — this is what lets a supervisor see
   real-time progress on the shop floor.
6. **Quality control on completion**:
   - `AtelierDonnees` — a reception/QC summary: quantity received,
     quantity approved vs. blocked, remarks, and a release sign-off
     (`liberation`). Also flags whether the work was subcontracted
     (`sousTraitant`).
   - `AtelierPiece` — the dimensional measurement records described above.
7. **Returns/rejections** (`AtelierRetour`) — the `idNv` column's exact
   meaning wasn't recoverable from static analysis (possibly "non
   validé" / a non-conformity severity level); kept as a plain nullable
   integer pending clarification.
8. Once complete, the fabricated part **can become a real stock Article**
   (`AtelierCreer.idArticle`) — closing the loop with the Inventory module.

## 3. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `atelier_creer.cs` | `/workshop/jobs/new`, `/workshop/jobs/[id]` | P0 |
| `atelier_gestion.cs`, `atelier_list_general.cs` | `/workshop/jobs` (list, filterable by état) | P0 |
| State-change actions (embedded in `atelier_creer.cs`/`atelier_gestion.cs`) | Status-transition buttons on job detail | P0 |
| `atelier_suivi_journalier.cs` | `/workshop/jobs/[id]/suivi` (daily log entries) | P0 |
| `atelier_liste_bsm.cs` | Raw-material (BSM) linking on job detail | P0 |
| `atelier_fiche_reception_controle_piece.cs` | `/workshop/jobs/[id]/qualite` (QC data + dimensional measurements) | P1 |
| `atelier_parametre_*.cs` (machine, piece type, priority, conception) | `/workshop/settings/*` | P0 |
| `atelier_historique.cs` | Folded into the job detail page's status history | P1 |
| `atelier_liste_commentaire.cs`, `atelier_liste_fichier.cs` | Comments/files tabs — deferred, same P2 pattern as other modules | P2 |

**P0 = this pass** — job creation, the état state machine with history,
daily time tracking, BSM linking, and reference-data settings. QC/
dimensional inspection is P1 given its specialized, lower-frequency use.

## 4. Notable business rules

- `nOf` (numéro d'ordre de fabrication) is the job's human-readable
  reference, used as a **loose text key** in `atelier_suivi_journalier`
  rather than a real foreign key — exactly the same pattern as
  `OrdreTravail.nOt` being referenced loosely from `Bsm` in Maintenance.
  Preserved as-is in this schema (`AtelierSuiviJournalier.nOf` is a plain
  string, not a relation) for fidelity, even though `AtelierCreer.nOf`
  is `@unique` and a real relation would be possible.
- The job's 4-level equipment reference (atelier/équipement/
  sous-équipement/organe) mirrors the same denormalized pattern used in
  `OrdreTravail` and `DemandeIntervention` — kept for consistency.
- `AtelierDonnees.sousTraitant` suggests some workshop jobs are actually
  outsourced rather than machined in-house, which would make this module
  partially overlap with a future Sous-Traitance module — worth watching
  for duplication once that module gets built.

## 5. Open questions for you

1. What does `AtelierRetour.id_nv` actually reference? No lookup table
   join was found in the surrounding code to confirm.
2. Is there a real foreign key intended between a job in `En Attente
   Achat` state and a `DemandeAchat` (Procurement)? The legacy code
   doesn't show one, but the workflow strongly implies a connection.
3. Should completed jobs *require* linking to a stock `Article`
   (`idArticle`), or is that optional in practice (e.g. for one-off
   repairs that never enter inventory)?
4. I added an 8th état, **"Terminé"** (Done), that wasn't in the 7 values
   I found in the legacy dropdown scrape — the workflow needs a terminal
   closing state and none of the confirmed 7 reads as one (even
   "A Vérifié" is pre-closure, not post). Worth confirming whether the
   real database has a distinct closing state I missed, or whether
   "A Vérifié" is in fact treated as terminal in practice.
