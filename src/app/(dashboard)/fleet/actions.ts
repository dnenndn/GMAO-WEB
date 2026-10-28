"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

// ----------------------------------------------------------------------------
// Vehicles (Engin)
// ----------------------------------------------------------------------------

export async function createEngin(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;

  const engin = await prisma.engin.create({
    data: {
      matricule: str(formData, "matricule"),
      numCarte: str(formData, "numCarte"),
      designation,
      marque: str(formData, "marque"),
      idVehicule: numOrNull(formData.get("idVehicule")),
      idChauffeur: numOrNull(formData.get("idChauffeur")),
      idCategorie: numOrNull(formData.get("idCategorie")),
      liaison: str(formData, "liaison"),
    },
  });

  revalidatePath("/fleet/vehicles");
  redirect(`/fleet/vehicles/${engin.id}`);
}

// ----------------------------------------------------------------------------
// Compliance documents (assurance / vignette / visite technique)
// ----------------------------------------------------------------------------

export async function addAssurance(enginId: number, formData: FormData) {
  await prisma.enginAssurance.create({
    data: {
      idEngin: enginId,
      raisonSocial: str(formData, "raisonSocial"),
      dateDeb: new Date(String(formData.get("dateDeb"))),
      dateExp: new Date(String(formData.get("dateExp"))),
      prix: numOrNull(formData.get("prix")),
      notAvant: numOrNull(formData.get("notAvant")),
    },
  });
  revalidatePath(`/fleet/vehicles/${enginId}`);
}

export async function addEnginFichier(enginId: number, formData: FormData) {
  const adresse = String(formData.get("adresse") || "").trim();
  if (!adresse) return;
  await prisma.enginFichier.create({ data: { idEngin: enginId, adresse } });
  revalidatePath(`/fleet/vehicles/${enginId}`);
}

export async function deleteEnginFichier(id: number, enginId: number) {
  await prisma.enginFichier.delete({ where: { id } });
  revalidatePath(`/fleet/vehicles/${enginId}`);
}

export async function addVignette(enginId: number, formData: FormData) {
  await prisma.enginVignette.create({
    data: {
      idEngin: enginId,
      dateDeb: new Date(String(formData.get("dateDeb"))),
      dateExp: new Date(String(formData.get("dateExp"))),
      prix: numOrNull(formData.get("prix")),
      notAvant: numOrNull(formData.get("notAvant")),
    },
  });
  revalidatePath(`/fleet/vehicles/${enginId}`);
}

export async function addVisiteTechnique(enginId: number, formData: FormData) {
  await prisma.enginVisiteTechnique.create({
    data: {
      idEngin: enginId,
      dateDeb: new Date(String(formData.get("dateDeb"))),
      dateExp: new Date(String(formData.get("dateExp"))),
      prix: numOrNull(formData.get("prix")),
      notAvant: numOrNull(formData.get("notAvant")),
      typeVisite: str(formData, "typeVisite"),
    },
  });
  revalidatePath(`/fleet/vehicles/${enginId}`);
}

// ----------------------------------------------------------------------------
// Fuel log
// ----------------------------------------------------------------------------

export async function addSortieCarburant(formData: FormData) {
  const idEngin = Number(formData.get("idEngin"));
  const quantite = Number(formData.get("quantite")) || 0;
  if (!idEngin || quantite <= 0) return;

  const prixU = numOrNull(formData.get("prixU"));

  await prisma.enginSortieCarburant.create({
    data: {
      idEngin,
      quantite,
      prixU,
      prixTtc: prixU ? prixU * quantite : null,
      date: new Date(String(formData.get("date") || new Date())),
      heure: str(formData, "heure"),
      idCarbu: numOrNull(formData.get("idCarbu")),
      compteur: numOrNull(formData.get("compteur")),
    },
  });

  revalidatePath("/fleet/fuel");
  revalidatePath(`/fleet/vehicles/${idEngin}`);
}

// ----------------------------------------------------------------------------
// Bons de carburant (fuel vouchers) and Voyages (trips)
// ----------------------------------------------------------------------------

export async function addBonCarburant(formData: FormData) {
  const idEngin = Number(formData.get("idEngin"));
  const idChauffeur = Number(formData.get("idChauffeur"));
  const idTypeCarburant = Number(formData.get("idTypeCarburant"));
  const quantite = Number(formData.get("quantite")) || 0;
  const prixU = Number(formData.get("prixU")) || 0;
  if (!idEngin || !idChauffeur || !idTypeCarburant || quantite <= 0) return;

  await prisma.bonDeCarburant.create({
    data: {
      nom: str(formData, "nom") ?? `BC-${Date.now()}`,
      idEngin,
      idChauffeur,
      idTypeCarburant,
      quantite,
      prixU,
      prixTtc: prixU * quantite,
      date: new Date(String(formData.get("date") || new Date())),
    },
  });

  revalidatePath("/fleet/bons-carburant");
}

export async function deleteBonCarburant(id: number) {
  await prisma.bonDeCarburant.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/fleet/bons-carburant");
}

export async function addVoyage(formData: FormData) {
  const idEngin = Number(formData.get("idEngin"));
  const idChauffeur = Number(formData.get("idChauffeur"));
  const depart = str(formData, "depart");
  const arrive = str(formData, "arrive");
  if (!idEngin || !idChauffeur || !depart || !arrive) return;

  await prisma.voyage.create({
    data: {
      idEngin,
      idChauffeur,
      depart,
      arrive,
      distance: Number(formData.get("distance")) || 0,
      date: new Date(String(formData.get("date") || new Date())),
      heureDep: str(formData, "heureDep"),
      heureArr: str(formData, "heureArr"),
    },
  });

  revalidatePath("/fleet/voyages");
}

export async function deleteVoyage(id: number) {
  await prisma.voyage.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/fleet/voyages");
}

// ----------------------------------------------------------------------------
// Reference data
// ----------------------------------------------------------------------------

export async function addTypeVehicule(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.typeVehicule.create({
    data: { designation, codeVehicule: str(formData, "codeVehicule") },
  });
  revalidatePath("/fleet/settings/vehicle-types");
}
export async function deleteTypeVehicule(id: number) {
  await requireAdmin();
  await prisma.typeVehicule.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/fleet/settings/vehicle-types");
}

export async function addChauffeur(formData: FormData) {
  const nom = String(formData.get("nom") || "").trim();
  if (!nom) return;
  await prisma.chauffeur.create({ data: { nom, code: str(formData, "code") } });
  revalidatePath("/fleet/settings/drivers");
}
export async function deleteChauffeur(id: number) {
  await requireAdmin();
  await prisma.chauffeur.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/fleet/settings/drivers");
}

export async function addTypeCarburant(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.typeCarburant.create({ data: { designation } });
  revalidatePath("/fleet/settings/fuel-types");
}
export async function deleteTypeCarburant(id: number) {
  await requireAdmin();
  await prisma.typeCarburant.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/fleet/settings/fuel-types");
}

export async function addCategorieDeCharge(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.categorieDeCharge.create({ data: { designation } });
  revalidatePath("/fleet/settings/categories");
}
export async function deleteCategorieDeCharge(id: number) {
  await requireAdmin();
  await prisma.categorieDeCharge.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/fleet/settings/categories");
}

// ----------------------------------------------------------------------------
// Réclamations (driver-reported vehicle complaints)
// ----------------------------------------------------------------------------

export async function addReclamation(formData: FormData) {
  const anomalie = str(formData, "anomalie");
  const idEngin = numOrNull(formData.get("idEngin"));
  const idChauffeur = numOrNull(formData.get("idChauffeur"));
  if (!anomalie || !idEngin || !idChauffeur) return;

  await prisma.reclamationAnomalie.create({
    data: {
      anomalie,
      idEngin,
      idChauffeur,
      date: new Date(String(formData.get("date") || new Date())),
    },
  });
  revalidatePath("/fleet/reclamations");
}

export async function deleteReclamation(id: number) {
  await prisma.reclamationAnomalie.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/fleet/reclamations");
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
