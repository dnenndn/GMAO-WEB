/**
 * Tier: article-characteristics-units — depends on core + master
 * (SousFamille, Article).
 *
 * All 6 tables here are straightforward — every source column matched
 * its target field exactly, no naming mismatches. `Caracteristique.type`
 * and `CaracteristiqueTextbox.type` are both confirmed enum-like strings
 * (see the schema comments on those fields — "TextBox"/"Select Unique"/
 * etc. and "Chaîne de caractères"/"Entier"/"Réel" respectively), so
 * they're passed through as-is rather than needing a code→label mapping
 * the way, say, Commande.statut does.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, resetSequence } from "../db";

export async function migrateArticleCharacteristicsUnits(prisma: PrismaClient, dryRun: boolean) {
  await migrateParametreUniteArticle(prisma, dryRun);
  await migrateTableauArticleUnite(prisma, dryRun);
  await migrateCaracteristique(prisma, dryRun);
  await migrateCaracteristiqueOption(prisma, dryRun);
  await migrateCaracteristiqueTextbox(prisma, dryRun);
  await migrateTableauArticleCaracteristique(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateParametreUniteArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_unite, designation, deleted FROM parametre_unite_article
  `);
  console.log(`parametre_unite_article: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreUniteArticle.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, codeUnite: r.code_unite, designation: r.designation, deleted: toBool(r.deleted) },
    });
  }
  await resetSequence(prisma, "parametre_unite_article");
}

async function migrateTableauArticleUnite(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_unite FROM tableau_article_unite`);
  console.log(`tableau_article_unite: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauArticleUnite.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: r.id_article, idUnite: r.id_unite },
    });
  }
  await resetSequence(prisma, "tableau_article_unite");
}

async function migrateCaracteristique(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_sous_famille, nom, type, champ_obligatoire, deleted FROM caracteristique
  `);
  console.log(`caracteristique: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.caracteristique.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idSousFamille: r.id_sous_famille,
        nom: r.nom,
        type: r.type,
        champObligatoire: toBool(r.champ_obligatoire),
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "caracteristique");
}

async function migrateCaracteristiqueOption(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_caracteristique, valeur_option, defaut FROM caracteristique_option
  `);
  console.log(`caracteristique_option: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.caracteristiqueOption.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idCaracteristique: r.id_caracteristique,
        valeurOption: r.valeur_option,
        defaut: toBool(r.defaut),
      },
    });
  }
  await resetSequence(prisma, "caracteristique_option");
}

async function migrateCaracteristiqueTextbox(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_caracteristique, type, valeur_defaut FROM caracteristique_textbox
  `);
  console.log(`caracteristique_textbox: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.caracteristiqueTextbox.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idCaracteristique: r.id_caracteristique,
        type: toStrOrNull(r.type),
        valeurDefaut: toStrOrNull(r.valeur_defaut),
      },
    });
  }
  await resetSequence(prisma, "caracteristique_textbox");
}

async function migrateTableauArticleCaracteristique(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_article, id_caracteristique, valeur FROM tableau_article_caracteristique
  `);
  console.log(`tableau_article_caracteristique: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauArticleCaracteristique.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idArticle: r.id_article,
        idCaracteristique: r.id_caracteristique,
        valeur: toStrOrNull(r.valeur),
      },
    });
  }
  await resetSequence(prisma, "tableau_article_caracteristique");
}
