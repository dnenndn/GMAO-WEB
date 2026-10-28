/**
 * Tier: inventory & procurement — depends on core + master (Article,
 * Fournisseur, Utilisateur all already migrated).
 *
 * Several boolean-looking source columns are actually varchar("Oui"/"Non")
 * — confirmed pattern already seen with demande_intervention.arret_machine
 * in the maintenance tier, same handling applied here (bsm.bsm_maintenance,
 * bsm.validation).
 *
 * Status codes: Commande (0/1/5/10 -> En attente/En cours/Annulée/
 * Clôturée) and DemandeAchat (0/10 -> En cours/Clôturée) are both
 * confirmed mappings — see docs/04-procurement-module-spec.md §3, not
 * guessed here.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

const COMMANDE_STATUT_MAP: Record<number, string> = {
  0: "En attente",
  1: "En cours",
  5: "Annulée",
  10: "Clôturée",
};

const DA_STATUT_MAP: Record<number, string> = {
  0: "En cours",
  10: "Clôturée",
};

/** "Oui"/"Non" (case/whitespace-tolerant) -> boolean, same pattern as
 * demande_intervention.arret_machine in the maintenance tier. */
function ouiNonToBool(v: unknown): boolean {
  if (v == null) return false;
  return String(v).trim().toLowerCase() === "oui";
}

export async function migrateInventoryProcurement(prisma: PrismaClient, dryRun: boolean) {
  const loginById = dryRun ? new Map<number, string>() : await buildUserLoginLookup(prisma);

  await migrateDemandeAchat(prisma, dryRun, loginById);
  await migrateDaArticle(prisma, dryRun);
  await migrateCommande(prisma, dryRun, loginById);
  await migrateCommandeArticle(prisma, dryRun);
  await migrateReception(prisma, dryRun, loginById);
  await migrateReceptionArticle(prisma, dryRun);
  await migrateBsm(prisma, dryRun, loginById);
  await migrateBsmArticle(prisma, dryRun);
  await migrateBrm(prisma, dryRun, loginById);
  await migrateBrmArticle(prisma, dryRun);
}

async function buildUserLoginLookup(prisma: PrismaClient): Promise<Map<number, string>> {
  const users = await prisma.utilisateur.findMany({ select: { id: true, login: true } });
  return new Map(users.map((u: { id: number; login: string }) => [u.id, u.login]));
}

// ----------------------------------------------------------------------------

async function migrateDemandeAchat(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_da, heure_da, delai, periode, createur, demandeur, statut, vue
    FROM demande_achat
  `);
  console.log(`demande_achat: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.demandeAchat.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        dateDa: toDate(r.date_da) ?? new Date(),
        heureDa: toStrOrNull(r.heure_da),
        delai: toNumOrNull(r.delai),
        periode: toStrOrNull(r.periode),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        // `demandeur` (requester) is also a Utilisateur id in the source,
        // same as createur — resolve the same way, falling back to the
        // raw id as a string (rather than null) since this field names a
        // specific person and an empty value would lose information a
        // plain "unknown user #N" string wouldn't.
        demandeur:
          toNumOrNull(r.demandeur) != null
            ? loginById.get(r.demandeur) ?? `utilisateur#${r.demandeur}`
            : null,
        statut: r.statut != null && DA_STATUT_MAP[Number(r.statut)] ? DA_STATUT_MAP[Number(r.statut)] : "En cours",
        vue: toBool(r.vue),
      },
    });
  }
  await resetSequence(prisma, "demande_achat");
}

async function migrateDaArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_da, id_article, qt, motif, qt_restant FROM da_article`);
  console.log(`da_article: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.daArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idDa: r.id_da,
        idArticle: r.id_article,
        qt: toNumOrNull(r.qt) ?? 0,
        motif: toStrOrNull(r.motif),
        // Target qtRestant is NOT NULL, but the source column is
        // nullable — falls back to the original qt (i.e. "nothing
        // ordered against this line yet, full amount still remaining")
        // rather than 0, matching the field's evident purpose.
        qtRestant: toNumOrNull(r.qt_restant) ?? toNumOrNull(r.qt) ?? 0,
      },
    });
  }
  await resetSequence(prisma, "da_article");
}

async function migrateCommande(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_commande, heure_commande, createur, id_fournisseur, statut,
           personne_contacter, date_signature, urgence, fodec, n_commande
    FROM commande
  `);
  console.log(`commande: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.commande.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        // Source is a plain int (a running number); this app's own
        // create-flow formats new orders as "PO-YYYY-NNNN" for display,
        // but that's a UX convenience, not a confirmed source format —
        // migrated rows keep the real legacy number as-is rather than
        // fabricating a formatted string for historical data.
        nCommande: r.n_commande != null ? String(r.n_commande) : null,
        dateCommande: toDate(r.date_commande) ?? new Date(),
        heureCommande: toStrOrNull(r.heure_commande),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        idFournisseur: toNumOrNull(r.id_fournisseur),
        statut:
          r.statut != null && COMMANDE_STATUT_MAP[Number(r.statut)]
            ? COMMANDE_STATUT_MAP[Number(r.statut)]
            : "En attente",
        personneContacter: toStrOrNull(r.personne_contacter),
        dateSignature: toDate(r.date_signature),
        urgence: toStrOrNull(r.urgence),
        fodec: toBool(r.fodec),
      },
    });
  }
  await resetSequence(prisma, "commande");
}

async function migrateCommandeArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_commande, id_da_article, qt_commande, prix_ht, remise FROM commande_article
  `);
  console.log(`commande_article: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.commandeArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idCommande: r.id_commande,
        idDaArticle: r.id_da_article,
        qtCommande: toNumOrNull(r.qt_commande) ?? 0,
        prixHt: toNumOrNull(r.prix_ht),
        remise: toNumOrNull(r.remise),
      },
    });
  }
  await resetSequence(prisma, "commande_article");
}

async function migrateReception(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_reception, heure_reception, reception_par, commentaire, statut, date_reel
    FROM reception
  `);
  console.log(`reception: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.reception.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        dateReception: toDate(r.date_reception) ?? new Date(),
        heureReception: toStrOrNull(r.heure_reception),
        // Source is a Utilisateur id (int) like createur elsewhere;
        // falls back to a labeled placeholder rather than null for the
        // same "don't lose which person" reasoning as demandeur above.
        receptionPar:
          toNumOrNull(r.reception_par) != null
            ? loginById.get(r.reception_par) ?? `utilisateur#${r.reception_par}`
            : null,
        commentaire: toStrOrNull(r.commentaire),
        // Source `statut` is int with no confirmed code mapping found
        // for this specific table (unlike Commande/DemandeAchat above) —
        // carried over as the raw string form of the number rather than
        // guessing a label, flagged here rather than silently invented.
        statut: r.statut != null ? String(r.statut) : null,
        dateReel: toDate(r.date_reel),
      },
    });
  }
  await resetSequence(prisma, "reception");
}

async function migrateReceptionArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_reception, id_commande, id_article, qt_recu, etat, qt_bon_etat,
           qt_mauvais_etat, id_da
    FROM reception_article
  `);
  console.log(`reception_article: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.receptionArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idReception: r.id_reception,
        idCommande: toNumOrNull(r.id_commande),
        idArticle: r.id_article,
        qtRecu: toNumOrNull(r.qt_recu) ?? 0,
        // Source `etat` is numeric (`real`) but the target models it as a
        // free string — no confirmed meaning/mapping found for this
        // field's values, so carried over as its string form rather than
        // guessing a label.
        etat: r.etat != null ? String(r.etat) : null,
        qtBonEtat: toNumOrNull(r.qt_bon_etat),
        qtMauvaisEtat: toNumOrNull(r.qt_mauvais_etat),
        idDa: toNumOrNull(r.id_da),
      },
    });
  }
  await resetSequence(prisma, "reception_article");
}

async function migrateBsm(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, type_stock, bsm_maintenance, id_receptionniste, n_ot, createur,
           date_bsm, heure_bsm, validation, li_ot
    FROM bsm
  `);
  console.log(`bsm: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.bsm.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        typeStock: toStrOrNull(r.type_stock),
        bsmMaintenance: ouiNonToBool(r.bsm_maintenance),
        idReceptionniste: toNumOrNull(r.id_receptionniste),
        nOt: toStrOrNull(r.n_ot),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        dateBsm: toDate(r.date_bsm) ?? new Date(),
        heureBsm: toStrOrNull(r.heure_bsm),
        validation: ouiNonToBool(r.validation),
        liOt: toStrOrNull(r.li_ot),
      },
    });
  }
  await resetSequence(prisma, "bsm");
}

async function migrateBsmArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_bsm, id_article, quantite, prix_ht FROM bsm_article`);
  console.log(`bsm_article: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.bsmArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idBsm: r.id_bsm,
        idArticle: r.id_article,
        quantite: toNumOrNull(r.quantite) ?? 0,
        prixHt: toNumOrNull(r.prix_ht),
      },
    });
  }
  await resetSequence(prisma, "bsm_article");
}

async function migrateBrm(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, type_retour, type_stock, retour_par, date_retour, heure_retour, n_bsm
    FROM brm
  `);
  console.log(`brm: ${rows.length} rows`);
  if (dryRun) return;

  // BRM.idBsm is the only relation represented by a numeric source value in
  // this migration. The source calls it `n_bsm`, while the target field is
  // `idBsm` (mapped to id_bsm_ref). Legacy databases commonly use 0 for
  // "no BSM", so 0 must become NULL. More importantly, n_bsm can point to a
  // BSM that was not migrated; passing that value to Prisma causes P2003.
  //
  // Load the migrated BSM ids once rather than issuing one query per BRM.
  const bsmRows = await prisma.bsm.findMany({ select: { id: true } });
  const migratedBsmIds = new Set(bsmRows.map((b: { id: number }) => b.id));

  let nulledBsm = 0;
  const invalidExamples: Array<{ brmId: unknown; nBsm: number }> = [];

  console.log(`  FK validation for brm:`);

  for (const r of rows as any[]) {
    const sourceBsm = toNumOrNull(r.n_bsm);
    let idBsm: number | null = sourceBsm;

    if (sourceBsm === 0) {
      idBsm = null;
      nulledBsm++;
      if (invalidExamples.length < 10) {
        invalidExamples.push({ brmId: r.id, nBsm: sourceBsm });
      }
    } else if (sourceBsm != null && !migratedBsmIds.has(sourceBsm)) {
      idBsm = null;
      nulledBsm++;
      if (invalidExamples.length < 10) {
        invalidExamples.push({ brmId: r.id, nBsm: sourceBsm });
      }
    }

    const retourParId = toNumOrNull(r.retour_par);
    const retourPar =
      retourParId != null
        ? loginById.get(retourParId) ?? `utilisateur#${retourParId}`
        : null;

    const createData = {
      id: r.id,
      typeRetour: r.type_retour != null ? String(r.type_retour) : null,
      typeStock: toStrOrNull(r.type_stock),
      retourPar,
      dateRetour: toDate(r.date_retour) ?? new Date(),
      heureRetour: toStrOrNull(r.heure_retour),
      idBsm,
    };

    try {
      await prisma.brm.upsert({
        where: { id: r.id },
        update: {},
        create: createData,
      });
    } catch (err: any) {
      // Keep the migration diagnosable if the target schema contains an FK
      // that is not represented by the current Prisma model assumptions.
      if (err?.code === "P2003") {
        console.error(`  ✗ BRM ${r.id}: foreign-key violation`);
        console.error(`    source n_bsm=${r.n_bsm}, resolved idBsm=${idBsm}`);
        console.error(`    create payload: ${JSON.stringify(createData)}`);
      }
      throw err;
    }
  }

  if (nulledBsm > 0) {
    console.log(`  ⚠ brm: ${nulledBsm} dangling/empty n_bsm reference(s) were nulled.`);
    for (const ex of invalidExamples) {
      console.log(`    - BRM ${ex.brmId}: n_bsm=${ex.nBsm} → NULL`);
    }
    if (nulledBsm > invalidExamples.length) {
      console.log(`    ... ${nulledBsm - invalidExamples.length} more`);
    }
  } else {
    console.log(`  ✓ idBsm → bsm.id: all references valid`);
  }

  await resetSequence(prisma, "brm");
}

async function migrateBrmArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_brm, id_article, quantite FROM brm_article`);
  console.log(`brm_article: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.brmArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idBrm: r.id_brm,
        idArticle: r.id_article,
        quantite: toNumOrNull(r.quantite) ?? 0,
      },
    });
  }
  await resetSequence(prisma, "brm_article");
}
