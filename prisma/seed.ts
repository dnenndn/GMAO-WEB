import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("demo1234", 10);
  const adminUser = await prisma.utilisateur.upsert({
    where: { login: "admin" },
    update: {},
    create: { login: "admin", motPasse: hash, fonction: "Superviseur", role: "Admin" },
  });

  const fonction = await prisma.fonctionIntervenant.create({
    data: { designation: "Mécanicien" },
  });

  const intervenant = await prisma.intervenant.create({
    data: {
      nom: "Karim Ben Ali",
      idFonction: fonction.id,
      tauxHoraire: 25,
      chefEquipe: true,
    },
  });

  const atelier = await prisma.equipement.create({
    data: { code: "AT-01", designation: "Atelier Production" },
  });
  const equipement = await prisma.equipement.create({
    data: { code: "EQ-14", designation: "Compresseur Industriel", idParent: atelier.id },
  });

  const classe = await prisma.parametreClasseIntervention.create({
    data: { code: "MEC", designation: "Mécanique" },
  });
  const intervention = await prisma.parametreIntervention.create({
    data: { code: "REP-01", intervention: "Remplacement joint" },
  });
  const anomalie = await prisma.parametreAnomalie.create({
    data: { code: "AN-03", anomalie: "Fuite d'huile" },
  });

  const di = await prisma.demandeIntervention.create({
    data: {
      dateEmission: new Date(),
      urgence: "Elevée",
      idDefaillance: anomalie.id,
      descriptionDefaillance: "Fuite d'huile importante sous le compresseur.",
      createur: "admin",
      atelier: atelier.id,
      equipement: equipement.id,
      arretMachine: true,
      statut: "Confirmée",
      nDi: "DI-2026-0001",
    },
  });

  const ot1 = await prisma.ordreTravail.create({
    data: {
      nOt: "OT-2026-0001",
      idDi: di.id,
      urgence: "Elevée",
      statut: "Planifié",
      type: "Corrective",
      idIntervention: intervention.id,
      idClasse: classe.id,
      idSuperviseur: intervenant.id,
      createur: "admin",
      atelier: atelier.id,
      equipement: equipement.id,
      idDefaillance: anomalie.id,
      debutPrevu: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  // --- Production module reference data ---
  const presse = await prisma.equipement.create({
    data: { code: "EQ-30", designation: "Presse à briques n°1", idParent: atelier.id },
  });
  const four1 = await prisma.equipement.create({
    data: { code: "EQ-40", designation: "Four tunnel n°1", idParent: atelier.id },
  });
  const ligneEmballage = await prisma.equipement.create({
    data: { code: "EQ-50", designation: "Ligne d'emballage n°1", idParent: atelier.id },
  });

  await prisma.prodEquipement.create({
    data: { idEquipement: presse.id, uniteProduction: "Fabrication" },
  });
  await prisma.prodEquipement.create({
    data: { idEquipement: four1.id, uniteProduction: "Four" },
  });
  await prisma.prodEquipement.create({
    data: { idEquipement: ligneEmballage.id, uniteProduction: "Emballage" },
  });

  await prisma.prodTypeBrique.createMany({
    data: [
      { designation: "Brique 8 trous", poid: 3.2, poidVert: 3.9 },
      { designation: "Brique 12 trous", poid: 4.5, poidVert: 5.4 },
      { designation: "Hourdis 16", poid: 6.1, poidVert: 7.3 },
    ],
  });

  await prisma.prodSaisie.createMany({
    data: [
      { designation: "Humidité argile", unite: "%", cible: 1 },
      { designation: "Granulométrie", unite: "mm", cible: 2 },
      { designation: "Température four", unite: "°C", cible: 3, poidFour: true },
      { designation: "Pression presse", unite: "bar", cible: 4 },
      { designation: "Cadence presse", unite: "u/h", cible: 5 },
    ],
  });

  await prisma.prodAnomalie.createMany({
    data: [
      { anomalie: "Bourrage presse", uniteProduction: "Fabrication" },
      { anomalie: "Panne convoyeur", uniteProduction: "Four" },
      { anomalie: "Casse produit", uniteProduction: "Emballage" },
    ],
  });

  // --- Inventory module reference data ---
  const magasin = await prisma.magasin.create({
    data: { codeMagasin: "MAG-01", designation: "Magasin central" },
  });
  const familleMeca = await prisma.famille.create({
    data: { codeFamille: "MEC", designation: "Mécanique" },
  });
  const sousFamilleRoul = await prisma.sousFamille.create({
    data: {
      idFamille: familleMeca.id,
      codeSousFamille: "ROUL",
      designation: "Roulements",
    },
  });

  const articleRoulement = await prisma.article.create({
    data: {
      codeArticle: "ART-0001",
      reference: "SKF-6205",
      designation: "Roulement à billes 6205",
      prixHt: 12.5,
      stockNeuf: 8,
      stockMini: 5,
      stockMaxi: 30,
      marque: "SKF",
      idMagasin: magasin.id,
    },
  });
  await prisma.tableauArticleSousFamille.create({
    data: { idArticle: articleRoulement.id, idSousFamille: sousFamilleRoul.id },
  });

  await prisma.article.create({
    data: {
      codeArticle: "ART-0002",
      reference: "JT-40x3",
      designation: "Joint torique 40x3",
      prixHt: 0.8,
      stockNeuf: 2,
      stockMini: 10,
      stockMaxi: 100,
      idMagasin: magasin.id,
    },
  });

  // --- Procurement module reference data ---
  const fournisseur = await prisma.fournisseur.create({
    data: {
      codeFournisseur: "FRS-0001",
      nom: "Tunisie Roulements SARL",
      activite: "Pièces mécaniques",
      ville: "Sfax",
      pays: "Tunisie",
      delai: 7,
      tvaDefaut: 19,
    },
  });

  const da = await prisma.demandeAchat.create({
    data: {
      dateDa: new Date(),
      demandeur: "Karim Ben Ali",
      periode: "Q1 2026",
      createur: "admin",
      statut: "En cours",
    },
  });
  const daLigne = await prisma.daArticle.create({
    data: {
      idDa: da.id,
      idArticle: articleRoulement.id,
      qt: 20,
      qtRestant: 20,
      motif: "Réapprovisionnement stock sécurité",
    },
  });
  await prisma.daAction.create({
    data: { idDa: da.id, type: "Confirmée", par: "admin" },
  });

  // --- Workshop module reference data ---
  const machine = await prisma.atelierMachine.create({
    data: { designation: "Tour CNC n°1" },
  });
  const typePiece = await prisma.atelierParametrePiece.create({
    data: { designation: "Axe" },
  });
  const priorite = await prisma.atelierParametrePriorite.create({
    data: { designation: "Normale" },
  });
  const conception = await prisma.atelierParametreConception.create({
    data: { designation: "Reproduction" },
  });

  const job = await prisma.atelierCreer.create({
    data: {
      nOf: "OF-2026-0001",
      equipement: equipement.id,
      idDemandeur: intervenant.id,
      dateConsultation: new Date(),
      nPlan: "PL-4471",
      nRevision: "B",
      quantite: 5,
      dimension: "Ø40x120mm",
      idParametrePiece: typePiece.id,
      idParametrePriorite: priorite.id,
      idParametreConception: conception.id,
      etat: "En Cours Atelier",
      createur: "admin",
    },
  });
  await prisma.atelierEtat.createMany({
    data: [
      { idAtelier: job.id, etat: "En Attente" },
      { idAtelier: job.id, etat: "En Cours Atelier" },
    ],
  });
  await prisma.atelierSuiviJournalier.create({
    data: {
      date: new Date(),
      heureDeb: "08:00",
      heureFin: "12:00",
      nOf: job.nOf,
      idMachine: machine.id,
      idOperateur: intervenant.id,
      qtSolde: 3,
    },
  });

  // --- Fleet module reference data ---
  const typeVehicule = await prisma.typeVehicule.create({
    data: { codeVehicule: "CAM", designation: "Camion" },
  });
  const chauffeur = await prisma.chauffeur.create({
    data: { code: "CH-01", nom: "Mohamed Trabelsi" },
  });
  const categorieCharge = await prisma.categorieDeCharge.create({
    data: { designation: "Poids lourd > 3.5T" },
  });
  const typeCarburant = await prisma.typeCarburant.create({
    data: { designation: "Gasoil" },
  });

  const engin = await prisma.engin.create({
    data: {
      matricule: "123 TUN 4567",
      numCarte: "CARD-0012",
      designation: "Camion benne",
      marque: "Iveco",
      idVehicule: typeVehicule.id,
      idChauffeur: chauffeur.id,
      idCategorie: categorieCharge.id,
    },
  });

  const soon = new Date();
  soon.setDate(soon.getDate() + 15);
  await prisma.enginAssurance.create({
    data: {
      idEngin: engin.id,
      raisonSocial: "STAR Assurances",
      dateDeb: new Date(),
      dateExp: soon,
      prix: 850,
      notAvant: 30,
    },
  });
  await prisma.enginSortieCarburant.create({
    data: {
      idEngin: engin.id,
      idCarbu: typeCarburant.id,
      quantite: 80,
      prixU: 2.15,
      prixTtc: 172,
      date: new Date(),
      compteur: 45230,
    },
  });

  // --- Budget module reference data ---
  // A signed, in-progress commande so the budget variance page has real
  // data to show on first run.
  const commandeSignee = await prisma.commande.create({
    data: {
      nCommande: "PO-2026-DEMO",
      idFournisseur: fournisseur.id,
      dateCommande: new Date(),
      dateSignature: new Date(),
      statut: "En cours",
      createur: "admin",
    },
  });
  await prisma.commandeArticle.create({
    data: {
      idCommande: commandeSignee.id,
      idDaArticle: daLigne.id,
      qtCommande: 10,
      prixHt: 12.5,
      remise: 5,
    },
  });

  const budgetStart = new Date();
  budgetStart.setDate(1); // start of current month, for a clean demo period
  await prisma.budget.create({
    data: {
      nom: "Budget pièces mécaniques",
      description: "Enveloppe mensuelle pour les achats de pièces mécaniques.",
      dateCreation: budgetStart,
      duree: "Chaque Mois",
      montant: 2000,
      categorieChoix: true,
      categories: { create: [{ idCategorie: familleMeca.id }] },
    },
  });

  // --- Subcontracting module reference data ---
  const activite = await prisma.activiteSousTraitance.create({
    data: { code: "USI-01", designation: "Usinage de précision" },
  });

  const demandeSousTraitanceDemo = await prisma.demandeSousTraitance.create({
    data: {
      dateCreation: new Date(),
      createur: "admin",
      statut: 1,
    },
  });

  const devis = await prisma.dsDevis.create({
    data: {
      idDs: demandeSousTraitanceDemo.id,
      dateDevis: new Date(),
      createur: "admin",
      statut: "En cours",
    },
  });
  await prisma.dsDevisFournisseur.create({
    data: { idDevis: devis.id, idFournisseur: fournisseur.id },
  });
  await prisma.dsDevisArticle.create({
    data: {
      idDevis: devis.id,
      idActivite: activite.id,
      qt: 4,
      prixHt: 45,
      source: "Devis initial",
    },
  });

  await prisma.dsHistoriqueMvt.createMany({
    data: [
      { dateMvt: new Date(), mvt: "Usine" },
      { dateMvt: new Date(), mvt: "Magasin" },
    ],
  });

  // --- Tooling module reference data ---
  const secteur = await prisma.secteur.create({
    data: { code: "SEC-01", designation: "Atelier mécanique" },
  });
  const tabType = await prisma.tabType.create({
    data: { code: "TYP-01", designation: "Instrument de mesure" },
  });
  await prisma.outil.create({
    data: {
      codeOutils: "OUT-0001",
      designation: "Pied à coulisse numérique",
      fkSecteurId: secteur.id,
      fkTypeId: tabType.id,
      numSerie: "SN-88213",
      fabriquant: "Mitutoyo",
      statut: true,
    },
  });

  // --- Analytics module demo data ---
  // A second, closed work order with real timestamps + cost data so the
  // reliability (MTTR/MTBF) and cost Pareto pages have something to show.
  const closedStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10);
  const closedEnd = new Date(closedStart.getTime() + 1000 * 60 * 60 * 4); // 4h repair
  const ot2 = await prisma.ordreTravail.create({
    data: {
      nOt: "OT-2026-0002",
      idDi: di.id,
      urgence: "Moyenne",
      statut: "Clôturé",
      type: "Corrective",
      idClasse: classe.id,
      idSuperviseur: intervenant.id,
      createur: "admin",
      atelier: atelier.id,
      equipement: equipement.id,
      idDefaillance: anomalie.id,
      dateDebut: closedStart,
      heureDebut: closedStart.toTimeString().slice(0, 5),
      dateFin: closedEnd,
      heureFin: closedEnd.toTimeString().slice(0, 5),
    },
  });

  const bsmAnalytics = await prisma.bsm.create({
    data: {
      typeStock: "Maintenance",
      bsmMaintenance: true,
      nOt: ot2.nOt,
      liOt: ot2.nOt, // string field, matches nOt — see schema note on Bsm.liOt
      dateBsm: closedStart,
      createur: "admin",
      validation: true,
    },
  });
  await prisma.bsmArticle.create({
    data: {
      idBsm: bsmAnalytics.id,
      idArticle: articleRoulement.id,
      quantite: 2,
      prixHt: articleRoulement.prixHt,
    },
  });

  const ressourceFonction = await prisma.otRessourcesFonction.create({
    data: { idOt: ot2.id, idFonction: fonction.id },
  });
  await prisma.otOrdoIntervenant.create({
    data: {
      idIntervenant: intervenant.id,
      idRessourceFonction: ressourceFonction.id,
      debut: closedStart,
      fin: closedEnd,
      coutHoraire: intervenant.tauxHoraire,
    },
  });

  // --- Preventive maintenance plans demo data ---
  const gamme = await prisma.gammeOperatoire.create({
    data: { code: "GAM-01", designation: "Révision générale", type: "Préventive" },
  });

  await prisma.prevSystematique.create({
    data: {
      idGamme: gamme.id,
      equipement: equipement.id,
      frequence: 3,
      periode: "Mois",
      dateDebut: new Date(),
      lancerOtAvant: 7,
    },
  });

  const compteurEquip = await prisma.equipementCompteur.create({
    data: {
      idEquipement: equipement.id,
      designation: "Heures de fonctionnement",
      uniteMesure: "h",
      valeurActuelle: 480,
    },
  });
  await prisma.prevCompteur.create({
    data: {
      idGamme: gamme.id,
      equipement: equipement.id,
      idCompteur: compteurEquip.id,
      valeurLancement: 500,
      typeValeur: "Sup",
      reinitialisation: "Oui",
      initial: 0,
      typeInitial: "Au Lancement de l'OT",
    },
  });

  await prisma.prevConditionnelle.create({
    data: {
      idGamme: gamme.id,
      equipement: equipement.id,
      mesure: "Vibration palier moteur",
      unite: "mm/s",
      valeurLancement: 80,
      typeValeur: "Sup",
    },
  });

  // --- Procurement quote step (Dop/Devis) demo data ---
  const dop = await prisma.dop.create({
    data: { dateDop: new Date(), createur: "admin", statut: "En cours" },
  });
  await prisma.dopArticle.create({
    data: { idDop: dop.id, idArticle: articleRoulement.id, qt: 20 },
  });
  await prisma.dopFournisseur.create({
    data: { idDop: dop.id, idFournisseur: fournisseur.id },
  });
  await prisma.dopFini.create({
    data: {
      idDop: dop.id,
      idArticle: articleRoulement.id,
      idFournisseur: fournisseur.id,
      prixHt: 11.9,
      remise: 3,
      qtDisponible: 20,
    },
  });

  // --- Article characteristics & units demo data ---
  const caractDiametre = await prisma.caracteristique.create({
    data: {
      idSousFamille: sousFamilleRoul.id,
      nom: "Diamètre intérieur",
      type: "TextBox",
      champObligatoire: true,
    },
  });
  await prisma.caracteristiqueTextbox.create({
    data: { idCaracteristique: caractDiametre.id, type: "Réel", valeurDefaut: "0" },
  });
  await prisma.tableauArticleCaracteristique.create({
    data: { idArticle: articleRoulement.id, idCaracteristique: caractDiametre.id, valeur: "25" },
  });

  const uniteKg = await prisma.parametreUniteArticle.create({
    data: { codeUnite: "PCS", designation: "Pièce" },
  });
  await prisma.tableauArticleUnite.create({
    data: { idArticle: articleRoulement.id, idUnite: uniteKg.id },
  });

  // --- Gamme resource planning demo data ---
  const gammeRevision = await prisma.gammeOperatoire.create({
    data: {
      code: "GAM-REV",
      designation: "Révision moteur",
      type: "Corrective",
      duree: 4,
      idClasse: classe.id,
    },
  });
  await prisma.gammeRessourcesFonction.create({
    data: { idGamme: gammeRevision.id, idFonction: fonction.id, nbreRequis: 2, minPlanif: 30, typeCout: "Interne" },
  });
  await prisma.gammeRessourcesOutillage.create({
    data: { idGamme: gammeRevision.id, idType: tabType.id, quantite: 1 },
  });
  await prisma.gammeRessourcesPdr.create({
    data: { idGamme: gammeRevision.id, idArticle: articleRoulement.id, quantite: 2 },
  });

  // --- Equipment detail tabs demo data ---
  await prisma.equipementGenerale.create({
    data: {
      idEquipement: equipement.id,
      marque: "Atlas Copco",
      nSerie: "AC-778213",
      fabricant: "Atlas Copco",
      dateAchat: new Date("2022-03-15"),
      dateMiseEnService: new Date("2022-04-01"),
      fonctionReq: "Fournir l'air comprimé pour l'atelier mécanique.",
    },
  });
  await prisma.equipementTechnique.create({
    data: { idEquipement: equipement.id, designation: "Puissance moteur", observation: "50 kW" },
  });
  await prisma.equipementObservation.create({
    data: { idEquipement: equipement.id, observation: "Bruit anormal signalé en janvier 2026, surveillé depuis." },
  });
  await prisma.equipementPrevision.create({
    data: { idEquipement: equipement.id, coutArret: 500, nbreArret: 2, periodeNbr: 1, periode: "Année" },
  });

  // --- Diagnostic (Ishikawa/AMDEC) reference data demo ---
  const symptomeVibration = await prisma.symptome.create({
    data: { code: "SYM-01", designation: "Vibration excessive" },
  });
  await prisma.symptomeDefaillance.create({
    data: { idSymptome: symptomeVibration.id, idDefaillance: anomalie.id },
  });
  await prisma.operationDiagnostic.create({
    data: { idDefaillance: anomalie.id, code: "OP-01", designation: "Vérifier l'alignement des paliers" },
  });

  // --- Invoicing demo data (Reception -> BonLivraison -> Facture) ---
  const receptionDemo = await prisma.reception.create({
    data: {
      dateReception: new Date(),
      receptionPar: "admin",
      statut: "Clôturée",
    },
  });
  await prisma.receptionArticle.create({
    data: {
      idReception: receptionDemo.id,
      idArticle: articleRoulement.id,
      qtRecu: 20,
    },
  });
  const blDemo = await prisma.bonLivraison.create({
    data: {
      idReception: receptionDemo.id,
      dateLivraison: new Date(),
      livraisonPar: "admin",
      blFournisseur: "BL-FRS-2026-0044",
      statut: "En cours",
    },
  });
  const factureDemo = await prisma.facture.create({
    data: {
      dateFacture: new Date(),
      createur: "admin",
      idFournisseur: fournisseur.id,
      tva: 19,
      nFacture: "FAC-2026-0012",
    },
  });
  await prisma.factureLivraison.create({
    data: { idFacture: factureDemo.id, idLivraison: blDemo.id },
  });

  // --- Gas & electricity tracking demo data ---
  const uniteKwh = await prisma.parametreUniteArticle.create({
    data: { codeUnite: "kWh", designation: "Kilowattheure" },
  });
  await prisma.prodFourConsommationElectrique.create({
    data: {
      date: new Date(),
      idUnite: uniteKwh.id,
      consMatin: 120,
      consPointe: 340,
      consNuit: 90,
      consSoir: 150,
    },
  });
  await prisma.prodCoefficientGaz.create({
    data: { coefficient: 1.05, date: new Date() },
  });

  // --- Auto-reorder demo data ---
  await prisma.acReapprovisionnement.create({
    data: {
      idArticle: articleRoulement.id,
      qt: 50,
      delai: 7,
      dateDebut: new Date(),
      reccurence: 1,
      periode: "Mois",
    },
  });
  await prisma.acRecompletement.create({
    data: {
      idArticle: articleRoulement.id,
      delai: 5,
      dateDebut: new Date(),
      reccurence: 2,
      periode: "Semaine",
      dateLimite: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  });

  // --- Fleet extras demo data ---
  await prisma.bonDeCarburant.create({
    data: {
      nom: "BC-2026-0001",
      idEngin: engin.id,
      idChauffeur: chauffeur.id,
      idTypeCarburant: typeCarburant.id,
      quantite: 40,
      prixU: 2.15,
      prixTtc: 86,
      date: new Date(),
    },
  });
  await prisma.voyage.create({
    data: {
      idEngin: engin.id,
      idChauffeur: chauffeur.id,
      depart: "Usine",
      arrive: "Dépôt central",
      distance: 32,
      date: new Date(),
      heureDep: "08:00",
      heureArr: "08:45",
    },
  });

  // --- Order & article modification history demo data ---
  await prisma.modificationArticle.create({
    data: {
      idArticle: articleRoulement.id,
      stockNeuf: 18,
      stockUse: 0,
      stockRebute: 0,
      dateModification: new Date(),
    },
  });
  await prisma.commandeModificationBase.create({
    data: {
      idCommande: commandeSignee.id,
      modifierPar: "admin",
      dateModification: new Date(),
      heureModification: new Date().toTimeString().slice(0, 5),
      lignes: {
        create: { idArticle: articleRoulement.id, qt: 12, prixHt: 12.5, remise: 5 },
      },
    },
  });

  // --- Subcontracting invoicing + raw-material demo data ---
  const dsCommandeDemo = await prisma.dsCommande.create({
    data: {
      nCommande: "DS-PO-2026-DEMO",
      idFournisseur: fournisseur.id,
      idDs: 1,
      dateCommande: new Date(),
      statut: "En cours",
      createur: "admin",
    },
  });
  const dsCommandeArticleDemo = await prisma.dsCommandeArticle.create({
    data: {
      idCommande: dsCommandeDemo.id,
      idActivite: activite.id,
      qt: 4,
      prixHt: 45,
      descr: "Usinage arbre moteur",
    },
  });
  const dsBlDemo = await prisma.dsBonLivraison.create({
    data: {
      idCommande: dsCommandeDemo.id,
      idFournisseur: fournisseur.id,
      dateLivraison: new Date(),
      livraisonPar: "admin",
      statut: "En cours",
      blFournisseur: "BL-ST-2026-0007",
    },
  });
  await prisma.dsLivraisonArticle.create({
    data: {
      idLivraison: dsBlDemo.id,
      idDsCommandeArticle: dsCommandeArticleDemo.id,
      qt: 4,
      prixHt: 45,
    },
  });
  const dsFactureDemo = await prisma.dsFacture.create({
    data: {
      dateFacture: new Date(),
      createur: "admin",
      idFournisseur: fournisseur.id,
      tva: 19,
      nFacture: "FAC-ST-2026-0003",
    },
  });
  await prisma.dsFactureLivraison.create({
    data: { idFacture: dsFactureDemo.id, idLivraison: dsBlDemo.id },
  });

  await prisma.dsMp.create({
    data: { idDemande: dsCommandeDemo.idDs, idArticle: articleRoulement.id, qt: 5 },
  });
  await prisma.dsNvArticle.create({
    data: {
      idDemande: dsCommandeDemo.idDs,
      idArticle: articleRoulement.id,
      idActivite: activite.id,
      quantite: 2,
      description: "Adaptateur sur mesure pour montage spécifique",
    },
  });

  // --- P1/P2 polish demo data: Fleet file attachment + Production A/S ---
  await prisma.enginFichier.create({
    data: { idEngin: engin.id, adresse: "documents/carte-grise.pdf" },
  });

  const saisieGranulometrie = await prisma.prodSaisie.findFirst({
    where: { designation: "Granulométrie" },
  });
  if (saisieGranulometrie) {
    const rapportDemo = await prisma.prodRapportGeneral.create({
      data: { dateRapport: new Date(), poste: "Jour" },
    });
    await prisma.prodRapportPrepAS.create({
      data: {
        idRapport: rapportDemo.id,
        idSaisie: saisieGranulometrie.id,
        valeurA: 2.1,
        valeurS: 1.8,
      },
    });

    // --- Production remaining-pieces demo data (Phase 26) ---
    const uniteFabrication = await prisma.prodEquipement.findFirst({
      where: { uniteProduction: "Fabrication" },
    });
    if (uniteFabrication) {
      await prisma.prodMesure.create({
        data: { idMesure: 1, idSaisie: saisieGranulometrie.id, idUnite: uniteFabrication.id },
      });
      await prisma.prodRapportChefEquipe.create({
        data: { idRapport: rapportDemo.id, idUnite: uniteFabrication.id, idChefEquipe: intervenant.id },
      });
      await prisma.prodRapportHeure.create({
        data: { idRapport: rapportDemo.id, idUnite: uniteFabrication.id, heure: 1, idProduit: 1 },
      });
    }
  }

  // --- Magasin sous-traitance demo data ---
  const magasinDemo = await prisma.magasinSousTraitance.create({
    data: {
      idArticle: articleRoulement.id,
      refInterne: "MST-2026-0001",
      demandeActuel: dsCommandeDemo.idDs,
      activiteActuel: activite.id,
      emplacementActuel: "Atelier sous-traitant — Zone A",
      nbrReparation: 1,
    },
  });

  // --- Signature demo data (Phase 22) — a separate pending order,
  // distinct from the already-"En cours" dsCommandeDemo above, so the
  // sign-off flow has something to demonstrate without disturbing the
  // existing invoicing demo chain. ---
  await prisma.signature.create({
    data: { idUtilisateur: adminUser.id, designation: await bcrypt.hash("1234", 10) },
  });
  const dsCommandeAttenteDemo = await prisma.dsCommande.create({
    data: {
      nCommande: "DS-PO-2026-DEMO2",
      idFournisseur: fournisseur.id,
      idDs: dsCommandeDemo.idDs,
      dateCommande: new Date(),
      statut: "En attente",
      createur: "admin",
    },
  });
  await prisma.dsCommandeArticle.create({
    data: {
      idCommande: dsCommandeAttenteDemo.id,
      idT: magasinDemo.id,
      source: "ex",
      qt: 1,
      prixHt: 0,
      descr: "Réparation roulement (via Magasin Sous-Traitance)",
    },
  });

  // --- Fournisseur reference-data demo data ---
  const activiteDemo = await prisma.parametreActiviteFournisseur.create({
    data: { codeActivite: "MEC", designation: "Mécanique industrielle" },
  });
  await prisma.tableauFournisseurActivite.create({
    data: { idFournisseur: fournisseur.id, idActivite: activiteDemo.id },
  });
  const deviseDemo = await prisma.parametreDeviseFournisseur.create({
    data: { designation: "EUR", conversion: 3.4 },
  });
  await prisma.tableauFournisseurDevise.create({
    data: { idFournisseur: fournisseur.id, idDevise: deviseDemo.id },
  });
  const reglementDemo = await prisma.parametreReglementFournisseur.create({
    data: { codeReglement: "30J", designation: "Virement à 30 jours" },
  });
  await prisma.tableauFournisseurReglement.create({
    data: { idFournisseur: fournisseur.id, idReglement: reglementDemo.id },
  });

  // --- Article reference-data demo data ---
  const classificationDemo = await prisma.parametreClassificationArticle.create({
    data: { codeClassification: "CRIT", designation: "Pièce critique" },
  });
  await prisma.tableauArticleClassification.create({
    data: { idArticle: articleRoulement.id, idClassification: classificationDemo.id },
  });
  const emplacementDemo = await prisma.parametreEmplacementArticle.create({
    data: { codeEmplacement: "A-01", designation: "Rayon A, étagère 1" },
  });
  await prisma.tableauArticleEmplacement.create({
    data: { idArticle: articleRoulement.id, idEmplacement: emplacementDemo.id },
  });
  await prisma.tableauArticleEquipement.create({
    data: { idArticle: articleRoulement.id, idEquipement: equipement.id },
  });
  await prisma.tableauArticleFournisseur.create({
    data: { idArticle: articleRoulement.id, idFournisseur: fournisseur.id },
  });

  // --- Notification demo data ---
  const notificationDemo = await prisma.notification.create({
    data: {
      type: "OT",
      idUtilisateur: adminUser.id,
      description: "Nouvel ordre de travail urgent assigné.",
      dateCreation: new Date(),
    },
  });
  await prisma.notificationAlerte.create({
    data: {
      idNot: notificationDemo.id,
      type: "Rappel",
      idUtilisateur: adminUser.id,
      description: "Rappel : ordre de travail urgent toujours en attente.",
      dateCreation: new Date(),
    },
  });

  // --- Activité scoping demo data ---
  await prisma.activiteFamille.create({
    data: { idActivite: activite.id, idFamille: familleMeca.id },
  });
  await prisma.activiteSousFamille.create({
    data: { idActivite: activite.id, idSousFamille: sousFamilleRoul.id },
  });
  await prisma.activiteOperation.create({
    data: { idActivite: activite.id, operation: "Démontage et nettoyage" },
  });

  // --- OT/Equipement odds-and-ends demo data ---
  const causeDemo = await prisma.parametreCauseRealisation.create({
    data: { code: "USURE", designation: "Usure normale" },
  });
  await prisma.otCauseRealisation.create({ data: { idOt: ot1.id, idCause: causeDemo.id } });
  const centreDemo = await prisma.parametreCentreCharge.create({
    data: { code: "CC-MEC", designation: "Atelier mécanique", budget: 15000 },
  });
  await prisma.otCentreCharge.create({ data: { idOt: ot1.id, idCentreCharge: centreDemo.id } });
  await prisma.equipementCompteurHistorique.create({
    data: { idCompteur: compteurEquip.id, valeur: 1200, dateMesure: new Date() },
  });
  await prisma.equipementCompteurNv.create({
    data: { idCompteur: compteurEquip.id, valeur: 0, dateNv: new Date() },
  });
  await prisma.compteurLiaison.create({
    data: { idOrgane: equipement.id, idCompteur: compteurEquip.id, idIntervention: intervention.id },
  });

  // --- Remaining small tables demo data ---
  const outilDemo = await prisma.outil.create({
    data: { codeOutils: "OUT-0002", designation: "Multimètre", statut: true },
  });
  const utilisationDemo = await prisma.utilisation.create({
    data: { code: "MES", designation: "Mesure électrique" },
  });
  await prisma.outilUtilisation.create({
    data: { idOutil: outilDemo.id, idUtilisation: utilisationDemo.id },
  });

  const planMaintenanceDemo = await prisma.planMaintenance.create({
    data: { code: "PM-01", designation: "Plan de maintenance préventive standard" },
  });

  await prisma.operationMaintenance.create({
    data: {
      idIntervention: intervention.id,
      code: "OP-MTN-01",
      designation: "Contrôle visuel général",
      type: "Corrective",
    },
  });

  await prisma.gammeCentreCharge.create({
    data: { idGamme: gammeRevision.id, idCentreCharge: centreDemo.id },
  });

  await prisma.atelierReception.create({
    data: {
      idAtelier: job.id,
      dateReception: new Date(),
      qtRecu: 1,
      etat: "Bon état",
    },
  });

  await prisma.livraisonArticle.create({
    data: {
      idLivraison: blDemo.id,
      idArticle: articleRoulement.id,
      qt: 20,
      prixHt: 11.9,
      remise: 3,
      investissement: false,
    },
  });

  await prisma.reclamationAnomalie.create({
    data: {
      anomalie: "Vibration anormale au freinage",
      date: new Date(),
      idEngin: engin.id,
      idChauffeur: chauffeur.id,
    },
  });

  // --- New UI depth demo data (Gamme centre-charge, Operations checklist,
  // Plans de maintenance, Workshop réceptions) ---
  await prisma.gammeCentreCharge.create({
    data: { idGamme: gammeRevision.id, idCentreCharge: centreDemo.id },
  });

  await prisma.operationMaintenance.create({
    data: {
      idIntervention: intervention.id,
      code: "OP-CHK-01",
      designation: "Vérifier serrage des boulons",
      type: "Contrôle",
    },
  });

  await prisma.planMaintenance.create({
    data: { code: "PLAN-01", designation: "Plan annuel — équipements critiques" },
  });

  await prisma.atelierReception.create({
    data: {
      idAtelier: job.id,
      dateReception: new Date(),
      qtRecu: 1,
      etat: "Conforme",
    },
  });

  console.log("Seed complete. Login: admin / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

