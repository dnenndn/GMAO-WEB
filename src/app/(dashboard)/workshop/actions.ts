"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserLogin, requireAdmin } from "@/lib/auth";

// ----------------------------------------------------------------------------
// Jobs (AtelierCreer)
// ----------------------------------------------------------------------------

export async function createJob(formData: FormData) {
  const createur = await currentUserLogin();
  const count = await prisma.atelierCreer.count();
  const nOf = `OF-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const job = await prisma.atelierCreer.create({
    data: {
      nOf,
      equipement: numOrNull(formData.get("equipement")),
      idDemandeur: numOrNull(formData.get("idDemandeur")),
      dateConsultation: new Date(),
      datePrevu: formData.get("datePrevu")
        ? new Date(String(formData.get("datePrevu")))
        : null,
      nPlan: str(formData, "nPlan"),
      nRevision: str(formData, "nRevision"),
      quantite: numOrNull(formData.get("quantite")),
      dimension: str(formData, "dimension"),
      idParametrePiece: numOrNull(formData.get("idParametrePiece")),
      idParametrePriorite: numOrNull(formData.get("idParametrePriorite")),
      idParametreConception: numOrNull(formData.get("idParametreConception")),
      etat: "En Attente",
      createur,
    },
  });

  await prisma.atelierEtat.create({
    data: { idAtelier: job.id, etat: "En Attente" },
  });

  revalidatePath("/workshop/jobs");
  redirect(`/workshop/jobs/${job.id}`);
}

export async function updateJobEtat(id: number, etat: string) {
  await prisma.$transaction([
    prisma.atelierCreer.update({ where: { id }, data: { etat } }),
    prisma.atelierEtat.create({ data: { idAtelier: id, etat } }),
  ]);
  revalidatePath("/workshop/jobs");
  revalidatePath(`/workshop/jobs/${id}`);
}

export async function linkArticle(id: number, formData: FormData) {
  const idArticle = numOrNull(formData.get("idArticle"));
  await prisma.atelierCreer.update({ where: { id }, data: { idArticle } });
  revalidatePath(`/workshop/jobs/${id}`);
}

export async function linkBsm(jobId: number, formData: FormData) {
  const idBsm = Number(formData.get("idBsm"));
  if (!idBsm) return;
  await prisma.atelierBsm.create({ data: { idAtelier: jobId, idBsm } });
  revalidatePath(`/workshop/jobs/${jobId}`);
}

// ----------------------------------------------------------------------------
// Daily follow-up (AtelierSuiviJournalier)
// ----------------------------------------------------------------------------

export async function addSuivi(nOf: string, jobId: number, formData: FormData) {
  await prisma.atelierSuiviJournalier.create({
    data: {
      date: new Date(String(formData.get("date") || new Date())),
      heureDeb: str(formData, "heureDeb"),
      heureFin: str(formData, "heureFin"),
      nOf,
      idMachine: numOrNull(formData.get("idMachine")),
      idOperateur: numOrNull(formData.get("idOperateur")),
      qtSolde: numOrNull(formData.get("qtSolde")),
    },
  });
  revalidatePath(`/workshop/jobs/${jobId}/suivi`);
}

// ----------------------------------------------------------------------------
// Quality control (AtelierDonnees + AtelierPiece)
// ----------------------------------------------------------------------------

export async function addDonnees(jobId: number, formData: FormData) {
  await prisma.atelierDonnees.create({
    data: {
      idAtelier: jobId,
      sousTraitant: str(formData, "sousTraitant"),
      qtRecu: numOrNull(formData.get("qtRecu")),
      pieceApp: numOrNull(formData.get("pieceApp")),
      pieceBloque: numOrNull(formData.get("pieceBloque")),
      remarque: str(formData, "remarque"),
      liberation: formData.get("liberation") === "on",
    },
  });
  revalidatePath(`/workshop/jobs/${jobId}/qualite`);
}

export async function addPieceMesure(jobId: number, formData: FormData) {
  await prisma.atelierPiece.create({
    data: {
      idAtelier: jobId,
      numMes: str(formData, "numMes"),
      mesureNominale: numOrNull(formData.get("mesureNominale")),
      plus: numOrNull(formData.get("plus")),
      tire: numOrNull(formData.get("tire")),
      p1: numOrNull(formData.get("p1")),
      p2: numOrNull(formData.get("p2")),
      p3: numOrNull(formData.get("p3")),
      p4: numOrNull(formData.get("p4")),
      p5: numOrNull(formData.get("p5")),
      p6: numOrNull(formData.get("p6")),
    },
  });
  revalidatePath(`/workshop/jobs/${jobId}/qualite`);
}

// ----------------------------------------------------------------------------
// Reference data
// ----------------------------------------------------------------------------

export async function addMachine(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.atelierMachine.create({ data: { designation } });
  revalidatePath("/workshop/settings/machines");
}
export async function deleteMachine(id: number) {
  await requireAdmin();
  await prisma.atelierMachine.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/workshop/settings/machines");
}

export async function addTypePiece(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.atelierParametrePiece.create({ data: { designation } });
  revalidatePath("/workshop/settings/types-piece");
}
export async function deleteTypePiece(id: number) {
  await requireAdmin();
  await prisma.atelierParametrePiece.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/workshop/settings/types-piece");
}

export async function addPriorite(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.atelierParametrePriorite.create({ data: { designation } });
  revalidatePath("/workshop/settings/priorites");
}
export async function deletePriorite(id: number) {
  await requireAdmin();
  await prisma.atelierParametrePriorite.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/workshop/settings/priorites");
}

export async function addConception(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.atelierParametreConception.create({ data: { designation } });
  revalidatePath("/workshop/settings/conceptions");
}
export async function deleteConception(id: number) {
  await requireAdmin();
  await prisma.atelierParametreConception.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/workshop/settings/conceptions");
}

// ----------------------------------------------------------------------------
// Job comments / files
// ----------------------------------------------------------------------------

export async function addJobCommentaire(jobId: number, formData: FormData) {
  const texte = String(formData.get("texte") || "").trim();
  if (!texte) return;
  const auteur = await currentUserLogin();
  await prisma.atelierCommentaire.create({
    data: { idAtelier: jobId, texte, auteur },
  });
  revalidatePath(`/workshop/jobs/${jobId}`);
}

export async function addJobFichier(jobId: number, formData: FormData) {
  const adresse = String(formData.get("adresse") || "").trim();
  if (!adresse) return;
  await prisma.atelierFichierAttachment.create({
    data: { idAtelier: jobId, adresse },
  });
  revalidatePath(`/workshop/jobs/${jobId}`);
}

export async function deleteJobFichier(id: number, jobId: number) {
  await prisma.atelierFichierAttachment.delete({ where: { id } });
  revalidatePath(`/workshop/jobs/${jobId}`);
}

export async function addJobReception(jobId: number, formData: FormData) {
  const qtRecu = Number(formData.get("qtRecu"));
  if (!qtRecu || qtRecu <= 0) return;
  await prisma.atelierReception.create({
    data: {
      idAtelier: jobId,
      dateReception: new Date(String(formData.get("dateReception") || new Date())),
      qtRecu,
      etat: str(formData, "etat"),
    },
  });
  revalidatePath(`/workshop/jobs/${jobId}`);
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function str(formData: FormData, key: string) {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : null;
}
