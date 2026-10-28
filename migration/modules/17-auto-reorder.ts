/**
 * Tier: auto-reorder — depends on core + master (Article).
 *
 * Clean tier — every source column matched its target field exactly.
 * Both plan tables' `arr` is nullable in the source but the target
 * models it as a plain (non-nullable) Boolean with a false default —
 * same `toBool()` pattern as everywhere else, which treats null/0 as
 * false and only 1 as true.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

export async function migrateAutoReorder(prisma: PrismaClient, dryRun: boolean) {
  await migrateAcReapprovisionnement(prisma, dryRun);
  await migrateAcReapprovisionnementEch(prisma, dryRun);
  await migrateAcRecompletement(prisma, dryRun);
  await migrateAcRecompletementEch(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateAcReapprovisionnement(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_article, qt, delai, date_debut, heure_debut, reccurence, date_limite, periode, arr
    FROM ac_reapprovisionnement
  `);
  console.log(`ac_reapprovisionnement: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.acReapprovisionnement.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idArticle: r.id_article,
        qt: toNumOrNull(r.qt) ?? 0,
        delai: r.delai,
        dateDebut: toDate(r.date_debut) ?? new Date(),
        heureDebut: toStrOrNull(r.heure_debut),
        reccurence: r.reccurence,
        dateLimite: toDate(r.date_limite),
        periode: toStrOrNull(r.periode),
        arr: toBool(r.arr),
      },
    });
  }
  await resetSequence(prisma, "ac_reapprovisionnement");
}

async function migrateAcReapprovisionnementEch(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rep, date_ech, heure_ech, deleted FROM ac_reapprovisionnement_ech`);
  console.log(`ac_reapprovisionnement_ech: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.acReapprovisionnementEch.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRep: r.id_rep,
        dateEch: toDate(r.date_ech) ?? new Date(),
        heureEch: toStrOrNull(r.heure_ech),
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "ac_reapprovisionnement_ech");
}

async function migrateAcRecompletement(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_article, delai, date_debut, heure_debut, reccurence, date_limite, periode, arr
    FROM ac_recompletement
  `);
  console.log(`ac_recompletement: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.acRecompletement.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idArticle: r.id_article,
        delai: r.delai,
        dateDebut: toDate(r.date_debut) ?? new Date(),
        heureDebut: toStrOrNull(r.heure_debut),
        reccurence: r.reccurence,
        dateLimite: toDate(r.date_limite) ?? new Date(),
        periode: toStrOrNull(r.periode),
        arr: toBool(r.arr),
      },
    });
  }
  await resetSequence(prisma, "ac_recompletement");
}

async function migrateAcRecompletementEch(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rep, date_ech, heure_ech, deleted FROM ac_recompletement_ech`);
  console.log(`ac_recompletement_ech: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.acRecompletementEch.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRep: r.id_rep,
        dateEch: toDate(r.date_ech) ?? new Date(),
        heureEch: toStrOrNull(r.heure_ech),
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "ac_recompletement_ech");
}
