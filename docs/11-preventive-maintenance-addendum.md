# Automatic Preventive Maintenance Generation — Addendum to Phase 1

Reverse-engineered from `lancement_ot_preventive.cs`. This corrects and
completes the `PrevSystematique`/`PrevConditionnelle`/`PrevCompteur` models
originally sketched in Phase 1 (`01-maintenance-module-spec.md`), which
were rough placeholders never actually implemented — no page or action in
the project referenced them until now.

## What changed from the Phase 1 placeholder schema

The original models guessed at simple shapes (`periodiciteJours`,
`prochaineDate`, `seuil`, `periodiciteValeur`). Reading the actual
generation logic in `lancement_ot_preventive.cs` revealed the real columns
are meaningfully different and more capable — see the schema comments on
each model for the confirmed field list. Nothing in the rest of the app
referenced the old field names, so this was a clean replacement, not a
breaking migration concern for anything already built.

## The three trigger mechanisms (confirmed from source)

1. **Systématique** (`creation_ot_systematique`, calendar-based — the
   actual generation call wasn't in this file, but the table structure
   confirms `frequence` + `periode` + `dateDebut` + `lancerOtAvant`, a
   lead-time in days before the calculated due date). **Reconstruction
   note**: since the exact "next due date" computation wasn't in the
   traced code, this implementation computes it as (last generated OT's
   `debutPrevu` for this exact plan) + (frequence × periode), or the
   plan's `dateDebut` itself if no OT has been generated yet. This is a
   reasonable interpretation, not a confirmed algorithm.
2. **Par compteur** (`creation_ot_compteur`, confirmed in full detail):
   compares `EquipementCompteur.valeurActuelle` against
   `PrevCompteur.valeurLancement` using `typeValeur` ("Sup" = trigger when
   current ≥ threshold, "Inf" = ≤). On trigger, if `reinitialisation =
   "Oui"`: resets the counter immediately when `typeInitial = "Au
   Lancement de l'OT"`, or defers the reset until the generated OT closes
   (tracked via the confirmed real table `ot_reinit_compteur`) for any
   other timing value. A plan with a pending reset is excluded from
   re-triggering — implemented via `reinitTracking: { none: {} }`.
3. **Conditionnelle** (`creation_ot_mesure`, confirmed): same Sup/Inf
   threshold logic, but triggered by a manually-entered measurement rather
   than a stored equipment value. The legacy app calls this from wherever
   a measurement gets recorded — no separate measurement-entry catalog was
   found in this schema, so the web version evaluates a value entered
   directly against the plan being checked, one at a time.

## What's implemented

- `/work-orders/preventif`: lists active plans of all three types, lets an
  Admin create new plans and deactivate existing ones, and provides
  "Générer les OT dus" / "Évaluer et générer" buttons for the systematic
  and counter mechanisms (batch-evaluates all active plans), plus a
  per-row manual value-entry form for conditional plans.
- Generated Work Orders use type `"Préventive Systématique"` /
  `"Préventive Syst Compteur"` / `"Préventive Conditionnelle"` — matching
  the existing `OT_TYPES` constant from Phase 1.
- Gated with `requireAdmin()` — bulk OT generation is exactly the kind of
  action flagged as sensitive in the authorization work.

## What's still not built

- **No scheduler.** "Générer les OT dus" is a manual button, not a cron
  job — consistent with how Budget's `creationAuto` auto-renewal was
  handled (same reasoning: real scheduling needs infrastructure this
  project doesn't set up, documented rather than faked).
- **The measurement-entry catalog** implied by `creation_ot_mesure(id_mesure,
  valeur)` — a proper build would let a technician log a sensor/gauge
  reading against a named measurement point, which then auto-evaluates
  every conditional plan tied to it. The current implementation collapses
  this into "enter a value directly against a specific plan," which is
  functionally equivalent for a single plan but loses the "one
  measurement triggers many plans" pattern the naming implies.
- **`creation_ot_systematique`'s exact due-date algorithm** wasn't traced
  in the source — see the reconstruction note above.
