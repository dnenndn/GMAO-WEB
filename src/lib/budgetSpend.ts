import { prisma } from "@/lib/prisma";
import { budgetPeriodEnd } from "@/lib/constants";

// FIXED — this was duplicated (with the same bug) across budget/page.tsx
// and budget/[id]/page.tsx. Found while checking the budget module
// against the real decompiled source (liste_budget_general_tous.cs):
// the real spend query filters commande.statut = 0 ("En attente") and
// uses commande.date_commande for the period window — this
// implementation was instead filtering statut IN ("En cours",
// "Clôturée") and using date_signature. Both were wrong, confirmed
// directly from the source's own bound SQL parameter (`@d` is bound
// as SqlDbType.Int with value 0, matching this schema's documented
// commande.statut convention: 0=En attente, 1=En cours, 5=Annulée,
// 10=Clôturée).
type BudgetForSpend = {
  dateCreation: Date;
  duree: string;
  categorieChoix: boolean;
  fournisseurChoix: boolean;
  categories: { idCategorie: number }[];
  fournisseurs: { idFournisseur: number }[];
};

export async function computeBudgetSpend(budget: BudgetForSpend): Promise<number> {
  const periodStart = budget.dateCreation;
  const periodEnd = budgetPeriodEnd(periodStart, budget.duree);

  const lignes = await prisma.commandeArticle.findMany({
    where: {
      commande: {
        dateCommande: { gte: periodStart, lte: periodEnd },
        statut: "En attente",
        ...(budget.fournisseurChoix && budget.fournisseurs.length > 0
          ? { idFournisseur: { in: budget.fournisseurs.map((f) => f.idFournisseur) } }
          : {}),
      },
      ...(budget.categorieChoix && budget.categories.length > 0
        ? {
            daArticle: {
              article: {
                sousFamilles: {
                  some: { sousFamille: { idFamille: { in: budget.categories.map((c) => c.idCategorie) } } },
                },
              },
            },
          }
        : {}),
    },
  });

  return lignes.reduce((acc, l) => {
    const brut = Number(l.qtCommande) * Number(l.prixHt ?? 0);
    const remise = brut * (Number(l.remise ?? 0) / 100);
    return acc + (brut - remise);
  }, 0);
}
