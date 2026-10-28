/**
 * Tier: master data — depends only on the core reference tier (Magasin,
 * FonctionIntervenant, TypeVehicule, Chauffeur, CategorieDeCharge).
 *
 * Equipement is self-referencing (id_parent) and also references Engin
 * (engin column) — migrated in two passes: insert every row with
 * idParent left null, then a second pass sets the real idParent once
 * every row exists (avoids FK-ordering issues regardless of what order
 * the source data happens to be in). Engin itself has no dependency on
 * Equipement, so it's migrated first with no ordering concern.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBool, toStrOrNull, toNumOrNull, toDate, toBufferOrNull, resetSequence } from "../db";

export async function migrateMasterData(prisma: PrismaClient, dryRun: boolean) {
  await migrateFournisseurs(prisma, dryRun);
  await migrateIntervenants(prisma, dryRun);
  await migrateEngins(prisma, dryRun);
  await migrateEquipements(prisma, dryRun); // depends on Engin — must run after
  await migrateArticles(prisma, dryRun);
}

// ----------------------------------------------------------------------------

async function migrateFournisseurs(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_fournisseur, nom, type, activite, commentaire, tva_defaut, fodec, delai,
           remise_defaut, pays, ville, code_postal, adresse, telephone_1, telephone_2,
           fax_1, fax_2, email, site_web, nom_banque, domiciliation, iban, rib, deleted
    FROM fournisseur
  `);
  console.log(`fournisseur: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.fournisseur.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeFournisseur: toStrOrNull(r.code_fournisseur),
        nom: r.nom,
        type: toStrOrNull(r.type),
        activite: toStrOrNull(r.activite),
        commentaire: toStrOrNull(r.commentaire),
        tvaDefaut: toNumOrNull(r.tva_defaut),
        fodec: toNumOrNull(r.fodec),
        delai: toNumOrNull(r.delai),
        remiseDefaut: toNumOrNull(r.remise_defaut),
        pays: toStrOrNull(r.pays),
        ville: toStrOrNull(r.ville),
        codePostal: toStrOrNull(r.code_postal),
        adresse: toStrOrNull(r.adresse),
        telephone1: toStrOrNull(r.telephone_1),
        telephone2: toStrOrNull(r.telephone_2),
        fax1: toStrOrNull(r.fax_1),
        fax2: toStrOrNull(r.fax_2),
        email: toStrOrNull(r.email),
        siteWeb: toStrOrNull(r.site_web),
        nomBanque: toStrOrNull(r.nom_banque),
        domiciliation: toStrOrNull(r.domiciliation),
        iban: toStrOrNull(r.iban),
        rib: toStrOrNull(r.rib),
        deleted: toBool(r.deleted),
      },
    });
  }
  await resetSequence(prisma, "fournisseur");
}

async function migrateIntervenants(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, nom, taux_horaire, id_fonction, deleted, type_cout, chef_equipe
    FROM intervenant
  `);
  console.log(`intervenant: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.intervenant.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        nom: r.nom,
        tauxHoraire: toNumOrNull(r.taux_horaire),
        idFonction: toNumOrNull(r.id_fonction),
        deleted: toBool(r.deleted),
        typeCout: toStrOrNull(r.type_cout),
        chefEquipe: r.chef_equipe === null ? null : toBool(r.chef_equipe),
      },
    });
  }
  await resetSequence(prisma, "intervenant");
}

async function migrateEngins(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, matricule, num_carte, designation, marque, id_vehicule, id_chauffeur,
           id_categorie, liaison, deleted
    FROM engins
  `);
  console.log(`engins: ${rows.length} rows`);
  if (dryRun) return;

  // The source has zero FK constraints anywhere, so a non-null
  // id_vehicule/id_chauffeur/id_categorie pointing at a row that doesn't
  // exist is valid there — it only becomes a problem in Postgres, which
  // enforces real FK constraints. Null out any reference that doesn't
  // resolve to an already-migrated row instead of hard-failing.
  const [validVehiculeIds, validChauffeurIds, validCategorieIds] = await Promise.all([
    prisma.typeVehicule.findMany({ select: { id: true } }).then((r: { id: number }[]) => new Set(r.map((x: { id: number }) => x.id) as number[])),
    prisma.chauffeur.findMany({ select: { id: true } }).then((r: { id: number }[]) => new Set(r.map((x: { id: number }) => x.id) as number[])),
    prisma.categorieDeCharge.findMany({ select: { id: true } }).then((r: { id: number }[]) => new Set(r.map((x: { id: number }) => x.id) as number[])),
  ]);

  let danglingCount = 0;

  for (const r of rows as any[]) {
    const idVehicule = toNumOrNull(r.id_vehicule);
    const idChauffeur = toNumOrNull(r.id_chauffeur);
    const idCategorie = toNumOrNull(r.id_categorie);

    const resolvedVehicule = idVehicule != null && validVehiculeIds.has(idVehicule) ? idVehicule : null;
    const resolvedChauffeur = idChauffeur != null && validChauffeurIds.has(idChauffeur) ? idChauffeur : null;
    const resolvedCategorie = idCategorie != null && validCategorieIds.has(idCategorie) ? idCategorie : null;

    if (
      (idVehicule != null && resolvedVehicule == null) ||
      (idChauffeur != null && resolvedChauffeur == null) ||
      (idCategorie != null && resolvedCategorie == null)
    ) {
      danglingCount++;
    }

    await prisma.engin.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        matricule: toStrOrNull(r.matricule),
        numCarte: toStrOrNull(r.num_carte),
        designation: r.designation,
        marque: toStrOrNull(r.marque),
        idVehicule: resolvedVehicule,
        idChauffeur: resolvedChauffeur,
        idCategorie: resolvedCategorie,
        liaison: r.liaison === null ? null : String(r.liaison),
        deleted: toBool(r.deleted),
      },
    });
  }

  if (danglingCount > 0) {
    console.log(
      `  ⚠ ${danglingCount} engin row(s) had a dangling id_vehicule/id_chauffeur/id_categorie ` +
        `reference (pointing at a row that doesn't exist in the source) — nulled out rather than failing the migration.`
    );
  }
  await resetSequence(prisma, "engins");
}

async function migrateEquipements(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, id_parent, code, designation, ordre, deleted, engin, tec_geo, type_equip
    FROM equipement
  `);
  console.log(`equipement: ${rows.length} rows (two-pass: insert, then link parents)`);
  if (dryRun) return;

  // `engin` is a real FK to Engin (and @unique). Guard against both a
  // dangling reference and two equipement rows claiming the same
  // vehicle, same reasoning as migrateEngins above.
  const validEnginIds = new Set(
    (await prisma.engin.findMany({ select: { id: true } })).map((e: { id: number }) => e.id)
  );
  // Seeded from the target database, not an empty Set — a re-run after
  // a partial failure needs to know about engin values already claimed
  // by rows an earlier attempt successfully wrote, or it can't tell a
  // genuine new duplicate apart from a row safely re-touching itself.
  // (This exact gap was found and fixed the hard way in tier 10's
  // Signature migration and tier 15's EquipementGenerale/
  // EquipementPrevision — applied proactively here too for consistency,
  // even though this tier already completed successfully once.)
  const claimedEnginIds = new Set(
    (await prisma.equipement.findMany({ where: { engin: { not: null } }, select: { engin: true } })).map(
      (e: { engin: number | null }) => e.engin as number
    )
  );
  const existingEquipementIds = new Set(
    (await prisma.equipement.findMany({ select: { id: true } })).map((e: { id: number }) => e.id)
  );
  let danglingCount = 0;
  let duplicateCount = 0;

  // Pass 1: insert every row with idParent left null.
  for (const r of rows as any[]) {
    const enginRaw = toNumOrNull(r.engin);
    let resolvedEngin: number | null = null;
    if (enginRaw != null) {
      if (!validEnginIds.has(enginRaw)) {
        danglingCount++;
      } else if (claimedEnginIds.has(enginRaw) && !existingEquipementIds.has(r.id)) {
        duplicateCount++;
      } else {
        resolvedEngin = enginRaw;
        claimedEnginIds.add(enginRaw);
      }
    }

    await prisma.equipement.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        idParent: null,
        code: toStrOrNull(r.code),
        designation: r.designation,
        ordre: toNumOrNull(r.ordre),
        deleted: toBool(r.deleted),
        engin: resolvedEngin,
        tecGeo: toNumOrNull(r.tec_geo),
        typeEquip: toNumOrNull(r.type_equip),
      },
    });
  }

  if (danglingCount > 0) {
    console.log(
      `  ⚠ ${danglingCount} equipement row(s) had an "engin" reference pointing at a ` +
        `vehicle that doesn't exist — nulled out.`
    );
  }
  if (duplicateCount > 0) {
    console.log(
      `  ⚠ ${duplicateCount} equipement row(s) referenced a vehicle already claimed by ` +
        `another equipement row — nulled out to satisfy the unique constraint (kept the first one seen).`
    );
  }

  // Pass 2: set the real idParent now that every target row exists.
  const validIds = new Set(rows.map((r: any) => r.id));
  for (const r of rows as any[]) {
    if (r.id_parent == null || r.id_parent === r.id || !validIds.has(r.id_parent)) continue;
    await prisma.equipement.update({
      where: { id: r.id },
      data: { idParent: r.id_parent },
    });
  }

  await resetSequence(prisma, "equipement");
}


async function migrateArticles(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`
    SELECT id, code_article, reference, designation, tva, prix_ht, stock_neuf, stock_use,
           stock_rebute, stock_reparable_manuel, stock_mini, stock_maxi, stock_securite,
           marque, methode_gestion, commentaire, photo, deleted, point_commande, id_magasin,
           modification_qt
    FROM article
  `);
  console.log(`article: ${rows.length} rows`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.article.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        codeArticle: toStrOrNull(r.code_article),
        reference: toStrOrNull(r.reference),
        designation: r.designation,
        tva: toNumOrNull(r.tva),
        prixHt: toNumOrNull(r.prix_ht),
        stockNeuf: toNumOrNull(r.stock_neuf) ?? 0,
        stockUse: toNumOrNull(r.stock_use) ?? 0,
        stockRebute: toNumOrNull(r.stock_rebute) ?? 0,
        stockReparableManuel: toNumOrNull(r.stock_reparable_manuel),
        stockMini: toNumOrNull(r.stock_mini),
        stockMaxi: toNumOrNull(r.stock_maxi),
        stockSecurite: toNumOrNull(r.stock_securite),
        marque: toStrOrNull(r.marque),
        methodeGestion: toStrOrNull(r.methode_gestion),
        commentaire: toStrOrNull(r.commentaire),
        photo: toBufferOrNull(r.photo),
        deleted: toBool(r.deleted),
        pointCommande: toNumOrNull(r.point_commande),
        idMagasin: toNumOrNull(r.id_magasin),
        modificationQt: toDate(r.modification_qt),
      },
    });
  }
  await resetSequence(prisma, "article");
}
