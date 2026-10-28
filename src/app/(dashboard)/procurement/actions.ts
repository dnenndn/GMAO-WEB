"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserLogin, requireAdmin } from "@/lib/auth";

// ----------------------------------------------------------------------------
// Fournisseurs (suppliers)
// ----------------------------------------------------------------------------

export async function createFournisseur(formData: FormData) {
  const nom = String(formData.get("nom") || "").trim();
  if (!nom) return;

  const fournisseur = await prisma.fournisseur.create({
    data: {
      codeFournisseur: str(formData, "codeFournisseur"),
      nom,
      type: str(formData, "type") ?? "Fournisseur",
      activite: str(formData, "activite"),
      email: str(formData, "email"),
      telephone1: str(formData, "telephone1"),
      ville: str(formData, "ville"),
      codePostal: str(formData, "codePostal"),
      pays: str(formData, "pays"),
      adresse: str(formData, "adresse"),
      delai: numOrNull(formData.get("delai")),
      tvaDefaut: numOrNull(formData.get("tvaDefaut")),
      remiseDefaut: numOrNull(formData.get("remiseDefaut")),
      fodec: numOrNull(formData.get("fodec")),
      commentaire: str(formData, "commentaire"),
    },
  });

  revalidatePath("/procurement/suppliers");
  redirect(`/procurement/suppliers/${fournisseur.id}`);
}

export async function updateFournisseurAdresse(id: number, formData: FormData) {
  await prisma.fournisseur.update({
    where: { id },
    data: {
      adresse: str(formData, "adresse"),
      ville: str(formData, "ville"),
      codePostal: str(formData, "codePostal"),
      pays: str(formData, "pays"),
      telephone1: str(formData, "telephone1"),
      telephone2: str(formData, "telephone2"),
      fax1: str(formData, "fax1"),
      fax2: str(formData, "fax2"),
      siteWeb: str(formData, "siteWeb"),
    },
  });
  revalidatePath(`/procurement/suppliers/${id}/adresse`);
}

export async function updateFournisseurBanque(id: number, formData: FormData) {
  await prisma.fournisseur.update({
    where: { id },
    data: {
      nomBanque: str(formData, "nomBanque"),
      domiciliation: str(formData, "domiciliation"),
      iban: str(formData, "iban"),
      rib: str(formData, "rib"),
      fodec: numOrNull(formData.get("fodec")),
    },
  });
  revalidatePath(`/procurement/suppliers/${id}/banque`);
}

// ----------------------------------------------------------------------------
// Demandes d'Achat (DA)
// ----------------------------------------------------------------------------

export async function createDemandeAchat(formData: FormData) {
  const createur = await currentUserLogin();
  const da = await prisma.demandeAchat.create({
    data: {
      dateDa: new Date(String(formData.get("dateDa") || new Date())),
      demandeur: str(formData, "demandeur"),
      periode: str(formData, "periode"),
      delai: numOrNull(formData.get("delai")) ? Number(formData.get("delai")) : null,
      createur,
      statut: "En cours",
    },
  });

  revalidatePath("/procurement/requests");
  redirect(`/procurement/requests/${da.id}`);
}

// Reproduces the real reference app's "Créer une demande" tab — one
// screen builds the whole DA (délai + several article lines) before
// anything is submitted, rather than this app's earlier two-step flow
// (create an empty header, then add lines on the next page one at a
// time). Called directly from a client component, not bound to a
// plain <form action>, since it needs an array of staged lines built
// up client-side before a single submit.
export async function createDemandeAchatWithLignes(
  header: { delai: number | null; periode: string | null },
  lignes: { idArticle: number; qt: number; motif: string | null }[]
) {
  const createur = await currentUserLogin();

  const da = await prisma.demandeAchat.create({
    data: {
      dateDa: new Date(),
      periode: header.periode,
      delai: header.delai,
      createur,
      statut: "En cours",
    },
  });

  for (const l of lignes) {
    if (!l.idArticle || l.qt <= 0) continue;
    await prisma.daArticle.create({
      data: {
        idDa: da.id,
        idArticle: l.idArticle,
        qt: l.qt,
        qtRestant: l.qt,
        motif: l.motif,
      },
    });
  }

  revalidatePath("/procurement/requests");
  redirect(`/procurement/requests/${da.id}`);
}

export async function addDaLigne(daId: number, formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const qt = Number(formData.get("qt")) || 0;
  if (!idArticle || qt <= 0) return;

  await prisma.daArticle.create({
    data: {
      idDa: daId,
      idArticle,
      qt,
      qtRestant: qt,
      motif: str(formData, "motif"),
    },
  });

  revalidatePath(`/procurement/requests/${daId}`);
}

export async function confirmerDa(id: number) {
  await requireAdmin();
  const par = await currentUserLogin();
  // FIXED — this used to only create the DaAction log entry and never
  // touch demandeAchat.statut at all, leaving it stuck on "En cours"
  // forever. Confirming a DA is a real status transition in the actual
  // C# source (da_confirmer.cs sets statut = 1 / "Confirmée" directly),
  // found while re-checking the decompiled source for the DA statut
  // migration bug — see the DemandeAchat.statut schema comment.
  await prisma.$transaction([
    prisma.daAction.create({ data: { idDa: id, type: "Confirmée", par } }),
    prisma.demandeAchat.update({ where: { id }, data: { statut: "Confirmée" } }),
  ]);
  revalidatePath(`/procurement/requests/${id}`);
}

export async function refuserDa(id: number) {
  await requireAdmin();
  const par = await currentUserLogin();
  // FIXED — this incorrectly set statut to "Clôturée" for a refusal.
  // The real C# source (da_refuser.cs) sets statut = 2 / "Refusée"
  // directly, a genuinely distinct outcome from closing a DA.
  await prisma.$transaction([
    prisma.daAction.create({ data: { idDa: id, type: "Refusée", par } }),
    prisma.demandeAchat.update({ where: { id }, data: { statut: "Refusée" } }),
  ]);
  revalidatePath(`/procurement/requests/${id}`);
}

export async function reporterDa(id: number) {
  await requireAdmin();
  const par = await currentUserLogin();
  // FIXED — this used to only create the DaAction log entry and never
  // touch demandeAchat.statut, leaving it stuck on "En cours". The real
  // C# source (da_reporter.cs) sets statut = 4 / "Reportée" directly.
  await prisma.$transaction([
    prisma.daAction.create({ data: { idDa: id, type: "Reportée", par } }),
    prisma.demandeAchat.update({ where: { id }, data: { statut: "Reportée" } }),
  ]);
  revalidatePath(`/procurement/requests/${id}`);
}

export async function cloturerDa(id: number) {
  await requireAdmin();
  const par = await currentUserLogin();
  await prisma.$transaction([
    prisma.daAction.create({ data: { idDa: id, type: "Clôturée", par } }),
    prisma.demandeAchat.update({ where: { id }, data: { statut: "Clôturée" } }),
  ]);
  revalidatePath(`/procurement/requests/${id}`);
  revalidatePath("/procurement/requests");
}

// ----------------------------------------------------------------------------
// Commandes (purchase orders)
// ----------------------------------------------------------------------------

export async function createCommande(formData: FormData) {
  const idFournisseur = Number(formData.get("idFournisseur"));
  if (!idFournisseur) return;

  const createur = await currentUserLogin();
  const count = await prisma.commande.count();
  const nCommande = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const commande = await prisma.commande.create({
    data: {
      nCommande,
      idFournisseur,
      dateCommande: new Date(String(formData.get("dateCommande") || new Date())),
      urgence: str(formData, "urgence"),
      personneContacter: str(formData, "personneContacter"),
      statut: "En attente",
      createur,
    },
  });

  revalidatePath("/procurement/orders");
  redirect(`/procurement/orders/${commande.id}`);
}

export async function addCommandeLigne(commandeId: number, formData: FormData) {
  const idDaArticle = Number(formData.get("idDaArticle"));
  const qtCommande = Number(formData.get("qtCommande")) || 0;
  const prixHt = numOrNull(formData.get("prixHt"));
  if (!idDaArticle || qtCommande <= 0) return;

  const daArticle = await prisma.daArticle.findUnique({ where: { id: idDaArticle } });
  if (!daArticle || Number(daArticle.qtRestant) < qtCommande) return;

  await prisma.$transaction([
    prisma.commandeArticle.create({
      data: { idCommande: commandeId, idDaArticle, qtCommande, prixHt },
    }),
    prisma.daArticle.update({
      where: { id: idDaArticle },
      data: { qtRestant: { decrement: qtCommande } },
    }),
  ]);

  revalidatePath(`/procurement/orders/${commandeId}`);
}

/** Edits an existing order line's qt/price/discount, logging the change
 * via CommandeModificationBase (header) + CommandeModifierArticle (line
 * snapshot) — confirmed real audit tables, previously not wired to
 * anything since there was no line-edit capability in the app at all. */
export async function updateCommandeLigne(ligneId: number, commandeId: number, formData: FormData) {
  const qtCommande = Number(formData.get("qtCommande"));
  const prixHt = numOrNull(formData.get("prixHt"));
  const remise = numOrNull(formData.get("remise"));
  if (!qtCommande || qtCommande <= 0) return;

  const ligne = await prisma.commandeArticle.findUnique({
    where: { id: ligneId },
    include: { daArticle: true },
  });
  if (!ligne) return;

  const modifierPar = await currentUserLogin();
  const now = new Date();

  await prisma.$transaction([
    prisma.commandeArticle.update({
      where: { id: ligneId },
      data: { qtCommande, prixHt, remise },
    }),
    prisma.commandeModificationBase.create({
      data: {
        idCommande: commandeId,
        modifierPar,
        dateModification: now,
        heureModification: now.toTimeString().slice(0, 5),
        lignes: {
          create: {
            idArticle: ligne.daArticle.idArticle,
            qt: qtCommande,
            prixHt: prixHt ?? 0,
            remise: remise ?? 0,
          },
        },
      },
    }),
  ]);

  revalidatePath(`/procurement/orders/${commandeId}`);
}

export async function updateCommandeStatut(id: number, statut: string) {
  await requireAdmin();
  await prisma.commande.update({ where: { id }, data: { statut } });
  revalidatePath("/procurement/orders");
  revalidatePath(`/procurement/orders/${id}`);
}

// ----------------------------------------------------------------------------
// DOP (Demande d'Ouverture de Prix — price survey / RFQ) and Devis (quote)
// ----------------------------------------------------------------------------

export async function createDop(formData: FormData) {
  const createur = await currentUserLogin();
  const idsArticles = formData.getAll("idsArticles").map(Number).filter(Boolean);
  const idsFournisseurs = formData.getAll("idsFournisseurs").map(Number).filter(Boolean);

  const dop = await prisma.dop.create({
    data: {
      dateDop: new Date(String(formData.get("dateDop") || new Date())),
      createur,
      statut: "En cours",
    },
  });

  if (idsArticles.length > 0) {
    await prisma.dopArticle.createMany({
      data: idsArticles.map((idArticle) => ({ idDop: dop.id, idArticle, qt: 1 })),
    });
  }
  if (idsFournisseurs.length > 0) {
    await prisma.dopFournisseur.createMany({
      data: idsFournisseurs.map((idFournisseur) => ({ idDop: dop.id, idFournisseur })),
    });
  }

  revalidatePath("/procurement/dop");
  redirect(`/procurement/dop/${dop.id}`);
}

/** Records (or updates) one supplier's quoted price for one article within
 * a DOP — the comparison-matrix row. */
export async function recordDopFini(dopId: number, formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const idFournisseur = Number(formData.get("idFournisseur"));
  const prixHt = Number(formData.get("prixHt"));
  if (!idArticle || !idFournisseur || Number.isNaN(prixHt)) return;

  const existing = await prisma.dopFini.findFirst({
    where: { idDop: dopId, idArticle, idFournisseur },
  });

  const data = {
    prixHt,
    remise: Number(formData.get("remise")) || 0,
    qtDisponible: numOrNull(formData.get("qtDisponible")),
  };

  if (existing) {
    await prisma.dopFini.update({ where: { id: existing.id }, data });
  } else {
    await prisma.dopFini.create({ data: { idDop: dopId, idArticle, idFournisseur, ...data } });
  }

  revalidatePath(`/procurement/dop/${dopId}`);
}

export async function markDopFiniDone(id: number, dopId: number) {
  await prisma.dopFini.update({ where: { id }, data: { fini: true } });
  revalidatePath(`/procurement/dop/${dopId}`);
}

/** Formalizes a chosen supplier's quote for a DOP into a real Devis,
 * copying over that supplier's DopFini rows as DevisArticle lines. */
export async function createDevisFromDop(dopId: number, formData: FormData) {
  const createur = await currentUserLogin();
  const idFournisseur = Number(formData.get("idFournisseur"));
  if (!idFournisseur) return;

  const resultats = await prisma.dopFini.findMany({
    where: { idDop: dopId, idFournisseur },
  });

  const devis = await prisma.devis.create({
    data: {
      idDop: dopId,
      createur,
      dateDevis: new Date(),
      statut: "En cours",
    },
  });

  await prisma.devisFournisseur.create({
    data: { idDevis: devis.id, idFournisseur },
  });

  if (resultats.length > 0) {
    await prisma.devisArticle.createMany({
      data: resultats.map((r) => ({
        idDevis: devis.id,
        idArticle: r.idArticle,
        qtDisponible: r.qtDisponible ?? 0,
        prixHt: r.prixHt,
        remise: r.remise,
      })),
    });
  }

  revalidatePath("/procurement/devis");
  redirect(`/procurement/devis/${devis.id}`);
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Factures (invoices)
// ----------------------------------------------------------------------------

export async function createFacture(formData: FormData) {
  const createur = await currentUserLogin();
  const idFournisseur = Number(formData.get("idFournisseur"));
  if (!idFournisseur) return;

  const idsLivraisons = formData.getAll("idsLivraisons").map(Number).filter(Boolean);

  const facture = await prisma.facture.create({
    data: {
      idFournisseur,
      dateFacture: new Date(String(formData.get("dateFacture") || new Date())),
      createur,
      tva: Number(formData.get("tva")) || 0,
      nFacture: str(formData, "nFacture"),
    },
  });

  if (idsLivraisons.length > 0) {
    await prisma.factureLivraison.createMany({
      data: idsLivraisons.map((idLivraison) => ({ idFacture: facture.id, idLivraison })),
    });
  }

  revalidatePath("/procurement/factures");
  redirect(`/procurement/factures/${facture.id}`);
}

// ----------------------------------------------------------------------------
// Supplier reference-data / profile (activité, compte, devise, livraison,
// règlement, fichiers) — 5 fixed-category lists + a fournisseur link for
// each, plus direct file attachments.
// ----------------------------------------------------------------------------

export async function createParametreActiviteFournisseur(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreActiviteFournisseur.create({
    data: { designation, codeActivite: str(formData, "codeActivite") },
  });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function createParametreCompteFournisseur(formData: FormData) {
  const designation = str(formData, "designation");
  const numero = numOrNull(formData.get("numero"));
  if (!designation || numero == null) return;
  await prisma.parametreCompteFournisseur.create({
    data: {
      designation,
      numero,
      estimation: numOrNull(formData.get("estimation")) ?? 0,
      periodeNbre: numOrNull(formData.get("periodeNbre")) ?? 1,
      periode: str(formData, "periode") ?? "Mois",
    },
  });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function createParametreDeviseFournisseur(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreDeviseFournisseur.create({
    data: { designation, conversion: numOrNull(formData.get("conversion")) ?? 1 },
  });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function createParametreLivraisonFournisseur(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreLivraisonFournisseur.create({
    data: { designation, codeLivraison: str(formData, "codeLivraison") },
  });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function createParametreReglementFournisseur(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreReglementFournisseur.create({
    data: { designation, codeReglement: str(formData, "codeReglement") },
  });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

// Delete actions for the 5 fournisseur-reference lists above — genuinely
// missing until this pass despite the settings page already querying
// `where: { deleted: false }` (implying deletability was always the
// intent). Admin-gated, matching this app's established pattern for
// deleting a standalone Parametre* settings entry (create is not gated;
// deleting the master entry is).

export async function deleteParametreActiviteFournisseur(id: number) {
  await requireAdmin();
  await prisma.parametreActiviteFournisseur.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function deleteParametreCompteFournisseur(id: number) {
  await requireAdmin();
  await prisma.parametreCompteFournisseur.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function deleteParametreDeviseFournisseur(id: number) {
  await requireAdmin();
  await prisma.parametreDeviseFournisseur.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function deleteParametreLivraisonFournisseur(id: number) {
  await requireAdmin();
  await prisma.parametreLivraisonFournisseur.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function deleteParametreReglementFournisseur(id: number) {
  await requireAdmin();
  await prisma.parametreReglementFournisseur.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/procurement/settings/fournisseur-reference");
}

export async function linkFournisseurActivite(fournisseurId: number, formData: FormData) {
  const idActivite = numOrNull(formData.get("idActivite"));
  if (!idActivite) return;
  await prisma.tableauFournisseurActivite.create({ data: { idFournisseur: fournisseurId, idActivite } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function unlinkFournisseurActivite(id: number, fournisseurId: number) {
  await prisma.tableauFournisseurActivite.delete({ where: { id } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function linkFournisseurCompte(fournisseurId: number, formData: FormData) {
  const idCompte = numOrNull(formData.get("idCompte"));
  if (!idCompte) return;
  await prisma.tableauFournisseurCompte.create({ data: { idFournisseur: fournisseurId, idCompte } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function unlinkFournisseurCompte(id: number, fournisseurId: number) {
  await prisma.tableauFournisseurCompte.delete({ where: { id } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function linkFournisseurDevise(fournisseurId: number, formData: FormData) {
  const idDevise = numOrNull(formData.get("idDevise"));
  if (!idDevise) return;
  await prisma.tableauFournisseurDevise.create({ data: { idFournisseur: fournisseurId, idDevise } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function unlinkFournisseurDevise(id: number, fournisseurId: number) {
  await prisma.tableauFournisseurDevise.delete({ where: { id } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function linkFournisseurLivraison(fournisseurId: number, formData: FormData) {
  const idLivraison = numOrNull(formData.get("idLivraison"));
  if (!idLivraison) return;
  await prisma.tableauFournisseurLivraison.create({ data: { idFournisseur: fournisseurId, idLivraison } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function unlinkFournisseurLivraison(id: number, fournisseurId: number) {
  await prisma.tableauFournisseurLivraison.delete({ where: { id } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function linkFournisseurReglement(fournisseurId: number, formData: FormData) {
  const idReglement = numOrNull(formData.get("idReglement"));
  if (!idReglement) return;
  await prisma.tableauFournisseurReglement.create({ data: { idFournisseur: fournisseurId, idReglement } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function unlinkFournisseurReglement(id: number, fournisseurId: number) {
  await prisma.tableauFournisseurReglement.delete({ where: { id } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function addFournisseurFichier(fournisseurId: number, formData: FormData) {
  const adresse = str(formData, "adresse");
  if (!adresse) return;
  await prisma.tableauFournisseurFichier.create({ data: { idFournisseur: fournisseurId, adresse } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

export async function deleteFournisseurFichier(id: number, fournisseurId: number) {
  await prisma.tableauFournisseurFichier.delete({ where: { id } });
  revalidatePath(`/procurement/suppliers/${fournisseurId}`);
}

function str(formData: FormData, key: string) {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : null;
}
