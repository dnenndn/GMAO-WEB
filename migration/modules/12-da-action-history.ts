/**
 * Tier: da-action-history — depends on core + master (Utilisateur) +
 * inventory-procurement (DemandeAchat).
 *
 * `DaAction` consolidates 9 real source tables (each logging one
 * workflow event: confirm/refuse/report/return/resend/close/modify/
 * admin-send/view), the same multi-source-id-collision situation as
 * `ProdMesureRapport` in tier 6 — 9 independent id sequences can't all
 * become one target `id`. Confirmed nothing else has an FK into
 * `DaAction.id` before applying the same fresh-id pattern used there:
 * plain `create()`, not `upsert()`, guarded by skipping entirely if the
 * target table already has rows (**not safe to re-run**, exactly like
 * `ProdMesureRapport`).
 *
 * Two of the 9 source tables have an extra column with no home on the
 * original `DaAction` model: `da_refuser.cause` (refusal reason) and
 * `da_reporter.nouvel_date` (rescheduled date). Found while auditing
 * this tier's SELECT column lists against the real schema — fixed by
 * extending `DaAction` with `cause`/`nouvelleDate` (both optional, so
 * fully backward compatible — nothing in the app reads or writes
 * `DaAction` fields other than `idDa`/`type`/`par`, confirmed by
 * grepping `src/` before making the change) rather than silently
 * dropping that data on migration.
 *
 * Also includes `DaFichier` and `DaArticleEquipement` in this tier since
 * both belong to the same DA-workflow area and `DaFichier` was a genuine
 * schema gap found while writing this (see schema.prisma comment on that
 * model) — same situation as EquipementCompteur/Prev* before it.
 *
 * `da_article_equipement.id_article` resolves to `DaArticle`, NOT
 * `Article` — confirmed by reading the actual `@relation` target before
 * assuming the obvious mapping. Ids are preserved 1:1, so this is a
 * direct pass-through once DaArticle (tier: inventory-procurement) has
 * run, same reasoning as every other id-preserving FK in this migration.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toStrOrNull, toDate, resetSequence, toNumOrNull } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateDaActionHistory(prisma: PrismaClient, dryRun: boolean) {
  const loginById = dryRun ? new Map<number, string>() : await buildUserLoginLookup(prisma);

  await migrateDaAction(prisma, dryRun, loginById);
  await migrateDaFichier(prisma, dryRun);
  await migrateDaArticleEquipement(prisma, dryRun);
}

async function buildUserLoginLookup(prisma: PrismaClient): Promise<Map<number, string>> {
  const users = await prisma.utilisateur.findMany({ select: { id: true, login: true } });
  return new Map(users.map((u: { id: number; login: string }) => [u.id, u.login]));
}

function loginOrPlaceholder(loginById: Map<number, string>, sourceUserId: unknown): string | null {
  const n = typeof sourceUserId === "number" ? sourceUserId : Number(sourceUserId);
  if (!n) return null;
  return loginById.get(n) ?? `utilisateur#${n}`;
}

/** Same fresh-id, not-safe-to-re-run pattern as ProdMesureRapport (tier
 * 6) — see file header. Each of the 9 source tables maps to one `type`
 * label on the consolidated model. Two of the 9 have an extra column
 * with nowhere to go on the original `DaAction` model (`da_refuser.cause`,
 * `da_reporter.nouvel_date`) — found while auditing this tier and fixed
 * by extending the schema (see schema.prisma comment on DaAction) rather
 * than silently dropping that data, the same treatment every other real
 * gap found during this migration effort has gotten. */
async function migrateDaAction(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const sources: {
    table: string;
    type: string;
    parCol: string;
    dateCol: string;
    heureCol: string;
    causeCol?: string;
    nouvelleDateCol?: string;
  }[] = [
    { table: "da_confirmer", type: "Confirmée", parCol: "confirmer_par", dateCol: "date_confirmer", heureCol: "heure_confirmer" },
    { table: "da_refuser", type: "Refusée", parCol: "refuser_par", dateCol: "date_refus", heureCol: "heure_refus", causeCol: "cause" },
    { table: "da_reporter", type: "Reportée", parCol: "reporter_par", dateCol: "date_report", heureCol: "heure_report", nouvelleDateCol: "nouvel_date" },
    { table: "da_retourner", type: "Retournée", parCol: "retourner_par", dateCol: "date_retourner", heureCol: "heure_retourner" },
    { table: "da_reenvoyer", type: "Renvoyée", parCol: "reenvoyer_par", dateCol: "date_reenvoyer", heureCol: "heure_reenvoyer" },
    { table: "da_cloturer", type: "Clôturée", parCol: "cloturer_par", dateCol: "date_cloture", heureCol: "heure_cloture" },
    { table: "da_modifier", type: "Modifiée", parCol: "modifier_par", dateCol: "date_modifier", heureCol: "heure_modifier" },
    { table: "da_administrateur", type: "Envoyée (Admin)", parCol: "envoyer_par", dateCol: "date_envoyer", heureCol: "heure_envoyer" },
    { table: "da_vue", type: "Vue", parCol: "vue_par", dateCol: "date_vue", heureCol: "heure_vue" },
  ];

  if (!dryRun) {
    const existing = await prisma.daAction.count();
    if (existing > 0) {
      console.log(`da_action: SKIPPED — target already has ${existing} row(s); not safe to re-run (see comment)`);
      return;
    }
  }

  let total = 0;
  const validDaIds = new Set((await prisma.demandeAchat.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);

  for (const src of sources) {
    const extraCols = [src.causeCol, src.nouvelleDateCol].filter(Boolean);
    const cols = ["id_da", src.parCol, src.dateCol, src.heureCol, ...extraCols].join(", ");
    const rows = await queryAll(`SELECT ${cols} FROM ${src.table}`);
    console.log(`${src.table}: ${rows.length} rows -> da_action (type=${src.type})`);
    total += rows.length;
    if (dryRun) continue;

    let skipped = 0;
    for (const r of rows as any[]) {
      const idDa = toExistingIdOrNull(r.id_da, validDaIds);
      if (idDa == null) {
        skipped++;
        console.warn(`  ⚠ skipping ${src.table} row with invalid id_da=${r.id_da}`);
        continue;
      }

      const dateVal = toDate(r[src.dateCol]) ?? new Date();
      const heureVal = toStrOrNull(r[src.heureCol]);
      // Combine date + time-of-day string into one DateTime where
      // possible, same spirit as every other date/heure pair in this
      // migration — DaAction.date has no separate heure column on the
      // target, so the time string (if parseable) is folded in here.
      let combined = dateVal;
      if (heureVal) {
        const [h, m] = heureVal.split(":").map(Number);
        if (!Number.isNaN(h)) {
          combined = new Date(dateVal);
          combined.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
        }
      }

      await prisma.daAction.create({
        data: {
          idDa,
          type: src.type,
          par: loginOrPlaceholder(loginById, r[src.parCol]),
          date: combined,
          cause: src.causeCol ? toStrOrNull(r[src.causeCol]) : null,
          nouvelleDate: src.nouvelleDateCol ? toDate(r[src.nouvelleDateCol]) : null,
        },
      });
    }

    if (skipped > 0) {
      console.log(`  ⚠ ${skipped} ${src.table} row(s) skipped because id_da was missing or dangling.`);
    }
  }
  console.log(`da_action: ${total} total rows examined; valid rows written`);
}

async function migrateDaFichier(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_da, adresse FROM da_fichier`);
  console.log(`da_fichier: ${rows.length} rows`);
  if (dryRun) return;

  const validDaIds = new Set((await prisma.demandeAchat.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDa = toExistingIdOrNull(r.id_da, validDaIds);
    if (idDa == null) {
      skipped++;
      console.warn(`  ⚠ skipping da_fichier row ${r.id}: invalid id_da=${r.id_da}`);
      continue;
    }

    await prisma.daFichier.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idDa, adresse: r.adresse },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} da_fichier row(s) skipped because id_da was missing or dangling.`);
  }
  await resetSequence(prisma, "da_fichier");
}

async function migrateDaArticleEquipement(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_da, id_article, id_equipement, id_lis FROM da_article_equipement`);
  console.log(`da_article_equipement: ${rows.length} rows`);
  if (dryRun) return;

  const validDaIds = new Set((await prisma.demandeAchat.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validArticleIds = new Set((await prisma.daArticle.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDa = toExistingIdOrNull(r.id_da, validDaIds);
    const idArticle = toExistingIdOrNull(r.id_article, validArticleIds);
    const idEquipement = toExistingIdOrNull(r.id_equipement, validEquipementIds);
    if (idDa == null || idArticle == null || idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping da_article_equipement row ${r.id}: invalid id_da=${r.id_da}, id_article=${r.id_article}, id_equipement=${r.id_equipement}`);
      continue;
    }

    await prisma.daArticleEquipement.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idDa,
        // Resolves to DaArticle, NOT Article — see file header.
        idArticle,
        idEquipement,
        idLis: r.id_lis,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} da_article_equipement row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "da_article_equipement");
}
