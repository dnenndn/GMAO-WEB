/**
 * Tier: activite-scoping — depends on core + master (Famille, SousFamille)
 * + subcontracting tier (ActiviteSousTraitance).
 *
 * All 3 tables added in this same pass (schema.prisma "Phase 25" + app
 * UI + this migration) — extends the already-migrated
 * ActiviteSousTraitance (Subcontracting) with Famille/SousFamille
 * scoping and an operations checklist.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, resetSequence } from "../db";

export async function migrateActiviteScoping(prisma: PrismaClient, dryRun: boolean) {
  await migrateActiviteFamille(prisma, dryRun);
  await migrateActiviteSousFamille(prisma, dryRun);
  await migrateActiviteOperation(prisma, dryRun);
}

async function migrateActiviteFamille(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_activite, id_famille FROM activite_famille`);
  console.log(`activite_famille: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.activiteFamille.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idActivite: r.id_activite, idFamille: r.id_famille },
    });
  }
  await resetSequence(prisma, "activite_famille");
}

async function migrateActiviteSousFamille(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_activite, id_sous_famille FROM activite_sous_famille`);
  console.log(`activite_sous_famille: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.activiteSousFamille.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idActivite: r.id_activite, idSousFamille: r.id_sous_famille },
    });
  }
  await resetSequence(prisma, "activite_sous_famille");
}

async function migrateActiviteOperation(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_activite, operation FROM activite_operation`);
  console.log(`activite_operation: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.activiteOperation.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idActivite: r.id_activite, operation: r.operation },
    });
  }
  await resetSequence(prisma, "activite_operation");
}
