/**
 * Tier: fournisseur-reference — depends on core + master (Fournisseur).
 *
 * All 11 tables added in this same pass (schema.prisma "Phase 22" +
 * app UI + this migration) — no pre-existing model to reconcile against,
 * unlike most other tiers in this migration.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, resetSequence } from "../db";

export async function migrateFournisseurReference(prisma: PrismaClient, dryRun: boolean) {
  await migrateParametreActiviteFournisseur(prisma, dryRun);
  await migrateParametreCompteFournisseur(prisma, dryRun);
  await migrateParametreDeviseFournisseur(prisma, dryRun);
  await migrateParametreLivraisonFournisseur(prisma, dryRun);
  await migrateParametreReglementFournisseur(prisma, dryRun);
  await migrateTableauFournisseurActivite(prisma, dryRun);
  await migrateTableauFournisseurCompte(prisma, dryRun);
  await migrateTableauFournisseurDevise(prisma, dryRun);
  await migrateTableauFournisseurLivraison(prisma, dryRun);
  await migrateTableauFournisseurReglement(prisma, dryRun);
  await migrateTableauFournisseurFichier(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateParametreActiviteFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_activite, designation, deleted FROM parametre_activite_fournisseur
  `);
  console.log(`parametre_activite_fournisseur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreActiviteFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeActivite: toStrOrNull(r.code_activite),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "parametre_activite_fournisseur");
}

async function migrateParametreCompteFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, numero, designation, estimation, periode_nbre, periode, deleted
    FROM parametre_compte_fournisseur
  `);
  console.log(`parametre_compte_fournisseur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreCompteFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        numero: r.numero,
        designation: r.designation,
        estimation: toNumOrNull(r.estimation) ?? 0,
        periodeNbre: toNumOrNull(r.periode_nbre) ?? 1,
        periode: r.periode,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "parametre_compte_fournisseur");
}

async function migrateParametreDeviseFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, designation, conversion, deleted FROM parametre_devise_fournisseur`);
  console.log(`parametre_devise_fournisseur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreDeviseFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        designation: r.designation,
        conversion: toNumOrNull(r.conversion) ?? 1,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "parametre_devise_fournisseur");
}

async function migrateParametreLivraisonFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_livraison, designation, deleted FROM parametre_livraison_fournisseur
  `);
  console.log(`parametre_livraison_fournisseur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreLivraisonFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeLivraison: toStrOrNull(r.code_livraison),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "parametre_livraison_fournisseur");
}

async function migrateParametreReglementFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_reglement, designation, deleted FROM parametre_reglement_fournisseur
  `);
  console.log(`parametre_reglement_fournisseur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreReglementFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeReglement: toStrOrNull(r.code_reglement),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "parametre_reglement_fournisseur");
}

async function migrateTableauFournisseurActivite(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_fournisseur, id_activite FROM tableau_fournisseur_activite`);
  console.log(`tableau_fournisseur_activite: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauFournisseurActivite.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idFournisseur: r.id_fournisseur, idActivite: r.id_activite },
    });
  }
  await resetSequence(prisma, "tableau_fournisseur_activite");
}

async function migrateTableauFournisseurCompte(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_fournisseur, id_compte FROM tableau_fournisseur_compte`);
  console.log(`tableau_fournisseur_compte: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauFournisseurCompte.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idFournisseur: r.id_fournisseur, idCompte: r.id_compte },
    });
  }
  await resetSequence(prisma, "tableau_fournisseur_compte");
}

async function migrateTableauFournisseurDevise(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_fournisseur, id_devise FROM tableau_fournisseur_devise`);
  console.log(`tableau_fournisseur_devise: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauFournisseurDevise.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idFournisseur: r.id_fournisseur, idDevise: r.id_devise },
    });
  }
  await resetSequence(prisma, "tableau_fournisseur_devise");
}

async function migrateTableauFournisseurLivraison(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_fournisseur, id_livraison FROM tableau_fournisseur_livraison`);
  console.log(`tableau_fournisseur_livraison: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauFournisseurLivraison.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idFournisseur: r.id_fournisseur, idLivraison: r.id_livraison },
    });
  }
  await resetSequence(prisma, "tableau_fournisseur_livraison");
}

async function migrateTableauFournisseurReglement(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_fournisseur, id_reglement FROM tableau_fournisseur_reglement`);
  console.log(`tableau_fournisseur_reglement: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauFournisseurReglement.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idFournisseur: r.id_fournisseur, idReglement: r.id_reglement },
    });
  }
  await resetSequence(prisma, "tableau_fournisseur_reglement");
}

async function migrateTableauFournisseurFichier(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_fournisseur, adresse FROM tableau_fournisseur_fichier`);
  console.log(`tableau_fournisseur_fichier: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauFournisseurFichier.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idFournisseur: r.id_fournisseur, adresse: r.adresse },
    });
  }
  await resetSequence(prisma, "tableau_fournisseur_fichier");
}
