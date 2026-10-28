"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserLogin } from "@/lib/auth";

export async function createDemandeIntervention(formData: FormData) {
  const createur = await currentUserLogin();
  const count = await prisma.demandeIntervention.count();
  const nDi = `DI-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const di = await prisma.demandeIntervention.create({
    data: {
      nDi,
      dateEmission: new Date(),
      urgence: String(formData.get("urgence") || ""),
      descriptionDefaillance: String(formData.get("description") || ""),
      atelier: Number(formData.get("atelier")) || null,
      equipement: Number(formData.get("equipement")) || null,
      arretMachine: formData.get("arretMachine") === "on",
      statut: "En attente",
      createur,
    },
  });

  revalidatePath("/interventions");
  redirect(`/interventions/${di.id}`);
}

export async function confirmerDemande(id: number) {
  const createur = await currentUserLogin();
  // Mirrors the legacy da_confirmer flow: approving a DI creates the OT.
  const di = await prisma.demandeIntervention.update({
    where: { id },
    data: { statut: "Confirmée" },
  });

  const count = await prisma.ordreTravail.count();
  const nOt = `OT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const ot = await prisma.ordreTravail.create({
    data: {
      nOt,
      idDi: di.id,
      urgence: di.urgence,
      statut: "En Préparation",
      type: "Corrective",
      atelier: di.atelier,
      equipement: di.equipement,
      sousEquipement: di.sousEquipement,
      organe: di.organe,
      idDefaillance: di.idDefaillance,
      createur,
    },
  });

  revalidatePath("/interventions");
  revalidatePath("/work-orders");
  redirect(`/work-orders/${ot.id}`);
}

export async function refuserDemande(id: number) {
  await prisma.demandeIntervention.update({
    where: { id },
    data: { statut: "Refusée" },
  });
  revalidatePath("/interventions");
  redirect(`/interventions/${id}`);
}
