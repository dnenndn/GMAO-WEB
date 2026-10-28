/**
 * Tier: budget — depends on core + master (Famille, Fournisseur already
 * migrated).
 *
 * `budget.categorie` is a real source column with NO corresponding field
 * anywhere on the target `Budget` model — category scoping is handled
 * entirely through the separate `budget_categorie` join table (which
 * *is* migrated below, via `BudgetCategorie`). Deliberately not carried
 * over; likely a vestigial single-category column predating the
 * many-to-many join-table design, but its exact status wasn't confirmed
 * either way. Flagged here rather than silently dropped without a trace.
 *
 * `creation_auto` is `varchar(3)` ("Oui"/"Non", same convention already
 * confirmed elsewhere) while `fournisseur_choix`/`categorie_choix`/
 * `creer_nv` are `int` (the standard 0/1 boolean pattern) — checked
 * individually rather than assuming all four boolean-ish columns share
 * one representation.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

function ouiNonToBool(v: unknown): boolean {
  if (v == null) return false;
  return String(v).trim().toLowerCase() === "oui";
}

export async function migrateBudget(prisma: PrismaClient, dryRun: boolean) {
  await migrateBudgetHeader(prisma, dryRun);
  await migrateBudgetCategorie(prisma, dryRun);
  await migrateBudgetFournisseur(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateBudgetHeader(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, nom, description, date_creation, duree, montant, creation_auto,
           fournisseur_choix, categorie_choix, creer_nv
    FROM budget
  `);
  console.log(`budget: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.budget.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        nom: r.nom,
        description: toStrOrNull(r.description),
        dateCreation: toDate(r.date_creation) ?? new Date(),
        duree: toStrOrNull(r.duree) ?? "Chaque Mois",
        montant: toNumOrNull(r.montant) ?? 0,
        creationAuto: ouiNonToBool(r.creation_auto),
        fournisseurChoix: toBool(r.fournisseur_choix),
        categorieChoix: toBool(r.categorie_choix),
        creerNv: toBool(r.creer_nv),
      },
    });
  }
  await resetSequence(prisma, "budget");
}

async function migrateBudgetCategorie(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_budget, id_categorie FROM budget_categorie`);
  console.log(`budget_categorie: ${rows.length} rows`);
  if (dryRun) return;

  const validBudgetIds = new Set((await prisma.budget.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFamilleIds = new Set((await prisma.famille.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idBudget = toExistingIdOrNull(r.id_budget, validBudgetIds);
    const idCategorie = toExistingIdOrNull(r.id_categorie, validFamilleIds);

    if (idBudget == null || idCategorie == null) {
      skipped++;
      console.warn(
        `  ⚠ skipping budget_categorie row ${r.id}: invalid id_budget=${r.id_budget}, id_categorie=${r.id_categorie}`
      );
      continue;
    }

    await prisma.budgetCategorie.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idBudget, idCategorie },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} budget_categorie row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "budget_categorie");
}

async function migrateBudgetFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_budget, id_fournisseur FROM budget_fournisseur`);
  console.log(`budget_fournisseur: ${rows.length} rows`);
  if (dryRun) return;

  const validBudgetIds = new Set((await prisma.budget.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idBudget = toExistingIdOrNull(r.id_budget, validBudgetIds);
    const idFournisseur = toExistingIdOrNull(r.id_fournisseur, validFournisseurIds);

    if (idBudget == null || idFournisseur == null) {
      skipped++;
      console.warn(
        `  ⚠ skipping budget_fournisseur row ${r.id}: invalid id_budget=${r.id_budget}, id_fournisseur=${r.id_fournisseur}`
      );
      continue;
    }

    await prisma.budgetFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idBudget, idFournisseur },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} budget_fournisseur row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "budget_fournisseur");
}
