-- CreateTable
CREATE TABLE "utilisateur" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "mot_passe" TEXT NOT NULL,
    "fonction" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Utilisateur',
    "photo" BYTEA,
    "mail" TEXT,
    "telephone" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervenant" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "taux_horaire" DECIMAL(65,30),
    "id_fonction" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "type_cout" TEXT,
    "chef_equipe" BOOLEAN,

    CONSTRAINT "intervenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fonction_intervenant" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,

    CONSTRAINT "fonction_intervenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement" (
    "id" SERIAL NOT NULL,
    "id_parent" INTEGER,
    "code" TEXT,
    "designation" TEXT NOT NULL,
    "ordre" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "engin" INTEGER,
    "tec_geo" INTEGER,
    "type_equip" INTEGER,

    CONSTRAINT "equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_classe_intervention" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,

    CONSTRAINT "parametre_classe_intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_intervention" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "intervention" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "typpe" TEXT,

    CONSTRAINT "parametre_intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_anomalie" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "anomalie" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "operateur" TEXT,

    CONSTRAINT "parametre_anomalie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamme_operatoire" (
    "id" SERIAL NOT NULL,
    "id_plan" INTEGER,
    "code" TEXT,
    "designation" TEXT NOT NULL,
    "urgence" TEXT,
    "statut" TEXT,
    "type" TEXT,
    "id_classe" INTEGER,
    "id_superviseur" INTEGER,
    "duree" INTEGER,
    "var_duree" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "operation" TEXT,
    "p_typpe" INTEGER,

    CONSTRAINT "gamme_operatoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_intervention" (
    "id" SERIAL NOT NULL,
    "id_demandeur" INTEGER,
    "date_emission" TIMESTAMP(3) NOT NULL,
    "heure_emission" TEXT,
    "urgence" TEXT,
    "id_defaillance" INTEGER,
    "description_defaillance" TEXT,
    "createur" TEXT,
    "atelier" INTEGER,
    "equipement" INTEGER,
    "sous_equipement" INTEGER,
    "organe" INTEGER,
    "arret_machine" BOOLEAN,
    "date_arret" TIMESTAMP(3),
    "heure_arret" TEXT,
    "statut" TEXT,
    "n_di" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "demande_intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordre_travail" (
    "id" SERIAL NOT NULL,
    "n_ot" TEXT NOT NULL,
    "id_di" INTEGER,
    "date_debut" TIMESTAMP(3),
    "heure_debut" TEXT,
    "date_fin" TIMESTAMP(3),
    "heure_fin" TEXT,
    "debut_prevu" TIMESTAMP(3),
    "fin_prevu" TIMESTAMP(3),
    "urgence" TEXT,
    "statut" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "id_intervention" INTEGER,
    "id_classe" INTEGER,
    "id_superviseur" INTEGER,
    "commentaire" TEXT,
    "createur" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "atelier" INTEGER,
    "equipement" INTEGER,
    "sous_equipement" INTEGER,
    "organe" INTEGER,
    "id_defaillance" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordre_travail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_ressources_fonction" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_fonction" INTEGER,
    "nbre_requis" INTEGER,
    "min_planif" INTEGER,
    "type_cout" TEXT,
    "date_debut" TIMESTAMP(3),
    "heure_debut" TEXT,

    CONSTRAINT "ot_ressources_fonction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_ordo_intervenant" (
    "id" SERIAL NOT NULL,
    "id_intervenant" INTEGER NOT NULL,
    "id_ressource_fonction" INTEGER NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "cout_horaire" DECIMAL(65,30),

    CONSTRAINT "ot_ordo_intervenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_ordo_intervention" (
    "id" SERIAL NOT NULL,
    "id_ressource_fonction" INTEGER NOT NULL,
    "id_operation" INTEGER NOT NULL,
    "type_operation" TEXT NOT NULL,

    CONSTRAINT "ot_ordo_intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_centre_charge" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_centre_charge" INTEGER,

    CONSTRAINT "ot_centre_charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_fichier" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "nomFichier" TEXT,
    "chemin" TEXT,

    CONSTRAINT "ot_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_commentaire" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "auteur" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ot_commentaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptome" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "symptome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prev_systematique" (
    "id" SERIAL NOT NULL,
    "id_gamme" INTEGER,
    "frequence" INTEGER,
    "periode" TEXT,
    "date_debut" TIMESTAMP(3),
    "heure_debut" TEXT,
    "lancer_ot_avant" INTEGER,
    "atelier" INTEGER,
    "equipement" INTEGER,
    "sous_equipement" INTEGER,
    "organe" INTEGER,
    "arr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "prev_systematique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prev_syst_ech" (
    "id" SERIAL NOT NULL,
    "id_rep" INTEGER NOT NULL,
    "date_ech" TIMESTAMP(3) NOT NULL,
    "heure_ech" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "prev_syst_ech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prev_conditionnelle" (
    "id" SERIAL NOT NULL,
    "id_gamme" INTEGER,
    "mesure" VARCHAR(2000),
    "unite" TEXT,
    "valeur_lancement" DECIMAL(65,30),
    "type_valeur" TEXT,
    "atelier" INTEGER,
    "equipement" INTEGER,
    "sous_equipement" INTEGER,
    "organe" INTEGER,
    "arr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "prev_conditionnelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prev_mesure" (
    "id" SERIAL NOT NULL,
    "id_prev" INTEGER NOT NULL,
    "mesure_par" INTEGER,
    "creer_par" INTEGER,
    "date_mesure" TIMESTAMP(3) NOT NULL,
    "heure_mesure" TEXT,
    "valeur" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "prev_mesure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prev_annuel" (
    "id" SERIAL NOT NULL,
    "id_rep" INTEGER NOT NULL,
    "date_echeance" TIMESTAMP(3) NOT NULL,
    "type_periode" TEXT,

    CONSTRAINT "prev_annuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prev_compteur" (
    "id" SERIAL NOT NULL,
    "id_gamme" INTEGER,
    "id_compteur" INTEGER,
    "valeur_lancement" DECIMAL(65,30),
    "type_valeur" TEXT,
    "reinitialisation" TEXT,
    "initial" DECIMAL(65,30),
    "type_initial" TEXT,
    "atelier" INTEGER,
    "equipement" INTEGER,
    "sous_equipement" INTEGER,
    "organe" INTEGER,
    "arr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "prev_compteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_reinit_compteur" (
    "id" SERIAL NOT NULL,
    "id_prev_compteur" INTEGER NOT NULL,
    "id_ot" INTEGER NOT NULL,

    CONSTRAINT "ot_reinit_compteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_compteur" (
    "id" SERIAL NOT NULL,
    "id_equipement" INTEGER,
    "designation" TEXT,
    "unite_mesure" TEXT,
    "valeur_actuelle" DECIMAL(65,30),
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "equipement_compteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_equipement" (
    "id" SERIAL NOT NULL,
    "id_equipement" INTEGER NOT NULL,
    "unite_production" TEXT NOT NULL,

    CONSTRAINT "prod_equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_type_brique" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "poid" DECIMAL(65,30),
    "poid_vert" DECIMAL(65,30),

    CONSTRAINT "prod_type_brique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_saisie" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "unite" TEXT,
    "preparation_produit" TEXT,
    "cible" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "poid_sec_fab" BOOLEAN NOT NULL DEFAULT false,
    "poid_four" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "prod_saisie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_fab_compteur" (
    "id" SERIAL NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_compteur" INTEGER NOT NULL,

    CONSTRAINT "prod_fab_compteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_general" (
    "id" SERIAL NOT NULL,
    "date_rapport" TIMESTAMP(3) NOT NULL,
    "poste" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prod_rapport_general_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_fab_produit" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tonnage" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_rapport_fab_produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_emb_produit" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nbr_bobine_feuillard" DECIMAL(65,30),
    "nbr_pallette" DECIMAL(65,30),

    CONSTRAINT "prod_rapport_emb_produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_four_entre" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tonnage" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_rapport_four_entre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_four_sortie" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_produit" INTEGER NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tonnage" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_rapport_four_sortie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_mesure_rapport" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER,
    "id_qualite" INTEGER NOT NULL,
    "categorie" TEXT NOT NULL,
    "valeur" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_mesure_rapport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_prep_as" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER,
    "id_qualite" INTEGER NOT NULL,
    "valeur_a" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valeur_s" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_rapport_prep_as_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_horaire_fabrication" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_qualite" INTEGER NOT NULL,
    "h1" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "h2" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "h3" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "h4" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "h5" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "h6" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "h7" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "h8" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_rapport_horaire_fabrication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_fab_tonnage" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "valeur" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_fab_tonnage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_fuel" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "type_saisie" TEXT NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_fuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_gaz" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "type_saisie" TEXT NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_gaz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_coefficient_gaz" (
    "id" SERIAL NOT NULL,
    "coefficient" DECIMAL(65,30),
    "date" TIMESTAMP(3),

    CONSTRAINT "prod_coefficient_gaz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_four_consommation_electrique" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3),
    "cons_matin" DECIMAL(65,30),
    "cons_pointe" DECIMAL(65,30),
    "cons_nuit" DECIMAL(65,30),
    "cons_soir" DECIMAL(65,30),
    "id_unite" INTEGER NOT NULL,

    CONSTRAINT "prod_four_consommation_electrique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_cf_fabrication" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_cf" INTEGER,

    CONSTRAINT "prod_rapport_cf_fabrication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_cf_emballage" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_cf" INTEGER,

    CONSTRAINT "prod_rapport_cf_emballage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_anomalie" (
    "id" SERIAL NOT NULL,
    "anomalie" TEXT NOT NULL,
    "unite_production" TEXT NOT NULL,

    CONSTRAINT "prod_anomalie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_anomalie" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_anomalie" INTEGER NOT NULL,
    "duree" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "prod_rapport_anomalie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magasin" (
    "id" SERIAL NOT NULL,
    "code_magasin" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "magasin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "famille" (
    "id" SERIAL NOT NULL,
    "code_famille" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "famille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sous_famille" (
    "id" SERIAL NOT NULL,
    "id_famille" INTEGER,
    "code_sous_famille" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sous_famille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article" (
    "id" SERIAL NOT NULL,
    "code_article" TEXT,
    "reference" TEXT,
    "designation" TEXT NOT NULL,
    "tva" DECIMAL(65,30),
    "prix_ht" DECIMAL(65,30),
    "stock_neuf" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stock_use" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stock_rebute" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "stock_reparable_manuel" DECIMAL(65,30),
    "stock_mini" DECIMAL(65,30),
    "stock_maxi" DECIMAL(65,30),
    "stock_securite" DECIMAL(65,30),
    "marque" TEXT,
    "methode_gestion" TEXT,
    "commentaire" TEXT,
    "photo" BYTEA,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "point_commande" DECIMAL(65,30),
    "id_magasin" INTEGER,
    "modification_qt" TIMESTAMP(3),

    CONSTRAINT "article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_sous_famille" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_sous_famille" INTEGER NOT NULL,

    CONSTRAINT "tableau_article_sous_famille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsm" (
    "id" SERIAL NOT NULL,
    "type_stock" TEXT,
    "bsm_maintenance" BOOLEAN NOT NULL DEFAULT false,
    "n_ot" TEXT,
    "li_ot" VARCHAR(100),
    "id_receptionniste" INTEGER,
    "createur" TEXT,
    "date_bsm" TIMESTAMP(3) NOT NULL,
    "heure_bsm" TEXT,
    "validation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bsm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsm_article" (
    "id" SERIAL NOT NULL,
    "id_bsm" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "prix_ht" DECIMAL(65,30),

    CONSTRAINT "bsm_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bsm_equipement" (
    "id" SERIAL NOT NULL,
    "id_bsm" INTEGER NOT NULL,
    "id_equipement" INTEGER NOT NULL,

    CONSTRAINT "bsm_equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brm" (
    "id" SERIAL NOT NULL,
    "type_retour" TEXT,
    "type_stock" TEXT,
    "retour_par" TEXT,
    "date_retour" TIMESTAMP(3) NOT NULL,
    "heure_retour" TEXT,
    "id_bsm_ref" INTEGER,

    CONSTRAINT "brm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brm_article" (
    "id" SERIAL NOT NULL,
    "id_brm" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "brm_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception" (
    "id" SERIAL NOT NULL,
    "date_reception" TIMESTAMP(3) NOT NULL,
    "heure_reception" TEXT,
    "reception_par" TEXT,
    "commentaire" TEXT,
    "statut" TEXT,
    "date_reel" TIMESTAMP(3),

    CONSTRAINT "reception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_article" (
    "id" SERIAL NOT NULL,
    "id_reception" INTEGER NOT NULL,
    "id_commande" INTEGER,
    "id_article" INTEGER NOT NULL,
    "qt_recu" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "etat" TEXT,
    "qt_bon_etat" DECIMAL(65,30),
    "qt_mauvais_etat" DECIMAL(65,30),
    "id_da" INTEGER,

    CONSTRAINT "reception_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reception_commande" (
    "id" SERIAL NOT NULL,
    "id_reception" INTEGER NOT NULL,
    "id_commande" INTEGER NOT NULL,

    CONSTRAINT "reception_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseur" (
    "id" SERIAL NOT NULL,
    "code_fournisseur" TEXT,
    "nom" TEXT NOT NULL,
    "type" TEXT,
    "activite" TEXT,
    "commentaire" TEXT,
    "tva_defaut" DECIMAL(65,30),
    "delai" DECIMAL(65,30),
    "remise_defaut" DECIMAL(65,30),
    "pays" TEXT,
    "ville" TEXT,
    "code_postal" TEXT,
    "adresse" TEXT,
    "telephone_1" TEXT,
    "telephone_2" TEXT,
    "fax_1" TEXT,
    "fax_2" TEXT,
    "email" TEXT,
    "site_web" TEXT,
    "nom_banque" TEXT,
    "domiciliation" TEXT,
    "iban" TEXT,
    "rib" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "fodec" DECIMAL(65,30),

    CONSTRAINT "fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_achat" (
    "id" SERIAL NOT NULL,
    "date_da" TIMESTAMP(3) NOT NULL,
    "heure_da" TEXT,
    "delai" INTEGER,
    "periode" TEXT,
    "createur" TEXT,
    "demandeur" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'En cours',
    "vue" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "demande_achat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_fichier" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "adresse" TEXT NOT NULL,

    CONSTRAINT "da_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_article" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "qt" DECIMAL(65,30) NOT NULL,
    "motif" TEXT,
    "qt_restant" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "da_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_article_equipement" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_equipement" INTEGER NOT NULL,
    "id_lis" INTEGER,

    CONSTRAINT "da_article_equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_action" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "par" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cause" TEXT,
    "nouvelle_date" TIMESTAMP(3),

    CONSTRAINT "da_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande" (
    "id" SERIAL NOT NULL,
    "n_commande" TEXT,
    "date_commande" TIMESTAMP(3) NOT NULL,
    "heure_commande" TEXT,
    "createur" TEXT,
    "id_fournisseur" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "personne_contacter" TEXT,
    "date_signature" TIMESTAMP(3),
    "urgence" TEXT,
    "fodec" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande_article" (
    "id" SERIAL NOT NULL,
    "id_commande" INTEGER NOT NULL,
    "id_da_article" INTEGER NOT NULL,
    "qt_commande" DECIMAL(65,30) NOT NULL,
    "prix_ht" DECIMAL(65,30),
    "remise" DECIMAL(65,30),

    CONSTRAINT "commande_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_machine" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "atelier_machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_parametre_piece" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "atelier_parametre_piece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_parametre_priorite" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "atelier_parametre_priorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_parametre_conception" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "atelier_parametre_conception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_creer" (
    "id" SERIAL NOT NULL,
    "n_of" TEXT,
    "atelier" INTEGER,
    "equipement" INTEGER,
    "sous_equipement" INTEGER,
    "organe" INTEGER,
    "id_demandeur" INTEGER,
    "date_consultation" TIMESTAMP(3),
    "date_prevu" TIMESTAMP(3),
    "n_plan" TEXT,
    "n_revision" TEXT,
    "quantite" DECIMAL(65,30),
    "dimension" TEXT,
    "id_parametre_piece" INTEGER,
    "id_parametre_priorite" INTEGER,
    "id_parametre_conception" INTEGER,
    "etat" TEXT NOT NULL DEFAULT 'En Attente',
    "createur" TEXT,
    "id_article" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atelier_creer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_etat" (
    "id" SERIAL NOT NULL,
    "id_atelier" INTEGER NOT NULL,
    "date_changement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etat" TEXT NOT NULL,

    CONSTRAINT "atelier_etat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_retour" (
    "id" SERIAL NOT NULL,
    "id_atelier" INTEGER NOT NULL,
    "id_nv" INTEGER,

    CONSTRAINT "atelier_retour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_donnees" (
    "id" SERIAL NOT NULL,
    "id_atelier" INTEGER NOT NULL,
    "sous_traitant" TEXT,
    "qt_recu" DECIMAL(65,30),
    "piece_app" DECIMAL(65,30),
    "piece_bloque" DECIMAL(65,30),
    "remarque" TEXT,
    "liberation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "atelier_donnees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_piece" (
    "id" SERIAL NOT NULL,
    "id_atelier" INTEGER NOT NULL,
    "num_mes" TEXT,
    "mesure_nominale" DECIMAL(65,30),
    "plus" DECIMAL(65,30),
    "tire" DECIMAL(65,30),
    "p1" DECIMAL(65,30),
    "p2" DECIMAL(65,30),
    "p3" DECIMAL(65,30),
    "p4" DECIMAL(65,30),
    "p5" DECIMAL(65,30),
    "p6" DECIMAL(65,30),

    CONSTRAINT "atelier_piece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_suivi_journalier" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heure_deb" TEXT,
    "heure_fin" TEXT,
    "n_of" TEXT,
    "id_machine" INTEGER,
    "id_operateur" INTEGER,
    "qt_solde" DECIMAL(65,30),
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "atelier_suivi_journalier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_bsm" (
    "id" SERIAL NOT NULL,
    "id_atelier" INTEGER NOT NULL,
    "id_bsm" INTEGER NOT NULL,

    CONSTRAINT "atelier_bsm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_de_vehicule" (
    "id" SERIAL NOT NULL,
    "code_vehicule" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "type_de_vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_de_carburant" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "type_de_carburant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chauffeur" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "nom" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chauffeur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorie_de_charge" (
    "id" SERIAL NOT NULL,
    "code_categorie" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "categorie_de_charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engins" (
    "id" SERIAL NOT NULL,
    "matricule" TEXT,
    "num_carte" TEXT,
    "designation" TEXT NOT NULL,
    "marque" TEXT,
    "id_vehicule" INTEGER,
    "id_chauffeur" INTEGER,
    "id_categorie" INTEGER,
    "liaison" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "engins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engins_assurance" (
    "id" SERIAL NOT NULL,
    "id_engin" INTEGER NOT NULL,
    "raison_social" TEXT,
    "date_deb" TIMESTAMP(3) NOT NULL,
    "date_exp" TIMESTAMP(3) NOT NULL,
    "prix" DECIMAL(65,30),
    "not_avant" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "engins_assurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engins_vignette" (
    "id" SERIAL NOT NULL,
    "id_engin" INTEGER NOT NULL,
    "date_deb" TIMESTAMP(3) NOT NULL,
    "date_exp" TIMESTAMP(3) NOT NULL,
    "prix" DECIMAL(65,30),
    "not_avant" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "engins_vignette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engins_visite_technique" (
    "id" SERIAL NOT NULL,
    "id_engin" INTEGER NOT NULL,
    "date_deb" TIMESTAMP(3) NOT NULL,
    "date_exp" TIMESTAMP(3) NOT NULL,
    "prix" DECIMAL(65,30),
    "not_avant" INTEGER,
    "type_visite" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "engins_visite_technique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engin_sortie_carburant" (
    "id" SERIAL NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL,
    "prix_u" DECIMAL(65,30),
    "prix_ttc" DECIMAL(65,30),
    "date" TIMESTAMP(3) NOT NULL,
    "heure" TEXT,
    "id_engin" INTEGER NOT NULL,
    "id_carbu" INTEGER,
    "compteur" DECIMAL(65,30),
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "engin_sortie_carburant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engin_compteur_initial" (
    "id" SERIAL NOT NULL,
    "id_compteur" INTEGER NOT NULL,
    "valeur_initial" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "engin_compteur_initial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engins_fichier" (
    "id" SERIAL NOT NULL,
    "id_engin" INTEGER NOT NULL,
    "adresse" TEXT,

    CONSTRAINT "engins_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "date_creation" TIMESTAMP(3) NOT NULL,
    "duree" TEXT NOT NULL DEFAULT 'Chaque Mois',
    "montant" DECIMAL(65,30) NOT NULL,
    "creation_auto" BOOLEAN NOT NULL DEFAULT false,
    "categorie_choix" BOOLEAN NOT NULL DEFAULT false,
    "fournisseur_choix" BOOLEAN NOT NULL DEFAULT false,
    "creer_nv" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_categorie" (
    "id" SERIAL NOT NULL,
    "id_budget" INTEGER NOT NULL,
    "id_categorie" INTEGER NOT NULL,

    CONSTRAINT "budget_categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_fournisseur" (
    "id" SERIAL NOT NULL,
    "id_budget" INTEGER NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,

    CONSTRAINT "budget_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activite" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,
    "type_st" BOOLEAN NOT NULL DEFAULT true,
    "type_article" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "activite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_sous_traitance" (
    "id" SERIAL NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL,
    "heure_creation" TEXT,
    "createur" TEXT,
    "statut" INTEGER,

    CONSTRAINT "demande_sous_traitance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_devis" (
    "id" SERIAL NOT NULL,
    "id_ds" INTEGER NOT NULL,
    "date_devis" TIMESTAMP(3) NOT NULL,
    "heure_devis" TEXT,
    "createur" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'En cours',
    "livr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ds_devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_devis_fournisseur" (
    "id" SERIAL NOT NULL,
    "id_devis" INTEGER NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,

    CONSTRAINT "ds_devis_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_devis_article" (
    "id" SERIAL NOT NULL,
    "id_devis" INTEGER NOT NULL,
    "id_t" INTEGER,
    "qt" DECIMAL(65,30) NOT NULL,
    "id_activite" INTEGER,
    "prix_ht" DECIMAL(65,30),
    "remise" DECIMAL(65,30),
    "source" TEXT,

    CONSTRAINT "ds_devis_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_devis_fichier" (
    "id" SERIAL NOT NULL,
    "id_devis" INTEGER NOT NULL,
    "adresse" TEXT,

    CONSTRAINT "ds_devis_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_commande" (
    "id" SERIAL NOT NULL,
    "n_commande" TEXT,
    "date_commande" TIMESTAMP(3) NOT NULL,
    "heure_commande" TEXT,
    "createur" TEXT,
    "id_fournisseur" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'En attente',
    "personne_contacter" TEXT,
    "date_signature" TIMESTAMP(3),
    "id_ds" INTEGER NOT NULL,
    "urgence" TEXT,
    "fodec" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ds_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_commande_article" (
    "id" SERIAL NOT NULL,
    "id_commande" INTEGER NOT NULL,
    "id_t" INTEGER,
    "qt" DECIMAL(65,30) NOT NULL,
    "id_activite" INTEGER,
    "prix_ht" DECIMAL(65,30),
    "remise" DECIMAL(65,30),
    "source" TEXT,
    "reception" DECIMAL(65,30) DEFAULT 0,
    "descr" TEXT,

    CONSTRAINT "ds_commande_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_bon_livraison" (
    "id" SERIAL NOT NULL,
    "id_commande" INTEGER,
    "date_livraison" TIMESTAMP(3) NOT NULL,
    "heure_livraison" TEXT,
    "livraison_par" TEXT,
    "statut" TEXT,
    "date_reel" TIMESTAMP(3),
    "id_fournisseur" INTEGER,
    "bl_fournisseur" TEXT,

    CONSTRAINT "ds_bon_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_livraison_article" (
    "id" SERIAL NOT NULL,
    "id_livraison" INTEGER NOT NULL,
    "id_ds_commande_article" INTEGER NOT NULL,
    "qt" DECIMAL(65,30) NOT NULL,
    "prix_ht" DECIMAL(65,30),
    "remise" DECIMAL(65,30),

    CONSTRAINT "ds_livraison_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_historique_mvt" (
    "id" SERIAL NOT NULL,
    "id_t" INTEGER,
    "id_mvt" INTEGER,
    "date_mvt" TIMESTAMP(3) NOT NULL,
    "heure_mvt" TEXT,
    "mvt" TEXT NOT NULL,

    CONSTRAINT "ds_historique_mvt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secteur" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,

    CONSTRAINT "secteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tab_type" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,

    CONSTRAINT "tab_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisation" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,

    CONSTRAINT "utilisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outils" (
    "id" SERIAL NOT NULL,
    "photo" BYTEA,
    "code_outils" TEXT,
    "designation" TEXT NOT NULL,
    "fk_secteur_id" INTEGER,
    "num_serie" TEXT,
    "num_modele" TEXT,
    "fabriquant" TEXT,
    "date_achat" TIMESTAMP(3),
    "fin_garantie" TIMESTAMP(3),
    "mise_service" TIMESTAMP(3),
    "prix_achat" DECIMAL(65,30),
    "remarque" TEXT,
    "fk_type_id" INTEGER,
    "etat_outil" TEXT,
    "statut" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "outils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tab_lancement_affectation" (
    "id" SERIAL NOT NULL,
    "id_intervenant" INTEGER,
    "outil" INTEGER,
    "date_debut" TIMESTAMP(3),
    "heure_debut" TEXT,
    "date_fin" TIMESTAMP(3),
    "heure_fin" TEXT,
    "commentaire" TEXT,
    "encours" BOOLEAN NOT NULL DEFAULT true,
    "n_ot" TEXT,

    CONSTRAINT "tab_lancement_affectation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_bl" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_liv_article" INTEGER NOT NULL,

    CONSTRAINT "ot_bl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_projet" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "cout" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ot_projet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_commentaire" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "auteur" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_commentaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_fichier" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "adresse" TEXT,

    CONSTRAINT "tableau_article_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dop" (
    "id" SERIAL NOT NULL,
    "date_dop" TIMESTAMP(3) NOT NULL,
    "heure_dop" TEXT,
    "createur" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'En cours',

    CONSTRAINT "dop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dop_article" (
    "id" SERIAL NOT NULL,
    "id_dop" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "qt" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "dop_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dop_fournisseur" (
    "id" SERIAL NOT NULL,
    "id_dop" INTEGER NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,

    CONSTRAINT "dop_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dop_fini" (
    "id" SERIAL NOT NULL,
    "id_dop" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,
    "prix_ht" DECIMAL(65,30) NOT NULL,
    "remise" DECIMAL(65,30) NOT NULL,
    "qt_disponible" DECIMAL(65,30),
    "fini" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "dop_fini_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis" (
    "id" SERIAL NOT NULL,
    "date_devis" TIMESTAMP(3) NOT NULL,
    "heure_devis" TEXT,
    "createur" TEXT,
    "id_dop" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'En cours',
    "livr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis_article" (
    "id" SERIAL NOT NULL,
    "id_devis" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "qt_disponible" DECIMAL(65,30) NOT NULL,
    "prix_ht" DECIMAL(65,30) NOT NULL,
    "remise" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "devis_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis_fournisseur" (
    "id" SERIAL NOT NULL,
    "id_devis" INTEGER NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,

    CONSTRAINT "devis_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis_fichier" (
    "id" SERIAL NOT NULL,
    "id_devis" INTEGER NOT NULL,
    "adresse" TEXT NOT NULL,

    CONSTRAINT "devis_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_commentaire" (
    "id" SERIAL NOT NULL,
    "id_atelier" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "auteur" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atelier_commentaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_fichier" (
    "id" SERIAL NOT NULL,
    "id_atelier" INTEGER NOT NULL,
    "adresse" TEXT,

    CONSTRAINT "atelier_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caracteristique" (
    "id" SERIAL NOT NULL,
    "id_sous_famille" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "champ_obligatoire" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "caracteristique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caracteristique_option" (
    "id" SERIAL NOT NULL,
    "id_caracteristique" INTEGER NOT NULL,
    "valeur_option" TEXT NOT NULL,
    "defaut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "caracteristique_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caracteristique_textbox" (
    "id" SERIAL NOT NULL,
    "id_caracteristique" INTEGER NOT NULL,
    "type" TEXT,
    "valeur_defaut" TEXT,

    CONSTRAINT "caracteristique_textbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_caracteristique" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_caracteristique" INTEGER NOT NULL,
    "valeur" TEXT,

    CONSTRAINT "tableau_article_caracteristique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_unite_article" (
    "id" SERIAL NOT NULL,
    "code_unite" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_unite_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_unite" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,

    CONSTRAINT "tableau_article_unite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamme_ressources_fonction" (
    "id" SERIAL NOT NULL,
    "id_fonction" INTEGER NOT NULL,
    "id_gamme" INTEGER NOT NULL,
    "nbre_requis" INTEGER NOT NULL,
    "min_planif" INTEGER NOT NULL,
    "type_cout" TEXT NOT NULL,

    CONSTRAINT "gamme_ressources_fonction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamme_ressources_outillage" (
    "id" SERIAL NOT NULL,
    "id_type" INTEGER NOT NULL,
    "id_gamme" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,

    CONSTRAINT "gamme_ressources_outillage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamme_ressources_pdr" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_gamme" INTEGER NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "gamme_ressources_pdr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_ressources_outil" (
    "id" SERIAL NOT NULL,
    "id_type" INTEGER NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "date_sh" TIMESTAMP(3) NOT NULL,
    "quantite" INTEGER NOT NULL,

    CONSTRAINT "ot_ressources_outil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_ressources_pdr" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL,
    "date_sh" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ot_ressources_pdr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_generale" (
    "id" SERIAL NOT NULL,
    "id_equipement" INTEGER NOT NULL,
    "reference" TEXT,
    "marque" TEXT,
    "n_serie" TEXT,
    "n_modele" TEXT,
    "n_contrat" TEXT,
    "n_immobilisation" TEXT,
    "fabricant" TEXT,
    "cout_achat" TEXT,
    "date_achat" TIMESTAMP(3),
    "date_mise_en_service" TIMESTAMP(3),
    "date_fin_garentie" TIMESTAMP(3),
    "date_fin_amortissement" TIMESTAMP(3),
    "fonction_req" TEXT,

    CONSTRAINT "equipement_generale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_technique" (
    "id" SERIAL NOT NULL,
    "id_equipement" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "observation" TEXT NOT NULL,

    CONSTRAINT "equipement_technique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_image" (
    "id" SERIAL NOT NULL,
    "id_equipement" INTEGER NOT NULL,
    "photo" BYTEA,

    CONSTRAINT "equipement_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_pdf" (
    "id" SERIAL NOT NULL,
    "id_equipement" INTEGER NOT NULL,
    "adresse" TEXT NOT NULL,

    CONSTRAINT "equipement_pdf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_observation" (
    "id" SERIAL NOT NULL,
    "id_equipement" INTEGER NOT NULL,
    "observation" TEXT,

    CONSTRAINT "equipement_observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_prevision" (
    "id" SERIAL NOT NULL,
    "id_equipement" INTEGER NOT NULL,
    "cout_arrêt" DECIMAL(65,30),
    "nbre_arrêt" DECIMAL(65,30),
    "periode_nbr" DECIMAL(65,30),
    "periode" TEXT,

    CONSTRAINT "equipement_prevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relation_anomalie" (
    "id" SERIAL NOT NULL,
    "id_anomalie" INTEGER NOT NULL,
    "id_parent" INTEGER NOT NULL,

    CONSTRAINT "relation_anomalie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptome_defaillance" (
    "id" SERIAL NOT NULL,
    "id_symptome" INTEGER NOT NULL,
    "id_defaillance" INTEGER NOT NULL,

    CONSTRAINT "symptome_defaillance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_diagnostic" (
    "id" SERIAL NOT NULL,
    "id_defaillance" INTEGER NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "operation_diagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_diagnostic_m" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_defaillance" INTEGER NOT NULL,
    "type_m" TEXT NOT NULL,

    CONSTRAINT "ot_diagnostic_m_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_diagnostic_def" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_defaillance" INTEGER NOT NULL,

    CONSTRAINT "ot_diagnostic_def_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_diagnostic_detection" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_defaillance" INTEGER NOT NULL,
    "type_d" INTEGER NOT NULL,

    CONSTRAINT "ot_diagnostic_detection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_diagnostic_symptome" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_symptome" INTEGER NOT NULL,
    "id_defaillance" INTEGER NOT NULL,

    CONSTRAINT "ot_diagnostic_symptome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_diagnostic_operation" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_operation" INTEGER NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ot_diagnostic_operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bon_livraison" (
    "id" SERIAL NOT NULL,
    "date_livraison" TIMESTAMP(3) NOT NULL,
    "heure_livraison" TEXT,
    "livraison_par" TEXT,
    "id_reception" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'En cours',
    "date_reel" TIMESTAMP(3),
    "bl_fournisseur" TEXT,

    CONSTRAINT "bon_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livraison_article" (
    "id" SERIAL NOT NULL,
    "id_livraison" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "qt" DECIMAL(65,30) NOT NULL,
    "prix_ht" DECIMAL(65,30) NOT NULL,
    "remise" DECIMAL(65,30) NOT NULL,
    "investissement" BOOLEAN,

    CONSTRAINT "livraison_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_reception" (
    "id" SERIAL NOT NULL,
    "id_atelier" INTEGER NOT NULL,
    "date_reception" TIMESTAMP(3) NOT NULL,
    "qt_recu" DECIMAL(65,30) NOT NULL,
    "etat" TEXT,

    CONSTRAINT "atelier_reception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamme_centre_charge" (
    "id" SERIAL NOT NULL,
    "id_gamme" INTEGER NOT NULL,
    "id_centre_charge" INTEGER,

    CONSTRAINT "gamme_centre_charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_maintenance" (
    "id" SERIAL NOT NULL,
    "id_intervention" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "operation_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outil_utilisation" (
    "id" SERIAL NOT NULL,
    "id_outil" INTEGER NOT NULL,
    "id_utilisation" INTEGER NOT NULL,

    CONSTRAINT "outil_utilisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_maintenance" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plan_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reclamation_anomalie" (
    "id" SERIAL NOT NULL,
    "anomalie" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "id_engin" INTEGER NOT NULL,
    "id_chauffeur" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reclamation_anomalie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facture" (
    "id" SERIAL NOT NULL,
    "date_facture" TIMESTAMP(3) NOT NULL,
    "heure_facture" TEXT,
    "createur" TEXT,
    "id_fournisseur" INTEGER NOT NULL,
    "tva" DECIMAL(65,30) NOT NULL,
    "date_reel" TIMESTAMP(3),
    "n_facture" TEXT,

    CONSTRAINT "facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facture_livraison" (
    "id" SERIAL NOT NULL,
    "id_facture" INTEGER NOT NULL,
    "id_livraison" INTEGER NOT NULL,

    CONSTRAINT "facture_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_facture" (
    "id" SERIAL NOT NULL,
    "date_facture" TIMESTAMP(3) NOT NULL,
    "heure_facture" TEXT,
    "createur" TEXT,
    "id_fournisseur" INTEGER NOT NULL,
    "tva" DECIMAL(65,30) NOT NULL,
    "date_reel" TIMESTAMP(3),
    "n_facture" TEXT,

    CONSTRAINT "ds_facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_facture_livraison" (
    "id" SERIAL NOT NULL,
    "id_facture" INTEGER NOT NULL,
    "id_livraison" INTEGER NOT NULL,

    CONSTRAINT "ds_facture_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ac_reapprovisionnement" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "qt" DECIMAL(65,30) NOT NULL,
    "delai" INTEGER NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "heure_debut" TEXT,
    "reccurence" INTEGER NOT NULL,
    "date_limite" TIMESTAMP(3),
    "periode" TEXT,
    "arr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ac_reapprovisionnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ac_reapprovisionnement_ech" (
    "id" SERIAL NOT NULL,
    "id_rep" INTEGER NOT NULL,
    "date_ech" TIMESTAMP(3) NOT NULL,
    "heure_ech" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ac_reapprovisionnement_ech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ac_recompletement" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "delai" INTEGER NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "heure_debut" TEXT,
    "reccurence" INTEGER NOT NULL,
    "date_limite" TIMESTAMP(3) NOT NULL,
    "periode" TEXT,
    "arr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ac_recompletement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ac_recompletement_ech" (
    "id" SERIAL NOT NULL,
    "id_rep" INTEGER NOT NULL,
    "date_ech" TIMESTAMP(3) NOT NULL,
    "heure_ech" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ac_recompletement_ech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bon_de_carburant" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL,
    "prix_u" DECIMAL(65,30) NOT NULL,
    "prix_ttc" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "id_engin" INTEGER NOT NULL,
    "id_chauffeur" INTEGER NOT NULL,
    "id_type_carburant" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bon_de_carburant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voyage" (
    "id" SERIAL NOT NULL,
    "depart" TEXT NOT NULL,
    "arrive" TEXT NOT NULL,
    "distance" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heure_dep" TEXT,
    "heure_arr" TEXT,
    "id_engin" INTEGER NOT NULL,
    "id_chauffeur" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "voyage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engin_parc_liaison_carburant" (
    "id" SERIAL NOT NULL,
    "id_carburant" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "engin_parc_liaison_carburant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande_modification_base" (
    "id" SERIAL NOT NULL,
    "id_commande" INTEGER NOT NULL,
    "modifier_par" TEXT,
    "date_modification" TIMESTAMP(3) NOT NULL,
    "heure_modification" TEXT,

    CONSTRAINT "commande_modification_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande_modifier_article" (
    "id" SERIAL NOT NULL,
    "id_modification" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "qt" DECIMAL(65,30) NOT NULL,
    "prix_ht" DECIMAL(65,30) NOT NULL,
    "remise" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "commande_modifier_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modification_article" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "tva" DECIMAL(65,30),
    "prix_ht" DECIMAL(65,30),
    "stock_neuf" DECIMAL(65,30),
    "stock_use" DECIMAL(65,30),
    "stock_rebute" DECIMAL(65,30),
    "date_modification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modification_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_mp" (
    "id" SERIAL NOT NULL,
    "id_demande" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "qt" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ds_mp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ds_nv_article" (
    "id" SERIAL NOT NULL,
    "id_demande" INTEGER NOT NULL,
    "id_article" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "id_activite" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "ds_nv_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magasin_sous_traitance" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "ref_interne" TEXT NOT NULL,
    "reception" BOOLEAN NOT NULL DEFAULT false,
    "nbr_reparation" INTEGER NOT NULL DEFAULT 0,
    "demande_actuel" INTEGER,
    "activite_actuel" INTEGER,
    "description" TEXT,
    "emplacement_actuel" TEXT,
    "equipement_actuel" INTEGER,

    CONSTRAINT "magasin_sous_traitance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature" (
    "id" SERIAL NOT NULL,
    "id_utilisateur" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,

    CONSTRAINT "signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_activite_fournisseur" (
    "id" SERIAL NOT NULL,
    "code_activite" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_activite_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_fournisseur_activite" (
    "id" SERIAL NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,
    "id_activite" INTEGER NOT NULL,

    CONSTRAINT "tableau_fournisseur_activite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_compte_fournisseur" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "estimation" DECIMAL(65,30) NOT NULL,
    "periode_nbre" DECIMAL(65,30) NOT NULL,
    "periode" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_compte_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_fournisseur_compte" (
    "id" SERIAL NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,
    "id_compte" INTEGER NOT NULL,

    CONSTRAINT "tableau_fournisseur_compte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_devise_fournisseur" (
    "id" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "conversion" DECIMAL(65,30) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_devise_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_fournisseur_devise" (
    "id" SERIAL NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,
    "id_devise" INTEGER NOT NULL,

    CONSTRAINT "tableau_fournisseur_devise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_livraison_fournisseur" (
    "id" SERIAL NOT NULL,
    "code_livraison" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_livraison_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_fournisseur_livraison" (
    "id" SERIAL NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,
    "id_livraison" INTEGER NOT NULL,

    CONSTRAINT "tableau_fournisseur_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_reglement_fournisseur" (
    "id" SERIAL NOT NULL,
    "code_reglement" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_reglement_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_fournisseur_reglement" (
    "id" SERIAL NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,
    "id_reglement" INTEGER NOT NULL,

    CONSTRAINT "tableau_fournisseur_reglement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_fournisseur_fichier" (
    "id" SERIAL NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,
    "adresse" TEXT NOT NULL,

    CONSTRAINT "tableau_fournisseur_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_classification_article" (
    "id" SERIAL NOT NULL,
    "code_classification" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_classification_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_classification" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_classification" INTEGER NOT NULL,

    CONSTRAINT "tableau_article_classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_emplacement_article" (
    "id" SERIAL NOT NULL,
    "code_emplacement" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_emplacement_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_emplacement" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_emplacement" INTEGER NOT NULL,

    CONSTRAINT "tableau_article_emplacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_stockage_article" (
    "id" SERIAL NOT NULL,
    "code_stockage" TEXT,
    "designation" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "parametre_stockage_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_stockage" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_stockage" INTEGER NOT NULL,

    CONSTRAINT "tableau_article_stockage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_equipement" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_equipement" INTEGER NOT NULL,

    CONSTRAINT "tableau_article_equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tableau_article_fournisseur" (
    "id" SERIAL NOT NULL,
    "id_article" INTEGER NOT NULL,
    "id_fournisseur" INTEGER NOT NULL,

    CONSTRAINT "tableau_article_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_image" (
    "id" SERIAL NOT NULL,
    "photo_parc" BYTEA,
    "photo_atelier" BYTEA,
    "photo_usine" BYTEA,

    CONSTRAINT "parametre_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" SERIAL NOT NULL,
    "id_n" INTEGER,
    "type" TEXT,
    "id_utilisateur" INTEGER,
    "description" TEXT,
    "vue" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_alerte" (
    "id" SERIAL NOT NULL,
    "id_not" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "id_utilisateur" INTEGER,
    "description" TEXT NOT NULL,
    "vue" BOOLEAN NOT NULL DEFAULT false,
    "date_creation" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_alerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activite_famille" (
    "id" SERIAL NOT NULL,
    "id_activite" INTEGER NOT NULL,
    "id_famille" INTEGER NOT NULL,

    CONSTRAINT "activite_famille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activite_operation" (
    "id" SERIAL NOT NULL,
    "id_activite" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,

    CONSTRAINT "activite_operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activite_sous_famille" (
    "id" SERIAL NOT NULL,
    "id_activite" INTEGER NOT NULL,
    "id_sous_famille" INTEGER NOT NULL,

    CONSTRAINT "activite_sous_famille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_cause_realisation" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,

    CONSTRAINT "parametre_cause_realisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ot_cause_realisation" (
    "id" SERIAL NOT NULL,
    "id_ot" INTEGER NOT NULL,
    "id_cause" INTEGER NOT NULL,

    CONSTRAINT "ot_cause_realisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre_centre_charge" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "designation" TEXT NOT NULL,
    "budget" DECIMAL(65,30),

    CONSTRAINT "parametre_centre_charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_compteur_historique" (
    "id" SERIAL NOT NULL,
    "id_compteur" INTEGER NOT NULL,
    "valeur" DECIMAL(65,30) NOT NULL,
    "date_mesure" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipement_compteur_historique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipement_compteur_nv" (
    "id" SERIAL NOT NULL,
    "id_compteur" INTEGER NOT NULL,
    "valeur" DECIMAL(65,30) NOT NULL,
    "date_nv" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipement_compteur_nv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compteur_liaison" (
    "id" SERIAL NOT NULL,
    "id_organe" INTEGER NOT NULL,
    "id_compteur" INTEGER NOT NULL,
    "id_intervention" INTEGER NOT NULL,

    CONSTRAINT "compteur_liaison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_mesure" (
    "id" SERIAL NOT NULL,
    "id_mesure" INTEGER NOT NULL,
    "id_saisie" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,

    CONSTRAINT "prod_mesure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_chef_equipe" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "id_chef_equipe" INTEGER NOT NULL,

    CONSTRAINT "prod_rapport_chef_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prod_rapport_heure" (
    "id" SERIAL NOT NULL,
    "id_rapport" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,
    "heure" INTEGER NOT NULL,
    "id_produit" INTEGER NOT NULL,

    CONSTRAINT "prod_rapport_heure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_login_key" ON "utilisateur"("login");

-- CreateIndex
CREATE UNIQUE INDEX "equipement_engin_key" ON "equipement"("engin");

-- CreateIndex
CREATE INDEX "ordre_travail_statut_idx" ON "ordre_travail"("statut");

-- CreateIndex
CREATE INDEX "ordre_travail_type_idx" ON "ordre_travail"("type");

-- CreateIndex
CREATE INDEX "ordre_travail_date_debut_idx" ON "ordre_travail"("date_debut");

-- CreateIndex
CREATE UNIQUE INDEX "prod_rapport_general_date_rapport_poste_key" ON "prod_rapport_general"("date_rapport", "poste");

-- CreateIndex
CREATE UNIQUE INDEX "prod_rapport_cf_fabrication_id_rapport_id_unite_key" ON "prod_rapport_cf_fabrication"("id_rapport", "id_unite");

-- CreateIndex
CREATE UNIQUE INDEX "prod_rapport_cf_emballage_id_rapport_id_unite_key" ON "prod_rapport_cf_emballage"("id_rapport", "id_unite");

-- CreateIndex
CREATE UNIQUE INDEX "atelier_creer_n_of_key" ON "atelier_creer"("n_of");

-- CreateIndex
CREATE UNIQUE INDEX "engin_compteur_initial_id_compteur_key" ON "engin_compteur_initial"("id_compteur");

-- CreateIndex
CREATE UNIQUE INDEX "equipement_generale_id_equipement_key" ON "equipement_generale"("id_equipement");

-- CreateIndex
CREATE UNIQUE INDEX "equipement_prevision_id_equipement_key" ON "equipement_prevision"("id_equipement");

-- CreateIndex
CREATE UNIQUE INDEX "signature_id_utilisateur_key" ON "signature"("id_utilisateur");

-- AddForeignKey
ALTER TABLE "intervenant" ADD CONSTRAINT "intervenant_id_fonction_fkey" FOREIGN KEY ("id_fonction") REFERENCES "fonction_intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement" ADD CONSTRAINT "equipement_id_parent_fkey" FOREIGN KEY ("id_parent") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement" ADD CONSTRAINT "equipement_engin_fkey" FOREIGN KEY ("engin") REFERENCES "engins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_intervention" ADD CONSTRAINT "demande_intervention_id_defaillance_fkey" FOREIGN KEY ("id_defaillance") REFERENCES "parametre_anomalie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_intervention" ADD CONSTRAINT "demande_intervention_equipement_fkey" FOREIGN KEY ("equipement") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_id_di_fkey" FOREIGN KEY ("id_di") REFERENCES "demande_intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_id_intervention_fkey" FOREIGN KEY ("id_intervention") REFERENCES "parametre_intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_id_classe_fkey" FOREIGN KEY ("id_classe") REFERENCES "parametre_classe_intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_id_superviseur_fkey" FOREIGN KEY ("id_superviseur") REFERENCES "intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_createur_fkey" FOREIGN KEY ("createur") REFERENCES "utilisateur"("login") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_atelier_fkey" FOREIGN KEY ("atelier") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_equipement_fkey" FOREIGN KEY ("equipement") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_sous_equipement_fkey" FOREIGN KEY ("sous_equipement") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_organe_fkey" FOREIGN KEY ("organe") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordre_travail" ADD CONSTRAINT "ordre_travail_id_defaillance_fkey" FOREIGN KEY ("id_defaillance") REFERENCES "parametre_anomalie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ressources_fonction" ADD CONSTRAINT "ot_ressources_fonction_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ressources_fonction" ADD CONSTRAINT "ot_ressources_fonction_id_fonction_fkey" FOREIGN KEY ("id_fonction") REFERENCES "fonction_intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ordo_intervenant" ADD CONSTRAINT "ot_ordo_intervenant_id_intervenant_fkey" FOREIGN KEY ("id_intervenant") REFERENCES "intervenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ordo_intervenant" ADD CONSTRAINT "ot_ordo_intervenant_id_ressource_fonction_fkey" FOREIGN KEY ("id_ressource_fonction") REFERENCES "ot_ressources_fonction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ordo_intervention" ADD CONSTRAINT "ot_ordo_intervention_id_ressource_fonction_fkey" FOREIGN KEY ("id_ressource_fonction") REFERENCES "ot_ressources_fonction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_centre_charge" ADD CONSTRAINT "ot_centre_charge_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_centre_charge" ADD CONSTRAINT "ot_centre_charge_id_centre_charge_fkey" FOREIGN KEY ("id_centre_charge") REFERENCES "parametre_centre_charge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_fichier" ADD CONSTRAINT "ot_fichier_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_commentaire" ADD CONSTRAINT "ot_commentaire_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prev_syst_ech" ADD CONSTRAINT "prev_syst_ech_id_rep_fkey" FOREIGN KEY ("id_rep") REFERENCES "prev_systematique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prev_mesure" ADD CONSTRAINT "prev_mesure_id_prev_fkey" FOREIGN KEY ("id_prev") REFERENCES "prev_conditionnelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prev_compteur" ADD CONSTRAINT "prev_compteur_id_compteur_fkey" FOREIGN KEY ("id_compteur") REFERENCES "equipement_compteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_reinit_compteur" ADD CONSTRAINT "ot_reinit_compteur_id_prev_compteur_fkey" FOREIGN KEY ("id_prev_compteur") REFERENCES "prev_compteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_reinit_compteur" ADD CONSTRAINT "ot_reinit_compteur_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_equipement" ADD CONSTRAINT "prod_equipement_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_fab_compteur" ADD CONSTRAINT "prod_fab_compteur_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_fab_produit" ADD CONSTRAINT "prod_rapport_fab_produit_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_fab_produit" ADD CONSTRAINT "prod_rapport_fab_produit_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_fab_produit" ADD CONSTRAINT "prod_rapport_fab_produit_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "prod_type_brique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_emb_produit" ADD CONSTRAINT "prod_rapport_emb_produit_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_emb_produit" ADD CONSTRAINT "prod_rapport_emb_produit_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_emb_produit" ADD CONSTRAINT "prod_rapport_emb_produit_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "prod_type_brique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_four_entre" ADD CONSTRAINT "prod_rapport_four_entre_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_four_entre" ADD CONSTRAINT "prod_rapport_four_entre_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_four_entre" ADD CONSTRAINT "prod_rapport_four_entre_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "prod_type_brique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_four_sortie" ADD CONSTRAINT "prod_rapport_four_sortie_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_four_sortie" ADD CONSTRAINT "prod_rapport_four_sortie_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_four_sortie" ADD CONSTRAINT "prod_rapport_four_sortie_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "prod_type_brique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_mesure_rapport" ADD CONSTRAINT "prod_mesure_rapport_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_mesure_rapport" ADD CONSTRAINT "prod_mesure_rapport_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_mesure_rapport" ADD CONSTRAINT "prod_mesure_rapport_id_qualite_fkey" FOREIGN KEY ("id_qualite") REFERENCES "prod_saisie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_prep_as" ADD CONSTRAINT "prod_rapport_prep_as_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_prep_as" ADD CONSTRAINT "prod_rapport_prep_as_id_qualite_fkey" FOREIGN KEY ("id_qualite") REFERENCES "prod_saisie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_horaire_fabrication" ADD CONSTRAINT "prod_rapport_horaire_fabrication_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_fab_tonnage" ADD CONSTRAINT "prod_fab_tonnage_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_fab_tonnage" ADD CONSTRAINT "prod_fab_tonnage_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_fuel" ADD CONSTRAINT "prod_fuel_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_gaz" ADD CONSTRAINT "prod_gaz_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_four_consommation_electrique" ADD CONSTRAINT "prod_four_consommation_electrique_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "parametre_unite_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_cf_fabrication" ADD CONSTRAINT "prod_rapport_cf_fabrication_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_cf_fabrication" ADD CONSTRAINT "prod_rapport_cf_fabrication_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_cf_fabrication" ADD CONSTRAINT "prod_rapport_cf_fabrication_id_cf_fkey" FOREIGN KEY ("id_cf") REFERENCES "intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_cf_emballage" ADD CONSTRAINT "prod_rapport_cf_emballage_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_cf_emballage" ADD CONSTRAINT "prod_rapport_cf_emballage_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_cf_emballage" ADD CONSTRAINT "prod_rapport_cf_emballage_id_cf_fkey" FOREIGN KEY ("id_cf") REFERENCES "intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_anomalie" ADD CONSTRAINT "prod_rapport_anomalie_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_anomalie" ADD CONSTRAINT "prod_rapport_anomalie_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_anomalie" ADD CONSTRAINT "prod_rapport_anomalie_id_anomalie_fkey" FOREIGN KEY ("id_anomalie") REFERENCES "prod_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sous_famille" ADD CONSTRAINT "sous_famille_id_famille_fkey" FOREIGN KEY ("id_famille") REFERENCES "famille"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article" ADD CONSTRAINT "article_id_magasin_fkey" FOREIGN KEY ("id_magasin") REFERENCES "magasin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_sous_famille" ADD CONSTRAINT "tableau_article_sous_famille_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_sous_famille" ADD CONSTRAINT "tableau_article_sous_famille_id_sous_famille_fkey" FOREIGN KEY ("id_sous_famille") REFERENCES "sous_famille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsm_article" ADD CONSTRAINT "bsm_article_id_bsm_fkey" FOREIGN KEY ("id_bsm") REFERENCES "bsm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsm_article" ADD CONSTRAINT "bsm_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsm_equipement" ADD CONSTRAINT "bsm_equipement_id_bsm_fkey" FOREIGN KEY ("id_bsm") REFERENCES "bsm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bsm_equipement" ADD CONSTRAINT "bsm_equipement_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brm" ADD CONSTRAINT "brm_id_bsm_ref_fkey" FOREIGN KEY ("id_bsm_ref") REFERENCES "bsm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brm_article" ADD CONSTRAINT "brm_article_id_brm_fkey" FOREIGN KEY ("id_brm") REFERENCES "brm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brm_article" ADD CONSTRAINT "brm_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_article" ADD CONSTRAINT "reception_article_id_reception_fkey" FOREIGN KEY ("id_reception") REFERENCES "reception"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_article" ADD CONSTRAINT "reception_article_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_article" ADD CONSTRAINT "reception_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_article" ADD CONSTRAINT "reception_article_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_commande" ADD CONSTRAINT "reception_commande_id_reception_fkey" FOREIGN KEY ("id_reception") REFERENCES "reception"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reception_commande" ADD CONSTRAINT "reception_commande_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_fichier" ADD CONSTRAINT "da_fichier_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_article" ADD CONSTRAINT "da_article_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_article" ADD CONSTRAINT "da_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_article_equipement" ADD CONSTRAINT "da_article_equipement_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "da_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_article_equipement" ADD CONSTRAINT "da_article_equipement_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_action" ADD CONSTRAINT "da_action_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande" ADD CONSTRAINT "commande_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_article" ADD CONSTRAINT "commande_article_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_article" ADD CONSTRAINT "commande_article_id_da_article_fkey" FOREIGN KEY ("id_da_article") REFERENCES "da_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_atelier_fkey" FOREIGN KEY ("atelier") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_equipement_fkey" FOREIGN KEY ("equipement") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_sous_equipement_fkey" FOREIGN KEY ("sous_equipement") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_organe_fkey" FOREIGN KEY ("organe") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_id_demandeur_fkey" FOREIGN KEY ("id_demandeur") REFERENCES "intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_id_parametre_piece_fkey" FOREIGN KEY ("id_parametre_piece") REFERENCES "atelier_parametre_piece"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_id_parametre_priorite_fkey" FOREIGN KEY ("id_parametre_priorite") REFERENCES "atelier_parametre_priorite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_id_parametre_conception_fkey" FOREIGN KEY ("id_parametre_conception") REFERENCES "atelier_parametre_conception"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_creer" ADD CONSTRAINT "atelier_creer_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_etat" ADD CONSTRAINT "atelier_etat_id_atelier_fkey" FOREIGN KEY ("id_atelier") REFERENCES "atelier_creer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_retour" ADD CONSTRAINT "atelier_retour_id_atelier_fkey" FOREIGN KEY ("id_atelier") REFERENCES "atelier_creer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_donnees" ADD CONSTRAINT "atelier_donnees_id_atelier_fkey" FOREIGN KEY ("id_atelier") REFERENCES "atelier_creer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_piece" ADD CONSTRAINT "atelier_piece_id_atelier_fkey" FOREIGN KEY ("id_atelier") REFERENCES "atelier_creer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_suivi_journalier" ADD CONSTRAINT "atelier_suivi_journalier_id_machine_fkey" FOREIGN KEY ("id_machine") REFERENCES "atelier_machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_suivi_journalier" ADD CONSTRAINT "atelier_suivi_journalier_id_operateur_fkey" FOREIGN KEY ("id_operateur") REFERENCES "intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_bsm" ADD CONSTRAINT "atelier_bsm_id_atelier_fkey" FOREIGN KEY ("id_atelier") REFERENCES "atelier_creer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_bsm" ADD CONSTRAINT "atelier_bsm_id_bsm_fkey" FOREIGN KEY ("id_bsm") REFERENCES "bsm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engins" ADD CONSTRAINT "engins_id_vehicule_fkey" FOREIGN KEY ("id_vehicule") REFERENCES "type_de_vehicule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engins" ADD CONSTRAINT "engins_id_chauffeur_fkey" FOREIGN KEY ("id_chauffeur") REFERENCES "chauffeur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engins" ADD CONSTRAINT "engins_id_categorie_fkey" FOREIGN KEY ("id_categorie") REFERENCES "categorie_de_charge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engins_assurance" ADD CONSTRAINT "engins_assurance_id_engin_fkey" FOREIGN KEY ("id_engin") REFERENCES "engins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engins_vignette" ADD CONSTRAINT "engins_vignette_id_engin_fkey" FOREIGN KEY ("id_engin") REFERENCES "engins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engins_visite_technique" ADD CONSTRAINT "engins_visite_technique_id_engin_fkey" FOREIGN KEY ("id_engin") REFERENCES "engins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engin_sortie_carburant" ADD CONSTRAINT "engin_sortie_carburant_id_engin_fkey" FOREIGN KEY ("id_engin") REFERENCES "engins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engin_sortie_carburant" ADD CONSTRAINT "engin_sortie_carburant_id_carbu_fkey" FOREIGN KEY ("id_carbu") REFERENCES "type_de_carburant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engin_compteur_initial" ADD CONSTRAINT "engin_compteur_initial_id_compteur_fkey" FOREIGN KEY ("id_compteur") REFERENCES "equipement_compteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engins_fichier" ADD CONSTRAINT "engins_fichier_id_engin_fkey" FOREIGN KEY ("id_engin") REFERENCES "engins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categorie" ADD CONSTRAINT "budget_categorie_id_budget_fkey" FOREIGN KEY ("id_budget") REFERENCES "budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categorie" ADD CONSTRAINT "budget_categorie_id_categorie_fkey" FOREIGN KEY ("id_categorie") REFERENCES "famille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_fournisseur" ADD CONSTRAINT "budget_fournisseur_id_budget_fkey" FOREIGN KEY ("id_budget") REFERENCES "budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_fournisseur" ADD CONSTRAINT "budget_fournisseur_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_devis" ADD CONSTRAINT "ds_devis_id_ds_fkey" FOREIGN KEY ("id_ds") REFERENCES "demande_sous_traitance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_devis_fournisseur" ADD CONSTRAINT "ds_devis_fournisseur_id_devis_fkey" FOREIGN KEY ("id_devis") REFERENCES "ds_devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_devis_fournisseur" ADD CONSTRAINT "ds_devis_fournisseur_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_devis_article" ADD CONSTRAINT "ds_devis_article_id_devis_fkey" FOREIGN KEY ("id_devis") REFERENCES "ds_devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_devis_article" ADD CONSTRAINT "ds_devis_article_id_activite_fkey" FOREIGN KEY ("id_activite") REFERENCES "activite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_devis_fichier" ADD CONSTRAINT "ds_devis_fichier_id_devis_fkey" FOREIGN KEY ("id_devis") REFERENCES "ds_devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_commande" ADD CONSTRAINT "ds_commande_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_commande" ADD CONSTRAINT "ds_commande_id_ds_fkey" FOREIGN KEY ("id_ds") REFERENCES "demande_sous_traitance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_commande_article" ADD CONSTRAINT "ds_commande_article_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "ds_commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_commande_article" ADD CONSTRAINT "ds_commande_article_id_activite_fkey" FOREIGN KEY ("id_activite") REFERENCES "activite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bon_livraison" ADD CONSTRAINT "ds_bon_livraison_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "ds_commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_bon_livraison" ADD CONSTRAINT "ds_bon_livraison_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_livraison_article" ADD CONSTRAINT "ds_livraison_article_id_livraison_fkey" FOREIGN KEY ("id_livraison") REFERENCES "ds_bon_livraison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_livraison_article" ADD CONSTRAINT "ds_livraison_article_id_ds_commande_article_fkey" FOREIGN KEY ("id_ds_commande_article") REFERENCES "ds_commande_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outils" ADD CONSTRAINT "outils_fk_secteur_id_fkey" FOREIGN KEY ("fk_secteur_id") REFERENCES "secteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outils" ADD CONSTRAINT "outils_fk_type_id_fkey" FOREIGN KEY ("fk_type_id") REFERENCES "tab_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tab_lancement_affectation" ADD CONSTRAINT "tab_lancement_affectation_id_intervenant_fkey" FOREIGN KEY ("id_intervenant") REFERENCES "intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tab_lancement_affectation" ADD CONSTRAINT "tab_lancement_affectation_outil_fkey" FOREIGN KEY ("outil") REFERENCES "outils"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_bl" ADD CONSTRAINT "ot_bl_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_bl" ADD CONSTRAINT "ot_bl_id_liv_article_fkey" FOREIGN KEY ("id_liv_article") REFERENCES "ds_livraison_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_projet" ADD CONSTRAINT "ot_projet_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_commentaire" ADD CONSTRAINT "article_commentaire_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_fichier" ADD CONSTRAINT "tableau_article_fichier_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dop_article" ADD CONSTRAINT "dop_article_id_dop_fkey" FOREIGN KEY ("id_dop") REFERENCES "dop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dop_article" ADD CONSTRAINT "dop_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dop_fournisseur" ADD CONSTRAINT "dop_fournisseur_id_dop_fkey" FOREIGN KEY ("id_dop") REFERENCES "dop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dop_fournisseur" ADD CONSTRAINT "dop_fournisseur_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dop_fini" ADD CONSTRAINT "dop_fini_id_dop_fkey" FOREIGN KEY ("id_dop") REFERENCES "dop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dop_fini" ADD CONSTRAINT "dop_fini_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dop_fini" ADD CONSTRAINT "dop_fini_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_id_dop_fkey" FOREIGN KEY ("id_dop") REFERENCES "dop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis_article" ADD CONSTRAINT "devis_article_id_devis_fkey" FOREIGN KEY ("id_devis") REFERENCES "devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis_article" ADD CONSTRAINT "devis_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis_fournisseur" ADD CONSTRAINT "devis_fournisseur_id_devis_fkey" FOREIGN KEY ("id_devis") REFERENCES "devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis_fournisseur" ADD CONSTRAINT "devis_fournisseur_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis_fichier" ADD CONSTRAINT "devis_fichier_id_devis_fkey" FOREIGN KEY ("id_devis") REFERENCES "devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_commentaire" ADD CONSTRAINT "atelier_commentaire_id_atelier_fkey" FOREIGN KEY ("id_atelier") REFERENCES "atelier_creer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_fichier" ADD CONSTRAINT "atelier_fichier_id_atelier_fkey" FOREIGN KEY ("id_atelier") REFERENCES "atelier_creer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caracteristique" ADD CONSTRAINT "caracteristique_id_sous_famille_fkey" FOREIGN KEY ("id_sous_famille") REFERENCES "sous_famille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caracteristique_option" ADD CONSTRAINT "caracteristique_option_id_caracteristique_fkey" FOREIGN KEY ("id_caracteristique") REFERENCES "caracteristique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caracteristique_textbox" ADD CONSTRAINT "caracteristique_textbox_id_caracteristique_fkey" FOREIGN KEY ("id_caracteristique") REFERENCES "caracteristique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_caracteristique" ADD CONSTRAINT "tableau_article_caracteristique_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_caracteristique" ADD CONSTRAINT "tableau_article_caracteristique_id_caracteristique_fkey" FOREIGN KEY ("id_caracteristique") REFERENCES "caracteristique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_unite" ADD CONSTRAINT "tableau_article_unite_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_unite" ADD CONSTRAINT "tableau_article_unite_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "parametre_unite_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamme_ressources_fonction" ADD CONSTRAINT "gamme_ressources_fonction_id_fonction_fkey" FOREIGN KEY ("id_fonction") REFERENCES "fonction_intervenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamme_ressources_fonction" ADD CONSTRAINT "gamme_ressources_fonction_id_gamme_fkey" FOREIGN KEY ("id_gamme") REFERENCES "gamme_operatoire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamme_ressources_outillage" ADD CONSTRAINT "gamme_ressources_outillage_id_type_fkey" FOREIGN KEY ("id_type") REFERENCES "tab_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamme_ressources_outillage" ADD CONSTRAINT "gamme_ressources_outillage_id_gamme_fkey" FOREIGN KEY ("id_gamme") REFERENCES "gamme_operatoire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamme_ressources_pdr" ADD CONSTRAINT "gamme_ressources_pdr_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamme_ressources_pdr" ADD CONSTRAINT "gamme_ressources_pdr_id_gamme_fkey" FOREIGN KEY ("id_gamme") REFERENCES "gamme_operatoire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ressources_outil" ADD CONSTRAINT "ot_ressources_outil_id_type_fkey" FOREIGN KEY ("id_type") REFERENCES "tab_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ressources_outil" ADD CONSTRAINT "ot_ressources_outil_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ressources_pdr" ADD CONSTRAINT "ot_ressources_pdr_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_ressources_pdr" ADD CONSTRAINT "ot_ressources_pdr_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement_generale" ADD CONSTRAINT "equipement_generale_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement_technique" ADD CONSTRAINT "equipement_technique_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement_image" ADD CONSTRAINT "equipement_image_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement_pdf" ADD CONSTRAINT "equipement_pdf_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement_observation" ADD CONSTRAINT "equipement_observation_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement_prevision" ADD CONSTRAINT "equipement_prevision_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relation_anomalie" ADD CONSTRAINT "relation_anomalie_id_anomalie_fkey" FOREIGN KEY ("id_anomalie") REFERENCES "parametre_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relation_anomalie" ADD CONSTRAINT "relation_anomalie_id_parent_fkey" FOREIGN KEY ("id_parent") REFERENCES "parametre_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptome_defaillance" ADD CONSTRAINT "symptome_defaillance_id_symptome_fkey" FOREIGN KEY ("id_symptome") REFERENCES "symptome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptome_defaillance" ADD CONSTRAINT "symptome_defaillance_id_defaillance_fkey" FOREIGN KEY ("id_defaillance") REFERENCES "parametre_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_diagnostic" ADD CONSTRAINT "operation_diagnostic_id_defaillance_fkey" FOREIGN KEY ("id_defaillance") REFERENCES "parametre_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_m" ADD CONSTRAINT "ot_diagnostic_m_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_m" ADD CONSTRAINT "ot_diagnostic_m_id_defaillance_fkey" FOREIGN KEY ("id_defaillance") REFERENCES "parametre_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_def" ADD CONSTRAINT "ot_diagnostic_def_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_def" ADD CONSTRAINT "ot_diagnostic_def_id_defaillance_fkey" FOREIGN KEY ("id_defaillance") REFERENCES "parametre_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_detection" ADD CONSTRAINT "ot_diagnostic_detection_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_detection" ADD CONSTRAINT "ot_diagnostic_detection_id_defaillance_fkey" FOREIGN KEY ("id_defaillance") REFERENCES "parametre_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_symptome" ADD CONSTRAINT "ot_diagnostic_symptome_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_symptome" ADD CONSTRAINT "ot_diagnostic_symptome_id_symptome_fkey" FOREIGN KEY ("id_symptome") REFERENCES "symptome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_symptome" ADD CONSTRAINT "ot_diagnostic_symptome_id_defaillance_fkey" FOREIGN KEY ("id_defaillance") REFERENCES "parametre_anomalie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_operation" ADD CONSTRAINT "ot_diagnostic_operation_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_diagnostic_operation" ADD CONSTRAINT "ot_diagnostic_operation_id_operation_fkey" FOREIGN KEY ("id_operation") REFERENCES "operation_diagnostic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_livraison" ADD CONSTRAINT "bon_livraison_id_reception_fkey" FOREIGN KEY ("id_reception") REFERENCES "reception"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraison_article" ADD CONSTRAINT "livraison_article_id_livraison_fkey" FOREIGN KEY ("id_livraison") REFERENCES "bon_livraison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraison_article" ADD CONSTRAINT "livraison_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_reception" ADD CONSTRAINT "atelier_reception_id_atelier_fkey" FOREIGN KEY ("id_atelier") REFERENCES "atelier_creer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamme_centre_charge" ADD CONSTRAINT "gamme_centre_charge_id_gamme_fkey" FOREIGN KEY ("id_gamme") REFERENCES "gamme_operatoire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamme_centre_charge" ADD CONSTRAINT "gamme_centre_charge_id_centre_charge_fkey" FOREIGN KEY ("id_centre_charge") REFERENCES "parametre_centre_charge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_maintenance" ADD CONSTRAINT "operation_maintenance_id_intervention_fkey" FOREIGN KEY ("id_intervention") REFERENCES "parametre_intervention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outil_utilisation" ADD CONSTRAINT "outil_utilisation_id_outil_fkey" FOREIGN KEY ("id_outil") REFERENCES "outils"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outil_utilisation" ADD CONSTRAINT "outil_utilisation_id_utilisation_fkey" FOREIGN KEY ("id_utilisation") REFERENCES "utilisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamation_anomalie" ADD CONSTRAINT "reclamation_anomalie_id_engin_fkey" FOREIGN KEY ("id_engin") REFERENCES "engins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamation_anomalie" ADD CONSTRAINT "reclamation_anomalie_id_chauffeur_fkey" FOREIGN KEY ("id_chauffeur") REFERENCES "chauffeur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture" ADD CONSTRAINT "facture_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_livraison" ADD CONSTRAINT "facture_livraison_id_facture_fkey" FOREIGN KEY ("id_facture") REFERENCES "facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_livraison" ADD CONSTRAINT "facture_livraison_id_livraison_fkey" FOREIGN KEY ("id_livraison") REFERENCES "bon_livraison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_facture" ADD CONSTRAINT "ds_facture_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_facture_livraison" ADD CONSTRAINT "ds_facture_livraison_id_facture_fkey" FOREIGN KEY ("id_facture") REFERENCES "ds_facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_facture_livraison" ADD CONSTRAINT "ds_facture_livraison_id_livraison_fkey" FOREIGN KEY ("id_livraison") REFERENCES "ds_bon_livraison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ac_reapprovisionnement" ADD CONSTRAINT "ac_reapprovisionnement_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ac_reapprovisionnement_ech" ADD CONSTRAINT "ac_reapprovisionnement_ech_id_rep_fkey" FOREIGN KEY ("id_rep") REFERENCES "ac_reapprovisionnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ac_recompletement" ADD CONSTRAINT "ac_recompletement_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ac_recompletement_ech" ADD CONSTRAINT "ac_recompletement_ech_id_rep_fkey" FOREIGN KEY ("id_rep") REFERENCES "ac_recompletement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_de_carburant" ADD CONSTRAINT "bon_de_carburant_id_engin_fkey" FOREIGN KEY ("id_engin") REFERENCES "engins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_de_carburant" ADD CONSTRAINT "bon_de_carburant_id_chauffeur_fkey" FOREIGN KEY ("id_chauffeur") REFERENCES "chauffeur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_de_carburant" ADD CONSTRAINT "bon_de_carburant_id_type_carburant_fkey" FOREIGN KEY ("id_type_carburant") REFERENCES "type_de_carburant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyage" ADD CONSTRAINT "voyage_id_engin_fkey" FOREIGN KEY ("id_engin") REFERENCES "engins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyage" ADD CONSTRAINT "voyage_id_chauffeur_fkey" FOREIGN KEY ("id_chauffeur") REFERENCES "chauffeur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engin_parc_liaison_carburant" ADD CONSTRAINT "engin_parc_liaison_carburant_id_carburant_fkey" FOREIGN KEY ("id_carburant") REFERENCES "type_de_carburant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_modification_base" ADD CONSTRAINT "commande_modification_base_id_commande_fkey" FOREIGN KEY ("id_commande") REFERENCES "commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_modifier_article" ADD CONSTRAINT "commande_modifier_article_id_modification_fkey" FOREIGN KEY ("id_modification") REFERENCES "commande_modification_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_modifier_article" ADD CONSTRAINT "commande_modifier_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modification_article" ADD CONSTRAINT "modification_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_mp" ADD CONSTRAINT "ds_mp_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_nv_article" ADD CONSTRAINT "ds_nv_article_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ds_nv_article" ADD CONSTRAINT "ds_nv_article_id_activite_fkey" FOREIGN KEY ("id_activite") REFERENCES "activite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magasin_sous_traitance" ADD CONSTRAINT "magasin_sous_traitance_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magasin_sous_traitance" ADD CONSTRAINT "magasin_sous_traitance_demande_actuel_fkey" FOREIGN KEY ("demande_actuel") REFERENCES "demande_sous_traitance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magasin_sous_traitance" ADD CONSTRAINT "magasin_sous_traitance_activite_actuel_fkey" FOREIGN KEY ("activite_actuel") REFERENCES "activite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magasin_sous_traitance" ADD CONSTRAINT "magasin_sous_traitance_equipement_actuel_fkey" FOREIGN KEY ("equipement_actuel") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature" ADD CONSTRAINT "signature_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_activite" ADD CONSTRAINT "tableau_fournisseur_activite_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_activite" ADD CONSTRAINT "tableau_fournisseur_activite_id_activite_fkey" FOREIGN KEY ("id_activite") REFERENCES "parametre_activite_fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_compte" ADD CONSTRAINT "tableau_fournisseur_compte_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_compte" ADD CONSTRAINT "tableau_fournisseur_compte_id_compte_fkey" FOREIGN KEY ("id_compte") REFERENCES "parametre_compte_fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_devise" ADD CONSTRAINT "tableau_fournisseur_devise_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_devise" ADD CONSTRAINT "tableau_fournisseur_devise_id_devise_fkey" FOREIGN KEY ("id_devise") REFERENCES "parametre_devise_fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_livraison" ADD CONSTRAINT "tableau_fournisseur_livraison_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_livraison" ADD CONSTRAINT "tableau_fournisseur_livraison_id_livraison_fkey" FOREIGN KEY ("id_livraison") REFERENCES "parametre_livraison_fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_reglement" ADD CONSTRAINT "tableau_fournisseur_reglement_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_reglement" ADD CONSTRAINT "tableau_fournisseur_reglement_id_reglement_fkey" FOREIGN KEY ("id_reglement") REFERENCES "parametre_reglement_fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_fournisseur_fichier" ADD CONSTRAINT "tableau_fournisseur_fichier_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_classification" ADD CONSTRAINT "tableau_article_classification_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_classification" ADD CONSTRAINT "tableau_article_classification_id_classification_fkey" FOREIGN KEY ("id_classification") REFERENCES "parametre_classification_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_emplacement" ADD CONSTRAINT "tableau_article_emplacement_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_emplacement" ADD CONSTRAINT "tableau_article_emplacement_id_emplacement_fkey" FOREIGN KEY ("id_emplacement") REFERENCES "parametre_emplacement_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_stockage" ADD CONSTRAINT "tableau_article_stockage_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_stockage" ADD CONSTRAINT "tableau_article_stockage_id_stockage_fkey" FOREIGN KEY ("id_stockage") REFERENCES "parametre_stockage_article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_equipement" ADD CONSTRAINT "tableau_article_equipement_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_equipement" ADD CONSTRAINT "tableau_article_equipement_id_equipement_fkey" FOREIGN KEY ("id_equipement") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_fournisseur" ADD CONSTRAINT "tableau_article_fournisseur_id_article_fkey" FOREIGN KEY ("id_article") REFERENCES "article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tableau_article_fournisseur" ADD CONSTRAINT "tableau_article_fournisseur_id_fournisseur_fkey" FOREIGN KEY ("id_fournisseur") REFERENCES "fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_alerte" ADD CONSTRAINT "notification_alerte_id_not_fkey" FOREIGN KEY ("id_not") REFERENCES "notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_alerte" ADD CONSTRAINT "notification_alerte_id_utilisateur_fkey" FOREIGN KEY ("id_utilisateur") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_famille" ADD CONSTRAINT "activite_famille_id_activite_fkey" FOREIGN KEY ("id_activite") REFERENCES "activite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_famille" ADD CONSTRAINT "activite_famille_id_famille_fkey" FOREIGN KEY ("id_famille") REFERENCES "famille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_operation" ADD CONSTRAINT "activite_operation_id_activite_fkey" FOREIGN KEY ("id_activite") REFERENCES "activite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_sous_famille" ADD CONSTRAINT "activite_sous_famille_id_activite_fkey" FOREIGN KEY ("id_activite") REFERENCES "activite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activite_sous_famille" ADD CONSTRAINT "activite_sous_famille_id_sous_famille_fkey" FOREIGN KEY ("id_sous_famille") REFERENCES "sous_famille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_cause_realisation" ADD CONSTRAINT "ot_cause_realisation_id_ot_fkey" FOREIGN KEY ("id_ot") REFERENCES "ordre_travail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ot_cause_realisation" ADD CONSTRAINT "ot_cause_realisation_id_cause_fkey" FOREIGN KEY ("id_cause") REFERENCES "parametre_cause_realisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement_compteur_historique" ADD CONSTRAINT "equipement_compteur_historique_id_compteur_fkey" FOREIGN KEY ("id_compteur") REFERENCES "equipement_compteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipement_compteur_nv" ADD CONSTRAINT "equipement_compteur_nv_id_compteur_fkey" FOREIGN KEY ("id_compteur") REFERENCES "equipement_compteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compteur_liaison" ADD CONSTRAINT "compteur_liaison_id_organe_fkey" FOREIGN KEY ("id_organe") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compteur_liaison" ADD CONSTRAINT "compteur_liaison_id_compteur_fkey" FOREIGN KEY ("id_compteur") REFERENCES "equipement_compteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compteur_liaison" ADD CONSTRAINT "compteur_liaison_id_intervention_fkey" FOREIGN KEY ("id_intervention") REFERENCES "parametre_intervention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_mesure" ADD CONSTRAINT "prod_mesure_id_saisie_fkey" FOREIGN KEY ("id_saisie") REFERENCES "prod_saisie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_mesure" ADD CONSTRAINT "prod_mesure_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_chef_equipe" ADD CONSTRAINT "prod_rapport_chef_equipe_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_chef_equipe" ADD CONSTRAINT "prod_rapport_chef_equipe_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_chef_equipe" ADD CONSTRAINT "prod_rapport_chef_equipe_id_chef_equipe_fkey" FOREIGN KEY ("id_chef_equipe") REFERENCES "intervenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_heure" ADD CONSTRAINT "prod_rapport_heure_id_rapport_fkey" FOREIGN KEY ("id_rapport") REFERENCES "prod_rapport_general"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_heure" ADD CONSTRAINT "prod_rapport_heure_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "prod_equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
