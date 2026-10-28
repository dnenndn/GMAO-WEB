import { prisma } from "@/lib/prisma";
import { budgetPeriodEnd } from "@/lib/constants";
import type { Budget, BudgetCategorie, BudgetFournisseur } from "@prisma/client";

// Orders in these statuses count as committed spend for variance purposes
// — excludes not-yet-approved and cancelled orders. See Budget module
// spec doc §6/§7.
const COMMITTED_STATUTS = ["En cours", "Clôturée"];

type BudgetWithScope = Budget & {
  categories: BudgetCategorie[];
  fournisseurs: BudgetFournisseur[];
};

/** Live variance computation — same aggregation the legacy app runs
 * against commande_article/commande, no separate spend ledger. Shared
 * between the single-budget detail page and the all-budgets recap page
 * so the (non-trivial) query logic only lives in one place. */
export async function computeBudgetSpend(budget: BudgetWithScope) {
  const periodStart = budget.dateCreation;
  const periodEnd = budgetPeriodEnd(periodStart, budget.duree);

  const lignes = await prisma.commandeArticle.findMany({
    where: {
      commande: {
        dateSignature: { gte: periodStart, lte: periodEnd },
        statut: { in: COMMITTED_STATUTS },
        ...(budget.fournisseurChoix && budget.fournisseurs.length > 0
          ? { idFournisseur: { in: budget.fournisseurs.map((f) => f.idFournisseur) } }
          : {}),
      },
      ...(budget.categorieChoix && budget.categories.length > 0
        ? {
            daArticle: {
              article: {
                sousFamilles: {
                  some: {
                    sousFamille: {
                      idFamille: { in: budget.categories.map((c) => c.idCategorie) },
                    },
                  },
                },
              },
            },
          }
        : {}),
    },
  });

  const totalDepense = lignes.reduce((acc, l) => {
    const brut = Number(l.qtCommande) * Number(l.prixHt ?? 0);
    const remise = brut * (Number(l.remise ?? 0) / 100);
    return acc + (brut - remise);
  }, 0);

  return { periodStart, periodEnd, totalDepense, lignesCount: lignes.length };
}
