/**
 * Tier: schema-ready-gap-closure — closes 19 tables that already had
 * correct Prisma models (built in earlier, separate app-development
 * work) but had never been migrated in any tier. Found by re-running the
 * diff process tier 11 established (every `FROM table` and dynamic
 * `table:` reference across all prior migration modules, diffed against
 * the real 215-table list) and cross-referencing the remaining gap
 * against `schema.prisma`'s actual `@@map()` targets — 19 of the 61
 * tables still missing already had a model waiting for them.
 *
 * Spans several otherwise-unrelated features because "already modeled,
 * not yet migrated" cuts across every module, not because these tables
 * are conceptually one tier — kept together here rather than split into
 * several near-empty single-table files.
 *
 * Two real schema gaps found and flagged (not silently dropped) rather
 * than fixed by guessing where the data should go:
 * - `ot_bl.id_t` has no corresponding field on the target `OtBl` model.
 * - `tab_lancement_affectation.motif` has no corresponding field on the
 *   target `TabLancementAffectation` model.
 * Both are genuine modeling gaps for a future schema pass, not migration
 * bugs — the columns exist and have real data, but nowhere to land.
 *
 * `outils.prix_achat` is `varchar(50)` despite being conceptually
 * numeric (same category of issue as tier 5's atelier_donnees/
 * atelier_piece) — reuses the same lenient-parse approach rather than a
 * direct cast.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, toBufferOrNull, resetSequence } from "../db";

function parseLenientNumber(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

async function buildUserLoginLookup(prisma: PrismaClient): Promise<Map<number, string>> {
  const users = await prisma.utilisateur.findMany({ select: { id: true, login: true } });
  return new Map(users.map((u: { id: number; login: string }) => [u.id, u.login]));
}

export async function migrateSchemaReadyGapClosure(prisma: PrismaClient, dryRun: boolean) {
  const loginById = dryRun ? new Map<number, string>() : await buildUserLoginLookup(prisma);

  await migrateParametreIntervention(prisma, dryRun);
  await migrateTableauArticleSousFamille(prisma, dryRun);
  await migrateTableauArticleFichier(prisma, dryRun);
  await migrateAtelierFichier(prisma, dryRun);
  await migrateBsmEquipement(prisma, dryRun);
  await migrateReceptionCommande(prisma, dryRun);
  await migrateCommandeModificationBase(prisma, dryRun, loginById);
  await migrateCommandeModifierArticle(prisma, dryRun);
  await migrateModificationArticle(prisma, dryRun);
  await migrateDsHistoriqueMvt(prisma, dryRun);
  await migrateProdCoefficientGaz(prisma, dryRun);
  await migrateProdFourConsommationElectrique(prisma, dryRun);
  await migrateOtCentreCharge(prisma, dryRun);
  await migrateOtOrdoIntervenant(prisma, dryRun);
  await migrateOtOrdoIntervention(prisma, dryRun);
  await migrateOtProjet(prisma, dryRun);
  await migrateOtBl(prisma, dryRun);
  await migrateOutil(prisma, dryRun);
  await migrateTabLancementAffectation(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateParametreIntervention(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, intervention, deleted, typpe FROM parametre_intervention`);
  console.log(`parametre_intervention: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.parametreIntervention.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        code: toStrOrNull(r.code),
        intervention: r.intervention,
        deleted: toBool(r.deleted),
        typpe: r.typpe != null ? String(r.typpe) : null,
      },
    });
  }
  await resetSequence(prisma, "parametre_intervention");
}

async function migrateTableauArticleSousFamille(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, id_sous_famille FROM tableau_article_sous_famille`);
  console.log(`tableau_article_sous_famille: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.tableauArticleSousFamille.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: r.id_article, idSousFamille: r.id_sous_famille },
    });
  }
  await resetSequence(prisma, "tableau_article_sous_famille");
}

async function migrateTableauArticleFichier(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_article, adresse FROM tableau_article_fichier`);
  console.log(`tableau_article_fichier: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.articleFichier.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idArticle: r.id_article, adresse: toStrOrNull(r.adresse) },
    });
  }
  await resetSequence(prisma, "tableau_article_fichier");
}

async function migrateAtelierFichier(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_atelier, adresse FROM atelier_fichier`);
  console.log(`atelier_fichier: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.atelierFichierAttachment.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idAtelier: r.id_atelier, adresse: toStrOrNull(r.adresse) },
    });
  }
  await resetSequence(prisma, "atelier_fichier");
}

async function migrateBsmEquipement(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_bsm, id_equipement FROM bsm_equipement`);
  console.log(`bsm_equipement: ${rows.length} rows`);
  if (dryRun) return;

  const validBsmIds = new Set((await prisma.bsm.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idBsm = toExistingIdOrNull(r.id_bsm, validBsmIds);
    const idEquipement = toExistingIdOrNull(r.id_equipement, validEquipementIds);

    if (idBsm == null || idEquipement == null) {
      skipped++;
      console.warn(`  ⚠ skipping bsm_equipement row ${r.id}: invalid id_bsm=${r.id_bsm} or id_equipement=${r.id_equipement}`);
      continue;
    }

    await prisma.bsmEquipement.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idBsm, idEquipement },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} bsm_equipement row(s) skipped because one or more parent IDs were missing or dangling.`);
  }
  await resetSequence(prisma, "bsm_equipement");
}

async function migrateReceptionCommande(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_reception, id_commande FROM reception_commande`);
  console.log(`reception_commande: ${rows.length} rows`);
  if (dryRun) return;

  const validReceptionIds = new Set((await prisma.reception.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCommandeIds = new Set((await prisma.commande.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idReception = toExistingIdOrNull(r.id_reception, validReceptionIds);
    const idCommande = toExistingIdOrNull(r.id_commande, validCommandeIds);

    if (idReception == null || idCommande == null) {
      skipped++;
      console.warn(`  ⚠ skipping reception_commande row ${r.id}: invalid id_reception=${r.id_reception} or id_commande=${r.id_commande}`);
      continue;
    }

    await prisma.receptionCommande.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idReception, idCommande },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} reception_commande row(s) skipped because one or more parent IDs were missing or dangling.`);
  }
  await resetSequence(prisma, "reception_commande");
}

async function migrateCommandeModificationBase(
  prisma: PrismaClient,
  dryRun: boolean,
  loginById: Map<number, string>
) {
  const rows = await queryAll(`
    SELECT id, id_commande, modifier_par, date_modification, heure_modification
    FROM commande_modification_base
  `);
  console.log(`commande_modification_base: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.commandeModificationBase.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idCommande: r.id_commande,
        modifierPar: toNumOrNull(r.modifier_par) != null ? loginById.get(r.modifier_par) ?? null : null,
        dateModification: toDate(r.date_modification) ?? new Date(),
        heureModification: toStrOrNull(r.heure_modification),
      },
    });
  }
  await resetSequence(prisma, "commande_modification_base");
}

async function migrateCommandeModifierArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_modification, id_article, qt, prix_ht, remise FROM commande_modifier_article
  `);
  console.log(`commande_modifier_article: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.commandeModifierArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idModification: r.id_modification,
        idArticle: r.id_article,
        qt: toNumOrNull(r.qt) ?? 0,
        prixHt: toNumOrNull(r.prix_ht) ?? 0,
        remise: toNumOrNull(r.remise) ?? 0,
      },
    });
  }
  await resetSequence(prisma, "commande_modifier_article");
}

async function migrateModificationArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_article, tva, prix_ht, stock_neuf, stock_use, stock_rebute, date_modification
    FROM modification_article
  `);
  console.log(`modification_article: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.modificationArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idArticle: r.id_article,
        tva: toNumOrNull(r.tva),
        prixHt: toNumOrNull(r.prix_ht),
        stockNeuf: toNumOrNull(r.stock_neuf),
        stockUse: toNumOrNull(r.stock_use),
        stockRebute: toNumOrNull(r.stock_rebute),
        dateModification: toDate(r.date_modification) ?? new Date(),
      },
    });
  }
  await resetSequence(prisma, "modification_article");
}

async function migrateDsHistoriqueMvt(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_t, id_mvt, date_mvt, heure_mvt, mvt FROM ds_historique_mvt`);
  console.log(`ds_historique_mvt: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.dsHistoriqueMvt.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idT: toNumOrNull(r.id_t),
        idMvt: toNumOrNull(r.id_mvt),
        dateMvt: toDate(r.date_mvt) ?? new Date(),
        heureMvt: toStrOrNull(r.heure_mvt),
        mvt: r.mvt,
      },
    });
  }
  await resetSequence(prisma, "ds_historique_mvt");
}

async function migrateProdCoefficientGaz(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, coefficient, date FROM prod_coefficient_gaz`);
  console.log(`prod_coefficient_gaz: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.prodCoefficientGaz.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, coefficient: toNumOrNull(r.coefficient), date: toDate(r.date) },
    });
  }
  await resetSequence(prisma, "prod_coefficient_gaz");
}

async function migrateProdFourConsommationElectrique(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, date, cons_matin, cons_pointe, cons_nuit, cons_soir, id_unite
    FROM prod_four_consommation_electrique
  `);
  console.log(`prod_four_consommation_electrique: ${rows.length} rows`);
  if (dryRun) return;

  const validUniteIds = new Set((await prisma.parametreUniteArticle.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idUnite = toExistingIdOrNull(r.id_unite, validUniteIds);
    if (idUnite == null) {
      skipped++;
      console.warn(`  ⚠ skipping prod_four_consommation_electrique row ${r.id}: invalid id_unite=${r.id_unite}`);
      continue;
    }

    await prisma.prodFourConsommationElectrique.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        date: toDate(r.date),
        consMatin: toNumOrNull(r.cons_matin),
        consPointe: toNumOrNull(r.cons_pointe),
        consNuit: toNumOrNull(r.cons_nuit),
        consSoir: toNumOrNull(r.cons_soir),
        idUnite,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} prod_four_consommation_electrique row(s) skipped because id_unite was missing or dangling.`);
  }
  await resetSequence(prisma, "prod_four_consommation_electrique");
}

async function migrateOtCentreCharge(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_ot, id_centre_charge FROM ot_centre_charge`);
  console.log(`ot_centre_charge: ${rows.length} rows`);
  if (dryRun) return;

  const validOtIds = new Set((await prisma.ordreTravail.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCentreChargeIds = new Set((await prisma.parametreCentreCharge.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idOt = toExistingIdOrNull(r.id_ot, validOtIds);
    const idCentreCharge = r.id_centre_charge == null ? null : toExistingIdOrNull(r.id_centre_charge, validCentreChargeIds);

    if (idOt == null || (r.id_centre_charge != null && idCentreCharge == null)) {
      skipped++;
      console.warn(`  ⚠ skipping ot_centre_charge row ${r.id}: invalid id_ot=${r.id_ot} or id_centre_charge=${r.id_centre_charge}`);
      continue;
    }

    await prisma.otCentreCharge.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idOt, idCentreCharge: idCentreCharge ?? null },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ot_centre_charge row(s) skipped because one or more parent IDs were missing or dangling.`);
  }
  await resetSequence(prisma, "ot_centre_charge");
}

async function migrateOtOrdoIntervenant(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_ressource_fonction, id_intervenant, debut, fin, cout_horaire FROM ot_ordo_intervenant
  `);
  console.log(`ot_ordo_intervenant: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otOrdoIntervenant.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRessourceFonction: r.id_ressource_fonction,
        idIntervenant: r.id_intervenant,
        debut: toDate(r.debut) ?? new Date(),
        fin: toDate(r.fin) ?? new Date(),
        coutHoraire: toNumOrNull(r.cout_horaire),
      },
    });
  }
  await resetSequence(prisma, "ot_ordo_intervenant");
}

async function migrateOtOrdoIntervention(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_ressource_fonction, id_operation, type_operation FROM ot_ordo_intervention
  `);
  console.log(`ot_ordo_intervention: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otOrdoIntervention.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idRessourceFonction: r.id_ressource_fonction,
        idOperation: r.id_operation,
        typeOperation: r.type_operation,
      },
    });
  }
  await resetSequence(prisma, "ot_ordo_intervention");
}

async function migrateOtProjet(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_ot, cout FROM ot_projet`);
  console.log(`ot_projet: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otProjet.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idOt: r.id_ot, cout: toNumOrNull(r.cout) ?? 0 },
    });
  }
  await resetSequence(prisma, "ot_projet");
}

async function migrateOtBl(prisma: PrismaClient, dryRun: boolean) {
  // Source also has `id_t`, with no corresponding target field — see
  // file header. Not selected here since there's nowhere to put it.
  const rows = await queryAll(`SELECT id, id_liv_article, id_ot FROM ot_bl`);
  console.log(`ot_bl: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.otBl.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idOt: r.id_ot, idLivArticle: r.id_liv_article },
    });
  }
  await resetSequence(prisma, "ot_bl");
}

async function migrateOutil(prisma: PrismaClient, dryRun: boolean) {
  // Source also has a `fichiers` column, with no corresponding target
  // field on Outil (only a related TabLancementAffectation history
  // exists) — not selected, nowhere to put it. `statut` is `int` in the
  // source but the target models it as a plain Boolean
  // (true=disponible) — treated as the standard 0/1 pattern via toBool.
  const rows = await queryAll(`
    SELECT id, code_outils, designation, fk_secteur_id, num_serie, num_modele, fabriquant,
           date_achat, fin_garantie, mise_service, prix_achat, photo, remarque, FK_type_id,
           etat_outil, statut
    FROM outils
  `);
  console.log(`outils: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.outil.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeOutils: toStrOrNull(r.code_outils),
        designation: toStrOrNull(r.designation) ?? "—",
        fkSecteurId: toNumOrNull(r.fk_secteur_id),
        numSerie: toStrOrNull(r.num_serie),
        numModele: toStrOrNull(r.num_modele),
        fabriquant: toStrOrNull(r.fabriquant),
        dateAchat: toDate(r.date_achat),
        finGarantie: toDate(r.fin_garantie),
        miseService: toDate(r.mise_service),
        // Source is varchar despite being conceptually numeric — see
        // file header, same category as tier 5's atelier_* columns.
        prixAchat: parseLenientNumber(r.prix_achat),
        photo: toBufferOrNull(r.photo),
        remarque: toStrOrNull(r.remarque),
        fkTypeId: toNumOrNull(r.FK_type_id),
        etatOutil: toStrOrNull(r.etat_outil),
        statut: r.statut != null ? toBool(r.statut) : true,
      },
    });
  }
  await resetSequence(prisma, "outils");
}

async function migrateTabLancementAffectation(prisma: PrismaClient, dryRun: boolean) {
  // Source also has a `motif` column, with no corresponding target
  // field — see file header. Not selected, nowhere to put it.
  const rows = await queryAll(`
    SELECT id, id_intervenant, outil, date_debut, heure_debut, date_fin, heure_fin,
           commentaire, encours, n_ot
    FROM tab_lancement_affectation
  `);
  console.log(`tab_lancement_affectation: ${rows.length} rows`);
  if (dryRun) return;

  const validIntervenantIds = new Set((await prisma.intervenant.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validOutilIds = new Set((await prisma.outil.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idIntervenant = r.id_intervenant == null ? null : toExistingIdOrNull(r.id_intervenant, validIntervenantIds);
    const idOutil = r.outil == null ? null : toExistingIdOrNull(r.outil, validOutilIds);

    if ((r.id_intervenant != null && idIntervenant == null) || (r.outil != null && idOutil == null)) {
      skipped++;
      console.warn(`  ⚠ skipping tab_lancement_affectation row ${r.id}: invalid id_intervenant=${r.id_intervenant} or outil=${r.outil}`);
      continue;
    }

    await prisma.tabLancementAffectation.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idIntervenant: idIntervenant,
        idOutil: idOutil,
        dateDebut: toDate(r.date_debut),
        heureDebut: toStrOrNull(r.heure_debut),
        dateFin: toDate(r.date_fin),
        heureFin: toStrOrNull(r.heure_fin),
        commentaire: toStrOrNull(r.commentaire),
        encours: toBool(r.encours),
        nOt: toStrOrNull(r.n_ot),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} tab_lancement_affectation row(s) skipped because one or more parent IDs were missing or dangling.`);
  }
  await resetSequence(prisma, "tab_lancement_affectation");
}
