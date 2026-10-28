"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserLogin, requireAdmin } from "@/lib/auth";

export async function createOrdreTravail(formData: FormData) {
  const createur = await currentUserLogin();
  const count = await prisma.ordreTravail.count();
  const nOt = `OT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const ot = await prisma.ordreTravail.create({
    data: {
      nOt,
      type: String(formData.get("type") || "Corrective"),
      urgence: String(formData.get("urgence") || ""),
      statut: "En Préparation",
      atelier: Number(formData.get("atelier")) || null,
      equipement: Number(formData.get("equipement")) || null,
      idClasse: Number(formData.get("idClasse")) || null,
      idSuperviseur: Number(formData.get("idSuperviseur")) || null,
      idIntervention: Number(formData.get("idIntervention")) || null,
      commentaire: String(formData.get("commentaire") || "") || null,
      debutPrevu: formData.get("debutPrevu")
        ? new Date(String(formData.get("debutPrevu")))
        : null,
      createur,
    },
  });

  revalidatePath("/work-orders");
  redirect(`/work-orders/${ot.id}`);
}

export async function updateStatut(id: number, statut: string) {
  const data: { statut: string; dateDebut?: Date; dateFin?: Date; heureDebut?: string; heureFin?: string } = {
    statut,
  };
  const now = new Date();
  if (statut === "En Cours") {
    data.dateDebut = now;
    data.heureDebut = now.toTimeString().slice(0, 5);
  }
  if (statut === "Clôturé") {
    data.dateFin = now;
    data.heureFin = now.toTimeString().slice(0, 5);
  }

  await prisma.ordreTravail.update({ where: { id }, data });
  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
}

export async function addCommentaire(id: number, formData: FormData) {
  const texte = String(formData.get("texte") || "").trim();
  if (!texte) return;
  const auteur = await currentUserLogin();
  await prisma.otCommentaire.create({
    data: { idOt: id, texte, auteur },
  });
  revalidatePath(`/work-orders/${id}`);
}

// ----------------------------------------------------------------------------
// Automatic preventive-maintenance generation
//
// Reconstructed from lancement_ot_preventive.cs. Three independent trigger
// mechanisms, matching the legacy logic as closely as this analysis could
// confirm — see docs/11-preventive-maintenance-addendum.md for the full
// trace of what was and wasn't confirmed in the source.
// ----------------------------------------------------------------------------

async function nextOtNumber() {
  const count = await prisma.ordreTravail.count();
  return `OT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

function addPeriod(date: Date, frequence: number, periode: string): Date {
  const d = new Date(date);
  switch (periode) {
    case "Jour":
      d.setDate(d.getDate() + frequence);
      break;
    case "Semaine":
      d.setDate(d.getDate() + frequence * 7);
      break;
    case "Mois":
      d.setMonth(d.getMonth() + frequence);
      break;
    case "Année":
      d.setFullYear(d.getFullYear() + frequence);
      break;
    default:
      d.setDate(d.getDate() + frequence); // fallback: treat as days
  }
  return d;
}

async function createPreventiveOt(params: {
  type: string;
  idGamme: number | null;
  atelier: number | null;
  equipement: number | null;
  sousEquipement: number | null;
  organe: number | null;
  datePrevu: Date;
}) {
  const nOt = await nextOtNumber();
  const createur = await currentUserLogin();
  return prisma.ordreTravail.create({
    data: {
      nOt,
      type: params.type,
      statut: "En Préparation",
      idIntervention: params.idGamme,
      atelier: params.atelier,
      equipement: params.equipement,
      sousEquipement: params.sousEquipement,
      organe: params.organe,
      debutPrevu: params.datePrevu,
      createur,
      urgence: "Moyenne",
    },
  });
}

/** Scans active (arr=false) systematic plans and generates a Work Order
 * for any whose next due date falls within `lancerOtAvant` days from now.
 * The "next due date" is computed from the most recent previously
 * generated OT for that exact plan (same gamme/equipment path), or from
 * the plan's `dateDebut` if none exists yet. */
export async function generateSystematiquePlans() {
  await requireAdmin();
  const plans = await prisma.prevSystematique.findMany({ where: { arr: false } });
  const now = new Date();
  let created = 0;

  for (const plan of plans) {
    if (!plan.frequence || !plan.periode) continue;

    const lastOt = await prisma.ordreTravail.findFirst({
      where: {
        type: "Préventive Systématique",
        idIntervention: plan.idGamme,
        atelier: plan.atelier,
        equipement: plan.equipement,
        sousEquipement: plan.sousEquipement,
        organe: plan.organe,
      },
      orderBy: { debutPrevu: "desc" },
    });

    const baseDate = lastOt?.debutPrevu ?? plan.dateDebut;
    if (!baseDate) continue;

    const nextDue = lastOt
      ? addPeriod(baseDate, plan.frequence, plan.periode)
      : baseDate; // first-ever OT for this plan fires on dateDebut itself

    const leadDays = plan.lancerOtAvant ?? 0;
    const launchWindow = new Date(nextDue);
    launchWindow.setDate(launchWindow.getDate() - leadDays);

    if (launchWindow <= now) {
      await createPreventiveOt({
        type: "Préventive Systématique",
        idGamme: plan.idGamme,
        atelier: plan.atelier,
        equipement: plan.equipement,
        sousEquipement: plan.sousEquipement,
        organe: plan.organe,
        datePrevu: nextDue,
      });
      created++;
    }
  }

  revalidatePath("/work-orders/preventif");
  revalidatePath("/work-orders");
}

/** Scans active counter-based plans, comparing each linked counter's
 * current value against the plan's trigger threshold. Plans with a
 * pending (unresolved) OtReinitCompteur entry are skipped — they're
 * already waiting on their generated OT to close before resetting. */
export async function generateCompteurPlans() {
  await requireAdmin();
  const plans = await prisma.prevCompteur.findMany({
    where: { arr: false, reinitTracking: { none: {} } },
    include: { compteur: true },
  });
  let created = 0;

  for (const plan of plans) {
    if (!plan.compteur || plan.valeurLancement == null) continue;
    const current = Number(plan.compteur.valeurActuelle ?? 0);
    const threshold = Number(plan.valeurLancement);

    const triggered =
      (plan.typeValeur === "Sup" && current >= threshold) ||
      (plan.typeValeur === "Inf" && current <= threshold);
    if (!triggered) continue;

    const ot = await createPreventiveOt({
      type: "Préventive Syst Compteur",
      idGamme: plan.idGamme,
      atelier: plan.atelier,
      equipement: plan.equipement,
      sousEquipement: plan.sousEquipement,
      organe: plan.organe,
      datePrevu: new Date(),
    });
    created++;

    if (plan.reinitialisation === "Oui" && plan.initial != null) {
      if (plan.typeInitial === "Au Lancement de l'OT") {
        // Reset immediately.
        await prisma.equipementCompteur.update({
          where: { id: plan.idCompteur! },
          data: { valeurActuelle: plan.initial },
        });
      } else {
        // Defer the reset until the OT closes — record the pending link,
        // which also excludes this plan from re-triggering meanwhile.
        await prisma.otReinitCompteur.create({
          data: { idPrevCompteur: plan.id, idOt: ot.id },
        });
      }
    }
  }

  revalidatePath("/work-orders/preventif");
  revalidatePath("/work-orders");
}

/** Manual evaluation for a single conditional plan — the legacy app
 * triggers this from wherever a measurement gets recorded
 * (creation_ot_mesure(id_mesure, valeur)); this schema doesn't model a
 * separate measurement-entry catalog, so the value is entered directly
 * against the plan being evaluated. */
export async function evaluateConditionnellePlan(planId: number, formData: FormData) {
  const valeur = Number(formData.get("valeur"));
  if (Number.isNaN(valeur)) return;

  const plan = await prisma.prevConditionnelle.findUnique({ where: { id: planId } });
  if (!plan || plan.arr || plan.valeurLancement == null) return;

  const threshold = Number(plan.valeurLancement);
  const triggered =
    (plan.typeValeur === "Sup" && valeur >= threshold) ||
    (plan.typeValeur === "Inf" && valeur <= threshold);

  if (triggered) {
    await createPreventiveOt({
      type: "Préventive Conditionnelle",
      idGamme: plan.idGamme,
      atelier: plan.atelier,
      equipement: plan.equipement,
      sousEquipement: plan.sousEquipement,
      organe: plan.organe,
      datePrevu: new Date(),
    });
  }

  revalidatePath("/work-orders/preventif");
  revalidatePath("/work-orders");
}

// ----------------------------------------------------------------------------
// Preventive plan management
// ----------------------------------------------------------------------------

export async function createPrevSystematique(formData: FormData) {
  await requireAdmin();
  await prisma.prevSystematique.create({
    data: {
      idGamme: numOrNull(formData.get("idGamme")),
      frequence: numOrNull(formData.get("frequence")),
      periode: String(formData.get("periode") || "") || null,
      dateDebut: formData.get("dateDebut") ? new Date(String(formData.get("dateDebut"))) : null,
      lancerOtAvant: numOrNull(formData.get("lancerOtAvant")),
      atelier: numOrNull(formData.get("atelier")),
      equipement: numOrNull(formData.get("equipement")),
      sousEquipement: numOrNull(formData.get("sousEquipement")),
      organe: numOrNull(formData.get("organe")),
    },
  });
  revalidatePath("/work-orders/preventif");
}

export async function deactivatePrevSystematique(id: number) {
  await requireAdmin();
  await prisma.prevSystematique.update({ where: { id }, data: { arr: true } });
  revalidatePath("/work-orders/preventif");
}

export async function createPrevConditionnelle(formData: FormData) {
  await requireAdmin();
  await prisma.prevConditionnelle.create({
    data: {
      idGamme: numOrNull(formData.get("idGamme")),
      mesure: String(formData.get("mesure") || "") || null,
      unite: String(formData.get("unite") || "") || null,
      valeurLancement: numOrNull(formData.get("valeurLancement")),
      typeValeur: String(formData.get("typeValeur") || "") || null,
      atelier: numOrNull(formData.get("atelier")),
      equipement: numOrNull(formData.get("equipement")),
      sousEquipement: numOrNull(formData.get("sousEquipement")),
      organe: numOrNull(formData.get("organe")),
    },
  });
  revalidatePath("/work-orders/preventif");
}

export async function deactivatePrevConditionnelle(id: number) {
  await requireAdmin();
  await prisma.prevConditionnelle.update({ where: { id }, data: { arr: true } });
  revalidatePath("/work-orders/preventif");
}

export async function createPrevCompteur(formData: FormData) {
  await requireAdmin();
  await prisma.prevCompteur.create({
    data: {
      idGamme: numOrNull(formData.get("idGamme")),
      idCompteur: numOrNull(formData.get("idCompteur")),
      valeurLancement: numOrNull(formData.get("valeurLancement")),
      typeValeur: String(formData.get("typeValeur") || "") || null,
      reinitialisation: String(formData.get("reinitialisation") || "") || null,
      initial: numOrNull(formData.get("initial")),
      typeInitial: String(formData.get("typeInitial") || "") || null,
      atelier: numOrNull(formData.get("atelier")),
      equipement: numOrNull(formData.get("equipement")),
      sousEquipement: numOrNull(formData.get("sousEquipement")),
      organe: numOrNull(formData.get("organe")),
    },
  });
  revalidatePath("/work-orders/preventif");
}

export async function deactivatePrevCompteur(id: number) {
  await requireAdmin();
  await prisma.prevCompteur.update({ where: { id }, data: { arr: true } });
  revalidatePath("/work-orders/preventif");
}

// ----------------------------------------------------------------------------
// Gammes opératoires & resource planning
// ----------------------------------------------------------------------------

export async function createGamme(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;

  const gamme = await prisma.gammeOperatoire.create({
    data: {
      code: str(formData, "code"),
      designation,
      type: str(formData, "type"),
      duree: numOrNull(formData.get("duree")),
      idClasse: numOrNull(formData.get("idClasse")),
    },
  });

  revalidatePath("/work-orders/gammes");
  redirect(`/work-orders/gammes/${gamme.id}`);
}

export async function addGammeRessourceFonction(gammeId: number, formData: FormData) {
  const idFonction = Number(formData.get("idFonction"));
  const nbreRequis = Number(formData.get("nbreRequis")) || 1;
  if (!idFonction) return;

  await prisma.gammeRessourcesFonction.create({
    data: {
      idGamme: gammeId,
      idFonction,
      nbreRequis,
      minPlanif: Number(formData.get("minPlanif")) || 0,
      typeCout: str(formData, "typeCout") ?? "Interne",
    },
  });
  revalidatePath(`/work-orders/gammes/${gammeId}`);
}

export async function removeGammeRessourceFonction(id: number, gammeId: number) {
  await prisma.gammeRessourcesFonction.delete({ where: { id } });
  revalidatePath(`/work-orders/gammes/${gammeId}`);
}

export async function addGammeRessourceOutillage(gammeId: number, formData: FormData) {
  const idType = Number(formData.get("idType"));
  const quantite = Number(formData.get("quantite")) || 1;
  if (!idType) return;

  await prisma.gammeRessourcesOutillage.create({
    data: { idGamme: gammeId, idType, quantite },
  });
  revalidatePath(`/work-orders/gammes/${gammeId}`);
}

export async function removeGammeRessourceOutillage(id: number, gammeId: number) {
  await prisma.gammeRessourcesOutillage.delete({ where: { id } });
  revalidatePath(`/work-orders/gammes/${gammeId}`);
}

export async function addGammeRessourcePdr(gammeId: number, formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const quantite = Number(formData.get("quantite")) || 1;
  if (!idArticle) return;

  await prisma.gammeRessourcesPdr.create({
    data: { idGamme: gammeId, idArticle, quantite },
  });
  revalidatePath(`/work-orders/gammes/${gammeId}`);
}

export async function removeGammeRessourcePdr(id: number, gammeId: number) {
  await prisma.gammeRessourcesPdr.delete({ where: { id } });
  revalidatePath(`/work-orders/gammes/${gammeId}`);
}

// ----------------------------------------------------------------------------
// OT resource usage (actual tool/parts consumption per work order)
// ----------------------------------------------------------------------------

export async function addOtRessourceOutil(otId: number, formData: FormData) {
  const idType = Number(formData.get("idType"));
  const quantite = Number(formData.get("quantite")) || 1;
  if (!idType) return;

  await prisma.otRessourcesOutil.create({
    data: { idOt: otId, idType, quantite, dateSh: new Date() },
  });
  revalidatePath(`/work-orders/${otId}`);
}

export async function addOtRessourcePdr(otId: number, formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const quantite = Number(formData.get("quantite")) || 1;
  if (!idArticle) return;

  await prisma.otRessourcesPdr.create({
    data: { idOt: otId, idArticle, quantite, dateSh: new Date() },
  });
  revalidatePath(`/work-orders/${otId}`);
}

// ----------------------------------------------------------------------------
// Diagnostics (Ishikawa/AMDEC root-cause analysis)
// ----------------------------------------------------------------------------

export async function setOtDiagnosticM(otId: number, formData: FormData) {
  const idDefaillance = Number(formData.get("idDefaillance"));
  const typeM = String(formData.get("typeM") || "").trim();
  if (!idDefaillance || !typeM) return;

  const existing = await prisma.otDiagnosticM.findFirst({ where: { idOt: otId } });
  if (existing) {
    await prisma.otDiagnosticM.update({ where: { id: existing.id }, data: { idDefaillance, typeM } });
  } else {
    await prisma.otDiagnosticM.create({ data: { idOt: otId, idDefaillance, typeM } });
  }
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

export async function addOtDiagnosticSymptome(otId: number, formData: FormData) {
  const idSymptome = Number(formData.get("idSymptome"));
  const idDefaillance = Number(formData.get("idDefaillance"));
  if (!idSymptome || !idDefaillance) return;

  await prisma.otDiagnosticSymptome.create({ data: { idOt: otId, idSymptome, idDefaillance } });
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

export async function removeOtDiagnosticSymptome(id: number, otId: number) {
  await prisma.otDiagnosticSymptome.delete({ where: { id } });
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

export async function addOtDiagnosticDetection(otId: number, formData: FormData) {
  const idDefaillance = Number(formData.get("idDefaillance"));
  const typeD = Number(formData.get("typeD"));
  if (!idDefaillance || Number.isNaN(typeD)) return;

  await prisma.otDiagnosticDetection.create({ data: { idOt: otId, idDefaillance, typeD } });
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

export async function removeOtDiagnosticDetection(id: number, otId: number) {
  await prisma.otDiagnosticDetection.delete({ where: { id } });
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

export async function addOtDiagnosticDef(otId: number, formData: FormData) {
  const idDefaillance = Number(formData.get("idDefaillance"));
  if (!idDefaillance) return;

  await prisma.otDiagnosticDef.create({ data: { idOt: otId, idDefaillance } });
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

export async function removeOtDiagnosticDef(id: number, otId: number) {
  await prisma.otDiagnosticDef.delete({ where: { id } });
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

export async function addOtDiagnosticOperation(otId: number, formData: FormData) {
  const idOperation = Number(formData.get("idOperation"));
  if (!idOperation) return;

  const now = new Date();
  await prisma.otDiagnosticOperation.create({
    data: { idOt: otId, idOperation, debut: now, fin: now },
  });
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

export async function closeOtDiagnosticOperation(id: number, otId: number) {
  await prisma.otDiagnosticOperation.update({ where: { id }, data: { fin: new Date() } });
  revalidatePath(`/work-orders/${otId}/diagnostic`);
}

// ----------------------------------------------------------------------------
// Diagnostic reference data (Symptômes, Opérations de diagnostic,
// associations to a défaillance, and the anomaly parent/child hierarchy)
// ----------------------------------------------------------------------------

export async function createSymptome(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.symptome.create({
    data: { designation, code: str(formData, "code") },
  });
  revalidatePath("/work-orders/settings/diagnostic");
}

export async function deleteSymptome(id: number) {
  await requireAdmin();
  await prisma.symptome.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/work-orders/settings/diagnostic");
}

export async function linkSymptomeDefaillance(formData: FormData) {
  const idSymptome = Number(formData.get("idSymptome"));
  const idDefaillance = Number(formData.get("idDefaillance"));
  if (!idSymptome || !idDefaillance) return;

  const existing = await prisma.symptomeDefaillance.findFirst({
    where: { idSymptome, idDefaillance },
  });
  if (!existing) {
    await prisma.symptomeDefaillance.create({ data: { idSymptome, idDefaillance } });
  }
  revalidatePath("/work-orders/settings/diagnostic");
}

export async function unlinkSymptomeDefaillance(id: number) {
  await prisma.symptomeDefaillance.delete({ where: { id } });
  revalidatePath("/work-orders/settings/diagnostic");
}

export async function createOperationDiagnostic(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  const idDefaillance = Number(formData.get("idDefaillance"));
  if (!designation || !idDefaillance) return;

  await prisma.operationDiagnostic.create({
    data: { designation, idDefaillance, code: str(formData, "code") },
  });
  revalidatePath("/work-orders/settings/diagnostic");
}

export async function deleteOperationDiagnostic(id: number) {
  await requireAdmin();
  await prisma.operationDiagnostic.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/work-orders/settings/diagnostic");
}

export async function linkRelationAnomalie(formData: FormData) {
  const idAnomalie = Number(formData.get("idAnomalie"));
  const idParent = Number(formData.get("idParent"));
  if (!idAnomalie || !idParent || idAnomalie === idParent) return;

  const existing = await prisma.relationAnomalie.findFirst({
    where: { idAnomalie, idParent },
  });
  if (!existing) {
    await prisma.relationAnomalie.create({ data: { idAnomalie, idParent } });
  }
  revalidatePath("/work-orders/settings/diagnostic");
}

export async function unlinkRelationAnomalie(id: number) {
  await prisma.relationAnomalie.delete({ where: { id } });
  revalidatePath("/work-orders/settings/diagnostic");
}

// ----------------------------------------------------------------------------
// Cause de réalisation & Centre de charge
// ----------------------------------------------------------------------------

export async function createCauseRealisation(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreCauseRealisation.create({ data: { designation, code: str(formData, "code") } });
  revalidatePath("/work-orders/settings/cause-centre-charge");
}

export async function deleteCauseRealisation(id: number) {
  await requireAdmin();
  await prisma.parametreCauseRealisation.delete({ where: { id } });
  revalidatePath("/work-orders/settings/cause-centre-charge");
}

export async function createCentreCharge(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreCentreCharge.create({
    data: { designation, code: str(formData, "code"), budget: numOrNull(formData.get("budget")) },
  });
  revalidatePath("/work-orders/settings/cause-centre-charge");
}

export async function deleteCentreCharge(id: number) {
  await requireAdmin();
  await prisma.parametreCentreCharge.delete({ where: { id } });
  revalidatePath("/work-orders/settings/cause-centre-charge");
}

// ----------------------------------------------------------------------------
// Gamme centre de charge, Interventions/Opérations checklist, Plans de
// maintenance
// ----------------------------------------------------------------------------

export async function linkGammeCentreCharge(gammeId: number, formData: FormData) {
  const idCentreCharge = numOrNull(formData.get("idCentreCharge"));
  if (!idCentreCharge) return;
  await prisma.gammeCentreCharge.create({ data: { idGamme: gammeId, idCentreCharge } });
  revalidatePath(`/work-orders/gammes/${gammeId}`);
}

export async function unlinkGammeCentreCharge(id: number, gammeId: number) {
  await prisma.gammeCentreCharge.delete({ where: { id } });
  revalidatePath(`/work-orders/gammes/${gammeId}`);
}

export async function createParametreIntervention(formData: FormData) {
  const intervention = str(formData, "intervention");
  if (!intervention) return;
  await prisma.parametreIntervention.create({
    data: { intervention, code: str(formData, "code"), typpe: str(formData, "typpe") },
  });
  revalidatePath("/work-orders/settings/interventions");
}

export async function deleteParametreIntervention(id: number) {
  await requireAdmin();
  await prisma.parametreIntervention.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/work-orders/settings/interventions");
}

export async function addOperationMaintenance(interventionId: number, formData: FormData) {
  const code = str(formData, "code");
  const designation = str(formData, "designation");
  const type = str(formData, "type");
  if (!code || !designation || !type) return;
  await prisma.operationMaintenance.create({
    data: { idIntervention: interventionId, code, designation, type },
  });
  revalidatePath(`/work-orders/settings/interventions/${interventionId}`);
}

export async function removeOperationMaintenance(id: number, interventionId: number) {
  await prisma.operationMaintenance.update({ where: { id }, data: { deleted: true } });
  revalidatePath(`/work-orders/settings/interventions/${interventionId}`);
}

export async function createPlanMaintenance(formData: FormData) {
  const code = str(formData, "code");
  const designation = str(formData, "designation");
  if (!code || !designation) return;
  await prisma.planMaintenance.create({ data: { code, designation } });
  revalidatePath("/work-orders/settings/plans-maintenance");
}

export async function deletePlanMaintenance(id: number) {
  await requireAdmin();
  await prisma.planMaintenance.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/work-orders/settings/plans-maintenance");
}

export async function setOtCauseRealisation(otId: number, formData: FormData) {
  const idCause = numOrNull(formData.get("idCause"));
  if (!idCause) return;
  const existing = await prisma.otCauseRealisation.findFirst({ where: { idOt: otId } });
  if (existing) {
    await prisma.otCauseRealisation.update({ where: { id: existing.id }, data: { idCause } });
  } else {
    await prisma.otCauseRealisation.create({ data: { idOt: otId, idCause } });
  }
  revalidatePath(`/work-orders/${otId}`);
}

export async function setOtCentreCharge(otId: number, formData: FormData) {
  const idCentreCharge = numOrNull(formData.get("idCentreCharge"));
  if (!idCentreCharge) return;
  const existing = await prisma.otCentreCharge.findFirst({ where: { idOt: otId } });
  if (existing) {
    await prisma.otCentreCharge.update({ where: { id: existing.id }, data: { idCentreCharge } });
  } else {
    await prisma.otCentreCharge.create({ data: { idOt: otId, idCentreCharge } });
  }
  revalidatePath(`/work-orders/${otId}`);
}

function str(formData: FormData, key: string) {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : null;
}
