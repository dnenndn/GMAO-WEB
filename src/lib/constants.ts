// Values below are copied verbatim from the legacy WinForms dropdowns
// (ordre_travail.cs: select_priorite_ajout / select_etat_ajout / select_type_intervention_ajout)
// so behaviour and filtering stay compatible with historical data.

export const URGENCES = ["Elevée", "Moyenne", "Faible"] as const;
export type Urgence = (typeof URGENCES)[number];

export const OT_STATUTS = [
  "En Préparation",
  "Planifié",
  "En Cours",
  "En Attente Arrêt Machine",
  "Sous-Traitant à contacter",
  "Clôturé",
  "Annulé",
] as const;
export type OtStatut = (typeof OT_STATUTS)[number];

export const OT_TYPES = [
  "Corrective",
  "Corrective Curative",
  "Corrective Palliative",
  "Préventive Systématique",
  "Préventive Syst Compteur",
  "Préventive Conditionnelle",
  "Travaux Neufs",
] as const;
export type OtType = (typeof OT_TYPES)[number];

// CORRECTED — these values were wrong, apparently borrowed from the
// separate DA (DemandeAchat) workflow's vocabulary rather than DI's own.
// Found by re-checking the decompiled C# source directly against real,
// already-migrated data: the real source column is a plain `int` with
// confirmed values 0/1/5, not this 5-value string set at all. See
// prisma/schema.prisma's DemandeIntervention.statut comment and
// migration/fixups/di-statut-recovery.ts for the full evidence trail.
export const DI_STATUTS = ["En Attente", "Validée", "Annulée"] as const;
export type DiStatut = (typeof DI_STATUTS)[number];

export function urgenceColor(u?: string | null) {
  switch (u) {
    case "Elevée":
      return { fg: "#B3261E", bg: "#FBE9E7" };
    case "Moyenne":
      return { fg: "#C97A0C", bg: "#FBF0DE" };
    case "Faible":
      return { fg: "#3D7A4E", bg: "#E7F2E9" };
    default:
      return { fg: "#6B7280", bg: "#EEEEEC" };
  }
}

export function statutColor(s?: string | null) {
  switch (s) {
    case "Clôturé":
    case "Clôturée":
      return { fg: "#3D7A4E", bg: "#E7F2E9" };
    case "En Cours":
      return { fg: "#204450", bg: "#D6E2E6" };
    case "Planifié":
      return { fg: "#2B5C6B", bg: "#EEF3F5" };
    case "En Préparation":
    case "En attente":
    case "En Attente":
      return { fg: "#6B7280", bg: "#EEEEEC" };
    case "Validée":
      return { fg: "#3D7A4E", bg: "#E7F2E9" };
    case "En Attente Arrêt Machine":
    case "Refusée":
    case "Annulée":
      return { fg: "#B3261E", bg: "#FBE9E7" };
    case "Sous-Traitant à contacter":
    case "Reportée":
      return { fg: "#C97A0C", bg: "#FBF0DE" };
    default:
      return { fg: "#6B7280", bg: "#EEEEEC" };
  }
}

// ----------------------------------------------------------------------------
// Production module (brick/ceramics line)
// ----------------------------------------------------------------------------

// Legacy hardcoded dropdown values (prod_rapport.select_poste)
export const POSTES = ["Jour", "Soir", "Nuit"] as const;
export type Poste = (typeof POSTES)[number];

// Legacy hardcoded dropdown values (prod_param_equipement.select_unite_production)
export const UNITES_PRODUCTION = [
  "Préparation",
  "Fabrication",
  "Four",
  "Emballage",
] as const;
export type UniteProduction = (typeof UNITES_PRODUCTION)[number];

// Legacy fuel consumption points, confirmed from prod_recap.cs column
// headers ("Fuel Séchoir 1 (T)", "Fuel Four 1 (T)", "Fuel Général (T)") —
// all measured in tonnes.
export const FUEL_POINTS = [
  "Séchoir 1",
  "Séchoir 2",
  "Séchoir 3",
  "Four 1",
  "Four 2",
  "Général",
] as const;

// UNCONFIRMED — unlike FUEL_POINTS (confirmed from legacy column headers),
// no equivalent confirmation was found for prod_gaz's measurement points.
// Mirrors the fuel points as a reasonable guess pending confirmation.
export const GAZ_POINTS = [
  "Séchoir 1",
  "Séchoir 2",
  "Séchoir 3",
  "Four",
] as const;

export function posteColor(p?: string | null) {
  switch (p) {
    case "Jour":
      return { fg: "#C97A0C", bg: "#FBF0DE" };
    case "Soir":
      return { fg: "#2B5C6B", bg: "#EEF3F5" };
    case "Nuit":
      return { fg: "#204450", bg: "#D6E2E6" };
    default:
      return { fg: "#6B7280", bg: "#EEEEEC" };
  }
}

// ----------------------------------------------------------------------------
// Procurement module
// ----------------------------------------------------------------------------

// Confirmed from the legacy list-screen filters: commande_attente.cs (0),
// commande_encour.cs (1), commande_annule.cs (5), commande_cloture.cs (10).
export const COMMANDE_STATUTS = ["En attente", "En cours", "Annulée", "Clôturée"] as const;
export type CommandeStatut = (typeof COMMANDE_STATUTS)[number];

export function commandeStatutColor(s?: string | null) {
  switch (s) {
    case "En cours":
      return { fg: "#204450", bg: "#D6E2E6" };
    case "Clôturée":
      return { fg: "#3D7A4E", bg: "#E7F2E9" };
    case "Annulée":
      return { fg: "#B3261E", bg: "#FBE9E7" };
    case "En attente":
    default:
      return { fg: "#C97A0C", bg: "#FBF0DE" };
  }
}

export function daStatutColor(s?: string | null) {
  switch (s) {
    case "Clôturée":
      return { fg: "#3D7A4E", bg: "#E7F2E9" };
    case "En cours":
    default:
      return { fg: "#2B5C6B", bg: "#EEF3F5" };
  }
}

// ----------------------------------------------------------------------------
// Budget module
// ----------------------------------------------------------------------------

// Confirmed from the legacy dropdown (creer_budget.select_duree).
export const BUDGET_DUREES = [
  "Chaque Jour",
  "Chaque Semaine",
  "Chaque 2 Semaine",
  "Chaque Mois",
  "Chaque 2 Mois",
  "Chaque Trimestre",
  "Chaque Simestre",
  "Chaque Année",
] as const;
export type BudgetDuree = (typeof BUDGET_DUREES)[number];

/// Computes the end date of the current budget period given its start
/// date and recurrence label.
export function budgetPeriodEnd(dateCreation: Date, duree: string): Date {
  const end = new Date(dateCreation);
  switch (duree) {
    case "Chaque Jour":
      end.setDate(end.getDate() + 1);
      break;
    case "Chaque Semaine":
      end.setDate(end.getDate() + 7);
      break;
    case "Chaque 2 Semaine":
      end.setDate(end.getDate() + 14);
      break;
    case "Chaque Mois":
      end.setMonth(end.getMonth() + 1);
      break;
    case "Chaque 2 Mois":
      end.setMonth(end.getMonth() + 2);
      break;
    case "Chaque Trimestre":
      end.setMonth(end.getMonth() + 3);
      break;
    case "Chaque Simestre":
      end.setMonth(end.getMonth() + 6);
      break;
    case "Chaque Année":
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      end.setMonth(end.getMonth() + 1);
  }
  return end;
}

// ----------------------------------------------------------------------------
// Workshop module ("Atelier" — internal machine shop, not the Production
// unite_production concept)
// ----------------------------------------------------------------------------

// Confirmed from atelier_creer.cs / atelier_gestion.cs dropdown items —
// all 7 except the last, "Terminé", which wasn't found in the scraped
// dropdown list. Added here because the workflow needs a terminal
// "done" state and none of the 7 confirmed values reads as one (even
// "A Vérifié" is pre-closure). Worth confirming with the plant whether
// a distinct closing state exists in the real database.
export const ATELIER_ETATS = [
  "En Attente",
  "En Attente MP",
  "En Attente Achat",
  "En Cours Méthode",
  "En Cours Atelier",
  "Op Exeternalisée",
  "A Vérifié",
  "Terminé",
] as const;

export function atelierEtatColor(e?: string | null) {
  switch (e) {
    case "Terminé":
      return { fg: "#3D7A4E", bg: "#E7F2E9" };
    case "En Cours Atelier":
    case "En Cours Méthode":
      return { fg: "#204450", bg: "#D6E2E6" };
    case "A Vérifié":
      return { fg: "#2B5C6B", bg: "#EEF3F5" };
    case "En Attente MP":
    case "En Attente Achat":
      return { fg: "#C97A0C", bg: "#FBF0DE" };
    case "Op Exeternalisée":
      return { fg: "#6552A6", bg: "#EDE9F7" };
    case "En Attente":
    default:
      return { fg: "#6B7280", bg: "#EEEEEC" };
  }
}
