/**
 * Tier: preventive-maintenance — depends on core + master (Equipement,
 * EquipementCompteur, Intervenant) + maintenance (GammeOperatoire,
 * OrdreTravail).
 *
 * Real gap found while writing this: `PrevSystEch`, `PrevMesure`, and
 * `PrevAnnuel` are all confirmed real source tables, but NONE of them had
 * ever been modeled in `schema.prisma` at all — not a migration oversight,
 * a schema oversight. The app's own preventive-maintenance generation
 * logic (`lancement_ot_preventive.cs` equivalent) computes due dates and
 * last-measurement values on the fly from `OrdreTravail` history rather
 * than reading these log tables, so their absence never surfaced as an
 * app bug. Added all 3 to `schema.prisma` in this pass so this real
 * historical data isn't silently dropped during migration — but this is
 * a genuine, known limitation: the current app UI does not read from
 * these 3 tables even though they're now migrated. Flagging clearly
 * rather than implying full feature parity.
 *
 * `PrevAnnuel.idRep`'s relationship to the other Prev* tables was NOT
 * established with confidence — see the schema comment on that model.
 * Left as a bare int, not guessed at as a foreign key.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migratePreventiveMaintenance(prisma: PrismaClient, dryRun: boolean) {
  await migratePrevSystematique(prisma, dryRun);
  await migratePrevSystEch(prisma, dryRun);
  await migratePrevConditionnelle(prisma, dryRun);
  await migratePrevMesure(prisma, dryRun);
  await migratePrevCompteur(prisma, dryRun);
  await migrateOtReinitCompteur(prisma, dryRun);
  await migratePrevAnnuel(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migratePrevSystematique(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_gamme, frequence, periode, date_debut, heure_debut, lancer_ot_avant,
           atelier, equipement, sous_equipement, organe, arr
    FROM prev_systematique
  `);
  console.log(`prev_systematique: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prevSystematique.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idGamme: toNumOrNull(r.id_gamme),
        frequence: toNumOrNull(r.frequence),
        periode: toStrOrNull(r.periode),
        dateDebut: toDate(r.date_debut),
        heureDebut: toStrOrNull(r.heure_debut),
        lancerOtAvant: toNumOrNull(r.lancer_ot_avant),
        atelier: toNumOrNull(r.atelier),
        equipement: toNumOrNull(r.equipement),
        sousEquipement: toNumOrNull(r.sous_equipement),
        organe: toNumOrNull(r.organe),
        arr: toBool(r.arr),
      },
    });
  }
  await resetSequence(prisma, "prev_systematique");
}

async function migratePrevSystEch(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rep, date_ech, heure_ech, deleted FROM prev_syst_ech`);
  console.log(`prev_syst_ech: ${rows.length} rows`);
  if (dryRun) return;

  const validPlanIds = new Set((await prisma.prevSystematique.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idRep = toExistingIdOrNull(r.id_rep, validPlanIds);
    if (idRep == null) {
      skipped++;
      console.warn(`  ⚠ skipping prev_syst_ech row ${r.id}: invalid id_rep=${r.id_rep}`);
      continue;
    }

    await prisma.prevSystEch.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRep,
        dateEch: toDate(r.date_ech) ?? new Date(),
        heureEch: toStrOrNull(r.heure_ech),
        deleted: toBool(r.deleted),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prev_syst_ech row(s) skipped because id_rep was missing or dangling.`);
  }
  await resetSequence(prisma, "prev_syst_ech");
}

async function migratePrevConditionnelle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_gamme, mesure, unite, valeur_lancement, type_valeur, atelier,
           equipement, sous_equipement, organe, arr
    FROM prev_conditionnelle
  `);
  console.log(`prev_conditionnelle: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prevConditionnelle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idGamme: toNumOrNull(r.id_gamme),
        mesure: toStrOrNull(r.mesure),
        unite: toStrOrNull(r.unite),
        valeurLancement: toNumOrNull(r.valeur_lancement),
        typeValeur: toStrOrNull(r.type_valeur),
        atelier: toNumOrNull(r.atelier),
        equipement: toNumOrNull(r.equipement),
        sousEquipement: toNumOrNull(r.sous_equipement),
        organe: toNumOrNull(r.organe),
        arr: toBool(r.arr),
      },
    });
  }
  await resetSequence(prisma, "prev_conditionnelle");
}

async function migratePrevMesure(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_prev, mesure_par, creer_par, date_mesure, heure_mesure, valeur FROM prev_mesure
  `);
  console.log(`prev_mesure: ${rows.length} rows`);
  if (dryRun) return;

  const validPlanIds = new Set((await prisma.prevConditionnelle.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idPrev = toExistingIdOrNull(r.id_prev, validPlanIds);
    if (idPrev == null) {
      skipped++;
      console.warn(`  ⚠ skipping prev_mesure row ${r.id}: invalid id_prev=${r.id_prev}`);
      continue;
    }

    await prisma.prevMesure.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idPrev,
        // Kept as raw Utilisateur ids, NOT resolved via login lookup —
        // see file header. Ids are preserved 1:1 across this migration,
        // so these remain meaningful references to migrated Utilisateur
        // rows even without a relation being declared on this model.
        mesurePar: toNumOrNull(r.mesure_par),
        creerPar: toNumOrNull(r.creer_par),
        dateMesure: toDate(r.date_mesure) ?? new Date(),
        heureMesure: toStrOrNull(r.heure_mesure),
        valeur: toNumOrNull(r.valeur) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prev_mesure row(s) skipped because id_prev was missing or dangling.`);
  }
  await resetSequence(prisma, "prev_mesure");
}

async function migratePrevCompteur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_gamme, id_compteur, valeur_lancement, type_valeur, reinitialisation,
           initial, type_initial, atelier, equipement, sous_equipement, organe, arr
    FROM prev_compteur
  `);
  console.log(`prev_compteur: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prevCompteur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idGamme: toNumOrNull(r.id_gamme),
        idCompteur: toNumOrNull(r.id_compteur),
        valeurLancement: toNumOrNull(r.valeur_lancement),
        typeValeur: toStrOrNull(r.type_valeur),
        reinitialisation: toStrOrNull(r.reinitialisation),
        initial: toNumOrNull(r.initial),
        typeInitial: toStrOrNull(r.type_initial),
        atelier: toNumOrNull(r.atelier),
        equipement: toNumOrNull(r.equipement),
        sousEquipement: toNumOrNull(r.sous_equipement),
        organe: toNumOrNull(r.organe),
        arr: toBool(r.arr),
      },
    });
  }
  await resetSequence(prisma, "prev_compteur");
}

async function migrateOtReinitCompteur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_prev_compteur, id_ot FROM ot_reinit_compteur`);
  console.log(`ot_reinit_compteur: ${rows.length} rows`);
  if (dryRun) return;

  const validPrevCompteurIds = new Set((await prisma.prevCompteur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validOtIds = new Set((await prisma.ordreTravail.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idPrevCompteur = toExistingIdOrNull(r.id_prev_compteur, validPrevCompteurIds);
    const idOt = toExistingIdOrNull(r.id_ot, validOtIds);
    if (idPrevCompteur == null || idOt == null) {
      skipped++;
      console.warn(`  ⚠ skipping ot_reinit_compteur row ${r.id}: invalid id_prev_compteur=${r.id_prev_compteur}, id_ot=${r.id_ot}`);
      continue;
    }

    await prisma.otReinitCompteur.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idPrevCompteur, idOt },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ot_reinit_compteur row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ot_reinit_compteur");
}

async function migratePrevAnnuel(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rep, date_echeance, type_periode FROM prev_annuel`);
  console.log(`prev_annuel: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prevAnnuel.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRep: r.id_rep,
        dateEcheance: toDate(r.date_echeance) ?? new Date(),
        typePeriode: toStrOrNull(r.type_periode),
      },
    });
  }
  await resetSequence(prisma, "prev_annuel");
}
