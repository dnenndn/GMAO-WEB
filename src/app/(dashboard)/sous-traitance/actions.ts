"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserLogin, requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

// ----------------------------------------------------------------------------
// Demande Sous-Traitance (Ds) — created inline when needed. Confirmed real
// table (demande_sous_traitance), creation traced to DIST.cs. See schema
// comment on DemandeSousTraitance for the full correction history.
// ----------------------------------------------------------------------------

async function createDemandeSousTraitance() {
  const createur = await currentUserLogin();
  const now = new Date();
  return prisma.demandeSousTraitance.create({
    data: {
      dateCreation: now,
      heureCreation: now.toTimeString().slice(0, 5),
      createur,
      statut: 0,
    },
  });
}

// ----------------------------------------------------------------------------
// Devis (quotes)
// ----------------------------------------------------------------------------

export async function createDevis(formData: FormData) {
  const createur = await currentUserLogin();
  const ds = await createDemandeSousTraitance();

  const devis = await prisma.dsDevis.create({
    data: {
      idDs: ds.id,
      dateDevis: new Date(String(formData.get("dateDevis") || new Date())),
      createur,
      statut: "En cours",
      livr: formData.get("livr") === "on",
    },
  });

  const idsFournisseurs = formData.getAll("idsFournisseurs").map(Number).filter(Boolean);
  if (idsFournisseurs.length > 0) {
    await prisma.dsDevisFournisseur.createMany({
      data: idsFournisseurs.map((idFournisseur) => ({ idDevis: devis.id, idFournisseur })),
    });
  }

  revalidatePath("/sous-traitance/devis");
  redirect(`/sous-traitance/devis/${devis.id}`);
}

export async function addDevisLigne(devisId: number, formData: FormData) {
  const qt = Number(formData.get("qt")) || 0;
  if (qt <= 0) return;

  await prisma.dsDevisArticle.create({
    data: {
      idDevis: devisId,
      idActivite: numOrNull(formData.get("idActivite")),
      qt,
      prixHt: numOrNull(formData.get("prixHt")),
      remise: numOrNull(formData.get("remise")),
      source: str(formData, "source"),
    },
  });

  revalidatePath(`/sous-traitance/devis/${devisId}`);
}

/** Edits an existing quote line's price/discount — confirmed via
 * modifier_devis_st.cs's real UPDATE statement (keyed by
 * devis+id_t+source, the same polymorphic key used elsewhere for this
 * line type). Quantity isn't part of that UPDATE in the source, so it's
 * intentionally not editable here either. */
export async function updateDevisLigne(ligneId: number, devisId: number, formData: FormData) {
  const prixHt = numOrNull(formData.get("prixHt"));
  const remise = numOrNull(formData.get("remise"));

  await prisma.dsDevisArticle.update({
    where: { id: ligneId },
    data: { prixHt, remise },
  });

  revalidatePath(`/sous-traitance/devis/${devisId}`);
}

// ----------------------------------------------------------------------------
// Commandes (orders)
// ----------------------------------------------------------------------------

export async function createCommandeSt(formData: FormData) {
  const createur = await currentUserLogin();
  const idFournisseur = Number(formData.get("idFournisseur"));
  if (!idFournisseur) return;

  const idDevis = numOrNull(formData.get("idDevis"));
  let idDs: number;
  if (idDevis) {
    const devis = await prisma.dsDevis.findUnique({ where: { id: idDevis } });
    idDs = devis?.idDs ?? (await createDemandeSousTraitance()).id;
  } else {
    idDs = (await createDemandeSousTraitance()).id;
  }

  const count = await prisma.dsCommande.count();
  const nCommande = `DS-PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const commande = await prisma.dsCommande.create({
    data: {
      nCommande,
      idFournisseur,
      idDs,
      dateCommande: new Date(String(formData.get("dateCommande") || new Date())),
      urgence: str(formData, "urgence"),
      personneContacter: str(formData, "personneContacter"),
      statut: "En attente",
      createur,
    },
  });

  revalidatePath("/sous-traitance/commandes");
  redirect(`/sous-traitance/commandes/${commande.id}`);
}

export async function addCommandeStLigne(commandeId: number, formData: FormData) {
  const idDevisArticle = numOrNull(formData.get("idDevisArticle"));
  const qt = Number(formData.get("qt")) || 0;
  if (qt <= 0) return;

  let idActivite: number | null = null;
  let prixHt: number | null = null;
  let source: string | null = null;

  if (idDevisArticle) {
    const ligne = await prisma.dsDevisArticle.findUnique({ where: { id: idDevisArticle } });
    if (ligne) {
      idActivite = ligne.idActivite;
      prixHt = ligne.prixHt ? Number(ligne.prixHt) : null;
      source = ligne.source;
    }
  }

  await prisma.dsCommandeArticle.create({
    data: {
      idCommande: commandeId,
      idActivite,
      qt,
      prixHt: numOrNull(formData.get("prixHt")) ?? prixHt,
      remise: numOrNull(formData.get("remise")),
      source,
      descr: str(formData, "descr"),
    },
  });

  revalidatePath(`/sous-traitance/commandes/${commandeId}`);
}

export async function updateCommandeStStatut(id: number, statut: string) {
  await requireAdmin();
  await prisma.dsCommande.update({ where: { id }, data: { statut } });
  revalidatePath("/sous-traitance/commandes");
  revalidatePath(`/sous-traitance/commandes/${id}`);
}

// ----------------------------------------------------------------------------
// Signature — electronic sign-off PIN for order approval. Confirmed via
// signature_commande_attente_st.cs.
// ----------------------------------------------------------------------------

export async function registerSignature(formData: FormData) {
  const login = await currentUserLogin();
  const pin = String(formData.get("pin") || "").trim();
  if (pin.length < 4) return;

  const user = await prisma.utilisateur.findUnique({ where: { login } });
  if (!user) return;

  const hash = await bcrypt.hash(pin, 10);
  await prisma.signature.upsert({
    where: { idUtilisateur: user.id },
    update: { designation: hash },
    create: { idUtilisateur: user.id, designation: hash },
  });

  revalidatePath("/sous-traitance/settings/signature");
}

/** Signs off a pending subcontracting order, matching
 * signature_commande_attente_st.cs's confirmed cascade exactly: verifies
 * the current user's PIN against their registered Signature, then sets
 * statut → "En cours" + dateSignature, and for every order line sourced
 * from the Magasin Sous-Traitance register ("ex"), logs a movement event
 * (mvt = "Commande") and moves that item's location to "Reparation",
 * clearing its current equipment link. */
export async function signCommandeSt(commandeId: number, formData: FormData) {
  const login = await currentUserLogin();
  const pin = String(formData.get("pin") || "").trim();

  const fail = (reason: string) =>
    redirect(`/sous-traitance/commandes/${commandeId}?signError=${encodeURIComponent(reason)}`);

  if (!pin) fail("PIN requis.");

  const user = await prisma.utilisateur.findUnique({
    where: { login },
    include: { signature: true },
  });
  if (!user?.signature) {
    fail("Aucune signature enregistrée pour cet utilisateur — voir Paramètres > Signature.");
  }

  const valid = await bcrypt.compare(pin, user!.signature!.designation);
  if (!valid) {
    fail("Code de signature incorrect.");
  }

  const now = new Date();

  const exLignes = await prisma.dsCommandeArticle.findMany({
    where: { idCommande: commandeId, source: "ex" },
  });

  await prisma.$transaction([
    prisma.dsCommande.update({
      where: { id: commandeId },
      data: { statut: "En cours", dateSignature: now },
    }),
    ...exLignes.flatMap((l) => {
      if (l.idT == null) return [];
      return [
        prisma.dsHistoriqueMvt.create({
          data: {
            idT: l.idT,
            dateMvt: now,
            heureMvt: now.toTimeString().slice(0, 5),
            mvt: "Commande",
          },
        }),
        prisma.magasinSousTraitance.update({
          where: { id: l.idT },
          data: { emplacementActuel: "Reparation", equipementActuel: null },
        }),
      ];
    }),
  ]);

  revalidatePath("/sous-traitance/commandes");
  redirect(`/sous-traitance/commandes/${commandeId}`);
}

// ----------------------------------------------------------------------------
// Bons de livraison (delivery notes)
// ----------------------------------------------------------------------------

export async function createLivraison(formData: FormData) {
  const idCommande = numOrNull(formData.get("idCommande"));
  let idFournisseur: number | null = null;
  if (idCommande) {
    const commande = await prisma.dsCommande.findUnique({ where: { id: idCommande } });
    idFournisseur = commande?.idFournisseur ?? null;
  }

  const livraison = await prisma.dsBonLivraison.create({
    data: {
      idCommande,
      idFournisseur,
      dateLivraison: new Date(String(formData.get("dateLivraison") || new Date())),
      livraisonPar: str(formData, "livraisonPar"),
      blFournisseur: str(formData, "blFournisseur"),
      statut: "En cours",
    },
  });

  revalidatePath("/sous-traitance/livraisons");
  redirect(`/sous-traitance/livraisons/${livraison.id}`);
}

export async function addLivraisonLigne(livraisonId: number, formData: FormData) {
  const idDsCommandeArticle = Number(formData.get("idDsCommandeArticle"));
  const qt = Number(formData.get("qt")) || 0;
  if (!idDsCommandeArticle || qt <= 0) return;

  const ligne = await prisma.dsCommandeArticle.findUnique({ where: { id: idDsCommandeArticle } });
  if (!ligne) return;

  await prisma.$transaction([
    prisma.dsLivraisonArticle.create({
      data: {
        idLivraison: livraisonId,
        idDsCommandeArticle,
        qt,
        prixHt: ligne.prixHt,
        remise: ligne.remise,
      },
    }),
    prisma.dsCommandeArticle.update({
      where: { id: idDsCommandeArticle },
      data: { reception: { increment: qt } },
    }),
  ]);

  revalidatePath(`/sous-traitance/livraisons/${livraisonId}`);
}

// ----------------------------------------------------------------------------
// Reference data
// ----------------------------------------------------------------------------

export async function addActivite(formData: FormData) {
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;
  await prisma.activiteSousTraitance.create({
    data: {
      designation,
      code: str(formData, "code"),
      typeArticle: str(formData, "typeArticle"),
    },
  });
  revalidatePath("/sous-traitance/settings/activites");
}

export async function deleteActivite(id: number) {
  await requireAdmin();
  await prisma.activiteSousTraitance.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/sous-traitance/settings/activites");
}

// ----------------------------------------------------------------------------
// Activité scoping (Famille/SousFamille) & operations checklist
// ----------------------------------------------------------------------------

export async function linkActiviteFamille(activiteId: number, formData: FormData) {
  const idFamille = numOrNull(formData.get("idFamille"));
  if (!idFamille) return;
  await prisma.activiteFamille.create({ data: { idActivite: activiteId, idFamille } });
  revalidatePath(`/sous-traitance/settings/activites/${activiteId}`);
}

export async function unlinkActiviteFamille(id: number, activiteId: number) {
  await prisma.activiteFamille.delete({ where: { id } });
  revalidatePath(`/sous-traitance/settings/activites/${activiteId}`);
}

export async function linkActiviteSousFamille(activiteId: number, formData: FormData) {
  const idSousFamille = numOrNull(formData.get("idSousFamille"));
  if (!idSousFamille) return;
  await prisma.activiteSousFamille.create({ data: { idActivite: activiteId, idSousFamille } });
  revalidatePath(`/sous-traitance/settings/activites/${activiteId}`);
}

export async function unlinkActiviteSousFamille(id: number, activiteId: number) {
  await prisma.activiteSousFamille.delete({ where: { id } });
  revalidatePath(`/sous-traitance/settings/activites/${activiteId}`);
}

export async function addActiviteOperation(activiteId: number, formData: FormData) {
  const operation = String(formData.get("operation") || "").trim();
  if (!operation) return;
  await prisma.activiteOperation.create({ data: { idActivite: activiteId, operation } });
  revalidatePath(`/sous-traitance/settings/activites/${activiteId}`);
}

export async function removeActiviteOperation(id: number, activiteId: number) {
  await prisma.activiteOperation.delete({ where: { id } });
  revalidatePath(`/sous-traitance/settings/activites/${activiteId}`);
}

// ----------------------------------------------------------------------------
// Matière première (raw material provisioning) & pièces nouvelles (custom
// fabrication requests)
// ----------------------------------------------------------------------------

export async function addDsMp(formData: FormData) {
  const idDemande = Number(formData.get("idDemande"));
  const idArticle = Number(formData.get("idArticle"));
  const qt = Number(formData.get("qt"));
  if (!idDemande || !idArticle || !qt) return;

  await prisma.dsMp.create({ data: { idDemande, idArticle, qt } });
  revalidatePath("/sous-traitance/matiere-premiere");
}

export async function deleteDsMp(id: number) {
  await prisma.dsMp.delete({ where: { id } });
  revalidatePath("/sous-traitance/matiere-premiere");
}

export async function addDsNvArticle(formData: FormData) {
  const idDemande = Number(formData.get("idDemande"));
  const idArticle = Number(formData.get("idArticle"));
  const idActivite = Number(formData.get("idActivite"));
  const quantite = Number(formData.get("quantite"));
  if (!idDemande || !idArticle || !idActivite || !quantite) return;

  await prisma.dsNvArticle.create({
    data: { idDemande, idArticle, idActivite, quantite, description: str(formData, "description") },
  });
  revalidatePath("/sous-traitance/matiere-premiere");
}

export async function deleteDsNvArticle(id: number) {
  await prisma.dsNvArticle.delete({ where: { id } });
  revalidatePath("/sous-traitance/matiere-premiere");
}

// ----------------------------------------------------------------------------
// Factures (invoices)
// ----------------------------------------------------------------------------

export async function createDsFacture(formData: FormData) {
  const createur = await currentUserLogin();
  const idFournisseur = Number(formData.get("idFournisseur"));
  if (!idFournisseur) return;

  const idsLivraisons = formData.getAll("idsLivraisons").map(Number).filter(Boolean);

  const facture = await prisma.dsFacture.create({
    data: {
      idFournisseur,
      dateFacture: new Date(String(formData.get("dateFacture") || new Date())),
      createur,
      tva: Number(formData.get("tva")) || 0,
      nFacture: str(formData, "nFacture"),
    },
  });

  if (idsLivraisons.length > 0) {
    await prisma.dsFactureLivraison.createMany({
      data: idsLivraisons.map((idLivraison) => ({ idFacture: facture.id, idLivraison })),
    });
  }

  revalidatePath("/sous-traitance/factures");
  redirect(`/sous-traitance/factures/${facture.id}`);
}

// ----------------------------------------------------------------------------
// Magasin Sous-Traitance — tracks a physical item/tool through its
// lifecycle at a subcontractor (current demande, activity, location,
// equipment, repair count).
// ----------------------------------------------------------------------------

export async function createMagasinSousTraitance(formData: FormData) {
  const idArticle = Number(formData.get("idArticle"));
  const refInterne = str(formData, "refInterne");
  if (!idArticle || !refInterne) return;

  await prisma.magasinSousTraitance.create({
    data: {
      idArticle,
      refInterne,
      description: str(formData, "description"),
      emplacementActuel: str(formData, "emplacementActuel"),
      activiteActuel: numOrNull(formData.get("activiteActuel")),
      equipementActuel: numOrNull(formData.get("equipementActuel")),
    },
  });
  revalidatePath("/sous-traitance/magasin");
}

export async function updateMagasinSousTraitance(id: number, formData: FormData) {
  await prisma.magasinSousTraitance.update({
    where: { id },
    data: {
      reception: formData.get("reception") === "on",
      nbrReparation: Number(formData.get("nbrReparation")) || 0,
      emplacementActuel: str(formData, "emplacementActuel"),
      activiteActuel: numOrNull(formData.get("activiteActuel")),
      description: str(formData, "description"),
    },
  });
  revalidatePath("/sous-traitance/magasin");
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function str(formData: FormData, key: string) {
  const v = String(formData.get(key) || "").trim();
  return v || null;
}

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : null;
}
