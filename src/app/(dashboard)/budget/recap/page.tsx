import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { computeBudgetSpend } from "@/lib/budget-variance";

export default async function BudgetRecapPage() {
  const budgets = await prisma.budget.findMany({
    where: { creerNv: false },
    include: {
      categories: { include: { famille: true } },
      fournisseurs: { include: { fournisseur: true } },
    },
    orderBy: { dateCreation: "desc" },
  });

  const rows = await Promise.all(
    budgets.map(async (b) => {
      const { periodStart, periodEnd, totalDepense } = await computeBudgetSpend(b);
      const montant = Number(b.montant);
      const restant = montant - totalDepense;
      const pct = montant > 0 ? (totalDepense / montant) * 100 : 0;
      return { budget: b, periodStart, periodEnd, totalDepense, montant, restant, pct };
    })
  );

  const totalAlloue = rows.reduce((a, r) => a + r.montant, 0);
  const totalDepenseGlobal = rows.reduce((a, r) => a + r.totalDepense, 0);

  return (
    <>
      <PageHeader eyebrow="Budget" title="Récapitulatif" />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-3 gap-4 max-w-2xl">
          <div className="bg-surface border border-hairline rounded p-4">
            <div className="text-2xl font-semibold font-mono text-ink">
              {totalAlloue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-muted mt-1">Total alloué (DT)</div>
          </div>
          <div className="bg-surface border border-hairline rounded p-4">
            <div className="text-2xl font-semibold font-mono text-ink">
              {totalDepenseGlobal.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-muted mt-1">Total dépensé (DT)</div>
          </div>
          <div className="bg-surface border border-hairline rounded p-4">
            <div
              className={`text-2xl font-semibold font-mono ${
                totalAlloue - totalDepenseGlobal < 0 ? "text-urgent" : "text-faible"
              }`}
            >
              {(totalAlloue - totalDepenseGlobal).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-muted mt-1">Total restant (DT)</div>
          </div>
        </div>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Budget</th>
                <th className="px-4 py-3 font-semibold">Portée</th>
                <th className="px-4 py-3 font-semibold">Période</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Alloué (DT)</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Dépensé (DT)</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Restant (DT)</th>
                <th className="px-4 py-3 font-semibold w-32">Consommation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const scope = r.budget.categorieChoix
                  ? r.budget.categories.map((c) => c.famille.designation).join(", ") || "Catégorie"
                  : r.budget.fournisseurChoix
                  ? r.budget.fournisseurs.map((f) => f.fournisseur.nom).join(", ") || "Fournisseur"
                  : "Global";
                return (
                  <tr key={r.budget.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/budget/${r.budget.id}`}>
                        <Nameplate>{r.budget.nom}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{scope}</td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {r.periodStart.toLocaleDateString("fr-FR")} → {r.periodEnd.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink">
                      {r.montant.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-ink">
                      {r.totalDepense.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs ${
                        r.restant < 0 ? "text-urgent" : "text-ink"
                      }`}
                    >
                      {r.restant.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 bg-paper rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            r.pct > 100 ? "bg-urgent" : r.pct > 80 ? "bg-moyenne" : "bg-faible"
                          }`}
                          style={{ width: `${Math.min(r.pct, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">{r.pct.toFixed(0)}%</div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
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
