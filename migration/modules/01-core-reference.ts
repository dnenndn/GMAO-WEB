/**
 * Tier: core reference data — tables with no foreign-key dependencies on
 * anything else, safe to migrate first. Every column mapping here was
 * checked against the real schema export (docs/12-schema-validation-
 * findings.md) during this script's development, not assumed from the
 * Prisma schema alone — see the comment on each function for what was
 * actually confirmed vs. inferred.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toBufferOrNull, resetSequence } from "../db";

export async function migrateCoreReferenceData(prisma: PrismaClient, dryRun: boolean) {
  await migrateUtilisateurs(prisma, dryRun);
  await migrateFonctionsIntervenant(prisma, dryRun);
  await migrateClassesIntervention(prisma, dryRun);
  await migrateAnomalies(prisma, dryRun);
  await migrateFamilles(prisma, dryRun);
  await migrateSousFamilles(prisma, dryRun); // depends on Famille — must run after
  await migrateSecteurs(prisma, dryRun);
  await migrateTabTypes(prisma, dryRun);
  await migrateUtilisations(prisma, dryRun);
  await migrateMagasins(prisma, dryRun);
  await migrateTypesVehicule(prisma, dryRun);
  await migrateTypesCarburant(prisma, dryRun);
  await migrateChauffeurs(prisma, dryRun);
  await migrateCategoriesDeCharge(prisma, dryRun);
  await migrateSymptomes(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateUtilisateurs(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, login, mot_passe, fonction, photo, mail, telephone, deleted FROM utilisateur`);
  console.log(`utilisateur: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    // IMPORTANT: mot_passe in the legacy DB is very likely a PLAINTEXT or
    // weakly-hashed password (see docs/01-maintenance-module-spec.md's
    // note on Utilisateur.motPasse), not a bcrypt hash — this app expects
    // bcrypt. Migrating the raw legacy value here would silently break
    // login for every migrated user. This function intentionally does
    // NOT set a usable password — every migrated user is created with a
    // random unusable placeholder hash, and `role` defaults to
    // "Utilisateur" for everyone except a user whose login is "admin".
    // You MUST reset every migrated user's password via /admin/users
    // (or a one-off script) before anyone can actually log in. This is a
    // deliberate safety choice, not an oversight — better to force an
    // explicit password reset than migrate a password of unknown
    // strength/format into a system that assumes bcrypt.
    await prisma.utilisateur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        login: r.login,
        motPasse: "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva", // unusable placeholder — see note above
        fonction: toStrOrNull(r.fonction),
        role: r.login === "admin" ? "Admin" : "Utilisateur",
        mail: toStrOrNull(r.mail),
        telephone: toStrOrNull(r.telephone),
        photo: toBufferOrNull(r.photo),
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "utilisateur");
}

async function migrateFonctionsIntervenant(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation FROM fonction_intervenant`);
  console.log(`fonction_intervenant: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.fonctionIntervenant.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: toStrOrNull(r.code), designation: r.designation },
    });
  }
  await resetSequence(prisma, "fonction_intervenant");
}

async function migrateClassesIntervention(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation FROM parametre_classe_intervention`);
  console.log(`parametre_classe_intervention: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreClasseIntervention.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: toStrOrNull(r.code), designation: r.designation },
    });
  }
  await resetSequence(prisma, "parametre_classe_intervention");
}

async function migrateAnomalies(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, anomalie, deleted, operateur FROM parametre_anomalie`);
  console.log(`parametre_anomalie: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreAnomalie.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        code: toStrOrNull(r.code),
        anomalie: r.anomalie,
        deleted: toBool(r.deleted),
        operateur: toStrOrNull(r.operateur),
      },
    });
  }
  await resetSequence(prisma, "parametre_anomalie");
}

async function migrateFamilles(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code_famille, designation, deleted FROM famille`);
  console.log(`famille: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.famille.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeFamille: toStrOrNull(r.code_famille),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "famille");
}

async function migrateSousFamilles(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(
    `SELECT id, id_famille, code_sous_famille, designation, deleted FROM sous_famille`
  );
  console.log(`sous_famille: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.sousFamille.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idFamille: r.id_famille,
        codeSousFamille: toStrOrNull(r.code_sous_famille),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "sous_famille");
}

async function migrateSecteurs(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation FROM secteur`);
  console.log(`secteur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.secteur.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: toStrOrNull(r.code), designation: toStrOrNull(r.designation) ?? "—" },
    });
  }
  await resetSequence(prisma, "secteur");
}

async function migrateTabTypes(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation FROM tab_type`);
  console.log(`tab_type: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tabType.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: toStrOrNull(r.code), designation: toStrOrNull(r.designation) ?? "—" },
    });
  }
  await resetSequence(prisma, "tab_type");
}

async function migrateUtilisations(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation FROM utilisation`);
  console.log(`utilisation: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.utilisation.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: toStrOrNull(r.code), designation: toStrOrNull(r.designation) ?? "—" },
    });
  }
  await resetSequence(prisma, "utilisation");
}

async function migrateMagasins(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code_magasin, designation, deleted FROM magasin`);
  console.log(`magasin: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.magasin.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeMagasin: toStrOrNull(r.code_magasin),
        designation: toStrOrNull(r.designation) ?? "—",
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "magasin");
}

async function migrateTypesVehicule(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code_vehicule, designation, deleted FROM type_de_vehicule`);
  console.log(`type_de_vehicule: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.typeVehicule.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeVehicule: toStrOrNull(r.code_vehicule),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "type_de_vehicule");
}

async function migrateTypesCarburant(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, designation, deleted FROM type_de_carburant`);
  console.log(`type_de_carburant: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.typeCarburant.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, designation: r.designation, deleted: toBool(r.deleted) },
    });
  }
  await resetSequence(prisma, "type_de_carburant");
}

async function migrateChauffeurs(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, nom, deleted FROM chauffeur`);
  console.log(`chauffeur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.chauffeur.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, code: toStrOrNull(r.code), nom: r.nom, deleted: toBool(r.deleted) },
    });
  }
  await resetSequence(prisma, "chauffeur");
}

async function migrateCategoriesDeCharge(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code_categorie, designation, deleted FROM categorie_de_charge`);
  console.log(`categorie_de_charge: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.categorieDeCharge.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeCategorie: toStrOrNull(r.code_categorie),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "categorie_de_charge");
}

async function migrateSymptomes(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation, deleted FROM symptome`);
  console.log(`symptome: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.symptome.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        code: toStrOrNull(r.code),
        designation: r.designation,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "symptome");
}
