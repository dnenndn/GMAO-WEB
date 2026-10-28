/**
 * Tier: fleet — depends on core + master (Engin, TypeCarburant, Chauffeur
 * already migrated).
 *
 * Includes `EquipementCompteur` here even though it's conceptually a
 * "core" (no-dependency) table — auditing tiers 1-6 found it was never
 * migrated anywhere, despite `EnginCompteurInitial` (this tier) and
 * `PrevCompteur` (not yet migrated) both depending on it. Migrated first
 * in this file, before anything that needs it, rather than silently
 * leaving the gap for whichever tier happened to need it next.
 *
 * Real naming mismatch found while writing this: target
 * `EquipementCompteur.uniteMesure` maps to `@map("unite_mesure")`, but
 * the actual source column is just `unite` — the `@map` value describes
 * the target's own snake_case convention, not necessarily the source
 * column name, and this is the one place in the whole schema where they
 * diverge. Checked directly against the schema export rather than
 * assumed from the `@map` annotation.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateFleet(prisma: PrismaClient, dryRun: boolean) {
  await migrateEquipementCompteur(prisma, dryRun);
  await migrateEnginAssurance(prisma, dryRun);
  await migrateEnginVignette(prisma, dryRun);
  await migrateEnginVisiteTechnique(prisma, dryRun);
  await migrateEnginSortieCarburant(prisma, dryRun);
  await migrateEnginCompteurInitial(prisma, dryRun);
  await migrateEnginFichier(prisma, dryRun);
  await migrateBonDeCarburant(prisma, dryRun);
  await migrateVoyage(prisma, dryRun);
  await migrateEnginParcLiaisonCarburant(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateEquipementCompteur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_equipement, designation, valeur, unite, deleted FROM equipement_compteur
  `);
  console.log(`equipement_compteur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.equipementCompteur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idEquipement: toNumOrNull(r.id_equipement),
        designation: toStrOrNull(r.designation),
        // Source column is `unite`, NOT `unite_mesure` — see file header.
        uniteMesure: toStrOrNull(r.unite),
        valeurActuelle: toNumOrNull(r.valeur),
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "equipement_compteur");
}

async function migrateEnginAssurance(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_engin, raison_social, date_deb, date_exp, prix, not_avant, deleted
    FROM engins_assurance
  `);
  console.log(`engins_assurance: ${rows.length} rows`);
  if (dryRun) return;

  const validEnginIds = new Set((await prisma.engin.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEngin = toExistingIdOrNull(r.id_engin, validEnginIds);
    if (idEngin == null) {
      skipped++;
      console.warn(`  ⚠ skipping engins_assurance row ${r.id}: invalid id_engin=${r.id_engin}`);
      continue;
    }

    await prisma.enginAssurance.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idEngin,
        raisonSocial: toStrOrNull(r.raison_social),
        dateDeb: toDate(r.date_deb) ?? new Date(),
        dateExp: toDate(r.date_exp) ?? new Date(),
        prix: toNumOrNull(r.prix),
        notAvant: toNumOrNull(r.not_avant),
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} engins_assurance row(s) skipped because id_engin was missing or dangling.`);
  }
  await resetSequence(prisma, "engins_assurance");
}

async function migrateEnginVignette(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_engin, date_deb, date_exp, prix, not_avant, deleted FROM engins_vignette
  `);
  console.log(`engins_vignette: ${rows.length} rows`);
  if (dryRun) return;

  const validEnginIds = new Set((await prisma.engin.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEngin = toExistingIdOrNull(r.id_engin, validEnginIds);
    if (idEngin == null) {
      skipped++;
      console.warn(`  ⚠ skipping engins_vignette row ${r.id}: invalid id_engin=${r.id_engin}`);
      continue;
    }

    await prisma.enginVignette.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idEngin,
        dateDeb: toDate(r.date_deb) ?? new Date(),
        dateExp: toDate(r.date_exp) ?? new Date(),
        prix: toNumOrNull(r.prix),
        notAvant: toNumOrNull(r.not_avant),
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} engins_vignette row(s) skipped because id_engin was missing or dangling.`);
  }
  await resetSequence(prisma, "engins_vignette");
}

async function migrateEnginVisiteTechnique(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_engin, date_deb, date_exp, prix, not_avant, deleted, type_visite
    FROM engins_visite_technique
  `);
  console.log(`engins_visite_technique: ${rows.length} rows`);
  if (dryRun) return;

  const validEnginIds = new Set((await prisma.engin.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEngin = toExistingIdOrNull(r.id_engin, validEnginIds);
    if (idEngin == null) {
      skipped++;
      console.warn(`  ⚠ skipping engins_visite_technique row ${r.id}: invalid id_engin=${r.id_engin}`);
      continue;
    }

    await prisma.enginVisiteTechnique.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idEngin,
        dateDeb: toDate(r.date_deb) ?? new Date(),
        dateExp: toDate(r.date_exp) ?? new Date(),
        prix: toNumOrNull(r.prix),
        notAvant: toNumOrNull(r.not_avant),
        // Source is `int`; target models the confirmed string form —
        // stringified directly since no code->label table was found for
        // this field (unlike, say, Commande.statut).
        typeVisite: r.type_visite != null ? String(r.type_visite) : null,
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} engins_visite_technique row(s) skipped because id_engin was missing or dangling.`);
  }
  await resetSequence(prisma, "engins_visite_technique");
}

async function migrateEnginSortieCarburant(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, quantite, prix_u, date, heure, id_engin, id_carbu, prix_ttc, compteur, deleted
    FROM engin_sortie_carburant
  `);
  console.log(`engin_sortie_carburant: ${rows.length} rows`);
  if (dryRun) return;

  const validEnginIds = new Set((await prisma.engin.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCarbuIds = new Set((await prisma.typeCarburant.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEngin = toExistingIdOrNull(r.id_engin, validEnginIds);
    if (idEngin == null) {
      skipped++;
      console.warn(`  ⚠ skipping engin_sortie_carburant row ${r.id}: invalid id_engin=${r.id_engin}`);
      continue;
    }

    const idCarbu = toExistingIdOrNull(r.id_carbu, validCarbuIds);

    await prisma.enginSortieCarburant.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        quantite: toNumOrNull(r.quantite) ?? 0,
        prixU: toNumOrNull(r.prix_u),
        prixTtc: toNumOrNull(r.prix_ttc),
        date: toDate(r.date) ?? new Date(),
        heure: toStrOrNull(r.heure),
        idEngin,
        idCarbu,
        compteur: toNumOrNull(r.compteur),
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} engin_sortie_carburant row(s) skipped because id_engin was missing or dangling.`);
  }
  await resetSequence(prisma, "engin_sortie_carburant");
}

async function migrateEnginCompteurInitial(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_compteur, valeur_initial FROM engin_compteur_initial`);
  console.log(`engin_compteur_initial: ${rows.length} rows`);
  if (dryRun) return;

  const validCompteurIds = new Set((await prisma.equipementCompteur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idCompteur = toExistingIdOrNull(r.id_compteur, validCompteurIds);
    if (idCompteur == null) {
      skipped++;
      console.warn(`  ⚠ skipping engin_compteur_initial row ${r.id}: invalid id_compteur=${r.id_compteur}`);
      continue;
    }

    await prisma.enginCompteurInitial.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idCompteur, valeurInitial: toNumOrNull(r.valeur_initial) ?? 0 },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} engin_compteur_initial row(s) skipped because id_compteur was missing or dangling.`);
  }
  await resetSequence(prisma, "engin_compteur_initial");
}

async function migrateEnginFichier(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_engin, adresse FROM engins_fichier`);
  console.log(`engins_fichier: ${rows.length} rows`);
  if (dryRun) return;

  const validEnginIds = new Set((await prisma.engin.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEngin = toExistingIdOrNull(r.id_engin, validEnginIds);
    if (idEngin == null) {
      skipped++;
      console.warn(`  ⚠ skipping engins_fichier row ${r.id}: invalid id_engin=${r.id_engin}`);
      continue;
    }

    await prisma.enginFichier.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idEngin, adresse: toStrOrNull(r.adresse) },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} engins_fichier row(s) skipped because id_engin was missing or dangling.`);
  }
  await resetSequence(prisma, "engins_fichier");
}

async function migrateBonDeCarburant(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, nom, quantite, prix_u, date, id_engin, id_chauffeur, id_type_carburant, prix_ttc, deleted
    FROM bon_de_carburant
  `);
  console.log(`bon_de_carburant: ${rows.length} rows`);
  if (dryRun) return;

  const validEnginIds = new Set((await prisma.engin.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validChauffeurIds = new Set((await prisma.chauffeur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validTypeCarburantIds = new Set((await prisma.typeCarburant.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEngin = toExistingIdOrNull(r.id_engin, validEnginIds);
    const idChauffeur = toExistingIdOrNull(r.id_chauffeur, validChauffeurIds);
    const idTypeCarburant = toExistingIdOrNull(r.id_type_carburant, validTypeCarburantIds);

    if (idEngin == null || idChauffeur == null || idTypeCarburant == null) {
      skipped++;
      console.warn(
        `  ⚠ skipping bon_de_carburant row ${r.id}: invalid id_engin=${r.id_engin}, id_chauffeur=${r.id_chauffeur}, id_type_carburant=${r.id_type_carburant}`
      );
      continue;
    }

    await prisma.bonDeCarburant.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        nom: r.nom,
        quantite: toNumOrNull(r.quantite) ?? 0,
        prixU: toNumOrNull(r.prix_u) ?? 0,
        prixTtc: toNumOrNull(r.prix_ttc) ?? 0,
        date: toDate(r.date) ?? new Date(),
        idEngin,
        idChauffeur,
        idTypeCarburant,
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} bon_de_carburant row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "bon_de_carburant");
}

async function migrateVoyage(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, depart, arrive, distance, date, id_engin, id_chauffeur, heure_dep, heure_arr, deleted
    FROM voyage
  `);
  console.log(`voyage: ${rows.length} rows`);
  if (dryRun) return;

  const validEnginIds = new Set((await prisma.engin.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validChauffeurIds = new Set((await prisma.chauffeur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idEngin = toExistingIdOrNull(r.id_engin, validEnginIds);
    const idChauffeur = toExistingIdOrNull(r.id_chauffeur, validChauffeurIds);
    if (idEngin == null || idChauffeur == null) {
      skipped++;
      console.warn(`  ⚠ skipping voyage row ${r.id}: invalid id_engin=${r.id_engin}, id_chauffeur=${r.id_chauffeur}`);
      continue;
    }

    await prisma.voyage.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        depart: r.depart,
        arrive: r.arrive,
        distance: toNumOrNull(r.distance) ?? 0,
        date: toDate(r.date) ?? new Date(),
        idEngin,
        idChauffeur,
        heureDep: toStrOrNull(r.heure_dep),
        heureArr: toStrOrNull(r.heure_arr),
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} voyage row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "voyage");
}

async function migrateEnginParcLiaisonCarburant(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_carburant, deleted FROM engin_parc_liaison_carburant`);
  console.log(`engin_parc_liaison_carburant: ${rows.length} rows`);
  if (dryRun) return;

  const validTypeCarburantIds = new Set((await prisma.typeCarburant.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idCarburant = toExistingIdOrNull(r.id_carburant, validTypeCarburantIds);
    if (idCarburant == null) {
      skipped++;
      console.warn(`  ⚠ skipping engin_parc_liaison_carburant row ${r.id}: invalid id_carburant=${r.id_carburant}`);
      continue;
    }

    await prisma.enginParcLiaisonCarburant.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idCarburant, deleted: toBool(r.deleted) },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} engin_parc_liaison_carburant row(s) skipped because id_carburant was missing or dangling.`);
  }
  await resetSequence(prisma, "engin_parc_liaison_carburant");
}
