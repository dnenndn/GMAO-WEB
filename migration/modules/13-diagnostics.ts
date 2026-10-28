/**
 * Tier: diagnostics — depends on core (Symptome, ParametreAnomalie) +
 * maintenance (OrdreTravail).
 *
 * All 8 tables here are straightforward — every source column matched
 * its target field exactly on first check, no naming mismatches or type
 * surprises found. `OperationDiagnostic` (reference data, no OT
 * dependency) is migrated first since `OtDiagnosticOperation` needs it.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

export async function migrateDiagnostics(prisma: PrismaClient, dryRun: boolean) {
  await migrateOperationDiagnostic(prisma, dryRun);
  await migrateRelationAnomalie(prisma, dryRun);
  await migrateSymptomeDefaillance(prisma, dryRun);
  await migrateOtDiagnosticDef(prisma, dryRun);
  await migrateOtDiagnosticDetection(prisma, dryRun);
  await migrateOtDiagnosticM(prisma, dryRun);
  await migrateOtDiagnosticOperation(prisma, dryRun);
  await migrateOtDiagnosticSymptome(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateOperationDiagnostic(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_defaillance, code, designation, deleted FROM operation_diagnostic
  `);
  console.log(`operation_diagnostic: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.operationDiagnostic.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idDefaillance: r.id_defaillance,
        code: toStrOrNull(r.code),
        designation: r.designation,
        deleted: Boolean(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "operation_diagnostic");
}

async function migrateRelationAnomalie(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_anomalie, id_parent FROM relation_anomalie`);
  console.log(`relation_anomalie: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.relationAnomalie.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idAnomalie: r.id_anomalie, idParent: r.id_parent },
    });
  }
  await resetSequence(prisma, "relation_anomalie");
}

async function migrateSymptomeDefaillance(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_symptome, id_defaillance FROM symptome_defaillance`);
  console.log(`symptome_defaillance: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.symptomeDefaillance.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idSymptome: r.id_symptome, idDefaillance: r.id_defaillance },
    });
  }
  await resetSequence(prisma, "symptome_defaillance");
}

async function migrateOtDiagnosticDef(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_ot, id_defaillance FROM ot_diagnostic_def`);
  console.log(`ot_diagnostic_def: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otDiagnosticDef.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idOt: r.id_ot, idDefaillance: r.id_defaillance },
    });
  }
  await resetSequence(prisma, "ot_diagnostic_def");
}

async function migrateOtDiagnosticDetection(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_ot, id_defaillance, type_d FROM ot_diagnostic_detection`);
  console.log(`ot_diagnostic_detection: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otDiagnosticDetection.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idOt: r.id_ot, idDefaillance: r.id_defaillance, typeD: toNumOrNull(r.type_d) ?? 0 },
    });
  }
  await resetSequence(prisma, "ot_diagnostic_detection");
}

async function migrateOtDiagnosticM(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_ot, id_defaillance, type_m FROM ot_diagnostic_m`);
  console.log(`ot_diagnostic_m: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otDiagnosticM.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idOt: r.id_ot, idDefaillance: r.id_defaillance, typeM: r.type_m },
    });
  }
  await resetSequence(prisma, "ot_diagnostic_m");
}

async function migrateOtDiagnosticOperation(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_ot, id_operation, debut, fin FROM ot_diagnostic_operation`);
  console.log(`ot_diagnostic_operation: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otDiagnosticOperation.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idOt: r.id_ot,
        idOperation: r.id_operation,
        debut: toDate(r.debut) ?? new Date(),
        fin: toDate(r.fin) ?? new Date(),
      },
    });
  }
  await resetSequence(prisma, "ot_diagnostic_operation");
}

async function migrateOtDiagnosticSymptome(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_ot, id_symptome, id_defaillance FROM ot_diagnostic_symptome`);
  console.log(`ot_diagnostic_symptome: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otDiagnosticSymptome.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idOt: r.id_ot, idSymptome: r.id_symptome, idDefaillance: r.id_defaillance },
    });
  }
  await resetSequence(prisma, "ot_diagnostic_symptome");
}
