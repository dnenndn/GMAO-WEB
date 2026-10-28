"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function createBudget(formData: FormData) {
  await requireAdmin();
  const nom = String(formData.get("nom") || "").trim();
  if (!nom) return;

  const categorieChoix = formData.get("scope") === "categorie";
  const fournisseurChoix = formData.get("scope") === "fournisseur";

  const budget = await prisma.budget.create({
    data: {
      nom,
      description: str(formData, "description"),
      dateCreation: new Date(String(formData.get("dateCreation") || new Date())),
      duree: String(formData.get("duree") || "Chaque Mois"),
      montant: Number(formData.get("montant")) || 0,
      creationAuto: formData.get("creationAuto") === "on",
      categorieChoix,
      fournisseurChoix,
    },
  });

  const idsCategories = formData.getAll("idsCategories").map(Number).filter(Boolean);
  const idsFournisseurs = formData.getAll("idsFournisseurs").map(Number).filter(Boolean);

  if (categorieChoix && idsCategories.length > 0) {
    await prisma.budgetCategorie.createMany({
      data: idsCategories.map((idCategorie) => ({ idBudget: budget.id, idCategorie })),
    });
  }
  if (fournisseurChoix && idsFournisseurs.length > 0) {
    await prisma.budgetFournisseur.createMany({
      data: idsFournisseurs.map((idFournisseur) => ({ idBudget: budget.id, idFournisseur })),
    });
  }

  revalidatePath("/budget");
  redirect(`/budget/${budget.id}`);
}

function str(formData: FormData, key: string) {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

export async function updateBudget(id: number, formData: FormData) {
  await requireAdmin();
  const nom = String(formData.get("nom") || "").trim();
  if (!nom) return;

  await prisma.budget.update({
    where: { id },
    data: {
      nom,
      description: str(formData, "description"),
      duree: String(formData.get("duree") || "Chaque Mois"),
      montant: Number(formData.get("montant")) || 0,
      creationAuto: formData.get("creationAuto") === "on",
    },
  });

  revalidatePath("/budget");
  revalidatePath(`/budget/${id}`);
}

// ----------------------------------------------------------------------------
// Scope management (category / supplier)
// ----------------------------------------------------------------------------

export async function addBudgetCategorie(budgetId: number, formData: FormData) {
  const idCategorie = Number(formData.get("idCategorie"));
  if (!idCategorie) return;
  await prisma.budgetCategorie.create({ data: { idBudget: budgetId, idCategorie } });
  revalidatePath(`/budget/${budgetId}`);
}

export async function removeBudgetCategorie(id: number, budgetId: number) {
  await prisma.budgetCategorie.delete({ where: { id } });
  revalidatePath(`/budget/${budgetId}`);
}

export async function addBudgetFournisseur(budgetId: number, formData: FormData) {
  const idFournisseur = Number(formData.get("idFournisseur"));
  if (!idFournisseur) return;
  await prisma.budgetFournisseur.create({ data: { idBudget: budgetId, idFournisseur } });
  revalidatePath(`/budget/${budgetId}`);
}

export async function removeBudgetFournisseur(id: number, budgetId: number) {
  await prisma.budgetFournisseur.delete({ where: { id } });
  revalidatePath(`/budget/${budgetId}`);
}
