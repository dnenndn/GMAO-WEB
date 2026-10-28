/**
 * Tier: production — depends on core + master (Equipement, Utilisateur/
 * Intervenant already migrated).
 *
 * Two real design issues found while writing this, both handled
 * explicitly rather than worked around silently:
 *
 * 1. `ProdMesureRapport` consolidates 4 real source tables
 *    (prod_rapport_fabrication_qualite, prod_rapport_four_qualite,
 *    prod_rapport_prep_general, prod_rapport_prep_qualite) into one
 *    target table — already documented as a deliberate simplification in
 *    the Production spec. This breaks the "preserve original ids"
 *    strategy used everywhere else in this migration: 4 separate source
 *    id sequences can't all map onto one target `id` column without
 *    collisions. Confirmed nothing else has an FK into
 *    `ProdMesureRapport.id` (it's a pure leaf table), so this is the one
 *    function in the whole migration that lets Postgres generate fresh
 *    ids instead — see the comment on `migrateProdMesureRapport` for the
 *    idempotency trade-off that comes with that.
 * 2. `prod_fuel.type_saisie` / `prod_gaz.type_saisie` are `int` codes in
 *    the source, but the target models them as the confirmed string
 *    labels (`FUEL_POINTS` — see src/lib/constants.ts). The exact
 *    code-to-label mapping was never directly confirmed (only the labels
 *    themselves, from column headers) — `FUEL_POINT_BY_CODE` below
 *    assumes the codes are simply 0-indexed in the same order as
 *    `FUEL_POINTS`, which is a reasonable guess, not a confirmed fact.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

const FUEL_POINTS = ["Séchoir 1", "Séchoir 2", "Séchoir 3", "Four 1", "Four 2", "Général"];
// Same list reused for gaz — see schema comment on ProdGaz.typeSaisie:
// gaz's own labels were never confirmed at all, so falling back to the
// (confirmed-for-fuel-only) fuel points is a placeholder, not a claim.
const GAZ_POINTS = ["Séchoir 1", "Séchoir 2", "Séchoir 3", "Four"];

function fuelPointLabel(code: unknown): string {
  const n = toNumOrNull(code);
  if (n == null || n < 0 || n >= FUEL_POINTS.length) return `Point #${code}`;
  return FUEL_POINTS[n];
}

function gazPointLabel(code: unknown): string {
  const n = toNumOrNull(code);
  if (n == null || n < 0 || n >= GAZ_POINTS.length) return `Point #${code}`;
  return GAZ_POINTS[n];
}

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateProduction(prisma: PrismaClient, dryRun: boolean) {
  await migrateProdEquipement(prisma, dryRun);
  await migrateProdTypeBrique(prisma, dryRun);
  await migrateProdSaisie(prisma, dryRun);
  await migrateProdAnomalie(prisma, dryRun);
  await migrateProdFabCompteur(prisma, dryRun);
  await migrateProdRapportGeneral(prisma, dryRun);
  await migrateProdRapportFabProduit(prisma, dryRun);
  await migrateProdRapportEmbProduit(prisma, dryRun);
  await migrateProdRapportFourEntre(prisma, dryRun);
  await migrateProdRapportFourSortie(prisma, dryRun);
  await migrateProdMesureRapport(prisma, dryRun);
  await migrateProdRapportPrepAS(prisma, dryRun);
  await migrateProdRapportHoraireFabrication(prisma, dryRun);
  await migrateProdFabTonnage(prisma, dryRun);
  await migrateProdFuel(prisma, dryRun);
  await migrateProdGaz(prisma, dryRun);
  await migrateProdRapportCfFabrication(prisma, dryRun);
  await migrateProdRapportCfEmballage(prisma, dryRun);
  await migrateProdRapportAnomalie(prisma, dryRun);
}

// ----------------------------------------------------------------------------
// Reference data
// ----------------------------------------------------------------------------

async function migrateProdEquipement(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_equipement, unite_production FROM prod_equipement`);
  console.log(`prod_equipement: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prodEquipement.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idEquipement: r.id_equipement, uniteProduction: r.unite_production },
    });
  }
  await resetSequence(prisma, "prod_equipement");
}

async function migrateProdTypeBrique(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, designation, poid, poid_vert FROM prod_type_brique`);
  console.log(`prod_type_brique: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prodTypeBrique.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        designation: toStrOrNull(r.designation) ?? "—",
        poid: toNumOrNull(r.poid),
        poidVert: toNumOrNull(r.poid_vert),
      },
    });
  }
  await resetSequence(prisma, "prod_type_brique");
}

async function migrateProdSaisie(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, designation, unite, preparation_produit, cible, deleted, poid_sec_fab, poid_four
    FROM prod_saisie
  `);
  console.log(`prod_saisie: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prodSaisie.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        designation: r.designation,
        unite: toStrOrNull(r.unite),
        preparationProduit: toStrOrNull(r.preparation_produit),
        cible: toNumOrNull(r.cible) ?? 1,
        deleted: toBool(r.deleted),
        poidSecFab: toBool(r.poid_sec_fab),
        poidFour: toBool(r.poid_four),
      },
    });
  }
  await resetSequence(prisma, "prod_saisie");
}

async function migrateProdAnomalie(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, anomalie, unite_production FROM prod_anomalie`);
  console.log(`prod_anomalie: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prodAnomalie.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, anomalie: r.anomalie, uniteProduction: r.unite_production },
    });
  }
  await resetSequence(prisma, "prod_anomalie");
}

async function migrateProdFabCompteur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_unite, id_compteur FROM prod_fab_compteur`);
  console.log(`prod_fab_compteur: ${rows.length} rows`);
  if (dryRun) return;

  const validEquipementIds = new Set(
    (await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]
  );

  let skipped = 0;
  for (const r of rows as any[]) {
    const idUnite = toNumOrNull(r.id_unite);
    if (idUnite == null || !validEquipementIds.has(idUnite)) {
      skipped++;
      console.warn(`  ⚠ skipping prod_fab_compteur row ${r.id}: invalid id_unite=${r.id_unite}`);
      continue;
    }

    const idCompteur = toNumOrNull(r.id_compteur);
    await prisma.prodFabCompteur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idUnite,
        idCompteur: idCompteur ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_fab_compteur row(s) skipped because id_unite was missing or dangling.`);
  }

  await resetSequence(prisma, "prod_fab_compteur");
}

// ----------------------------------------------------------------------------
// Reports
// ----------------------------------------------------------------------------

async function migrateProdRapportGeneral(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, date_rapport, poste FROM prod_rapport_general`);
  console.log(`prod_rapport_general: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prodRapportGeneral.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, dateRapport: toDate(r.date_rapport) ?? new Date(), poste: r.poste },
    });
  }
  await resetSequence(prisma, "prod_rapport_general");
}

async function migrateProdRapportFabProduit(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_rapport, id_unite, id_produit, quantite, tonnage FROM prod_rapport_fab_produit
  `);
  console.log(`prod_rapport_fab_produit: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validProduitIds = new Set((await prisma.prodTypeBrique.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    const idProduit = toExistingIdOrNull(r.id_produit, validProduitIds);
    if (idRapport == null || idUnite == null || idProduit == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_fab_produit row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}, id_produit=${r.id_produit}`);
      continue;
    }

    await prisma.prodRapportFabProduit.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        idUnite,
        idProduit,
        quantite: toNumOrNull(r.quantite) ?? 0,
        tonnage: toNumOrNull(r.tonnage) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_fab_produit row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_fab_produit");
}

async function migrateProdRapportEmbProduit(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_rapport, id_unite, id_produit, quantite, nbr_bobine_feuillard, nbr_pallette
    FROM prod_rapport_emb_produit
  `);
  console.log(`prod_rapport_emb_produit: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validProduitIds = new Set((await prisma.prodTypeBrique.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    const idProduit = toExistingIdOrNull(r.id_produit, validProduitIds);
    if (idRapport == null || idUnite == null || idProduit == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_emb_produit row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}, id_produit=${r.id_produit}`);
      continue;
    }

    await prisma.prodRapportEmbProduit.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        idUnite,
        idProduit,
        quantite: toNumOrNull(r.quantite) ?? 0,
        nbrBobineFeuillard: toNumOrNull(r.nbr_bobine_feuillard),
        nbrPallette: toNumOrNull(r.nbr_pallette),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_emb_produit row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_emb_produit");
}

async function migrateProdRapportFourEntre(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_rapport, id_unite, id_produit, quantite, tonnage FROM prod_rapport_four_entre
  `);
  console.log(`prod_rapport_four_entre: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validProduitIds = new Set((await prisma.prodTypeBrique.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    const idProduit = toExistingIdOrNull(r.id_produit, validProduitIds);
    if (idRapport == null || idUnite == null || idProduit == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_four_entre row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}, id_produit=${r.id_produit}`);
      continue;
    }

    await prisma.prodRapportFourEntre.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        idUnite,
        idProduit,
        quantite: toNumOrNull(r.quantite) ?? 0,
        tonnage: toNumOrNull(r.tonnage) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_four_entre row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_four_entre");
}

async function migrateProdRapportFourSortie(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_rapport, id_unite, id_produit, quantite, tonnage FROM prod_rapport_four_sortie
  `);
  console.log(`prod_rapport_four_sortie: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validProduitIds = new Set((await prisma.prodTypeBrique.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    const idProduit = toExistingIdOrNull(r.id_produit, validProduitIds);
    if (idRapport == null || idUnite == null || idProduit == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_four_sortie row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}, id_produit=${r.id_produit}`);
      continue;
    }

    await prisma.prodRapportFourSortie.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        idUnite,
        idProduit,
        quantite: toNumOrNull(r.quantite) ?? 0,
        tonnage: toNumOrNull(r.tonnage) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_four_sortie row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_four_sortie");
}

/** Consolidates 4 real source tables into one target — see the file-level
 * comment for why this is the one function in the whole migration that
 * can't preserve original ids. IMPORTANT idempotency trade-off: unlike
 * every other function here, this one is NOT safe to run twice — it uses
 * plain `create`, not `upsert`, since there's no per-row natural key to
 * upsert against once 4 id spaces are merged. Guarded by skipping
 * entirely if the target table already has any rows, rather than risking
 * silent duplication on a re-run. */
async function migrateProdMesureRapport(prisma: PrismaClient, dryRun: boolean) {
  const sources: { table: string; categorie: string; hasUnite: boolean }[] = [
    { table: "prod_rapport_fabrication_qualite", categorie: "fabrication_qualite", hasUnite: true },
    { table: "prod_rapport_four_qualite", categorie: "four_qualite", hasUnite: true },
    { table: "prod_rapport_prep_general", categorie: "prep_general", hasUnite: false },
    { table: "prod_rapport_prep_qualite", categorie: "prep_qualite", hasUnite: true },
  ];

  if (!dryRun) {
    const existing = await prisma.prodMesureRapport.count();
    if (existing > 0) {
      console.log(`prod_mesure_rapport: SKIPPED — target already has ${existing} row(s); not safe to re-run (see comment)`);
      return;
    }
  }

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validSaisieIds = new Set((await prisma.prodSaisie.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let total = 0;
  let skipped = 0;
  for (const src of sources) {
    const cols = src.hasUnite
      ? "id_rapport, id_unite, id_qualite, valeur"
      : "id_rapport, id_qualite, valeur";
    const rows = await queryAll(`SELECT ${cols} FROM ${src.table}`);
    console.log(`${src.table}: ${rows.length} rows -> prod_mesure_rapport (categorie=${src.categorie})`);
    total += rows.length;
    if (dryRun) continue;

    for (const r of rows as any[]) {
      const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
      const idUnite = src.hasUnite ? toExistingIdOrNull(r.id_unite, validUniteIds) : null;
      const idSaisie = toExistingIdOrNull(r.id_qualite, validSaisieIds);

      if (idRapport == null || idSaisie == null) {
        skipped++;
        const rowRef =
          r.id != null ? String(r.id) : `id_rapport=${r.id_rapport ?? "?"}, id_unite=${r.id_unite ?? "?"}, id_qualite=${r.id_qualite ?? "?"}`;
        console.warn(
          `  ⚠ skipping ${src.table} row ${rowRef}: invalid id_rapport=${r.id_rapport}, ` +
          `id_unite=${r.id_unite ?? "null"}, id_qualite=${r.id_qualite}`
        );
        continue;
      }

      await prisma.prodMesureRapport.create({
        data: {
          idRapport,
          idUnite: idUnite ?? null,
          idSaisie,
          categorie: src.categorie,
          valeur: toNumOrNull(r.valeur) ?? 0,
        },
      });
    }
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_mesure_rapport row(s) skipped because one or more FK targets were missing.`);
  }
  console.log(`prod_mesure_rapport: ${total} total rows inspected; ${total - skipped} rows written`);
}

async function migrateProdRapportPrepAS(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_rapport, id_unite, id_qualite, valeur_a, valeur_s FROM prod_rapport_prep_as
  `);
  console.log(`prod_rapport_prep_as: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validSaisieIds = new Set((await prisma.prodSaisie.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = r.id_unite == null ? null : toExistingIdOrNull(r.id_unite, validUniteIds);
    const idSaisie = toExistingIdOrNull(r.id_qualite, validSaisieIds);
    if (idRapport == null || idSaisie == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_prep_as row ${r.id}: invalid id_rapport=${r.id_rapport}, id_qualite=${r.id_qualite}`);
      continue;
    }

    await prisma.prodRapportPrepAS.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        idUnite: idUnite ?? undefined,
        idSaisie,
        valeurA: toNumOrNull(r.valeur_a) ?? 0,
        valeurS: toNumOrNull(r.valeur_s) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_prep_as row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_prep_as");
}

async function migrateProdRapportHoraireFabrication(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_rapport, id_unite, id_qualite, h1, h2, h3, h4, h5, h6, h7, h8
    FROM prod_rapport_horaire_fabrication
  `);
  console.log(`prod_rapport_horaire_fabrication: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validSaisieIds = new Set((await prisma.prodSaisie.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    const idSaisie = toExistingIdOrNull(r.id_qualite, validSaisieIds);
    if (idRapport == null || idUnite == null || idSaisie == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_horaire_fabrication row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}, id_qualite=${r.id_qualite}`);
      continue;
    }

    await prisma.prodRapportHoraireFabrication.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        idUnite,
        idSaisie,
        h1: toNumOrNull(r.h1) ?? 0,
        h2: toNumOrNull(r.h2) ?? 0,
        h3: toNumOrNull(r.h3) ?? 0,
        h4: toNumOrNull(r.h4) ?? 0,
        h5: toNumOrNull(r.h5) ?? 0,
        h6: toNumOrNull(r.h6) ?? 0,
        h7: toNumOrNull(r.h7) ?? 0,
        h8: toNumOrNull(r.h8) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_horaire_fabrication row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_horaire_fabrication");
}

async function migrateProdFabTonnage(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rapport, id_unite, valeur FROM prod_fab_tonnage`);
  console.log(`prod_fab_tonnage: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    if (idRapport == null || idUnite == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_fab_tonnage row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}`);
      continue;
    }

    await prisma.prodFabTonnage.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        idUnite,
        valeur: toNumOrNull(r.valeur) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_fab_tonnage row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_fab_tonnage");
}

async function migrateProdFuel(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rapport, type_saisie, quantite FROM prod_fuel`);
  console.log(`prod_fuel: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    if (idRapport == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_fuel row ${r.id}: invalid id_rapport=${r.id_rapport}`);
      continue;
    }

    await prisma.prodFuel.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        typeSaisie: fuelPointLabel(r.type_saisie),
        quantite: toNumOrNull(r.quantite) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_fuel row(s) skipped because id_rapport was missing or dangling.`);
  }
  await resetSequence(prisma, "prod_fuel");
}

async function migrateProdGaz(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rapport, type_saisie, quantite FROM prod_gaz`);
  console.log(`prod_gaz: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    if (idRapport == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_gaz row ${r.id}: invalid id_rapport=${r.id_rapport}`);
      continue;
    }

    await prisma.prodGaz.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        typeSaisie: gazPointLabel(r.type_saisie),
        quantite: toNumOrNull(r.quantite) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_gaz row(s) skipped because id_rapport was missing or dangling.`);
  }
  await resetSequence(prisma, "prod_gaz");
}

async function migrateProdRapportCfFabrication(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rapport, id_unite, id_cf FROM prod_rapport_cf_fabrication`);
  console.log(`prod_rapport_cf_fabrication: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCfIds = new Set((await prisma.intervenant.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    const idCf = r.id_cf == null ? null : toExistingIdOrNull(r.id_cf, validCfIds);
    if (idRapport == null || idUnite == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_cf_fabrication row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}`);
      continue;
    }

    await prisma.prodRapportCfFabrication.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idRapport, idUnite, idCf: idCf ?? null },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_cf_fabrication row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_cf_fabrication");
}

async function migrateProdRapportCfEmballage(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rapport, id_unite, id_cf FROM prod_rapport_cf_emballage`);
  console.log(`prod_rapport_cf_emballage: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCfIds = new Set((await prisma.intervenant.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    const idCf = r.id_cf == null ? null : toExistingIdOrNull(r.id_cf, validCfIds);
    if (idRapport == null || idUnite == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_cf_emballage row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}`);
      continue;
    }

    await prisma.prodRapportCfEmballage.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idRapport, idUnite, idCf: idCf ?? null },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_cf_emballage row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_cf_emballage");
}

async function migrateProdRapportAnomalie(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_rapport, id_unite, id_anomalie, duree FROM prod_rapport_anomalie
  `);
  console.log(`prod_rapport_anomalie: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validAnomalieIds = new Set((await prisma.prodAnomalie.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  let skipped = 0;
  for (const r of rows as any[]) {
    const idRapport = toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    const idAnomalie = toExistingIdOrNull(r.id_anomalie, validAnomalieIds);
    if (idRapport == null || idUnite == null || idAnomalie == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_anomalie row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}, id_anomalie=${r.id_anomalie}`);
      continue;
    }

    await prisma.prodRapportAnomalie.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRapport,
        idUnite,
        idAnomalie,
        duree: toNumOrNull(r.duree) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_rapport_anomalie row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "prod_rapport_anomalie");
}
