/**
 * Tier: workshop (atelier) — depends on core + master (Article, Equipement,
 * Intervenant already migrated).
 *
 * Real discovery while writing this: `atelier_donnees` and `atelier_piece`
 * store numeric-looking values (quantities, measurements, tolerances) as
 * `varchar(150)` in the source, not a numeric type — evidently free-text
 * entry fields in the legacy UI despite being conceptually numbers. This
 * schema correctly types them as Decimal, so every value here goes through
 * `parseLenientNumber()` below (handles French-locale comma decimals and
 * blank/junk values) rather than a direct cast.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

/** Source text fields that are conceptually numeric sometimes use a comma
 * decimal separator (French locale) and sometimes contain blank/non-numeric
 * junk from free-text entry — plain Number() would silently return NaN or
 * lose the comma case. Strips whitespace, swaps ',' for '.', then parses. */
function parseLenientNumber(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

/** Same "Oui"/"Non" convention already confirmed for
 * demande_intervention.arret_machine and bsm.validation — applied here to
 * atelier_donnees.liberation on the assumption it follows the same
 * pattern, NOT independently confirmed for this specific column. */
function ouiNonToBool(v: unknown): boolean {
  if (v == null) return false;
  return String(v).trim().toLowerCase() === "oui";
}

/** Legacy data uses 0 to mean "no reference" on many FK-like columns. A raw
 * Prisma insert with 0 will fail because PostgreSQL relation IDs are positive
 * integers only. Convert these sentinel zeros to null before writing. */
function toForeignKeyOrNull(v: unknown): number | null {
  const n = toNumOrNull(v);
  return n != null && n > 0 ? n : null;
}

export async function migrateWorkshop(prisma: PrismaClient, dryRun: boolean) {
  await migrateAtelierMachine(prisma, dryRun);
  await migrateAtelierParametrePiece(prisma, dryRun);
  await migrateAtelierParametrePriorite(prisma, dryRun);
  await migrateAtelierParametreConception(prisma, dryRun);
  await migrateAtelierCreer(prisma, dryRun);
  await migrateAtelierEtat(prisma, dryRun);
  await migrateAtelierRetour(prisma, dryRun);
  await migrateAtelierDonnees(prisma, dryRun);
  await migrateAtelierPiece(prisma, dryRun);
  await migrateAtelierSuiviJournalier(prisma, dryRun);
  await migrateAtelierBsm(prisma, dryRun);
}

// ----------------------------------------------------------------------------
// Reference data (no dependencies)
// ----------------------------------------------------------------------------

async function migrateAtelierMachine(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, designation, deleted FROM atelier_machine`);
  console.log(`atelier_machine: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierMachine.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, designation: toStrOrNull(r.designation) ?? "—", deleted: toBool(r.deleted) },
    });
  }
  await resetSequence(prisma, "atelier_machine");
}

async function migrateAtelierParametrePiece(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, designation, deleted FROM atelier_parametre_piece`);
  console.log(`atelier_parametre_piece: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierParametrePiece.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, designation: toStrOrNull(r.designation) ?? "—", deleted: toBool(r.deleted) },
    });
  }
  await resetSequence(prisma, "atelier_parametre_piece");
}

async function migrateAtelierParametrePriorite(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, designation, deleted FROM atelier_parametre_priorite`);
  console.log(`atelier_parametre_priorite: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierParametrePriorite.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, designation: toStrOrNull(r.designation) ?? "—", deleted: toBool(r.deleted) },
    });
  }
  await resetSequence(prisma, "atelier_parametre_priorite");
}

async function migrateAtelierParametreConception(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, designation, deleted FROM atelier_parametre_conception`);
  console.log(`atelier_parametre_conception: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierParametreConception.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, designation: toStrOrNull(r.designation) ?? "—", deleted: toBool(r.deleted) },
    });
  }
  await resetSequence(prisma, "atelier_parametre_conception");
}

// ----------------------------------------------------------------------------
// Jobs
// ----------------------------------------------------------------------------

async function migrateAtelierCreer(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, atelier, equipement, sous_equipement, organe, id_demandeur, date_consultation,
           date_prevu, n_plan, n_revision, quantite, id_parametre_piece, id_parametre_priorite,
           id_parametre_conception, etat, id_article, createur, dimension, commentaire, n_of
    FROM atelier_creer
  `);
  console.log(`atelier_creer: ${rows.length} rows`);
  if (dryRun) return;

  const loginById = await buildUserLoginLookup(prisma);

  for (const r of rows as any[]) {
    const payload = {
      id: r.id,
      // n_of is `int` in the source but the target field is a unique
      // String — stringified directly, preserving the real job number.
      nOf: r.n_of != null ? String(r.n_of) : null,
      atelier: toForeignKeyOrNull(r.atelier),
      equipement: toForeignKeyOrNull(r.equipement),
      sousEquipement: toForeignKeyOrNull(r.sous_equipement),
      organe: toForeignKeyOrNull(r.organe),
      // idDemandeur resolves to Intervenant (not Utilisateur) — ids are
      // preserved 1:1 across this whole migration, so no lookup needed,
      // just a direct pass-through once Intervenant is migrated (tier:
      // master, already run before this tier).
      idDemandeur: toForeignKeyOrNull(r.id_demandeur),
      dateConsultation: toDate(r.date_consultation),
      datePrevu: toDate(r.date_prevu),
      nPlan: toStrOrNull(r.n_plan),
      nRevision: toStrOrNull(r.n_revision),
      quantite: toNumOrNull(r.quantite),
      dimension: toStrOrNull(r.dimension),
      idParametrePiece: toForeignKeyOrNull(r.id_parametre_piece),
      idParametrePriorite: toForeignKeyOrNull(r.id_parametre_priorite),
      idParametreConception: toForeignKeyOrNull(r.id_parametre_conception),
      etat: toStrOrNull(r.etat) ?? "En Attente",
      createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
      idArticle: toForeignKeyOrNull(r.id_article),
    };

    try {
      await prisma.atelierCreer.upsert({
        where: { id: r.id },
        update: {},
        create: payload,
      });
    } catch (error) {
      console.error("Skipping invalid atelier_creer row:", {
        id: r.id,
        atelier: r.atelier,
        equipement: r.equipement,
        sous_equipement: r.sous_equipement,
        organe: r.organe,
        id_demandeur: r.id_demandeur,
        id_parametre_piece: r.id_parametre_piece,
        id_parametre_priorite: r.id_parametre_priorite,
        id_parametre_conception: r.id_parametre_conception,
        id_article: r.id_article,
      });
      throw error;
    }

    // atelier_creer.commentaire is a real source column (a single
    // free-text note), but the target schema instead models comments as
    // a separate one-to-many thread (AtelierCommentaire) — there is no
    // `commentaire` field on AtelierCreer itself. Carry the note over as
    // a single linked comment rather than silently dropping it (this was
    // caught by an automated field-name audit; an earlier version of this
    // function incorrectly tried to write `commentaire` directly onto
    // AtelierCreer, which is not a real field on that model at all).
    const commentaireText = toStrOrNull(r.commentaire);
    if (commentaireText) {
      await prisma.atelierCommentaire.create({
        data: { idAtelier: r.id, texte: commentaireText, auteur: "migration" },
      });
    }
  }
  await resetSequence(prisma, "atelier_creer");
}

async function buildUserLoginLookup(prisma: PrismaClient): Promise<Map<number, string>> {
  const users = await prisma.utilisateur.findMany({ select: { id: true, login: true } });
  return new Map(users.map((u: { id: number; login: string }) => [u.id, u.login]));
}

// ----------------------------------------------------------------------------
// Job sub-tables
// ----------------------------------------------------------------------------

async function migrateAtelierEtat(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_atelier, date_changement, etat FROM atelier_etat`);
  console.log(`atelier_etat: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierEtat.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idAtelier: r.id_atelier,
        dateChangement: toDate(r.date_changement) ?? new Date(),
        etat: toStrOrNull(r.etat) ?? "—",
      },
    });
  }
  await resetSequence(prisma, "atelier_etat");
}

async function migrateAtelierRetour(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_atelier, id_nv FROM atelier_retour`);
  console.log(`atelier_retour: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierRetour.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idAtelier: r.id_atelier, idNv: toNumOrNull(r.id_nv) },
    });
  }
  await resetSequence(prisma, "atelier_retour");
}

async function migrateAtelierDonnees(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_atelier, sous_traitant, qt_recu, piece_app, piece_bloque, remarque, liberation
    FROM atelier_donnees
  `);
  console.log(`atelier_donnees: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierDonnees.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idAtelier: r.id_atelier,
        sousTraitant: toStrOrNull(r.sous_traitant),
        qtRecu: parseLenientNumber(r.qt_recu),
        pieceApp: parseLenientNumber(r.piece_app),
        pieceBloque: parseLenientNumber(r.piece_bloque),
        remarque: toStrOrNull(r.remarque),
        liberation: ouiNonToBool(r.liberation),
      },
    });
  }
  await resetSequence(prisma, "atelier_donnees");
}

async function migrateAtelierPiece(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_atelier, num_mes, mesure_nominale, plus, tire, p1, p2, p3, p4, p5, p6
    FROM atelier_piece
  `);
  console.log(`atelier_piece: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierPiece.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idAtelier: r.id_atelier,
        numMes: r.num_mes != null ? String(r.num_mes) : null,
        mesureNominale: parseLenientNumber(r.mesure_nominale),
        plus: parseLenientNumber(r.plus),
        tire: parseLenientNumber(r.tire),
        p1: parseLenientNumber(r.p1),
        p2: parseLenientNumber(r.p2),
        p3: parseLenientNumber(r.p3),
        p4: parseLenientNumber(r.p4),
        p5: parseLenientNumber(r.p5),
        p6: parseLenientNumber(r.p6),
      },
    });
  }
  await resetSequence(prisma, "atelier_piece");
}

async function migrateAtelierSuiviJournalier(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, date, heure_deb, heure_fin, n_of, id_machine, id_operateur, qt_solde, deleted
    FROM atelier_suivi_journalier
  `);
  console.log(`atelier_suivi_journalier: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierSuiviJournalier.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        date: toDate(r.date) ?? new Date(),
        heureDeb: toStrOrNull(r.heure_deb),
        heureFin: toStrOrNull(r.heure_fin),
        nOf: toStrOrNull(r.n_of),
        idMachine: toNumOrNull(r.id_machine),
        idOperateur: toNumOrNull(r.id_operateur),
        qtSolde: toNumOrNull(r.qt_solde),
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "atelier_suivi_journalier");
}

async function migrateAtelierBsm(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_atelier, id_bsm FROM atelier_bsm`);
  console.log(`atelier_bsm: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierBsm.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idAtelier: r.id_atelier, idBsm: r.id_bsm },
    });
  }
  await resetSequence(prisma, "atelier_bsm");
}
