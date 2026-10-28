"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

// ----------------------------------------------------------------------------
// Outils (tools)
// ----------------------------------------------------------------------------

export async function createOutil(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;

  const outil = await prisma.outil.create({
    data: {
      codeOutils: str(formData, "codeOutils"),
      designation,
      fkSecteurId: numOrNull(formData.get("fkSecteurId")),
      fkTypeId: numOrNull(formData.get("fkTypeId")),
      numSerie: str(formData, "numSerie"),
      numModele: str(formData, "numModele"),
      fabriquant: str(formData, "fabriquant"),
      dateAchat: formData.get("dateAchat") ? new Date(String(formData.get("dateAchat"))) : null,
      finGarantie: formData.get("finGarantie") ? new Date(String(formData.get("finGarantie"))) : null,
      miseService: formData.get("miseService") ? new Date(String(formData.get("miseService"))) : null,
      prixAchat: numOrNull(formData.get("prixAchat")),
      remarque: str(formData, "remarque"),
      etatOutil: str(formData, "etatOutil"),
      statut: true,
    },
  });

  revalidatePath("/tooling/outils");
  redirect(`/tooling/outils/${outil.id}`);
}

// ----------------------------------------------------------------------------
// Checkout / return
// ----------------------------------------------------------------------------

export async function checkoutOutil(outilId: number, formData: FormData) {
  const idIntervenant = Number(formData.get("idIntervenant"));
  if (!idIntervenant) return;

  const now = new Date();

  await prisma.$transaction([
    prisma.tabLancementAffectation.create({
      data: {
        idIntervenant,
        idOutil: outilId,
        dateDebut: now,
        heureDebut: now.toTimeString().slice(0, 5),
        commentaire: str(formData, "commentaire"),
        encours: true,
        nOt: str(formData, "nOt"),
      },
    }),
    prisma.outil.update({ where: { id: outilId }, data: { statut: false } }),
  ]);

  revalidatePath(`/tooling/outils/${outilId}`);
}

export async function returnOutil(affectationId: number, outilId: number) {
  const now = new Date();

  await prisma.$transaction([
    prisma.tabLancementAffectation.update({
      where: { id: affectationId },
      data: {
        encours: false,
        dateFin: now,
        heureFin: now.toTimeString().slice(0, 5),
      },
    }),
    prisma.outil.update({ where: { id: outilId }, data: { statut: true } }),
  ]);

  revalidatePath(`/tooling/outils/${outilId}`);
}

export async function linkOutilUtilisation(outilId: number, formData: FormData) {
  const idUtilisation = Number(formData.get("idUtilisation"));
  if (!idUtilisation) return;
  await prisma.outilUtilisation.create({ data: { idOutil: outilId, idUtilisation } });
  revalidatePath(`/tooling/outils/${outilId}`);
}

export async function unlinkOutilUtilisation(id: number, outilId: number) {
  await prisma.outilUtilisation.delete({ where: { id } });
  revalidatePath(`/tooling/outils/${outilId}`);
}

// ----------------------------------------------------------------------------
// Reference data
// ----------------------------------------------------------------------------

export async function addSecteur(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.secteur.create({ data: { designation, code: str(formData, "code") } });
  revalidatePath("/tooling/settings/secteurs");
}
export async function deleteSecteur(id: number) {
  await requireAdmin();
  await prisma.secteur.delete({ where: { id } });
  revalidatePath("/tooling/settings/secteurs");
}

export async function addTabType(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.tabType.create({ data: { designation, code: str(formData, "code") } });
  revalidatePath("/tooling/settings/types");
}
export async function deleteTabType(id: number) {
  await requireAdmin();
  await prisma.tabType.delete({ where: { id } });
  revalidatePath("/tooling/settings/types");
}

export async function addUtilisation(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.utilisation.create({ data: { designation, code: str(formData, "code") } });
  revalidatePath("/tooling/settings/utilisations");
}
export async function deleteUtilisation(id: number) {
  await requireAdmin();
  await prisma.utilisation.delete({ where: { id } });
  revalidatePath("/tooling/settings/utilisations");
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
