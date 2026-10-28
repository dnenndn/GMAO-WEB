"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserLogin, requireAdmin } from "@/lib/auth";

// ----------------------------------------------------------------------------
// Articles
// ----------------------------------------------------------------------------

export async function createArticle(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;

  const article = await prisma.article.create({
    data: {
      codeArticle: String(formData.get("codeArticle") || "") || null,
      reference: String(formData.get("reference") || "") || null,
      designation,
      prixHt: numOrNull(formData.get("prixHt")),
      stockMini: numOrNull(formData.get("stockMini")),
      stockMaxi: numOrNull(formData.get("stockMaxi")),
      stockSecurite: numOrNull(formData.get("stockSecurite")),
      marque: String(formData.get("marque") || "") || null,
      idMagasin: numOrNull(formData.get("idMagasin")),
      commentaire: String(formData.get("commentaire") || "") || null,
    },
  });

  const idSousFamille = numOrNull(formData.get("idSousFamille"));
  if (idSousFamille) {
    await prisma.tableauArticleSousFamille.create({
      data: { idArticle: article.id, idSousFamille },
    });
  }

  revalidatePath("/inventory/articles");
  redirect(`/inventory/articles/${article.id}`);
}

export async function updateArticleStock(id: number, formData: FormData) {
  const stockNeuf = numOrZero(formData.get("stockNeuf"));
  const stockUse = numOrZero(formData.get("stockUse"));
  const stockRebute = numOrZero(formData.get("stockRebute"));

  await prisma.$transaction([
    prisma.article.update({
      where: { id },
      data: { stockNeuf, stockUse, stockRebute },
    }),
    // Passive change log — confirmed real table, date-only, no user
    // column (see schema comment on ModificationArticle).
    prisma.modificationArticle.create({
      data: {
        idArticle: id,
        stockNeuf,
        stockUse,
        stockRebute,
        dateModification: new Date(),
      },
    }),
  ]);
  revalidatePath(`/inventory/articles/${id}`);
}

// ----------------------------------------------------------------------------
// BSM (stock issue)
// ----------------------------------------------------------------------------

export async function createBsm(formData: FormData) {
  const createur = await currentUserLogin();
  const bsm = await prisma.bsm.create({
    data: {
      typeStock: String(formData.get("typeStock") || "") || null,
      bsmMaintenance: formData.get("bsmMaintenance") === "on",
      nOt: String(formData.get("nOt") || "") || null,
      dateBsm: new Date(String(formData.get("dateBsm") || new Date())),
      createur,
      validation: false,
    },
  });

  revalidatePath("/inventory/bsm");
  redirect(`/inventory/bsm/${bsm.id}`);
}

export async function addBsmLigne(bsmId: number, formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const quantite = Number(formData.get("quantite")) || 0;
  if (!idArticle || quantite <= 0) return;

  const article = await prisma.article.findUnique({ where: { id: idArticle } });
  if (!article) return;

  await prisma.$transaction([
    prisma.bsmArticle.create({
      data: { idBsm: bsmId, idArticle, quantite, prixHt: article.prixHt },
    }),
    prisma.article.update({
      where: { id: idArticle },
      data: { stockNeuf: { decrement: quantite } },
    }),
  ]);

  revalidatePath(`/inventory/bsm/${bsmId}`);
}

export async function validateBsm(id: number) {
  await requireAdmin();
  await prisma.bsm.update({ where: { id }, data: { validation: true } });
  revalidatePath(`/inventory/bsm/${id}`);
}

// ----------------------------------------------------------------------------
// BRM (stock return)
// ----------------------------------------------------------------------------

export async function createBrm(formData: FormData) {
  const brm = await prisma.brm.create({
    data: {
      typeRetour: String(formData.get("typeRetour") || "") || null,
      retourPar: String(formData.get("retourPar") || "") || null,
      dateRetour: new Date(String(formData.get("dateRetour") || new Date())),
      idBsm: numOrNull(formData.get("idBsm")),
    },
  });

  revalidatePath("/inventory/brm");
  redirect(`/inventory/brm/${brm.id}`);
}

export async function addBrmLigne(brmId: number, formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const quantite = Number(formData.get("quantite")) || 0;
  if (!idArticle || quantite <= 0) return;

  await prisma.$transaction([
    prisma.brmArticle.create({ data: { idBrm: brmId, idArticle, quantite } }),
    prisma.article.update({
      where: { id: idArticle },
      data: { stockNeuf: { increment: quantite } },
    }),
  ]);

  revalidatePath(`/inventory/brm/${brmId}`);
}

// ----------------------------------------------------------------------------
// Reception (goods receipt)
// ----------------------------------------------------------------------------

export async function createReception(formData: FormData) {
  const reception = await prisma.reception.create({
    data: {
      dateReception: new Date(String(formData.get("dateReception") || new Date())),
      receptionPar: String(formData.get("receptionPar") || "") || null,
      commentaire: String(formData.get("commentaire") || "") || null,
      statut: "En cours",
    },
  });

  revalidatePath("/inventory/receptions");
  redirect(`/inventory/receptions/${reception.id}`);
}

export async function addReceptionLigne(receptionId: number, formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const qtRecu = Number(formData.get("qtRecu")) || 0;
  if (!idArticle || qtRecu <= 0) return;

  const idCommandeRaw = String(formData.get("idCommande") || "").trim();
  const idCommande = idCommandeRaw ? Number(idCommandeRaw) : null;

  // If this receipt is against a purchase order line, find the matching
  // DA line (via commande_article -> da_article) so id_da is populated too,
  // same traceability chain as the legacy schema.
  let idDa: number | null = null;
  if (idCommande) {
    const ligne = await prisma.commandeArticle.findFirst({
      where: { idCommande, daArticle: { idArticle } },
      include: { daArticle: true },
    });
    idDa = ligne?.daArticle.idDa ?? null;
  }

  await prisma.$transaction([
    prisma.receptionArticle.create({
      data: {
        idReception: receptionId,
        idArticle,
        qtRecu,
        qtBonEtat: qtRecu,
        idCommande,
        idDa,
      },
    }),
    prisma.article.update({
      where: { id: idArticle },
      data: { stockNeuf: { increment: qtRecu } },
    }),
  ]);

  revalidatePath(`/inventory/receptions/${receptionId}`);
}

// ----------------------------------------------------------------------------
// Reference data
// ----------------------------------------------------------------------------

export async function addFamille(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.famille.create({
    data: { designation, codeFamille: String(formData.get("codeFamille") || "") || null },
  });
  revalidatePath("/inventory/settings/familles");
}

export async function deleteFamille(id: number) {
  await requireAdmin();
  await prisma.famille.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/inventory/settings/familles");
}

export async function addSousFamille(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  const idFamille = Number(formData.get("idFamille"));
  if (!designation || !idFamille) return;
  await prisma.sousFamille.create({
    data: {
      designation,
      idFamille,
      codeSousFamille: String(formData.get("codeSousFamille") || "") || null,
    },
  });
  revalidatePath("/inventory/settings/sous-familles");
}

export async function deleteSousFamille(id: number) {
  await requireAdmin();
  await prisma.sousFamille.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/inventory/settings/sous-familles");
}

export async function addMagasin(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.magasin.create({
    data: { designation, codeMagasin: String(formData.get("codeMagasin") || "") || null },
  });
  revalidatePath("/inventory/settings/magasins");
}

export async function deleteMagasin(id: number) {
  await requireAdmin();
  await prisma.magasin.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/inventory/settings/magasins");
}

// ----------------------------------------------------------------------------
// Article comments / files
// ----------------------------------------------------------------------------

export async function addArticleCommentaire(articleId: number, formData: FormData) {
  const texte = String(formData.get("texte") || "").trim();
  if (!texte) return;
  const auteur = await currentUserLogin();
  await prisma.articleCommentaire.create({
    data: { idArticle: articleId, texte, auteur },
  });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function addArticleFichier(articleId: number, formData: FormData) {
  const adresse = String(formData.get("adresse") || "").trim();
  if (!adresse) return;
  await prisma.articleFichier.create({
    data: { idArticle: articleId, adresse },
  });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function deleteArticleFichier(id: number, articleId: number) {
  await prisma.articleFichier.delete({ where: { id } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

// ----------------------------------------------------------------------------
// Caractéristiques (dynamic per-sous-famille custom fields)
// ----------------------------------------------------------------------------

export async function createCaracteristique(formData: FormData) {
  const nom = String(formData.get("nom") || "").trim();
  const idSousFamille = Number(formData.get("idSousFamille"));
  const type = String(formData.get("type") || "");
  if (!nom || !idSousFamille || !type) return;

  const caracteristique = await prisma.caracteristique.create({
    data: {
      nom,
      idSousFamille,
      type,
      champObligatoire: formData.get("champObligatoire") === "on",
    },
  });

  if (type === "TextBox") {
    await prisma.caracteristiqueTextbox.create({
      data: {
        idCaracteristique: caracteristique.id,
        type: str(formData, "textboxType"),
        valeurDefaut: str(formData, "valeurDefaut"),
      },
    });
  } else if (type === "Select Unique" || type === "Select Multiple" || type === "Radio Button") {
    const options = String(formData.get("options") || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (options.length > 0) {
      await prisma.caracteristiqueOption.createMany({
        data: options.map((valeurOption, i) => ({
          idCaracteristique: caracteristique.id,
          valeurOption,
          defaut: i === 0,
        })),
      });
    }
  }

  revalidatePath("/inventory/settings/caracteristiques");
}

export async function deleteCaracteristique(id: number) {
  await requireAdmin();
  await prisma.caracteristique.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/inventory/settings/caracteristiques");
}

export async function setArticleCaracteristique(
  articleId: number,
  idCaracteristique: number,
  formData: FormData
) {
  // A <select multiple> submits several "valeur" entries — getAll() covers
  // that case, and also works fine for single-value fields (returns one).
  const valeur = formData.getAll("valeur").map(String).join(",").trim();

  const existing = await prisma.tableauArticleCaracteristique.findFirst({
    where: { idArticle: articleId, idCaracteristique },
  });

  if (existing) {
    await prisma.tableauArticleCaracteristique.update({
      where: { id: existing.id },
      data: { valeur: valeur || null },
    });
  } else {
    await prisma.tableauArticleCaracteristique.create({
      data: { idArticle: articleId, idCaracteristique, valeur: valeur || null },
    });
  }

  revalidatePath(`/inventory/articles/${articleId}`);
}

// ----------------------------------------------------------------------------
// Unités
// ----------------------------------------------------------------------------

export async function createUnite(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.parametreUniteArticle.create({
    data: { designation, codeUnite: String(formData.get("codeUnite") || "") },
  });
  revalidatePath("/inventory/settings/unites");
}

export async function deleteUnite(id: number) {
  await requireAdmin();
  await prisma.parametreUniteArticle.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/inventory/settings/unites");
}

export async function setArticleUnite(articleId: number, formData: FormData) {
  const idUnite = Number(formData.get("idUnite"));
  if (!idUnite) return;

  await prisma.tableauArticleUnite.deleteMany({ where: { idArticle: articleId } });
  await prisma.tableauArticleUnite.create({ data: { idArticle: articleId, idUnite } });

  revalidatePath(`/inventory/articles/${articleId}`);
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Bon de livraison (formal delivery note, wraps an existing Reception)
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Reception <-> Commande header-level linking (distinct from
// ReceptionArticle.idCommande — see schema comment on ReceptionCommande)
// ----------------------------------------------------------------------------

export async function linkReceptionCommande(receptionId: number, formData: FormData) {
  const idCommande = Number(formData.get("idCommande"));
  if (!idCommande) return;

  const existing = await prisma.receptionCommande.findFirst({
    where: { idReception: receptionId, idCommande },
  });
  if (!existing) {
    await prisma.receptionCommande.create({ data: { idReception: receptionId, idCommande } });
  }
  revalidatePath(`/inventory/receptions/${receptionId}`);
}

export async function unlinkReceptionCommande(id: number, receptionId: number) {
  await prisma.receptionCommande.delete({ where: { id } });
  revalidatePath(`/inventory/receptions/${receptionId}`);
}

// ----------------------------------------------------------------------------
// Automatic reorder planning (Réapprovisionnement / Recomplétement)
// ----------------------------------------------------------------------------

function addPeriod(date: Date, count: number, periode: string | null): Date {
  const d = new Date(date);
  switch (periode) {
    case "Jour":
      d.setDate(d.getDate() + count);
      break;
    case "Semaine":
      d.setDate(d.getDate() + count * 7);
      break;
    case "Mois":
      d.setMonth(d.getMonth() + count);
      break;
    case "Année":
      d.setFullYear(d.getFullYear() + count);
      break;
    default:
      d.setDate(d.getDate() + count);
  }
  return d;
}

export async function createReapprovisionnement(formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const qt = Number(formData.get("qt"));
  if (!idArticle || !qt) return;

  await prisma.acReapprovisionnement.create({
    data: {
      idArticle,
      qt,
      delai: Number(formData.get("delai")) || 0,
      dateDebut: new Date(String(formData.get("dateDebut") || new Date())),
      reccurence: Number(formData.get("reccurence")) || 1,
      periode: str(formData, "periode"),
      dateLimite: formData.get("dateLimite") ? new Date(String(formData.get("dateLimite"))) : null,
    },
  });
  revalidatePath("/inventory/reapprovisionnement");
}

export async function deactivateReapprovisionnement(id: number) {
  await requireAdmin();
  await prisma.acReapprovisionnement.update({ where: { id }, data: { arr: true } });
  revalidatePath("/inventory/reapprovisionnement");
}

export async function createRecompletement(formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const dateLimite = formData.get("dateLimite");
  if (!idArticle || !dateLimite) return;

  await prisma.acRecompletement.create({
    data: {
      idArticle,
      delai: Number(formData.get("delai")) || 0,
      dateDebut: new Date(String(formData.get("dateDebut") || new Date())),
      reccurence: Number(formData.get("reccurence")) || 1,
      periode: str(formData, "periode"),
      dateLimite: new Date(String(dateLimite)),
    },
  });
  revalidatePath("/inventory/reapprovisionnement");
}

export async function deactivateRecompletement(id: number) {
  await requireAdmin();
  await prisma.acRecompletement.update({ where: { id }, data: { arr: true } });
  revalidatePath("/inventory/reapprovisionnement");
}

/** Scans active plans of both kinds and logs a due "échéance" for any
 * whose next occurrence has arrived, based on the most recent prior
 * occurrence (or dateDebut if none yet) + reccurence × periode. Mirrors
 * the preventive-maintenance generation pattern (generateSystematiquePlans
 * in the work-orders module) — same reasoning applies: the legacy app's
 * exact due-date algorithm wasn't traceable in the source, so this is a
 * reasonable reconstruction, not a confirmed one. */
export async function checkReapprovisionnementEcheances() {
  await requireAdmin();
  const plans = await prisma.acReapprovisionnement.findMany({ where: { arr: false } });
  let created = 0;
  const now = new Date();

  for (const plan of plans) {
    if (plan.dateLimite && plan.dateLimite < now) continue;

    const last = await prisma.acReapprovisionnementEch.findFirst({
      where: { idRep: plan.id },
      orderBy: { dateEch: "desc" },
    });
    const nextDue = last
      ? addPeriod(last.dateEch, plan.reccurence, plan.periode)
      : plan.dateDebut;

    if (nextDue <= now) {
      await prisma.acReapprovisionnementEch.create({
        data: { idRep: plan.id, dateEch: nextDue, heureEch: nextDue.toTimeString().slice(0, 5) },
      });
      created++;
    }
  }
  revalidatePath("/inventory/reapprovisionnement");
}

export async function checkRecompletementEcheances() {
  await requireAdmin();
  const plans = await prisma.acRecompletement.findMany({ where: { arr: false } });
  let created = 0;
  const now = new Date();

  for (const plan of plans) {
    if (plan.dateLimite < now) continue;

    const last = await prisma.acRecompletementEch.findFirst({
      where: { idRep: plan.id },
      orderBy: { dateEch: "desc" },
    });
    const nextDue = last
      ? addPeriod(last.dateEch, plan.reccurence, plan.periode)
      : plan.dateDebut;

    if (nextDue <= now) {
      await prisma.acRecompletementEch.create({
        data: { idRep: plan.id, dateEch: nextDue, heureEch: nextDue.toTimeString().slice(0, 5) },
      });
      created++;
    }
  }
  revalidatePath("/inventory/reapprovisionnement");
}

export async function createBonLivraison(receptionId: number, formData: FormData) {
  const livraisonPar = await currentUserLogin();

  const bl = await prisma.bonLivraison.create({
    data: {
      idReception: receptionId,
      dateLivraison: new Date(String(formData.get("dateLivraison") || new Date())),
      livraisonPar,
      blFournisseur: str(formData, "blFournisseur"),
      statut: "En cours",
    },
  });

  revalidatePath(`/inventory/receptions/${receptionId}`);
  redirect(`/inventory/livraisons/${bl.id}`);
}

// ----------------------------------------------------------------------------
// Bon de livraison line items — confirmed real (creer_bl.cs), separate
// from the linked Reception's own line items (see schema comment on
// BonLivraison for the correction history).
// ----------------------------------------------------------------------------

export async function addLivraisonLigne(livraisonId: number, formData: FormData) {
  const idArticle = numOrNull(formData.get("idArticle"));
  const qt = numOrNull(formData.get("qt"));
  if (!idArticle || !qt) return;

  await prisma.livraisonArticle.create({
    data: {
      idLivraison: livraisonId,
      idArticle,
      qt,
      prixHt: numOrNull(formData.get("prixHt")) ?? 0,
      remise: numOrNull(formData.get("remise")) ?? 0,
      investissement: formData.get("investissement") === "on",
    },
  });
  revalidatePath(`/inventory/livraisons/${livraisonId}`);
}

export async function deleteLivraisonLigne(id: number, livraisonId: number) {
  await prisma.livraisonArticle.delete({ where: { id } });
  revalidatePath(`/inventory/livraisons/${livraisonId}`);
}

// ----------------------------------------------------------------------------
// Article photo — confirmed via article_image.cs to be a single `photo`
// column directly on `article`, not a separate images table.
// ----------------------------------------------------------------------------

export async function updateArticlePhoto(articleId: number, formData: FormData) {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  await prisma.article.update({
    where: { id: articleId },
    data: { photo: buffer },
  });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function deleteArticlePhoto(articleId: number) {
  await prisma.article.update({ where: { id: articleId }, data: { photo: null } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

// ----------------------------------------------------------------------------
// Article reference-data / profile (classification, emplacement, stockage,
// équipements compatibles, fournisseurs habituels)
// ----------------------------------------------------------------------------

export async function createParametreClassificationArticle(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreClassificationArticle.create({
    data: { designation, codeClassification: str(formData, "codeClassification") },
  });
  revalidatePath("/inventory/settings/article-reference");
}

export async function createParametreEmplacementArticle(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreEmplacementArticle.create({
    data: { designation, codeEmplacement: str(formData, "codeEmplacement") },
  });
  revalidatePath("/inventory/settings/article-reference");
}

export async function createParametreStockageArticle(formData: FormData) {
  const designation = str(formData, "designation");
  if (!designation) return;
  await prisma.parametreStockageArticle.create({
    data: { designation, codeStockage: str(formData, "codeStockage") },
  });
  revalidatePath("/inventory/settings/article-reference");
}

// Delete actions for the 3 article-reference lists above — genuinely
// missing until this pass, same gap as the fournisseur-reference lists.
// Admin-gated, matching this app's established pattern.

export async function deleteParametreClassificationArticle(id: number) {
  await requireAdmin();
  await prisma.parametreClassificationArticle.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/inventory/settings/article-reference");
}

export async function deleteParametreEmplacementArticle(id: number) {
  await requireAdmin();
  await prisma.parametreEmplacementArticle.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/inventory/settings/article-reference");
}

export async function deleteParametreStockageArticle(id: number) {
  await requireAdmin();
  await prisma.parametreStockageArticle.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/inventory/settings/article-reference");
}

export async function linkArticleClassification(articleId: number, formData: FormData) {
  const idClassification = numOrNull(formData.get("idClassification"));
  if (!idClassification) return;
  await prisma.tableauArticleClassification.create({ data: { idArticle: articleId, idClassification } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function unlinkArticleClassification(id: number, articleId: number) {
  await prisma.tableauArticleClassification.delete({ where: { id } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function linkArticleEmplacement(articleId: number, formData: FormData) {
  const idEmplacement = numOrNull(formData.get("idEmplacement"));
  if (!idEmplacement) return;
  await prisma.tableauArticleEmplacement.create({ data: { idArticle: articleId, idEmplacement } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function unlinkArticleEmplacement(id: number, articleId: number) {
  await prisma.tableauArticleEmplacement.delete({ where: { id } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function linkArticleStockage(articleId: number, formData: FormData) {
  const idStockage = numOrNull(formData.get("idStockage"));
  if (!idStockage) return;
  await prisma.tableauArticleStockage.create({ data: { idArticle: articleId, idStockage } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function unlinkArticleStockage(id: number, articleId: number) {
  await prisma.tableauArticleStockage.delete({ where: { id } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function linkArticleEquipement(articleId: number, formData: FormData) {
  const idEquipement = numOrNull(formData.get("idEquipement"));
  if (!idEquipement) return;
  await prisma.tableauArticleEquipement.create({ data: { idArticle: articleId, idEquipement } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function unlinkArticleEquipement(id: number, articleId: number) {
  await prisma.tableauArticleEquipement.delete({ where: { id } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function linkArticleFournisseur(articleId: number, formData: FormData) {
  const idFournisseur = numOrNull(formData.get("idFournisseur"));
  if (!idFournisseur) return;
  await prisma.tableauArticleFournisseur.create({ data: { idArticle: articleId, idFournisseur } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

export async function unlinkArticleFournisseur(id: number, articleId: number) {
  await prisma.tableauArticleFournisseur.delete({ where: { id } });
  revalidatePath(`/inventory/articles/${articleId}`);
}

function str(formData: FormData, key: string) {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : null;
}

function numOrZero(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : 0;
}
