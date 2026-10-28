/**
 * Tier: notification — depends on core + master (Utilisateur).
 *
 * `Type`'s casing differs between the two source tables
 * (`notification.type` lowercase, `notification_alerte.Type` capitalized)
 * — SQL Server column names are case-insensitive by default so this is
 * cosmetic, but the SELECT below spells each exactly as the source has
 * it to avoid relying on that case-insensitivity.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, queryPage, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

const BATCH_SIZE = 5000;

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateNotification(prisma: PrismaClient, dryRun: boolean) {
  await migrateNotificationHeader(prisma, dryRun);
  await migrateNotificationAlerte(prisma, dryRun);
}

async function migrateNotificationHeader(prisma: PrismaClient, dryRun: boolean) {
  const rowsCount = Number((await queryAll<{ total: number | string }>(`SELECT COUNT(*) AS total FROM notification`))[0]?.total ?? 0);
  console.log(`notification: ${rowsCount} rows`);
  if (dryRun) return;

  const validUserIds = new Set((await prisma.utilisateur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let totalProcessed = 0;
  let lastId = 0;

  while (true) {
    const rows = await queryPage<any>("notification", "id, id_n, type, id_utilisateur, description, vue, date_creation", {
      lastId,
      pageSize: BATCH_SIZE,
    });
    if (rows.length === 0) break;

    const validRows: {
      id: number;
      idN: number | null;
      type: string | null;
      idUtilisateur: number | null;
      description: string | null;
      vue: boolean;
      dateCreation: Date | null;
    }[] = [];

    for (const r of rows as any[]) {
      const idUtilisateur = r.id_utilisateur == null ? null : toExistingIdOrNull(r.id_utilisateur, validUserIds);
      if (r.id_utilisateur != null && idUtilisateur == null) {
        console.warn(`  ⚠ skipping notification row ${r.id}: invalid id_utilisateur=${r.id_utilisateur}`);
        continue;
      }

      validRows.push({
        id: r.id,
        idN: toNumOrNull(r.id_n),
        type: toStrOrNull(r.type),
        idUtilisateur: idUtilisateur,
        description: toStrOrNull(r.description),
        vue: toBool(r.vue),
        dateCreation: toDate(r.date_creation),
      });
    }

    if (validRows.length > 0) {
      await prisma.notification.createMany({
        data: validRows,
        skipDuplicates: true,
      });
    }

    totalProcessed += rows.length;
    lastId = rows.reduce((max, row) => Math.max(max, Number((row as any).id) || 0), lastId);
  }

  console.log(`notification: ${totalProcessed} rows processed in batches`);
  await resetSequence(prisma, "notification");
}

async function migrateNotificationAlerte(prisma: PrismaClient, dryRun: boolean) {
  const rowsCount = Number((await queryAll<{ total: number | string }>(`SELECT COUNT(*) AS total FROM notification_alerte`))[0]?.total ?? 0);
  console.log(`notification_alerte: ${rowsCount} rows`);
  if (dryRun) return;

  const validUserIds = new Set((await prisma.utilisateur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validNotificationIds = new Set((await prisma.notification.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let totalProcessed = 0;
  let lastId = 0;

  while (true) {
    const rows = await queryPage<any>("notification_alerte", "id, id_not, Type, id_utilisateur, description, vue, date_creation", {
      lastId,
      pageSize: BATCH_SIZE,
    });
    if (rows.length === 0) break;

    const validRows: {
      id: number;
      idNot: number;
      type: string;
      idUtilisateur: number | null;
      description: string;
      vue: boolean;
      dateCreation: Date;
    }[] = [];

    for (const r of rows as any[]) {
      const idNot = toExistingIdOrNull(r.id_not, validNotificationIds);
      const idUtilisateur = r.id_utilisateur == null ? null : toExistingIdOrNull(r.id_utilisateur, validUserIds);

      if (idNot == null || (r.id_utilisateur != null && idUtilisateur == null)) {
        console.warn(`  ⚠ skipping notification_alerte row ${r.id}: invalid id_not=${r.id_not} or id_utilisateur=${r.id_utilisateur}`);
        continue;
      }

      validRows.push({
        id: r.id,
        idNot: idNot,
        type: toStrOrNull(r.Type) ?? "",
        idUtilisateur: idUtilisateur,
        description: toStrOrNull(r.description) ?? "",
        vue: toBool(r.vue),
        dateCreation: toDate(r.date_creation) ?? new Date(),
      });
    }

    if (validRows.length > 0) {
      await prisma.notificationAlerte.createMany({
        data: validRows,
        skipDuplicates: true,
      });
    }

    totalProcessed += rows.length;
    lastId = rows.reduce((max, row) => Math.max(max, Number((row as any).id) || 0), lastId);
  }

  console.log(`notification_alerte: ${totalProcessed} rows processed in batches`);
  await resetSequence(prisma, "notification_alerte");
}
