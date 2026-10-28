"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FUEL_POINTS, GAZ_POINTS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth";

/**
 * Creates a shift report and auto-generates zeroed entry rows for every
 * equipment x brick-type combination across Fabrication, Emballage, and
 * Four (in/out) — mirroring prod_rapport.guna2Button1_Click in the legacy
 * app, which calls insert_produit_fabrication / insert_produit_emballage /
 * insert_produit_four right after creating the report row.
 */
export async function createRapport(formData: FormData) {
  const dateRapport = new Date(String(formData.get("dateRapport")));
  const poste = String(formData.get("poste") || "");

  const existing = await prisma.prodRapportGeneral.findUnique({
    where: { dateRapport_poste: { dateRapport, poste } },
  });
  if (existing) {
    redirect(`/production/${existing.id}`);
  }

  const [fabUnites, embUnites, fourUnites, typesBrique, saisies] = await Promise.all([
    prisma.prodEquipement.findMany({ where: { uniteProduction: "Fabrication" } }),
    prisma.prodEquipement.findMany({ where: { uniteProduction: "Emballage" } }),
    prisma.prodEquipement.findMany({ where: { uniteProduction: "Four" } }),
    prisma.prodTypeBrique.findMany(),
    prisma.prodSaisie.findMany({ where: { deleted: false } }),
  ]);

  const prepGeneral = saisies.filter((s) => s.cible === 1);
  const prepAS = saisies.filter((s) => s.cible === 2);
  const fourQualite = saisies.filter((s) => s.cible === 3);
  const fabQualite = saisies.filter((s) => s.cible === 4);
  const fabHoraire = saisies.filter((s) => s.cible === 5);

  const rapport = await prisma.prodRapportGeneral.create({
    data: { dateRapport, poste },
  });

  await prisma.$transaction([
    prisma.prodRapportFabProduit.createMany({
      data: fabUnites.flatMap((u) =>
        typesBrique.map((t) => ({
          idRapport: rapport.id,
          idUnite: u.id,
          idProduit: t.id,
          quantite: 0,
          tonnage: 0,
        }))
      ),
    }),
    prisma.prodRapportEmbProduit.createMany({
      data: embUnites.flatMap((u) =>
        typesBrique.map((t) => ({
          idRapport: rapport.id,
          idUnite: u.id,
          idProduit: t.id,
          quantite: 0,
        }))
      ),
    }),
    prisma.prodRapportFourEntre.createMany({
      data: fourUnites.flatMap((u) =>
        typesBrique.map((t) => ({
          idRapport: rapport.id,
          idUnite: u.id,
          idProduit: t.id,
          quantite: 0,
          tonnage: 0,
        }))
      ),
    }),
    prisma.prodRapportFourSortie.createMany({
      data: fourUnites.flatMap((u) =>
        typesBrique.map((t) => ({
          idRapport: rapport.id,
          idUnite: u.id,
          idProduit: t.id,
          quantite: 0,
          tonnage: 0,
        }))
      ),
    }),
    prisma.prodFuel.createMany({
      data: FUEL_POINTS.map((p) => ({
        idRapport: rapport.id,
        typeSaisie: p,
        quantite: 0,
      })),
    }),
    prisma.prodGaz.createMany({
      data: GAZ_POINTS.map((p) => ({
        idRapport: rapport.id,
        typeSaisie: p,
        quantite: 0,
      })),
    }),
    // Report-level préparation readings (no equipment dimension)
    prisma.prodMesureRapport.createMany({
      data: prepGeneral.map((s) => ({
        idRapport: rapport.id,
        idUnite: null,
        idSaisie: s.id,
        categorie: "prep_general",
        valeur: 0,
      })),
    }),
    // Préparation A/S paired readings (meaning of "A"/"S" not confirmed —
    // see spec doc §5). No equipment dimension, mirrors prep_general.
    prisma.prodRapportPrepAS.createMany({
      data: prepAS.map((s) => ({
        idRapport: rapport.id,
        idUnite: null,
        idSaisie: s.id,
        valeurA: 0,
        valeurS: 0,
      })),
    }),
    // Kiln quality readings, per Four unit
    prisma.prodMesureRapport.createMany({
      data: fourUnites.flatMap((u) =>
        fourQualite.map((s) => ({
          idRapport: rapport.id,
          idUnite: u.id,
          idSaisie: s.id,
          categorie: "four_qualite",
          valeur: 0,
        }))
      ),
    }),
    // Fabrication quality readings, per Fabrication unit
    prisma.prodMesureRapport.createMany({
      data: fabUnites.flatMap((u) =>
        fabQualite.map((s) => ({
          idRapport: rapport.id,
          idUnite: u.id,
          idSaisie: s.id,
          categorie: "fabrication_qualite",
          valeur: 0,
        }))
      ),
    }),
    // Hourly fabrication throughput, per Fabrication unit x parameter
    prisma.prodRapportHoraireFabrication.createMany({
      data: fabUnites.flatMap((u) =>
        fabHoraire.map((s) => ({
          idRapport: rapport.id,
          idUnite: u.id,
          idSaisie: s.id,
        }))
      ),
    }),
    // Daily fabrication tonnage total, per Fabrication unit
    prisma.prodFabTonnage.createMany({
      data: fabUnites.map((u) => ({
        idRapport: rapport.id,
        idUnite: u.id,
        valeur: 0,
      })),
    }),
    // Chef d'équipe (shift team lead) assignment slot, per Fabrication unit
    prisma.prodRapportCfFabrication.createMany({
      data: fabUnites.map((u) => ({
        idRapport: rapport.id,
        idUnite: u.id,
      })),
    }),
    // Chef d'équipe assignment slot, per Emballage unit
    prisma.prodRapportCfEmballage.createMany({
      data: embUnites.map((u) => ({
        idRapport: rapport.id,
        idUnite: u.id,
      })),
    }),
  ]);

  revalidatePath("/production");
  redirect(`/production/${rapport.id}`);
}

export async function updateFabProduit(id: number, formData: FormData) {
  const quantite = Number(formData.get("quantite")) || 0;
  const tonnage = Number(formData.get("tonnage")) || 0;
  const row = await prisma.prodRapportFabProduit.update({
    where: { id },
    data: { quantite, tonnage },
  });
  revalidatePath(`/production/${row.idRapport}/fabrication`);
}

export async function updateEmbProduit(id: number, formData: FormData) {
  const quantite = Number(formData.get("quantite")) || 0;
  const nbrBobineFeuillard = Number(formData.get("nbrBobineFeuillard")) || 0;
  const nbrPallette = Number(formData.get("nbrPallette")) || 0;
  const row = await prisma.prodRapportEmbProduit.update({
    where: { id },
    data: { quantite, nbrBobineFeuillard, nbrPallette },
  });
  revalidatePath(`/production/${row.idRapport}/emballage`);
}

export async function updateFourEntre(id: number, formData: FormData) {
  const quantite = Number(formData.get("quantite")) || 0;
  const tonnage = Number(formData.get("tonnage")) || 0;
  const row = await prisma.prodRapportFourEntre.update({
    where: { id },
    data: { quantite, tonnage },
  });
  revalidatePath(`/production/${row.idRapport}/four`);
}

export async function updateFourSortie(id: number, formData: FormData) {
  const quantite = Number(formData.get("quantite")) || 0;
  const tonnage = Number(formData.get("tonnage")) || 0;
  const row = await prisma.prodRapportFourSortie.update({
    where: { id },
    data: { quantite, tonnage },
  });
  revalidatePath(`/production/${row.idRapport}/four`);
}

export async function updateFuel(id: number, formData: FormData) {
  const quantite = Number(formData.get("quantite")) || 0;
  const row = await prisma.prodFuel.update({
    where: { id },
    data: { quantite },
  });
  revalidatePath(`/production/${row.idRapport}/fuel`);
}

export async function updateGaz(id: number, formData: FormData) {
  const quantite = Number(formData.get("quantite")) || 0;
  const row = await prisma.prodGaz.update({
    where: { id },
    data: { quantite },
  });
  revalidatePath(`/production/${row.idRapport}/gaz`);
}

export async function upsertFourConsommationElectrique(formData: FormData) {
  const date = new Date(String(formData.get("date") || new Date()));

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.prodFourConsommationElectrique.findFirst({
    where: { date: { gte: dayStart, lte: dayEnd } },
  });

  // The real reference screen has no unit selector at all — a single
  // daily meter reading, not broken down per production unit. idUnite
  // stays a required FK in the schema (an earlier pass before this
  // screenshot was available), so it's auto-assigned to the first
  // active unit here rather than shown as a field the person has to
  // fill in for no reason the real screen gives them.
  const data = {
    date,
    idUnite: existing?.idUnite ?? (await prisma.parametreUniteArticle.findFirst({ where: { deleted: false }, orderBy: { id: "asc" } }))!.id,
    consMatin: numOrNull(formData.get("consMatin")),
    consPointe: numOrNull(formData.get("consPointe")),
    consNuit: numOrNull(formData.get("consNuit")),
    consSoir: numOrNull(formData.get("consSoir")),
  };

  if (existing) {
    await prisma.prodFourConsommationElectrique.update({ where: { id: existing.id }, data });
  } else {
    await prisma.prodFourConsommationElectrique.create({ data });
  }

  revalidatePath("/production/electricite");
}

export async function deleteFourConsommationElectrique(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await prisma.prodFourConsommationElectrique.delete({ where: { id } });
  revalidatePath("/production/electricite");
}

export async function upsertCoefficientGaz(formData: FormData) {
  const date = new Date(String(formData.get("date") || new Date()));
  const coefficient = numOrNull(formData.get("coefficient"));
  if (coefficient == null) return;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.prodCoefficientGaz.findFirst({
    where: { date: { gte: dayStart, lte: dayEnd } },
  });

  if (existing) {
    await prisma.prodCoefficientGaz.update({ where: { id: existing.id }, data: { date, coefficient } });
  } else {
    await prisma.prodCoefficientGaz.create({ data: { date, coefficient } });
  }

  revalidatePath("/production/coefficient");
}

export async function updateMesure(id: number, formData: FormData) {
  const valeur = Number(formData.get("valeur")) || 0;
  const row = await prisma.prodMesureRapport.update({
    where: { id },
    data: { valeur },
  });
  revalidatePath(`/production/${row.idRapport}/qualite`);
  revalidatePath(`/production/${row.idRapport}/preparation`);
}

export async function updatePrepAS(id: number, formData: FormData) {
  const valeurA = Number(formData.get("valeurA")) || 0;
  const valeurS = Number(formData.get("valeurS")) || 0;
  const row = await prisma.prodRapportPrepAS.update({
    where: { id },
    data: { valeurA, valeurS },
  });
  revalidatePath(`/production/${row.idRapport}/preparation`);
}

export async function updateHoraire(id: number, formData: FormData) {
  const data = {
    h1: Number(formData.get("h1")) || 0,
    h2: Number(formData.get("h2")) || 0,
    h3: Number(formData.get("h3")) || 0,
    h4: Number(formData.get("h4")) || 0,
    h5: Number(formData.get("h5")) || 0,
    h6: Number(formData.get("h6")) || 0,
    h7: Number(formData.get("h7")) || 0,
    h8: Number(formData.get("h8")) || 0,
  };
  const row = await prisma.prodRapportHoraireFabrication.update({
    where: { id },
    data,
  });
  revalidatePath(`/production/${row.idRapport}/qualite`);
}

export async function updateTonnage(id: number, formData: FormData) {
  const valeur = Number(formData.get("valeur")) || 0;
  const row = await prisma.prodFabTonnage.update({
    where: { id },
    data: { valeur },
  });
  revalidatePath(`/production/${row.idRapport}/qualite`);
}

export async function updateCfFabrication(id: number, formData: FormData) {
  const idCfRaw = String(formData.get("idCf") || "");
  const row = await prisma.prodRapportCfFabrication.update({
    where: { id },
    data: { idCf: idCfRaw ? Number(idCfRaw) : null },
  });
  revalidatePath(`/production/${row.idRapport}/fabrication`);
}

export async function updateCfEmballage(id: number, formData: FormData) {
  const idCfRaw = String(formData.get("idCf") || "");
  const row = await prisma.prodRapportCfEmballage.update({
    where: { id },
    data: { idCf: idCfRaw ? Number(idCfRaw) : null },
  });
  revalidatePath(`/production/${row.idRapport}/emballage`);
}

export async function addAnomalie(rapportId: number, formData: FormData) {
  const idUnite = Number(formData.get("idUnite"));
  const idAnomalie = Number(formData.get("idAnomalie"));
  const duree = Number(formData.get("duree")) || 0;
  if (!idUnite || !idAnomalie) return;

  await prisma.prodRapportAnomalie.create({
    data: { idRapport: rapportId, idUnite, idAnomalie, duree },
  });
  revalidatePath(`/production/${rapportId}/anomalies`);
}

export async function deleteAnomalie(id: number, rapportId: number) {
  await prisma.prodRapportAnomalie.delete({ where: { id } });
  revalidatePath(`/production/${rapportId}/anomalies`);
}

// ----------------------------------------------------------------------------
// Reference data (settings)
// ----------------------------------------------------------------------------

export async function addProdEquipement(formData: FormData) {
  const idEquipement = Number(formData.get("idEquipement"));
  const uniteProduction = String(formData.get("uniteProduction") || "");
  if (!idEquipement || !uniteProduction) return;

  const existing = await prisma.prodEquipement.findFirst({
    where: { idEquipement },
  });
  if (!existing) {
    await prisma.prodEquipement.create({ data: { idEquipement, uniteProduction } });
  }
  revalidatePath("/production/settings/equipements");
}

export async function deleteProdEquipement(id: number) {
  await requireAdmin();
  await prisma.prodEquipement.delete({ where: { id } });
  revalidatePath("/production/settings/equipements");
}

export async function addTypeBrique(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  const poidRaw = String(formData.get("poid") || "").trim();
  const poidVertRaw = String(formData.get("poidVert") || "").trim();
  if (!designation) return;

  await prisma.prodTypeBrique.create({
    data: {
      designation,
      poid: poidRaw ? Number(poidRaw) : null,
      poidVert: poidVertRaw ? Number(poidVertRaw) : null,
    },
  });
  revalidatePath("/production/settings/briques");
}

export async function deleteTypeBrique(id: number) {
  await requireAdmin();
  await prisma.prodTypeBrique.delete({ where: { id } });
  revalidatePath("/production/settings/briques");
}

// ----------------------------------------------------------------------------
// Recap / KPI dashboard reference data
// (the actual aggregation for /production/recap is computed inline in that
// page from raw findMany() results — simpler to read/adjust than groupBy
// across multiple related tables, given several KPIs need row-level joins
// e.g. matching chef-de-fabrication assignments to fabrication output).
// ----------------------------------------------------------------------------

export async function addSaisie(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  const unite = String(formData.get("unite") || "").trim() || null;
  const cible = Number(formData.get("cible"));
  const poidFour = formData.get("poidFour") === "on";
  if (!designation || !cible) return;

  await prisma.prodSaisie.create({
    data: { designation, unite, cible, poidFour },
  });
  revalidatePath("/production/settings/parametres");
}

export async function deleteSaisie(id: number) {
  await requireAdmin();
  await prisma.prodSaisie.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/production/settings/parametres");
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : null;
}
