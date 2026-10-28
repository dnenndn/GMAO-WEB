/**
 * Tier: gamme-ot-resources — depends on core + master (FonctionIntervenant,
 * TabType, Article) + maintenance (GammeOperatoire, OrdreTravail).
 *
 * Real gap found while writing this: `ot_ressources_fonction` has 5 real
 * source columns (`nbre_requis`, `min_planif`, `type_cout`, `date_debut`,
 * `heure_debut`) with no home on the original `OtRessourcesFonction`
 * model — same class of gap as `DaAction.cause`/`nouvelleDate` (tier 12).
 * Confirmed nothing in `src/app/` references this model at all before
 * extending it (all 5 new fields optional, fully backward compatible).
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

export async function migrateGammeOtResources(prisma: PrismaClient, dryRun: boolean) {
  await migrateGammeRessourcesFonction(prisma, dryRun);
  await migrateGammeRessourcesOutillage(prisma, dryRun);
  await migrateGammeRessourcesPdr(prisma, dryRun);
  await migrateOtRessourcesFonction(prisma, dryRun);
  await migrateOtRessourcesOutil(prisma, dryRun);
  await migrateOtRessourcesPdr(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateGammeRessourcesFonction(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_fonction, id_gamme, nbre_requis, min_planif, type_cout
    FROM gamme_ressources_fonction
  `);
  console.log(`gamme_ressources_fonction: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.gammeRessourcesFonction.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idFonction: r.id_fonction,
        idGamme: r.id_gamme,
        nbreRequis: r.nbre_requis,
        minPlanif: r.min_planif,
        typeCout: r.type_cout,
      },
    });
  }
  await resetSequence(prisma, "gamme_ressources_fonction");
}

async function migrateGammeRessourcesOutillage(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_type, id_gamme, quantite FROM gamme_ressources_outillage`);
  console.log(`gamme_ressources_outillage: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.gammeRessourcesOutillage.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idType: r.id_type, idGamme: r.id_gamme, quantite: r.quantite },
    });
  }
  await resetSequence(prisma, "gamme_ressources_outillage");
}

async function migrateGammeRessourcesPdr(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_gamme, quantite FROM gamme_ressources_pdr`);
  console.log(`gamme_ressources_pdr: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.gammeRessourcesPdr.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: r.id_article, idGamme: r.id_gamme, quantite: toNumOrNull(r.quantite) ?? 0 },
    });
  }
  await resetSequence(prisma, "gamme_ressources_pdr");
}

async function migrateOtRessourcesFonction(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_fonction, id_ot, nbre_requis, min_planif, type_cout, date_debut, heure_debut
    FROM ot_ressources_fonction
  `);
  console.log(`ot_ressources_fonction: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otRessourcesFonction.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idOt: r.id_ot,
        idFonction: toNumOrNull(r.id_fonction),
        nbreRequis: toNumOrNull(r.nbre_requis),
        minPlanif: toNumOrNull(r.min_planif),
        typeCout: toStrOrNull(r.type_cout),
        dateDebut: toDate(r.date_debut),
        heureDebut: toStrOrNull(r.heure_debut),
      },
    });
  }
  await resetSequence(prisma, "ot_ressources_fonction");
}

async function migrateOtRessourcesOutil(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_type, id_ot, date_sh, quantite FROM ot_ressources_outil`);
  console.log(`ot_ressources_outil: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otRessourcesOutil.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idType: r.id_type,
        idOt: r.id_ot,
        dateSh: toDate(r.date_sh) ?? new Date(),
        quantite: r.quantite,
      },
    });
  }
  await resetSequence(prisma, "ot_ressources_outil");
}

async function migrateOtRessourcesPdr(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_ot, quantite, date_sh FROM ot_ressources_pdr`);
  console.log(`ot_ressources_pdr: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otRessourcesPdr.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idArticle: r.id_article,
        idOt: r.id_ot,
        quantite: toNumOrNull(r.quantite) ?? 0,
        dateSh: toDate(r.date_sh) ?? new Date(),
      },
    });
  }
  await resetSequence(prisma, "ot_ressources_pdr");
}
