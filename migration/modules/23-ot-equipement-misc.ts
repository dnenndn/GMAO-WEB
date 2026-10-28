/**
 * Tier: ot-equipement-misc — depends on core + master (Equipement) +
 * maintenance (OrdreTravail, ParametreIntervention, EquipementCompteur).
 *
 * `ParametreCentreCharge` fills a real gap: `OtCentreCharge` was
 * migrated in tier 18 with a bare unrelated `idCentreCharge` int — the
 * schema itself has been updated to add the real relation now that this
 * lookup table exists (matching the EquipementCompteur precedent from
 * tier 7), but tier 18's own migration function is untouched and still
 * correct, since it always wrote to the scalar FK column directly.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, queryPage, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

const BATCH_SIZE = 5000;

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateOtEquipementMisc(prisma: PrismaClient, dryRun: boolean) {
  await migrateParametreCauseRealisation(prisma, dryRun);
  await migrateParametreCentreCharge(prisma, dryRun);
  await migrateOtCauseRealisation(prisma, dryRun);
  await migrateEquipementCompteurHistorique(prisma, dryRun);
  await migrateEquipementCompteurNv(prisma, dryRun);
  await migrateCompteurLiaison(prisma, dryRun);
}

async function migrateParametreCauseRealisation(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation FROM parametre_cause_realisation`);
  console.log(`parametre_cause_realisation: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreCauseRealisation.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: toStrOrNull(r.code), designation: r.designation },
    });
  }
  await resetSequence(prisma, "parametre_cause_realisation");
}

async function migrateParametreCentreCharge(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation, budget FROM parametre_centre_charge`);
  console.log(`parametre_centre_charge: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreCentreCharge.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: toStrOrNull(r.code), designation: r.designation, budget: toNumOrNull(r.budget) },
    });
  }
  await resetSequence(prisma, "parametre_centre_charge");
}

async function migrateOtCauseRealisation(prisma: PrismaClient, dryRun: boolean) {
  const rowsCount = Number((await queryAll<{ total: number | string }>(`SELECT COUNT(*) AS total FROM ot_cause_realisation`))[0]?.total ?? 0);
  console.log(`ot_cause_realisation: ${rowsCount} rows`);
  if (dryRun) return;

  const validOtIds = new Set((await prisma.ordreTravail.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCauseIds = new Set((await prisma.parametreCauseRealisation.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let totalProcessed = 0;
  let lastId = 0;

  while (true) {
    const rows = await queryPage<any>("ot_cause_realisation", "id, id_ot, id_cause", { lastId, pageSize: BATCH_SIZE });
    if (rows.length === 0) break;

    const validRows: { id: number; idOt: number; idCause: number }[] = [];
    for (const r of rows as any[]) {
      const idOt = toExistingIdOrNull(r.id_ot, validOtIds);
      const idCause = toExistingIdOrNull(r.id_cause, validCauseIds);
      if (idOt == null || idCause == null) {
        console.warn(`  ⚠ skipping ot_cause_realisation row ${r.id}: invalid id_ot=${r.id_ot} or id_cause=${r.id_cause}`);
        continue;
      }
      validRows.push({ id: r.id, idOt, idCause });
    }

    if (validRows.length > 0) {
      await prisma.otCauseRealisation.createMany({ data: validRows, skipDuplicates: true });
    }

    totalProcessed += rows.length;
    lastId = rows.reduce((max, row) => Math.max(max, Number((row as any).id) || 0), lastId);
  }

  console.log(`ot_cause_realisation: ${totalProcessed} rows processed in batches`);
  await resetSequence(prisma, "ot_cause_realisation");
}

async function migrateEquipementCompteurHistorique(prisma: PrismaClient, dryRun: boolean) {
  const rowsCount = Number((await queryAll<{ total: number | string }>(`SELECT COUNT(*) AS total FROM equipement_compteur_historique`))[0]?.total ?? 0);
  console.log(`equipement_compteur_historique: ${rowsCount} rows`);
  if (dryRun) return;

  const validCompteurIds = new Set((await prisma.equipementCompteur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let totalProcessed = 0;
  let lastId = 0;

  while (true) {
    const rows = await queryPage<any>("equipement_compteur_historique", "id, id_compteur, valeur, date_mesure", {
      lastId,
      pageSize: BATCH_SIZE,
    });
    if (rows.length === 0) break;

    const validRows: { id: number; idCompteur: number; valeur: number; dateMesure: Date }[] = [];
    for (const r of rows as any[]) {
      const idCompteur = toExistingIdOrNull(r.id_compteur, validCompteurIds);
      if (idCompteur == null) {
        console.warn(`  ⚠ skipping equipement_compteur_historique row ${r.id}: invalid id_compteur=${r.id_compteur}`);
        continue;
      }

      validRows.push({
        id: r.id,
        idCompteur,
        valeur: toNumOrNull(r.valeur) ?? 0,
        dateMesure: toDate(r.date_mesure) ?? new Date(),
      });
    }

    if (validRows.length > 0) {
      await prisma.equipementCompteurHistorique.createMany({ data: validRows, skipDuplicates: true });
    }

    totalProcessed += rows.length;
    lastId = rows.reduce((max, row) => Math.max(max, Number((row as any).id) || 0), lastId);
  }

  console.log(`equipement_compteur_historique: ${totalProcessed} rows processed in batches`);
  await resetSequence(prisma, "equipement_compteur_historique");
}

async function migrateEquipementCompteurNv(prisma: PrismaClient, dryRun: boolean) {
  const rowsCount = Number((await queryAll<{ total: number | string }>(`SELECT COUNT(*) AS total FROM equipement_compteur_nv`))[0]?.total ?? 0);
  console.log(`equipement_compteur_nv: ${rowsCount} rows`);
  if (dryRun) return;

  const validCompteurIds = new Set((await prisma.equipementCompteur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let totalProcessed = 0;
  let lastId = 0;

  while (true) {
    const rows = await queryPage<any>("equipement_compteur_nv", "id, id_compteur, valeur, date_nv", { lastId, pageSize: BATCH_SIZE });
    if (rows.length === 0) break;

    const validRows: { id: number; idCompteur: number; valeur: number; dateNv: Date }[] = [];
    for (const r of rows as any[]) {
      const idCompteur = toExistingIdOrNull(r.id_compteur, validCompteurIds);
      if (idCompteur == null) {
        console.warn(`  ⚠ skipping equipement_compteur_nv row ${r.id}: invalid id_compteur=${r.id_compteur}`);
        continue;
      }

      validRows.push({
        id: r.id,
        idCompteur,
        valeur: toNumOrNull(r.valeur) ?? 0,
        dateNv: toDate(r.date_nv) ?? new Date(),
      });
    }

    if (validRows.length > 0) {
      await prisma.equipementCompteurNv.createMany({ data: validRows, skipDuplicates: true });
    }

    totalProcessed += rows.length;
    lastId = rows.reduce((max, row) => Math.max(max, Number((row as any).id) || 0), lastId);
  }

  console.log(`equipement_compteur_nv: ${totalProcessed} rows processed in batches`);
  await resetSequence(prisma, "equipement_compteur_nv");
}

async function migrateCompteurLiaison(prisma: PrismaClient, dryRun: boolean) {
  const rowsCount = Number((await queryAll<{ total: number | string }>(`SELECT COUNT(*) AS total FROM compteur_liaison`))[0]?.total ?? 0);
  console.log(`compteur_liaison: ${rowsCount} rows`);
  if (dryRun) return;

  const validOrganeIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCompteurIds = new Set((await prisma.equipementCompteur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validInterventionIds = new Set((await prisma.parametreIntervention.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let totalProcessed = 0;
  let lastId = 0;

  while (true) {
    const rows = await queryPage<any>("compteur_liaison", "id, id_organe, id_compteur, id_intervention", { lastId, pageSize: BATCH_SIZE });
    if (rows.length === 0) break;

    const validRows: { id: number; idOrgane: number; idCompteur: number; idIntervention: number }[] = [];
    for (const r of rows as any[]) {
      const idOrgane = toExistingIdOrNull(r.id_organe, validOrganeIds);
      const idCompteur = toExistingIdOrNull(r.id_compteur, validCompteurIds);
      const idIntervention = toExistingIdOrNull(r.id_intervention, validInterventionIds);
      if (idOrgane == null || idCompteur == null || idIntervention == null) {
        console.warn(
          `  ⚠ skipping compteur_liaison row ${r.id}: invalid id_organe=${r.id_organe}, id_compteur=${r.id_compteur}, id_intervention=${r.id_intervention}`
        );
        continue;
      }

      validRows.push({ id: r.id, idOrgane, idCompteur, idIntervention });
    }

    if (validRows.length > 0) {
      await prisma.compteurLiaison.createMany({ data: validRows, skipDuplicates: true });
    }

    totalProcessed += rows.length;
    lastId = rows.reduce((max, row) => Math.max(max, Number((row as any).id) || 0), lastId);
  }

  console.log(`compteur_liaison: ${totalProcessed} rows processed in batches`);
  await resetSequence(prisma, "compteur_liaison");
}
