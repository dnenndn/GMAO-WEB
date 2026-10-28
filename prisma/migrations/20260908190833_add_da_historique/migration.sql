-- DropForeignKey
ALTER TABLE "prod_fab_compteur" DROP CONSTRAINT "prod_fab_compteur_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_fab_tonnage" DROP CONSTRAINT "prod_fab_tonnage_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_mesure" DROP CONSTRAINT "prod_mesure_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_mesure_rapport" DROP CONSTRAINT "prod_mesure_rapport_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_anomalie" DROP CONSTRAINT "prod_rapport_anomalie_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_cf_emballage" DROP CONSTRAINT "prod_rapport_cf_emballage_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_cf_fabrication" DROP CONSTRAINT "prod_rapport_cf_fabrication_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_chef_equipe" DROP CONSTRAINT "prod_rapport_chef_equipe_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_emb_produit" DROP CONSTRAINT "prod_rapport_emb_produit_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_fab_produit" DROP CONSTRAINT "prod_rapport_fab_produit_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_four_entre" DROP CONSTRAINT "prod_rapport_four_entre_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_four_sortie" DROP CONSTRAINT "prod_rapport_four_sortie_id_unite_fkey";

-- DropForeignKey
ALTER TABLE "prod_rapport_heure" DROP CONSTRAINT "prod_rapport_heure_id_unite_fkey";

-- CreateTable
CREATE TABLE "da_administrateur" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "envoyer_par" INTEGER,
    "date_envoyer" TIMESTAMP(3) NOT NULL,
    "heure_envoyer" TEXT,

    CONSTRAINT "da_administrateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_cloturer" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "cloturer_par" INTEGER,
    "date_cloture" TIMESTAMP(3) NOT NULL,
    "heure_cloture" TEXT,

    CONSTRAINT "da_cloturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_confirmer" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "confirmer_par" INTEGER,
    "date_confirmer" TIMESTAMP(3) NOT NULL,
    "heure_confirmer" TEXT,

    CONSTRAINT "da_confirmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_modifier" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "modifier_par" INTEGER,
    "date_modifier" TIMESTAMP(3) NOT NULL,
    "heure_modifier" TEXT,

    CONSTRAINT "da_modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_refuser" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "refuser_par" INTEGER,
    "date_refus" TIMESTAMP(3) NOT NULL,
    "heure_refus" TEXT,
    "cause" TEXT,

    CONSTRAINT "da_refuser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_reporter" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "reporter_par" INTEGER,
    "date_report" TIMESTAMP(3) NOT NULL,
    "heure_report" TEXT,
    "nouvel_date" TIMESTAMP(3),

    CONSTRAINT "da_reporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_retourner" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "retourner_par" INTEGER,
    "date_retourner" TIMESTAMP(3) NOT NULL,
    "heure_retourner" TEXT,

    CONSTRAINT "da_retourner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "da_vue" (
    "id" SERIAL NOT NULL,
    "id_da" INTEGER NOT NULL,
    "date_vue" TIMESTAMP(3) NOT NULL,
    "heure_vue" TEXT,
    "vue_par" INTEGER,

    CONSTRAINT "da_vue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bsm_n_ot_idx" ON "bsm"("n_ot");

-- CreateIndex
CREATE INDEX "bsm_article_id_bsm_idx" ON "bsm_article"("id_bsm");

-- CreateIndex
CREATE INDEX "bsm_article_id_article_idx" ON "bsm_article"("id_article");

-- CreateIndex
CREATE INDEX "commande_article_id_commande_idx" ON "commande_article"("id_commande");

-- CreateIndex
CREATE INDEX "da_article_id_da_idx" ON "da_article"("id_da");

-- CreateIndex
CREATE INDEX "da_article_id_article_idx" ON "da_article"("id_article");

-- CreateIndex
CREATE INDEX "equipement_id_parent_idx" ON "equipement"("id_parent");

-- CreateIndex
CREATE INDEX "notification_id_utilisateur_vue_idx" ON "notification"("id_utilisateur", "vue");

-- CreateIndex
CREATE INDEX "notification_alerte_id_utilisateur_vue_idx" ON "notification_alerte"("id_utilisateur", "vue");

-- CreateIndex
CREATE INDEX "reception_article_id_reception_idx" ON "reception_article"("id_reception");

-- CreateIndex
CREATE INDEX "reception_article_id_article_idx" ON "reception_article"("id_article");

-- CreateIndex
CREATE INDEX "tableau_article_fournisseur_id_article_idx" ON "tableau_article_fournisseur"("id_article");

-- CreateIndex
CREATE INDEX "tableau_article_fournisseur_id_fournisseur_idx" ON "tableau_article_fournisseur"("id_fournisseur");

-- AddForeignKey
ALTER TABLE "demande_intervention" ADD CONSTRAINT "demande_intervention_id_demandeur_fkey" FOREIGN KEY ("id_demandeur") REFERENCES "intervenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_fab_compteur" ADD CONSTRAINT "prod_fab_compteur_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_fab_produit" ADD CONSTRAINT "prod_rapport_fab_produit_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_emb_produit" ADD CONSTRAINT "prod_rapport_emb_produit_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_four_entre" ADD CONSTRAINT "prod_rapport_four_entre_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_four_sortie" ADD CONSTRAINT "prod_rapport_four_sortie_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_mesure_rapport" ADD CONSTRAINT "prod_mesure_rapport_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_fab_tonnage" ADD CONSTRAINT "prod_fab_tonnage_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_cf_fabrication" ADD CONSTRAINT "prod_rapport_cf_fabrication_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_cf_emballage" ADD CONSTRAINT "prod_rapport_cf_emballage_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_anomalie" ADD CONSTRAINT "prod_rapport_anomalie_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_administrateur" ADD CONSTRAINT "da_administrateur_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_cloturer" ADD CONSTRAINT "da_cloturer_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_confirmer" ADD CONSTRAINT "da_confirmer_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_modifier" ADD CONSTRAINT "da_modifier_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_refuser" ADD CONSTRAINT "da_refuser_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_reporter" ADD CONSTRAINT "da_reporter_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_retourner" ADD CONSTRAINT "da_retourner_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "da_vue" ADD CONSTRAINT "da_vue_id_da_fkey" FOREIGN KEY ("id_da") REFERENCES "demande_achat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_mesure" ADD CONSTRAINT "prod_mesure_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_chef_equipe" ADD CONSTRAINT "prod_rapport_chef_equipe_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prod_rapport_heure" ADD CONSTRAINT "prod_rapport_heure_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "equipement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
