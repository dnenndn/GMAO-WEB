/**
 * Tier: remaining-small-tables — depends on core + master + inventory-
 * procurement (Article, BonLivraison) + workshop (AtelierCreer) +
 * maintenance (GammeOperatoire, ParametreIntervention) + tooling (Outil,
 * Utilisation) + fleet (Engin, Chauffeur).
 *
 * `LivraisonArticle` is the most significant table here — not a new
 * discovery but a CORRECTION. An earlier pass (Phase 16) assumed
 * BonLivraison had no line items of its own, just displaying its linked
 * Reception's items instead. That was wrong, confirmed directly against
 * `creer_bl.cs`'s real insert statement. See schema.prisma's comment on
 * BonLivraison for the full correction, and the app-side fix (the
 * Facture detail page now computes a real total from these lines instead
 * of the "not tracked" disclaimer that page carried before this).
 *
 * `test_equip` is deliberately NOT migrated (and not modeled in the
 * schema at all) — its shape breaks every convention the other 214 real
 * tables follow (a varchar primary key instead of int identity, English-
 * ish field names instead of this app's consistent French naming).
 * Left out as a likely scratch/test artifact in the source database
 * itself, not a real application feature.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateRemainingSmallTables(prisma: PrismaClient, dryRun: boolean) {
  await migrateLivraisonArticle(prisma, dryRun);
  await migrateAtelierReception(prisma, dryRun);
  await migrateGammeCentreCharge(prisma, dryRun);
  await migrateOperationMaintenance(prisma, dryRun);
  await migrateOutilUtilisation(prisma, dryRun);
  await migratePlanMaintenance(prisma, dryRun);
  await migrateReclamationAnomalie(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateLivraisonArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_livraison, id_article, qt, prix_ht, remise, investissement FROM livraison_article
  `);
  console.log(`livraison_article: ${rows.length} rows`);
  if (dryRun) return;

  const validLivraisonIds = new Set((await prisma.bonLivraison.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idLivraison = r.id_livraison == null ? null : toExistingIdOrNull(r.id_livraison, validLivraisonIds);
    const idArticle = r.id_article == null ? null : toExistingIdOrNull(r.id_article, validArticleIds);

    if ((r.id_livraison != null && idLivraison == null) || (r.id_article != null && idArticle == null)) {
      skipped++;
      console.warn(`  ⚠ skipping livraison_article row ${r.id}: invalid id_livraison=${r.id_livraison} or id_article=${r.id_article}`);
      continue;
    }

    await prisma.livraisonArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idLivraison: idLivraison as number,
        idArticle: idArticle as number,
        qt: toNumOrNull(r.qt) ?? 0,
        prixHt: toNumOrNull(r.prix_ht) ?? 0,
        remise: toNumOrNull(r.remise) ?? 0,
        investissement: r.investissement != null ? toBool(r.investissement) : null,
      },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} livraison_article row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "livraison_article");
}

async function migrateAtelierReception(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_atelier, date_reception, qt_recu, etat FROM atelier_reception`);
  console.log(`atelier_reception: ${rows.length} rows`);
  if (dryRun) return;

  const validAtelierIds = new Set((await prisma.atelierCreer.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idAtelier = r.id_atelier == null ? null : toExistingIdOrNull(r.id_atelier, validAtelierIds);
    if (r.id_atelier != null && idAtelier == null) {
      skipped++;
      console.warn(`  ⚠ skipping atelier_reception row ${r.id}: invalid id_atelier=${r.id_atelier}`);
      continue;
    }

    await prisma.atelierReception.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idAtelier: idAtelier as number,
        dateReception: toDate(r.date_reception) ?? new Date(),
        qtRecu: toNumOrNull(r.qt_recu) ?? 0,
        etat: toStrOrNull(r.etat),
      },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} atelier_reception row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "atelier_reception");
}

async function migrateGammeCentreCharge(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_gamme, id_centre_charge FROM gamme_centre_charge`);
  console.log(`gamme_centre_charge: ${rows.length} rows`);
  if (dryRun) return;

  const validGammeIds = new Set((await prisma.gammeOperatoire.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCentreChargeIds = new Set((await prisma.parametreCentreCharge.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idGamme = r.id_gamme == null ? null : toExistingIdOrNull(r.id_gamme, validGammeIds);
    const idCentreCharge = r.id_centre_charge == null ? null : toExistingIdOrNull(r.id_centre_charge, validCentreChargeIds);

    if ((r.id_gamme != null && idGamme == null) || (r.id_centre_charge != null && idCentreCharge == null)) {
      skipped++;
      console.warn(`  ⚠ skipping gamme_centre_charge row ${r.id}: invalid id_gamme=${r.id_gamme} or id_centre_charge=${r.id_centre_charge}`);
      continue;
    }

    await prisma.gammeCentreCharge.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idGamme: idGamme as number,
        idCentreCharge: idCentreCharge,
      },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} gamme_centre_charge row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "gamme_centre_charge");
}

async function migrateOperationMaintenance(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_intervention, code, designation, type, deleted FROM operation_maintenance
  `);
  console.log(`operation_maintenance: ${rows.length} rows`);
  if (dryRun) return;

  const validInterventionIds = new Set((await prisma.parametreIntervention.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idIntervention = r.id_intervention == null ? null : toExistingIdOrNull(r.id_intervention, validInterventionIds);
    if (r.id_intervention != null && idIntervention == null) {
      skipped++;
      console.warn(`  ⚠ skipping operation_maintenance row ${r.id}: invalid id_intervention=${r.id_intervention}`);
      continue;
    }

    await prisma.operationMaintenance.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idIntervention: idIntervention as number,
        code: r.code,
        designation: r.designation,
        type: r.type,
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} operation_maintenance row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "operation_maintenance");
}

async function migrateOutilUtilisation(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_outil, id_utilisation FROM outil_utilisation`);
  console.log(`outil_utilisation: ${rows.length} rows`);
  if (dryRun) return;

  const validOutilIds = new Set((await prisma.outil.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUtilisationIds = new Set((await prisma.utilisation.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idOutil = r.id_outil == null ? null : toExistingIdOrNull(r.id_outil, validOutilIds);
    const idUtilisation = r.id_utilisation == null ? null : toExistingIdOrNull(r.id_utilisation, validUtilisationIds);

    if ((r.id_outil != null && idOutil == null) || (r.id_utilisation != null && idUtilisation == null)) {
      skipped++;
      console.warn(`  ⚠ skipping outil_utilisation row ${r.id}: invalid id_outil=${r.id_outil} or id_utilisation=${r.id_utilisation}`);
      continue;
    }

    await prisma.outilUtilisation.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idOutil: idOutil as number, idUtilisation: idUtilisation as number },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} outil_utilisation row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "outil_utilisation");
}

async function migratePlanMaintenance(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation, deleted FROM plan_maintenance`);
  console.log(`plan_maintenance: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.planMaintenance.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: r.code, designation: r.designation, deleted: toBool(r.deleted) },
    });
  }
  await resetSequence(prisma, "plan_maintenance");
}

async function migrateReclamationAnomalie(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, anomalie, date, id_engin, id_chauffeur, deleted FROM reclamation_anomalie
  `);
  console.log(`reclamation_anomalie: ${rows.length} rows`);
  if (dryRun) return;

  const validEnginIds = new Set((await prisma.engin.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validChauffeurIds = new Set((await prisma.chauffeur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEngin = r.id_engin == null ? null : toExistingIdOrNull(r.id_engin, validEnginIds);
    const idChauffeur = r.id_chauffeur == null ? null : toExistingIdOrNull(r.id_chauffeur, validChauffeurIds);

    if ((r.id_engin != null && idEngin == null) || (r.id_chauffeur != null && idChauffeur == null)) {
      skipped++;
      console.warn(`  ⚠ skipping reclamation_anomalie row ${r.id}: invalid id_engin=${r.id_engin} or id_chauffeur=${r.id_chauffeur}`);
      continue;
    }

    await prisma.reclamationAnomalie.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        anomalie: r.anomalie,
        date: toDate(r.date) ?? new Date(),
        idEngin: idEngin as number,
        idChauffeur: idChauffeur as number,
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} reclamation_anomalie row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "reclamation_anomalie");
}
