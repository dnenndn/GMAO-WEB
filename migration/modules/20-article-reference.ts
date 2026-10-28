/**
 * Tier: article-reference — depends on core + master (Article) +
 * maintenance (Equipement) + fournisseur-reference tier (Fournisseur).
 *
 * All 8 tables added in this same pass (schema.prisma "Phase 23" + app
 * UI + this migration), parallel in shape to tier 19's Fournisseur
 * reference-data work. `parametre_image` is deliberately NOT migrated
 * here — it's a genuine outlier (a single-row global config table, no
 * `id_article` or any FK at all, holding 3 fixed site photos with no
 * confirmed UI destination found in the decompiled source). Modeled in
 * schema for completeness but left out of this migration; add it in a
 * follow-up once its actual usage is confirmed rather than guess at
 * which row(s) matter or invent a UI to justify migrating it now.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, resetSequence } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateArticleReference(prisma: PrismaClient, dryRun: boolean) {
  await migrateParametreClassificationArticle(prisma, dryRun);
  await migrateParametreEmplacementArticle(prisma, dryRun);
  await migrateParametreStockageArticle(prisma, dryRun);
  await migrateTableauArticleClassification(prisma, dryRun);
  await migrateTableauArticleEmplacement(prisma, dryRun);
  await migrateTableauArticleStockage(prisma, dryRun);
  await migrateTableauArticleEquipement(prisma, dryRun);
  await migrateTableauArticleFournisseur(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateParametreClassificationArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_classification, designation, deleted FROM parametre_classification_article
  `);
  console.log(`parametre_classification_article: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreClassificationArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeClassification: toStrOrNull(r.code_classification),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "parametre_classification_article");
}

async function migrateParametreEmplacementArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_emplacement, designation, deleted FROM parametre_emplacement_article
  `);
  console.log(`parametre_emplacement_article: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreEmplacementArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeEmplacement: toStrOrNull(r.code_emplacement),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "parametre_emplacement_article");
}

async function migrateParametreStockageArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_stockage, designation, deleted FROM parametre_stockage_article
  `);
  console.log(`parametre_stockage_article: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreStockageArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeStockage: toStrOrNull(r.code_stockage),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "parametre_stockage_article");
}

async function migrateTableauArticleClassification(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_classification FROM tableau_article_classification`);
  console.log(`tableau_article_classification: ${rows.length} rows`);
  if (dryRun) return;

  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validClassificationIds = new Set((await prisma.parametreClassificationArticle.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idArticle = r.id_article == null ? null : toExistingIdOrNull(r.id_article, validArticleIds);
    const idClassification = r.id_classification == null ? null : toExistingIdOrNull(r.id_classification, validClassificationIds);
    if (idArticle == null || idClassification == null) {
      skipped++;
      console.warn(`  ⚠ skipping tableau_article_classification row ${r.id}: invalid id_article=${r.id_article} or id_classification=${r.id_classification}`);
      continue;
    }
    await prisma.tableauArticleClassification.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: idArticle, idClassification: idClassification },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} tableau_article_classification row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "tableau_article_classification");
}

async function migrateTableauArticleEmplacement(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_emplacement FROM tableau_article_emplacement`);
  console.log(`tableau_article_emplacement: ${rows.length} rows`);
  if (dryRun) return;

  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validEmplacementIds = new Set((await prisma.parametreEmplacementArticle.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idArticle = r.id_article == null ? null : toExistingIdOrNull(r.id_article, validArticleIds);
    const idEmplacement = r.id_emplacement == null ? null : toExistingIdOrNull(r.id_emplacement, validEmplacementIds);
    if (idArticle == null || idEmplacement == null) {
      skipped++;
      console.warn(`  ⚠ skipping tableau_article_emplacement row ${r.id}: invalid id_article=${r.id_article} or id_emplacement=${r.id_emplacement}`);
      continue;
    }
    await prisma.tableauArticleEmplacement.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: idArticle, idEmplacement: idEmplacement },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} tableau_article_emplacement row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "tableau_article_emplacement");
}

async function migrateTableauArticleStockage(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_stockage FROM tableau_article_stockage`);
  console.log(`tableau_article_stockage: ${rows.length} rows`);
  if (dryRun) return;

  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validStockageIds = new Set((await prisma.parametreStockageArticle.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idArticle = r.id_article == null ? null : toExistingIdOrNull(r.id_article, validArticleIds);
    const idStockage = r.id_stockage == null ? null : toExistingIdOrNull(r.id_stockage, validStockageIds);
    if (idArticle == null || idStockage == null) {
      skipped++;
      console.warn(`  ⚠ skipping tableau_article_stockage row ${r.id}: invalid id_article=${r.id_article} or id_stockage=${r.id_stockage}`);
      continue;
    }
    await prisma.tableauArticleStockage.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: idArticle, idStockage: idStockage },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} tableau_article_stockage row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "tableau_article_stockage");
}

async function migrateTableauArticleEquipement(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_equipement FROM tableau_article_equipement`);
  console.log(`tableau_article_equipement: ${rows.length} rows`);
  if (dryRun) return;

  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idArticle = r.id_article == null ? null : toExistingIdOrNull(r.id_article, validArticleIds);
    const idEquipement = r.id_equipement == null ? null : toExistingIdOrNull(r.id_equipement, validEquipementIds);
    if (idArticle == null || idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping tableau_article_equipement row ${r.id}: invalid id_article=${r.id_article} or id_equipement=${r.id_equipement}`);
      continue;
    }
    await prisma.tableauArticleEquipement.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: idArticle, idEquipement: idEquipement },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} tableau_article_equipement row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "tableau_article_equipement");
}

async function migrateTableauArticleFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_fournisseur FROM tableau_article_fournisseur`);
  console.log(`tableau_article_fournisseur: ${rows.length} rows`);
  if (dryRun) return;

  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idArticle = r.id_article == null ? null : toExistingIdOrNull(r.id_article, validArticleIds);
    const idFournisseur = r.id_fournisseur == null ? null : toExistingIdOrNull(r.id_fournisseur, validFournisseurIds);
    if (idArticle == null || idFournisseur == null) {
      skipped++;
      console.warn(`  ⚠ skipping tableau_article_fournisseur row ${r.id}: invalid id_article=${r.id_article} or id_fournisseur=${r.id_fournisseur}`);
      continue;
    }
    await prisma.tableauArticleFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: idArticle, idFournisseur: idFournisseur },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} tableau_article_fournisseur row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "tableau_article_fournisseur");
}
