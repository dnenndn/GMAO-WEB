/**
 * Tier: production-remaining — depends on core + master (Intervenant) +
 * production (ProdSaisie, ProdEquipement, ProdRapportGeneral).
 *
 * All 3 tables added in this same pass (schema.prisma "Phase 26" + this
 * migration). No app UI built for any of them — same reasoning as
 * `parametre_image` (tier 20): these are config/reference-style tables
 * with no confirmed UI destination found in the decompiled source for
 * this pass (unlike, say, Fournisseur/Article reference-data, which had
 * clear settings-page precedent). Migrated so the data isn't lost, but
 * flagged rather than guessing at a UI that isn't confirmed to exist.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, resetSequence, toNumOrNull } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateProductionRemaining(prisma: PrismaClient, dryRun: boolean) {
  await migrateProdMesure(prisma, dryRun);
  await migrateProdRapportChefEquipe(prisma, dryRun);
  await migrateProdRapportHeure(prisma, dryRun);
}

async function migrateProdMesure(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_mesure, id_saisie, id_unite FROM prod_mesure`);
  console.log(`prod_mesure: ${rows.length} rows`);
  if (dryRun) return;

  const validSaisieIds = new Set((await prisma.prodSaisie.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idSaisie = r.id_saisie == null ? null : toExistingIdOrNull(r.id_saisie, validSaisieIds);
    const idUnite = r.id_unite == null ? null : toExistingIdOrNull(r.id_unite, validUniteIds);

    if ((r.id_saisie != null && idSaisie == null) || (r.id_unite != null && idUnite == null)) {
      skipped++;
      console.warn(`  ⚠ skipping prod_mesure row ${r.id}: invalid id_saisie=${r.id_saisie} or id_unite=${r.id_unite}`);
      continue;
    }

    await prisma.prodMesure.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idMesure: r.id_mesure, idSaisie: idSaisie as number, idUnite: idUnite as number },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} prod_mesure row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "prod_mesure");
}

async function migrateProdRapportChefEquipe(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rapport, id_unite, id_chef_equipe FROM prod_rapport_chef_equipe`);
  console.log(`prod_rapport_chef_equipe: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validChefEquipeIds = new Set((await prisma.intervenant.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idRapport = r.id_rapport == null ? null : toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = r.id_unite == null ? null : toExistingIdOrNull(r.id_unite, validUniteIds);
    const idChefEquipe = r.id_chef_equipe == null ? null : toExistingIdOrNull(r.id_chef_equipe, validChefEquipeIds);

    if ((r.id_rapport != null && idRapport == null) || (r.id_unite != null && idUnite == null) || (r.id_chef_equipe != null && idChefEquipe == null)) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_chef_equipe row ${r.id}: invalid id_rapport=${r.id_rapport}, id_unite=${r.id_unite}, or id_chef_equipe=${r.id_chef_equipe}`);
      continue;
    }

    await prisma.prodRapportChefEquipe.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idRapport: idRapport as number, idUnite: idUnite as number, idChefEquipe: idChefEquipe as number },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} prod_rapport_chef_equipe row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "prod_rapport_chef_equipe");
}

async function migrateProdRapportHeure(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_rapport, id_unite, heure, id_produit FROM prod_rapport_heure`);
  console.log(`prod_rapport_heure: ${rows.length} rows`);
  if (dryRun) return;

  const validRapportIds = new Set((await prisma.prodRapportGeneral.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validUniteIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idRapport = r.id_rapport == null ? null : toExistingIdOrNull(r.id_rapport, validRapportIds);
    const idUnite = r.id_unite == null ? null : toExistingIdOrNull(r.id_unite, validUniteIds);

    if ((r.id_rapport != null && idRapport == null) || (r.id_unite != null && idUnite == null)) {
      skipped++;
      console.warn(`  ⚠ skipping prod_rapport_heure row ${r.id}: invalid id_rapport=${r.id_rapport} or id_unite=${r.id_unite}`);
      continue;
    }

    await prisma.prodRapportHeure.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idRapport: idRapport as number, idUnite: idUnite as number, heure: r.heure, idProduit: r.id_produit },
    });
  }

  if (skipped > 0) console.log(`  ⚠ ${skipped} prod_rapport_heure row(s) skipped because one or more parent IDs were missing or dangling.`);
  await resetSequence(prisma, "prod_rapport_heure");
}
