/**
 * Tier: subcontracting — depends on core + master (Article, Fournisseur,
 * Utilisateur, Equipement).
 *
 * Real discrepancy found while writing this: the target model
 * `DsBonLivraison.idCommande` has a real `@relation` to `DsCommande`, but
 * the actual source `ds_bon_livraison` table has NO `id_commande` column
 * at all (confirmed against the schema export, not assumed from the
 * Prisma field's existence). The only real link from a delivery note
 * back to its order is indirect, through
 * `DsLivraisonArticle.idDsCommandeArticle -> DsCommandeArticle.idCommande`.
 * Rather than fabricate a value or reverse-engineer one from the not-yet-
 * migrated line items, `idCommande` is left `null` here — flagged in the
 * code, not silently guessed.
 *
 * `signature.designation` is a PIN hash, same security posture as
 * `utilisateur.mot_passe` (tier 1) — never carried over from the source
 * (likely a different/weaker hash from the legacy app, and this schema's
 * own login/PIN-check code expects a specific bcrypt hash it produced
 * itself). Every migrated user with a source Signature row gets a fresh
 * random PIN instead, reported the same way temporary passwords are —
 * see `migrateSignature` below.
 *
 * `ds_commande.statut` has no independently confirmed code table, but
 * given `ds_commande` is structurally a near-exact mirror of the regular
 * `Commande` table (same columns, same evident workflow), this reuses
 * `Commande`'s confirmed 0/1/5/10 mapping — an assumption of consistency
 * between the two parallel tables, not an independently verified fact
 * for `ds_commande` specifically.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, resetSequence } from "../db";
import bcrypt from "bcryptjs";

const COMMANDE_STATUT_MAP: Record<number, string> = {
  0: "En attente",
  1: "En cours",
  5: "Annulée",
  10: "Clôturée",
};

function ouiNonToBool(v: unknown): boolean {
  if (v == null) return false;
  return String(v).trim().toLowerCase() === "oui";
}

function toExistingIdOrNull(value: unknown, validIds: Set<number>): number | null {
  const n = toNumOrNull(value);
  return n != null && validIds.has(n) ? n : null;
}

export async function migrateSubcontracting(prisma: PrismaClient, dryRun: boolean) {
  const loginById = dryRun ? new Map<number, string>() : await buildUserLoginLookup(prisma);

  await migrateDemandeSousTraitance(prisma, dryRun, loginById);
  await migrateActiviteSousTraitance(prisma, dryRun);
  await migrateDsDevis(prisma, dryRun, loginById);
  await migrateDsDevisFournisseur(prisma, dryRun);
  await migrateDsDevisArticle(prisma, dryRun);
  await migrateDsDevisFichier(prisma, dryRun);
  await migrateDsCommande(prisma, dryRun, loginById);
  await migrateDsCommandeArticle(prisma, dryRun);
  await migrateDsBonLivraison(prisma, dryRun, loginById);
  await migrateDsLivraisonArticle(prisma, dryRun);
  await migrateDsFacture(prisma, dryRun, loginById);
  await migrateDsFactureLivraison(prisma, dryRun);
  await migrateDsMp(prisma, dryRun);
  await migrateDsNvArticle(prisma, dryRun);
  await migrateMagasinSousTraitance(prisma, dryRun);
  await migrateSignature(prisma, dryRun);
}

async function buildUserLoginLookup(prisma: PrismaClient): Promise<Map<number, string>> {
  const users = await prisma.utilisateur.findMany({ select: { id: true, login: true } });
  return new Map(users.map((u: { id: number; login: string }) => [u.id, u.login]));
}

// ----------------------------------------------------------------------------

async function migrateDemandeSousTraitance(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`SELECT id, date_creation, heure_creation, createur, statut FROM demande_sous_traitance`);
  console.log(`demande_sous_traitance: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.demandeSousTraitance.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        dateCreation: toDate(r.date_creation) ?? new Date(),
        heureCreation: toStrOrNull(r.heure_creation),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        statut: toNumOrNull(r.statut),
      },
    });
  }
  await resetSequence(prisma, "demande_sous_traitance");
}

async function migrateActiviteSousTraitance(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, code, designation, type_st, type_article, deleted FROM activite`);
  console.log(`activite: ${rows.length} rows`);
  if (dryRun) return;
  for (const r of rows as any[]) {
    await prisma.activiteSousTraitance.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        code: toStrOrNull(r.code),
        designation: r.designation,
        typeSt: toBool(r.type_st),
        // Source is `int`; target models the confirmed string form.
        typeArticle: r.type_article != null ? String(r.type_article) : null,
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "activite");
}

async function migrateDsDevis(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`SELECT id, date_devis, heure_devis, createur, id_ds, statut, livr FROM ds_devis`);
  console.log(`ds_devis: ${rows.length} rows`);
  if (dryRun) return;

  const validDsIds = new Set((await prisma.demandeSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDs = toExistingIdOrNull(r.id_ds, validDsIds);
    if (idDs == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_devis row ${r.id}: invalid id_ds=${r.id_ds}`);
      continue;
    }

    await prisma.dsDevis.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        dateDevis: toDate(r.date_devis) ?? new Date(),
        heureDevis: toStrOrNull(r.heure_devis),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        idDs,
        statut: r.statut != null ? String(r.statut) : "En cours",
        livr: ouiNonToBool(r.livr),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_devis row(s) skipped because id_ds was missing or dangling.`);
  }
  await resetSequence(prisma, "ds_devis");
}

async function migrateDsDevisFournisseur(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_devis, id_fournisseur FROM ds_devis_fournisseur`);
  console.log(`ds_devis_fournisseur: ${rows.length} rows`);
  if (dryRun) return;

  const validDevisIds = new Set((await prisma.dsDevis.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDevis = toExistingIdOrNull(r.id_devis, validDevisIds);
    const idFournisseur = toExistingIdOrNull(r.id_fournisseur, validFournisseurIds);
    if (idDevis == null || idFournisseur == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_devis_fournisseur row ${r.id}: invalid id_devis=${r.id_devis}, id_fournisseur=${r.id_fournisseur}`);
      continue;
    }

    await prisma.dsDevisFournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idDevis, idFournisseur },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_devis_fournisseur row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_devis_fournisseur");
}

async function migrateDsDevisArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_devis, id_t, qt, id_activite, prix_ht, remise, source FROM ds_devis_article
  `);
  console.log(`ds_devis_article: ${rows.length} rows`);
  if (dryRun) return;

  const validDevisIds = new Set((await prisma.dsDevis.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validActiviteIds = new Set((await prisma.activiteSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDevis = toExistingIdOrNull(r.id_devis, validDevisIds);
    const idActivite = toNumOrNull(r.id_activite) != null ? toExistingIdOrNull(r.id_activite, validActiviteIds) : null;
    if (idDevis == null || (r.id_activite != null && idActivite == null)) {
      skipped++;
      console.warn(`  ⚠ skipping ds_devis_article row ${r.id}: invalid id_devis=${r.id_devis}, id_activite=${r.id_activite}`);
      continue;
    }

    await prisma.dsDevisArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idDevis,
        // idT is polymorphic (Article vs DsNvArticle, discriminated by
        // `source`) — kept as the raw id, not resolved here, matching
        // how the target schema itself models it (no @relation on idT).
        idT: toNumOrNull(r.id_t),
        qt: toNumOrNull(r.qt) ?? 0,
        idActivite: idActivite,
        prixHt: toNumOrNull(r.prix_ht),
        remise: toNumOrNull(r.remise),
        source: toStrOrNull(r.source),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_devis_article row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_devis_article");
}

async function migrateDsDevisFichier(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_devis, adresse FROM ds_devis_fichier`);
  console.log(`ds_devis_fichier: ${rows.length} rows`);
  if (dryRun) return;

  const validDevisIds = new Set((await prisma.dsDevis.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDevis = toExistingIdOrNull(r.id_devis, validDevisIds);
    if (idDevis == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_devis_fichier row ${r.id}: invalid id_devis=${r.id_devis}`);
      continue;
    }

    await prisma.dsDevisFichier.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idDevis, adresse: toStrOrNull(r.adresse) },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_devis_fichier row(s) skipped because id_devis was missing or dangling.`);
  }
  await resetSequence(prisma, "ds_devis_fichier");
}

async function migrateDsCommande(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_commande, heure_commande, createur, id_fournisseur, statut,
           personne_contacter, date_signature, id_ds, urgence, fodec, n_commande
    FROM ds_commande
  `);
  console.log(`ds_commande: ${rows.length} rows`);
  if (dryRun) return;

  const validDsIds = new Set((await prisma.demandeSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDs = toExistingIdOrNull(r.id_ds, validDsIds);
    const idFournisseur = toNumOrNull(r.id_fournisseur) != null ? toExistingIdOrNull(r.id_fournisseur, validFournisseurIds) : null;
    if (idDs == null || (r.id_fournisseur != null && idFournisseur == null)) {
      skipped++;
      console.warn(`  ⚠ skipping ds_commande row ${r.id}: invalid id_ds=${r.id_ds}, id_fournisseur=${r.id_fournisseur}`);
      continue;
    }

    await prisma.dsCommande.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        nCommande: r.n_commande != null ? String(r.n_commande) : null,
        dateCommande: toDate(r.date_commande) ?? new Date(),
        heureCommande: toStrOrNull(r.heure_commande),
        createur: toNumOrNull(r.createur) != null ? loginById.get(r.createur) ?? null : null,
        idFournisseur,
        statut:
          r.statut != null && COMMANDE_STATUT_MAP[Number(r.statut)]
            ? COMMANDE_STATUT_MAP[Number(r.statut)]
            : "En attente",
        personneContacter: toStrOrNull(r.personne_contacter),
        dateSignature: toDate(r.date_signature),
        idDs,
        urgence: toStrOrNull(r.urgence),
        fodec: toBool(r.fodec),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_commande row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_commande");
}

async function migrateDsCommandeArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_commande, id_t, qt, id_activite, prix_ht, remise, source, reception, descr
    FROM ds_commande_article
  `);
  console.log(`ds_commande_article: ${rows.length} rows`);
  if (dryRun) return;

  const validCommandeIds = new Set((await prisma.dsCommande.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validActiviteIds = new Set((await prisma.activiteSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idCommande = toExistingIdOrNull(r.id_commande, validCommandeIds);
    const idActivite = toNumOrNull(r.id_activite) != null ? toExistingIdOrNull(r.id_activite, validActiviteIds) : null;
    if (idCommande == null || (r.id_activite != null && idActivite == null)) {
      skipped++;
      console.warn(`  ⚠ skipping ds_commande_article row ${r.id}: invalid id_commande=${r.id_commande}, id_activite=${r.id_activite}`);
      continue;
    }

    await prisma.dsCommandeArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idCommande,
        idT: toNumOrNull(r.id_t),
        qt: toNumOrNull(r.qt) ?? 0,
        idActivite,
        prixHt: toNumOrNull(r.prix_ht),
        remise: toNumOrNull(r.remise),
        source: toStrOrNull(r.source),
        reception: toNumOrNull(r.reception) ?? 0,
        descr: toStrOrNull(r.descr),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_commande_article row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_commande_article");
}

async function migrateDsBonLivraison(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_livraison, heure_livraison, livraison_par, statut, date_reel,
           id_fournisseur, bl_fournisseur
    FROM ds_bon_livraison
  `);
  console.log(`ds_bon_livraison: ${rows.length} rows`);
  if (dryRun) return;

  const validCommandeIds = new Set((await prisma.dsCommande.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idCommande = toNumOrNull(r.id_commande) != null ? toExistingIdOrNull(r.id_commande, validCommandeIds) : null;
    const idFournisseur = toNumOrNull(r.id_fournisseur) != null ? toExistingIdOrNull(r.id_fournisseur, validFournisseurIds) : null;
    if (r.id_commande != null && idCommande == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_bon_livraison row ${r.id}: invalid id_commande=${r.id_commande}`);
      continue;
    }

    if (r.id_fournisseur != null && idFournisseur == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_bon_livraison row ${r.id}: invalid id_fournisseur=${r.id_fournisseur}`);
      continue;
    }

    await prisma.dsBonLivraison.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idCommande: idCommande,
        dateLivraison: toDate(r.date_livraison) ?? new Date(),
        heureLivraison: toStrOrNull(r.heure_livraison),
        livraisonPar:
          toNumOrNull(r.livraison_par) != null
            ? loginById.get(r.livraison_par) ?? `utilisateur#${r.livraison_par}`
            : null,
        statut: r.statut != null ? String(r.statut) : null,
        dateReel: toDate(r.date_reel),
        idFournisseur,
        blFournisseur: toStrOrNull(r.bl_fournisseur),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_bon_livraison row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_bon_livraison");
}

async function migrateDsLivraisonArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_livraison, id_ds_commande_article, qt, prix_ht, remise FROM ds_livraison_article
  `);
  console.log(`ds_livraison_article: ${rows.length} rows`);
  if (dryRun) return;

  const validLivraisonIds = new Set((await prisma.dsBonLivraison.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validCommandeArticleIds = new Set((await prisma.dsCommandeArticle.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idLivraison = toExistingIdOrNull(r.id_livraison, validLivraisonIds);
    const idDsCommandeArticle = toExistingIdOrNull(r.id_ds_commande_article, validCommandeArticleIds);
    if (idLivraison == null || idDsCommandeArticle == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_livraison_article row ${r.id}: invalid id_livraison=${r.id_livraison}, id_ds_commande_article=${r.id_ds_commande_article}`);
      continue;
    }

    await prisma.dsLivraisonArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idLivraison,
        idDsCommandeArticle,
        qt: toNumOrNull(r.qt) ?? 0,
        prixHt: toNumOrNull(r.prix_ht),
        remise: toNumOrNull(r.remise),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_livraison_article row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_livraison_article");
}

async function migrateDsFacture(prisma: PrismaClient, dryRun: boolean, loginById: Map<number, string>) {
  const rows = await queryAll(`
    SELECT id, date_facture, heure_facture, createur, id_fournisseur, tva, date_reel, n_facture
    FROM ds_facture
  `);
  console.log(`ds_facture: ${rows.length} rows`);
  if (dryRun) return;

  const validFournisseurIds = new Set((await prisma.fournisseur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idFournisseur = toExistingIdOrNull(r.id_fournisseur, validFournisseurIds);
    if (idFournisseur == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_facture row ${r.id}: invalid id_fournisseur=${r.id_fournisseur}`);
      continue;
    }

    await prisma.dsFacture.upsert({
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
    console.log(`  ⚠ ${skipped} ds_facture row(s) skipped because id_fournisseur was missing or dangling.`);
  }
  await resetSequence(prisma, "ds_facture");
}

async function migrateDsFactureLivraison(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_facture, id_livraison FROM ds_facture_livraison`);
  console.log(`ds_facture_livraison: ${rows.length} rows`);
  if (dryRun) return;

  const validFactureIds = new Set((await prisma.dsFacture.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validLivraisonIds = new Set((await prisma.dsBonLivraison.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idFacture = toExistingIdOrNull(r.id_facture, validFactureIds);
    const idLivraison = toExistingIdOrNull(r.id_livraison, validLivraisonIds);
    if (idFacture == null || idLivraison == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_facture_livraison row ${r.id}: invalid id_facture=${r.id_facture}, id_livraison=${r.id_livraison}`);
      continue;
    }

    await prisma.dsFactureLivraison.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idFacture, idLivraison },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_facture_livraison row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_facture_livraison");
}

async function migrateDsMp(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_demande, id_article, qt FROM ds_mp`);
  console.log(`ds_mp: ${rows.length} rows`);
  if (dryRun) return;

  const validDemandeIds = new Set((await prisma.demandeSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDemande = toExistingIdOrNull(r.id_demande, validDemandeIds);
    const idArticle = toExistingIdOrNull(r.id_article, validArticleIds);
    if (idDemande == null || idArticle == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_mp row ${r.id}: invalid id_demande=${r.id_demande}, id_article=${r.id_article}`);
      continue;
    }

    await prisma.dsMp.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, idDemande, idArticle, qt: toNumOrNull(r.qt) ?? 0 },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_mp row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_mp");
}

async function migrateDsNvArticle(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_demande, id_article, quantite, id_activite, description FROM ds_nv_article
  `);
  console.log(`ds_nv_article: ${rows.length} rows`);
  if (dryRun) return;

  const validDemandeIds = new Set((await prisma.demandeSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validActiviteIds = new Set((await prisma.activiteSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idDemande = toExistingIdOrNull(r.id_demande, validDemandeIds);
    const idArticle = toExistingIdOrNull(r.id_article, validArticleIds);
    const idActivite = toExistingIdOrNull(r.id_activite, validActiviteIds);
    // idActivite is a REQUIRED field on DsNvArticle (not nullable) — a
    // real, dormant bug found here: the skip check only ever covered
    // "non-null but invalid", never "null in the source", even though a
    // required field can't tolerate either case. Never actually
    // triggered a runtime failure with real data (this row never had a
    // null id_activite), but strict type-checking caught the gap, and
    // it's fixed properly here rather than just satisfying the compiler.
    if (idDemande == null || idArticle == null || idActivite == null) {
      skipped++;
      console.warn(`  ⚠ skipping ds_nv_article row ${r.id}: invalid id_demande=${r.id_demande}, id_article=${r.id_article}, id_activite=${r.id_activite}`);
      continue;
    }

    await prisma.dsNvArticle.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idDemande,
        idArticle,
        quantite: toNumOrNull(r.quantite) ?? 0,
        idActivite,
        description: toStrOrNull(r.description),
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} ds_nv_article row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "ds_nv_article");
}

async function migrateMagasinSousTraitance(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_article, ref_interne, reception, nbr_reparation, demande_actuel,
           activite_actuel, description, emplacement_actuel, equipement_actuel
    FROM magasin_sous_traitance
  `);
  console.log(`magasin_sous_traitance: ${rows.length} rows`);
  if (dryRun) return;

  const validArticleIds = new Set((await prisma.article.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validDemandeIds = new Set((await prisma.demandeSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validActiviteIds = new Set((await prisma.activiteSousTraitance.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const validEquipementIds = new Set((await prisma.equipement.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  let skipped = 0;

  for (const r of rows as any[]) {
    const idArticle = toExistingIdOrNull(r.id_article, validArticleIds);
    const demandeActuel = toNumOrNull(r.demande_actuel) != null ? toExistingIdOrNull(r.demande_actuel, validDemandeIds) : null;
    const activiteActuel = toNumOrNull(r.activite_actuel) != null ? toExistingIdOrNull(r.activite_actuel, validActiviteIds) : null;
    const equipementActuel = toNumOrNull(r.equipement_actuel) != null ? toExistingIdOrNull(r.equipement_actuel, validEquipementIds) : null;

    if (idArticle == null || (r.demande_actuel != null && demandeActuel == null) || (r.activite_actuel != null && activiteActuel == null) || (r.equipement_actuel != null && equipementActuel == null)) {
      skipped++;
      console.warn(`  ⚠ skipping magasin_sous_traitance row ${r.id}: invalid id_article=${r.id_article}, demande_actuel=${r.demande_actuel}, activite_actuel=${r.activite_actuel}, equipement_actuel=${r.equipement_actuel}`);
      continue;
    }

    await prisma.magasinSousTraitance.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idArticle,
        refInterne: r.ref_interne,
        reception: toBool(r.reception),
        nbrReparation: toNumOrNull(r.nbr_reparation) ?? 0,
        demandeActuel: demandeActuel,
        activiteActuel,
        description: toStrOrNull(r.description),
        emplacementActuel: toStrOrNull(r.emplacement_actuel),
        equipementActuel,
      },
    });
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} magasin_sous_traitance row(s) skipped because one or more FK targets were missing.`);
  }
  await resetSequence(prisma, "magasin_sous_traitance");
}

/** Never carries over the source `designation` (PIN hash) — same
 * security posture as Utilisateur passwords (tier 1), but with a real
 * difference worth noting: tier 1 sets a single unusable placeholder
 * hash for every user (forcing a manual reset via /admin/users, no file
 * involved), while PINs here are cheap enough per-user to regenerate
 * individually — generates a fresh random PIN per user, hashes it the
 * way this app's own signature-check code expects, and reports the
 * plaintext temporary PINs to a local-only file for out-of-band
 * distribution. (An earlier version of this comment claimed tier 1 does
 * the same file-based reporting — it doesn't; corrected here rather than
 * left stale.) */
async function migrateSignature(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, id_utilisateur FROM signature`);
  console.log(`signature: ${rows.length} rows`);
  if (dryRun) return;

  const validUtilisateurIds = new Set((await prisma.utilisateur.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]);
  const resetTokens: { idUtilisateur: number; temporaryPin: string }[] = [];
  let skipped = 0;
  let duplicateUser = 0;
  // Real bug found on an actual migration run, then found AGAIN on the
  // very next attempt after this first fix: the source has zero
  // constraints, so nothing stops the same id_utilisateur appearing on
  // more than one signature row. The target enforces one signature per
  // user — a deliberate modernization — so a second row for an
  // already-claimed user fails. The first fix only tracked duplicates
  // *within this run*, seeded empty each execution — it missed that a
  // prior partial run (before this fix existed) had already written one
  // signature to Postgres for that user, so a fresh in-memory Set had no
  // way to know. Fixed properly this time by seeding the tracking set
  // from what's already in the target database, not just what's been
  // seen so far in the current execution — the same class of check this
  // migration already applies everywhere else for "does this referenced
  // row already exist," just missed here on the first pass.
  const claimedUtilisateurIds = new Set(
    (await prisma.signature.findMany({ select: { idUtilisateur: true } })).map((x: { idUtilisateur: number }) => x.idUtilisateur) as number[]
  );
  // Also need to know which source ids are already-migrated rows being
  // re-upserted (a safe no-op update, not a genuine new duplicate) —
  // otherwise a row that already exists would be mistaken for a conflict
  // with itself, since its own idUtilisateur is already in the set above.
  const existingSignatureIds = new Set(
    (await prisma.signature.findMany({ select: { id: true } })).map((x: { id: number }) => x.id) as number[]
  );

  for (const r of rows as any[]) {
    const idUtilisateur = toExistingIdOrNull(r.id_utilisateur, validUtilisateurIds);
    if (idUtilisateur == null) {
      skipped++;
      console.warn(`  ⚠ skipping signature row ${r.id}: invalid id_utilisateur=${r.id_utilisateur}`);
      continue;
    }
    if (claimedUtilisateurIds.has(idUtilisateur) && !existingSignatureIds.has(r.id)) {
      duplicateUser++;
      console.warn(
        `  ⚠ skipping signature row ${r.id}: id_utilisateur=${idUtilisateur} already has a signature from an earlier row in this same migration run.`
      );
      continue;
    }
    claimedUtilisateurIds.add(idUtilisateur);

    const alreadyExists = existingSignatureIds.has(r.id);
    // Only generate/report a fresh PIN for a genuinely new row. `update:
    // {}` below deliberately leaves an already-existing row's stored
    // hash untouched on a re-run — reporting a brand-new PIN in that
    // case would be actively misleading, since it wouldn't match what's
    // actually stored.
    const temporaryPin = alreadyExists ? null : String(Math.floor(1000 + Math.random() * 9000));
    await prisma.signature.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idUtilisateur,
        designation: await bcrypt.hash(temporaryPin ?? "0000", 10),
      },
    });
    if (temporaryPin != null) {
      resetTokens.push({ idUtilisateur, temporaryPin });
    }
  }

  if (skipped > 0) {
    console.log(`  ⚠ ${skipped} signature row(s) skipped because id_utilisateur was missing or dangling.`);
  }
  if (duplicateUser > 0) {
    console.log(
      `  ⚠ ${duplicateUser} signature row(s) skipped because that user already had a signature migrated from an earlier row (kept the first one seen; no timestamp exists on this table to determine which was actually newest).`
    );
  }
  await resetSequence(prisma, "signature");

  if (resetTokens.length > 0) {
    const fs = await import("fs");
    fs.writeFileSync("migration-temporary-signature-pins.json", JSON.stringify(resetTokens, null, 2));
    console.log(
      `  ${resetTokens.length} temporary signature PIN(s) written to ` +
        `migration-temporary-signature-pins.json — distribute out-of-band and delete afterward. Do NOT commit it.`
    );
  }
}
