/**
 * Tier: procurement-quotes-invoicing — depends on core + master
 * (Fournisseur, Article, Utilisateur) + inventory-procurement (Reception,
 * needed by BonLivraison).
 *
 * `dop.statut`/`devis.statut`/`bon_livraison.statut` are all `int` in the
 * source with no confirmed code table found for any of the three (unlike
 * `Commande`/`DemandeAchat`, which have confirmed mappings — see tier 4).
 * Falls back to the same conservative "0 = En cours, anything else =
 * Clôturée" pattern already used for DemandeAchat's confirmed 0/10 codes,
 * explicitly flagged here as an *unconfirmed* guess for these three
 * specific tables, not a verified mapping.
 *
 * `bon_livraison.livraison_par` and `facture.createur` are both
 * Utilisateur ids needing the login lookup (same pattern as every other
 * `createur`-style field elsewhere in this migration).
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

/** Unconfirmed fallback — see file header. */
function guessStatutFromCode(code: unknown): string {
  return toNumOrNull(code) === 0 ? "En cours" : "Clôturée";
}

function ouiNonToBool(v: unknown): boolean {
  if (v == null) return false;
  return String(v).trim().toLowerCase() === "oui";
}

async function buildUserLoginLookup(prisma: PrismaClient): Promise<Map<number, string>> {
  const users = await prisma.utilisateur.findMany({ select: { id: true, login: true } });
  return new Map(users.map((u: { id: number; login: string }) => [u.id, u.login]));
}

export async function migrateProcurementQuotesInvoicing(prisma: PrismaClient, dryRun: boolean) {
  const loginById = dryRun ? new Map<number, string>() : await buildUserLoginLookup(prisma);

  await migrateDop(prisma, dryRun, loginById);
  await migrateDopArticle(prisma, dryRun);
  await migrateDopFournisseur(prisma, dryRun);
  await migrateDopFini(prisma, dryRun);
  await migrateDevis(prisma, dryRun, loginById);
  await migrateDevisArticle(prisma, dryRun);
  await migrateDevisFournisseur(prisma, dryRun);
  await migrateDevisFichier(prisma, dryRun);
  await migrateBonLivraison(prisma, dryRun, loginById);
  await migrateFacture(prisma, dryRun, loginById);
  await migrateFactureLivraison(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateDop(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`SELECT id, date_dop, heure_dop, createur, statut FROM dop`);
  console.log(`dop: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.dop.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        dateDop: toDate(r.date_dop) ?? new Date(),
        heureDop: toStrOrNull(r.heure_dop),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        statut: guessStatutFromCode(r.statut),
      },
    });
  }
  await resetSequence(prisma, "dop");
}

async function migrateDopArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_dop, id_article, qt FROM dop_article`);
  console.log(`dop_article: ${rows.length} rows`);
  if (dryRun) return;

  const validDopIds = new Set((await prisma.dop.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDop = toExistingIdOrNull(r.id_dop, validDopIds);
    const idArticle = toExistingIdOrNull(r.id_article, validArticleIds);
    if (idDop == null || idArticle == null) {
      skipped++;
      console.warn(`  ⚠ skipping dop_article row ${r.id}: invalid id_dop=${r.id_dop}, id_article=${r.id_article}`);
      continue;
    }

    await prisma.dopArticle.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idDop, idArticle, qt: toNumOrNull(r.qt) ?? 0 },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} dop_article row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "dop_article");
}

async function migrateDopFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_dop, id_fournisseur FROM dop_fournisseur`);
  console.log(`dop_fournisseur: ${rows.length} rows`);
  if (dryRun) return;

  const validDopIds = new Set((await prisma.dop.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDop = toExistingIdOrNull(r.id_dop, validDopIds);
    const idFournisseur = toExistingIdOrNull(r.id_fournisseur, validFournisseurIds);
    if (idDop == null || idFournisseur == null) {
      skipped++;
      console.warn(`  ⚠ skipping dop_fournisseur row ${r.id}: invalid id_dop=${r.id_dop}, id_fournisseur=${r.id_fournisseur}`);
      continue;
    }

    await prisma.dopFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idDop, idFournisseur },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} dop_fournisseur row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "dop_fournisseur");
}

async function migrateDopFini(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_dop, id_article, id_fournisseur, prix_ht, remise, qt_disponible, fini FROM dop_fini
  `);
  console.log(`dop_fini: ${rows.length} rows`);
  if (dryRun) return;

  const validDopIds = new Set((await prisma.dop.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDop = toExistingIdOrNull(r.id_dop, validDopIds);
    const idArticle = toExistingIdOrNull(r.id_article, validArticleIds);
    const idFournisseur = toExistingIdOrNull(r.id_fournisseur, validFournisseurIds);

    if (idDop == null || idArticle == null || idFournisseur == null) {
      skipped++;
      console.warn(
        `  ⚠ skipping dop_fini row ${r.id}: invalid id_dop=${r.id_dop}, id_article=${r.id_article}, id_fournisseur=${r.id_fournisseur}`
      );
      continue;
    }

    await prisma.dopFini.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idDop,
        idArticle,
        idFournisseur,
        prixHt: toNumOrNull(r.prix_ht) ?? 0,
        remise: toNumOrNull(r.remise) ?? 0,
        qtDisponible: toNumOrNull(r.qt_disponible),
        fini: toBool(r.fini),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} dop_fini row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "dop_fini");
}

async function migrateDevis(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_devis, heure_devis, createur, id_dop, statut, livr FROM devis
  `);
  console.log(`devis: ${rows.length} rows`);
  if (dryRun) return;

  const validDopIds = new Set((await prisma.dop.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDop = toExistingIdOrNull(r.id_dop, validDopIds);
    if (idDop == null) {
      skipped++;
      console.warn(`  ⚠ skipping devis row ${r.id}: invalid id_dop=${r.id_dop}`);
      continue;
    }

    await prisma.devis.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        dateDevis: toDate(r.date_devis) ?? new Date(),
        heureDevis: toStrOrNull(r.heure_devis),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        idDop,
        statut: guessStatutFromCode(r.statut),
        livr: ouiNonToBool(r.livr),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} devis row(s) skipped because id_dop was missing or dangling.`);
  }
  await resetSequence(prisma, "devis");
}

async function migrateDevisArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_devis, id_article, qt_disponible, prix_ht, remise FROM devis_article
  `);
  console.log(`devis_article: ${rows.length} rows`);
  if (dryRun) return;

  const validDevisIds = new Set((await prisma.devis.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDevis = toExistingIdOrNull(r.id_devis, validDevisIds);
    const idArticle = toExistingIdOrNull(r.id_article, validArticleIds);
    if (idDevis == null || idArticle == null) {
      skipped++;
      console.warn(`  ⚠ skipping devis_article row ${r.id}: invalid id_devis=${r.id_devis}, id_article=${r.id_article}`);
      continue;
    }

    await prisma.devisArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idDevis,
        idArticle,
        qtDisponible: toNumOrNull(r.qt_disponible) ?? 0,
        prixHt: toNumOrNull(r.prix_ht) ?? 0,
        remise: toNumOrNull(r.remise) ?? 0,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} devis_article row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "devis_article");
}

async function migrateDevisFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_devis, id_fournisseur FROM devis_fournisseur`);
  console.log(`devis_fournisseur: ${rows.length} rows`);
  if (dryRun) return;

  const validDevisIds = new Set((await prisma.devis.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDevis = toExistingIdOrNull(r.id_devis, validDevisIds);
    const idFournisseur = toExistingIdOrNull(r.id_fournisseur, validFournisseurIds);
    if (idDevis == null || idFournisseur == null) {
      skipped++;
      console.warn(`  ⚠ skipping devis_fournisseur row ${r.id}: invalid id_devis=${r.id_devis}, id_fournisseur=${r.id_fournisseur}`);
      continue;
    }

    await prisma.devisFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idDevis, idFournisseur },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} devis_fournisseur row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "devis_fournisseur");
}

async function migrateDevisFichier(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_devis, adresse FROM devis_fichier`);
  console.log(`devis_fichier: ${rows.length} rows`);
  if (dryRun) return;

  const validDevisIds = new Set((await prisma.devis.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDevis = toExistingIdOrNull(r.id_devis, validDevisIds);
    if (idDevis == null) {
      skipped++;
      console.warn(`  ⚠ skipping devis_fichier row ${r.id}: invalid id_devis=${r.id_devis}`);
      continue;
    }

    await prisma.devisFichier.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idDevis, adresse: r.adresse },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} devis_fichier row(s) skipped because id_devis was missing or dangling.`);
  }
  await resetSequence(prisma, "devis_fichier");
}

async function migrateBonLivraison(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_livraison, heure_livraison, livraison_par, id_reception, statut,
           date_reel, bl_fournisseur
    FROM bon_livraison
  `);
  console.log(`bon_livraison: ${rows.length} rows`);
  if (dryRun) return;

  const validReceptionIds = new Set((await prisma.reception.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idReception = toExistingIdOrNull(r.id_reception, validReceptionIds);
    if (idReception == null) {
      skipped++;
      console.warn(`  ⚠ skipping bon_livraison row ${r.id}: invalid id_reception=${r.id_reception}`);
      continue;
    }

    await prisma.bonLivraison.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        dateLivraison: toDate(r.date_livraison) ?? new Date(),
        heureLivraison: toStrOrNull(r.heure_livraison),
        livraisonPar:
          toNumOrNull(r.livraison_par) != null
            ? loginById.get(r.livraison_par) ?? `utilisateur#${r.livraison_par}`
            : null,
        idReception,
        statut: guessStatutFromCode(r.statut),
        dateReel: toDate(r.date_reel),
        blFournisseur: toStrOrNull(r.bl_fournisseur),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} bon_livraison row(s) skipped because id_reception was missing or dangling.`);
  }
  await resetSequence(prisma, "bon_livraison");
}

async function migrateFacture(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_facture, heure_facture, createur, id_fournisseur, tva, date_reel, n_facture
    FROM facture
  `);
  console.log(`facture: ${rows.length} rows`);
  if (dryRun) return;

  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idFournisseur = toExistingIdOrNull(r.id_fournisseur, validFournisseurIds);
    if (idFournisseur == null) {
      skipped++;
      console.warn(`  ⚠ skipping facture row ${r.id}: invalid id_fournisseur=${r.id_fournisseur}`);
      continue;
    }

    await prisma.facture.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        dateFacture: toDate(r.date_facture) ?? new Date(),
        heureFacture: toStrOrNull(r.heure_facture),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        idFournisseur,
        tva: toNumOrNull(r.tva) ?? 0,
        dateReel: toDate(r.date_reel),
        nFacture: toStrOrNull(r.n_facture),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} facture row(s) skipped because id_fournisseur was missing or dangling.`);
  }
  await resetSequence(prisma, "facture");
}

async function migrateFactureLivraison(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_facture, id_livraison FROM facture_livraison`);
  console.log(`facture_livraison: ${rows.length} rows`);
  if (dryRun) return;

  const validFactureIds = new Set((await prisma.facture.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validLivraisonIds = new Set((await prisma.bonLivraison.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idFacture = toExistingIdOrNull(r.id_facture, validFactureIds);
    const idLivraison = toExistingIdOrNull(r.id_livraison, validLivraisonIds);
    if (idFacture == null || idLivraison == null) {
      skipped++;
      console.warn(
        `  ⚠ skipping facture_livraison row ${r.id}: invalid id_facture=${r.id_facture}, id_livraison=${r.id_livraison}`
      );
      continue;
    }

    await prisma.factureLivraison.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idFacture, idLivraison },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} facture_livraison row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "facture_livraison");
}
