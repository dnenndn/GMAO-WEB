import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { computeBudgetSpend } from "@/lib/budgetSpend";

export default async function BudgetListPage() {
  const budgets = await prisma.budget.findMany({
    where: { creerNv: false },
    include: { categories: { include: { famille: true } }, fournisseurs: { include: { fournisseur: true } } },
    orderBy: { dateCreation: "desc" },
  });

  const withSpend = await Promise.all(
    budgets.map(async (b) => ({ ...b, spend: await computeBudgetSpend(b) }))
  );

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Liste des budgets"
        action={{ href: "/budget/new", label: "+ Nouveau budget" }} hideBack
      />
      <div className="p-8">
        <div className="flex justify-end mb-4">
          <Link
            href="/budget/recap"
            className="text-xs font-semibold text-steel-600 hover:text-steel-700"
          >
            Récapitulatif →
          </Link>
        </div>
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">Date de lancement</th>
                <th className="px-4 py-3 font-semibold">Durée</th>
                <th className="px-4 py-3 font-semibold w-32 text-right">Montant Total (DT)</th>
                <th className="px-4 py-3 font-semibold w-32 text-right">Montant BL (DT)</th>
              </tr>
            </thead>
            <tbody>
              {withSpend.map((b) => {
                const over = b.spend > Number(b.montant);
                return (
                  <tr key={b.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 text-muted font-mono text-xs">{b.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/budget/${b.id}`}>
                        <Nameplate>{b.nom}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {b.dateCreation.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-ink text-xs">{b.duree}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink">
                      {Number(b.montant).toLocaleString("fr-FR")}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs ${
                        over ? "text-urgent font-semibold" : "text-ink"
                      }`}
                    >
                      {b.spend.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                );
              })}
              {budgets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun budget pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
