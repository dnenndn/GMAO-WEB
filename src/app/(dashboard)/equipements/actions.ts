"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ----------------------------------------------------------------------------
// Equipement tree — lazy loading
// ----------------------------------------------------------------------------

// The real reference screen (Arbre_Equipement.cs) lazy-loads each node's
// children with a fresh query on expand — it never loads the whole
// hierarchy at once. An earlier pass here loaded everything upfront on
// the assumption the dataset was small enough; it wasn't, and made the
// page slow to load regardless of tree size. Reverted to match the
// real app's actual lazy design: the page loads only root-level
// equipment, and this action fetches one node's direct children on
// demand when it's expanded.
export async function getEquipementChildren(parentId: number) {
  const children = await prisma.equipement.findMany({
    where: { deleted: false, idParent: parentId },
    select: { id: true, idParent: true, code: true, designation: true, ordre: true },
    orderBy: { ordre: "asc" },
  });

  const childIds = children.map((c) => c.id);
  const pdfs = childIds.length
    ? await prisma.equipementPdf.findMany({
        where: { idEquipement: { in: childIds } },
        select: { idEquipement: true },
        distinct: ["idEquipement"],
      })
    : [];
  const pdfSet = new Set(pdfs.map((p) => p.idEquipement));

  return children.map((c) => ({
    id: c.id,
    idParent: c.idParent,
    code: c.code,
    designation: c.designation,
    hasPdf: pdfSet.has(c.id),
  }));
}

// Server-side search across the whole equipment table (not just what's
// currently expanded client-side) — returns a flat list of matches,
// same flattened shape the real "Afficher Joints" toggle already uses,
// rather than trying to reconstruct partial ancestor chains for a tree
// that isn't fully loaded on the client.
export async function searchEquipements(query: string) {
  const q = query.trim();
  if (!q) return [];
  const matches = await prisma.equipement.findMany({
    where: {
      deleted: false,
      OR: [
        { designation: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, idParent: true, code: true, designation: true },
    orderBy: { designation: "asc" },
    take: 200,
  });
  const ids = matches.map((m) => m.id);
  const pdfs = ids.length
    ? await prisma.equipementPdf.findMany({
        where: { idEquipement: { in: ids } },
        select: { idEquipement: true },
        distinct: ["idEquipement"],
      })
    : [];
  const pdfSet = new Set(pdfs.map((p) => p.idEquipement));
  return matches.map((m) => ({ ...m, hasPdf: pdfSet.has(m.id) }));
}

const MODEL_3D_EXTENSIONS = ["glb", "gltf", "stl"];

// Fetches just the 3D-viewable attachments (glb/gltf/stl) for one
// equipment, used by the tree view to show a part's model inline next
// to the tree the moment it's selected, rather than needing a separate
// page/tab.
export async function getEquipement3DModels(equipementId: number) {
  const pdfs = await prisma.equipementPdf.findMany({
    where: { idEquipement: equipementId },
    orderBy: { id: "asc" },
  });
  return pdfs
    .filter((p) => {
      const ext = p.adresse.split(".").pop()?.toLowerCase();
      return !!ext && MODEL_3D_EXTENSIONS.includes(ext);
    })
    .map((p) => ({ id: p.id, adresse: p.adresse }));
}

// "Afficher Joints" — the real button's actual behavior: a flat list
// of every equipment with a PDF document attached (equipement_pdf),
// not the hierarchy — matches the real handler's own query exactly.
export async function getEquipementsWithPdf() {
  const links = await prisma.equipementPdf.findMany({
    select: { idEquipement: true },
    distinct: ["idEquipement"],
  });
  const ids = links.map((l) => l.idEquipement);
  if (ids.length === 0) return [];
  const equipements = await prisma.equipement.findMany({
    where: { deleted: false, id: { in: ids } },
    select: { id: true, idParent: true, code: true, designation: true },
    orderBy: { id: "asc" },
  });
  return equipements.map((e) => ({ ...e, hasPdf: true }));
}


// ----------------------------------------------------------------------------
// General/administrative info (1:1)
// ----------------------------------------------------------------------------

export async function updateEquipementGenerale(equipementId: number, formData: FormData) {
  const data = {
    reference: str(formData, "reference"),
    marque: str(formData, "marque"),
    nSerie: str(formData, "nSerie"),
    nModele: str(formData, "nModele"),
    nContrat: str(formData, "nContrat"),
    nImmobilisation: str(formData, "nImmobilisation"),
    fabricant: str(formData, "fabricant"),
    coutAchat: str(formData, "coutAchat"),
    dateAchat: dateOrNull(formData.get("dateAchat")),
    dateMiseEnService: dateOrNull(formData.get("dateMiseEnService")),
    dateFinGarantie: dateOrNull(formData.get("dateFinGarantie")),
    dateFinAmortissement: dateOrNull(formData.get("dateFinAmortissement")),
    fonctionReq: str(formData, "fonctionReq"),
  };

  await prisma.equipementGenerale.upsert({
    where: { idEquipement: equipementId },
    update: data,
    create: { idEquipement: equipementId, ...data },
  });

  revalidatePath(`/equipements/${equipementId}`);
}

// ----------------------------------------------------------------------------
// Technique (repeatable specs)
// ----------------------------------------------------------------------------

export async function addEquipementTechnique(equipementId: number, formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  const observation = String(formData.get("observation") || "").trim();
  if (!designation) return;

  await prisma.equipementTechnique.create({
    data: { idEquipement: equipementId, designation, observation },
  });
  revalidatePath(`/equipements/${equipementId}/technique`);
}

export async function deleteEquipementTechnique(id: number, equipementId: number) {
  await prisma.equipementTechnique.delete({ where: { id } });
  revalidatePath(`/equipements/${equipementId}/technique`);
}

// ----------------------------------------------------------------------------
// Observations
// ----------------------------------------------------------------------------

export async function addEquipementObservation(equipementId: number, formData: FormData) {
  const observation = String(formData.get("observation") || "").trim();
  if (!observation) return;

  await prisma.equipementObservation.create({
    data: { idEquipement: equipementId, observation },
  });
  revalidatePath(`/equipements/${equipementId}/technique`);
}

export async function deleteEquipementObservation(id: number, equipementId: number) {
  await prisma.equipementObservation.delete({ where: { id } });
  revalidatePath(`/equipements/${equipementId}/technique`);
}

// ----------------------------------------------------------------------------
// PDF attachments
// ----------------------------------------------------------------------------

export async function addEquipementPdf(equipementId: number, formData: FormData) {
  const adresse = String(formData.get("adresse") || "").trim();
  if (!adresse) return;

  await prisma.equipementPdf.create({ data: { idEquipement: equipementId, adresse } });
  revalidatePath(`/equipements/${equipementId}/documents`);
}

export async function deleteEquipementPdf(id: number, equipementId: number) {
  await prisma.equipementPdf.delete({ where: { id } });
  revalidatePath(`/equipements/${equipementId}/documents`);
}

// ----------------------------------------------------------------------------
// Downtime-cost / failure forecast (1:1)
// ----------------------------------------------------------------------------

export async function updateEquipementPrevision(equipementId: number, formData: FormData) {
  const data = {
    coutArret: numOrNull(formData.get("coutArret")),
    nbreArret: numOrNull(formData.get("nbreArret")),
    periodeNbr: numOrNull(formData.get("periodeNbr")),
    periode: str(formData, "periode"),
  };

  await prisma.equipementPrevision.upsert({
    where: { idEquipement: equipementId },
    update: data,
    create: { idEquipement: equipementId, ...data },
  });

  revalidatePath(`/equipements/${equipementId}/prevision`);
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

function dateOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? new Date(s) : null;
}
