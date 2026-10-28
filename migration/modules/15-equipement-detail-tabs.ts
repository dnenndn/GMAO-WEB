/**
 * Tier: equipment-detail-tabs — depends on core + master (Equipement).
 *
 * Two things worth flagging:
 * 1. `equipement_prevision.cout_arrêt`/`nbre_arrêt` genuinely have
 *    accented characters in the real column names (confirmed against the
 *    schema export, not an artifact of an earlier pass) — SQL Server
 *    natively supports Unicode identifiers, quoted here with `[...]`
 *    brackets the same way the legacy app's own DDL does throughout.
 * 2. `equipement_image.photo` is a real `[image]` (binary) column —
 *    same class of field as `Utilisateur.photo`/`Article.photo` (tier
 *    1), migrated the same way via `toBufferOrNull()`.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toStrOrNull, toNumOrNull, toDate, toBufferOrNull, resetSequence } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateEquipementDetailTabs(prisma: PrismaClient, dryRun: boolean) {
  await migrateEquipementGenerale(prisma, dryRun);
  await migrateEquipementTechnique(prisma, dryRun);
  await migrateEquipementImage(prisma, dryRun);
  await migrateEquipementPdf(prisma, dryRun);
  await migrateEquipementObservation(prisma, dryRun);
  await migrateEquipementPrevision(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateEquipementGenerale(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_equipement, reference, marque, n_serie, n_modele, n_contrat,
           n_immobilisation, fabricant, cout_achat, date_achat, date_mise_en_service,
           date_fin_garentie, date_fin_amortissement, fonction_req
    FROM equipement_generale
  `);
  console.log(`equipement_generale: ${rows.length} rows`);
  if (dryRun) return;

  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;
  let duplicateEquipement = 0;
  // Same bug class already found and fixed once for Signature in tier
  // 10: EquipementGenerale.idEquipement is @unique (a real 1:1), but the
  // source has zero constraints, so nothing stops more than one
  // equipement_generale row referencing the same equipment. Fixed the
  // same correct way this time (learned from getting it wrong once
  // already on Signature): seed the "already claimed" set from what's
  // actually in the target database, not from an empty in-memory Set,
  // so a re-run after a partial failure doesn't miss rows already
  // written by an earlier attempt. Also track which source ids are
  // already-migrated rows being safely re-touched, so a row isn't
  // mistaken for a conflict with itself.
  const claimedEquipementIds = new Set(
    (await prisma.equipementGenerale.findMany({ select: { idEquipement: true } })).map((x: { idEquipement: number }) => x.idEquipement) as number[]
  );
  const existingGeneraleIds = new Set(
    (await prisma.equipementGenerale.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]
  );

  for (const r of rows as any[]) {
    const idEquipement = toExistingIdOrNull(r.id_equipement, validEquipementIds);
    if (idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping equipement_generale row ${r.id}: invalid id_equipement=${r.id_equipement}`);
      continue;
    }
    if (claimedEquipementIds.has(idEquipement) && !existingGeneraleIds.has(r.id)) {
      duplicateEquipement++;
      console.warn(
        `  ⚠ skipping equipement_generale row ${r.id}: id_equipement=${idEquipement} already has a record from an earlier row.`
      );
      continue;
    }
    claimedEquipementIds.add(idEquipement);

    await prisma.equipementGenerale.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idEquipement,
        reference: toStrOrNull(r.reference),
        marque: toStrOrNull(r.marque),
        nSerie: toStrOrNull(r.n_serie),
        nModele: toStrOrNull(r.n_modele),
        nContrat: toStrOrNull(r.n_contrat),
        nImmobilisation: toStrOrNull(r.n_immobilisation),
        fabricant: toStrOrNull(r.fabricant),
        coutAchat: toStrOrNull(r.cout_achat),
        dateAchat: toDate(r.date_achat),
        dateMiseEnService: toDate(r.date_mise_en_service),
        dateFinGarantie: toDate(r.date_fin_garentie),
        dateFinAmortissement: toDate(r.date_fin_amortissement),
        fonctionReq: toStrOrNull(r.fonction_req),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} equipement_generale row(s) skipped because id_equipement was missing or dangling.`);
  }
  if (duplicateEquipement > 0) {
    console.log(
      `  ⚠ ${duplicateEquipement} equipement_generale row(s) skipped because that equipment already had a record migrated from an earlier row.`
    );
  }
  await resetSequence(prisma, "equipement_generale");
}

async function migrateEquipementTechnique(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_equipement, designation, observation FROM equipement_technique`);
  console.log(`equipement_technique: ${rows.length} rows`);
  if (dryRun) return;

  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEquipement = toExistingIdOrNull(r.id_equipement, validEquipementIds);
    if (idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping equipement_technique row ${r.id}: invalid id_equipement=${r.id_equipement}`);
      continue;
    }

    await prisma.equipementTechnique.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idEquipement, designation: r.designation, observation: r.observation },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} equipement_technique row(s) skipped because id_equipement was missing or dangling.`);
  }
  await resetSequence(prisma, "equipement_technique");
}

async function migrateEquipementImage(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_equipement, photo FROM equipement_image`);
  console.log(`equipement_image: ${rows.length} rows`);
  if (dryRun) return;

  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEquipement = toExistingIdOrNull(r.id_equipement, validEquipementIds);
    if (idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping equipement_image row ${r.id}: invalid id_equipement=${r.id_equipement}`);
      continue;
    }

    await prisma.equipementImage.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idEquipement, photo: toBufferOrNull(r.photo) },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} equipement_image row(s) skipped because id_equipement was missing or dangling.`);
  }
  await resetSequence(prisma, "equipement_image");
}

async function migrateEquipementPdf(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_equipement, adresse FROM equipement_pdf`);
  console.log(`equipement_pdf: ${rows.length} rows`);
  if (dryRun) return;

  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEquipement = toExistingIdOrNull(r.id_equipement, validEquipementIds);
    if (idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping equipement_pdf row ${r.id}: invalid id_equipement=${r.id_equipement}`);
      continue;
    }

    await prisma.equipementPdf.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idEquipement, adresse: r.adresse },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} equipement_pdf row(s) skipped because id_equipement was missing or dangling.`);
  }
  await resetSequence(prisma, "equipement_pdf");
}

async function migrateEquipementObservation(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_equipement, observation FROM equipement_observation`);
  console.log(`equipement_observation: ${rows.length} rows`);
  if (dryRun) return;

  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEquipement = toExistingIdOrNull(r.id_equipement, validEquipementIds);
    if (idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping equipement_observation row ${r.id}: invalid id_equipement=${r.id_equipement}`);
      continue;
    }

    await prisma.equipementObservation.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idEquipement, observation: toStrOrNull(r.observation) },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} equipement_observation row(s) skipped because id_equipement was missing or dangling.`);
  }
  await resetSequence(prisma, "equipement_observation");
}

async function migrateEquipementPrevision(prisma: PrismaClient, dryRun: boolean) {
  // Bracket-quoted identifiers for the two accented column names — see
  // file header.
  const rows = await queryAll(`
    SELECT id, id_equipement, [cout_arrêt], [nbre_arrêt], periode_nbr, periode
    FROM equipement_prevision
  `);
  console.log(`equipement_prevision: ${rows.length} rows`);
  if (dryRun) return;

  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;
  let duplicateEquipement = 0;
  // Same bug class as EquipementGenerale above (fixed after a real
  // failure): idEquipement is @unique (a real 1:1), source has zero
  // constraints, checked proactively here before a user hit it, not
  // after.
  const claimedEquipementIds = new Set(
    (await prisma.equipementPrevision.findMany({ select: { idEquipement: true } })).map((x: { idEquipement: number }) => x.idEquipement) as number[]
  );
  const existingPrevisionIds = new Set(
    (await prisma.equipementPrevision.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]
  );

  for (const r of rows as any[]) {
    const idEquipement = toExistingIdOrNull(r.id_equipement, validEquipementIds);
    if (idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping equipement_prevision row ${r.id}: invalid id_equipement=${r.id_equipement}`);
      continue;
    }
    if (claimedEquipementIds.has(idEquipement) && !existingPrevisionIds.has(r.id)) {
      duplicateEquipement++;
      console.warn(
        `  ⚠ skipping equipement_prevision row ${r.id}: id_equipement=${idEquipement} already has a record from an earlier row.`
      );
      continue;
    }
    claimedEquipementIds.add(idEquipement);

    await prisma.equipementPrevision.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idEquipement,
        coutArret: toNumOrNull(r.cout_arrêt),
        nbreArret: toNumOrNull(r.nbre_arrêt),
        periodeNbr: toNumOrNull(r.periode_nbr),
        periode: toStrOrNull(r.periode),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} equipement_prevision row(s) skipped because id_equipement was missing or dangling.`);
  }
  if (duplicateEquipement > 0) {
    console.log(
      `  ⚠ ${duplicateEquipement} equipement_prevision row(s) skipped because that equipment already had a record migrated from an earlier row.`
    );
  }
  await resetSequence(prisma, "equipement_prevision");
}
