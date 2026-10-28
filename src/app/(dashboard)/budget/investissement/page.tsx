import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

// Reproduces the real budget_investissement.cs screen — found while
// checking the budget module's sidebar against the real app (it was
// only reachable as "Créer un budget" from Form1.cs's own menu, a
// separate top-level entry from "Gestion de budget" > "Liste des",
// alongside this "Investissement" entry). Lists every delivered
// article flagged investissement = true within a date range, with
// its supplier — the real source's own join chain: livraison_article
// -> bon_livraison -> reception -> reception_article -> commande ->
// fournisseur. The underlying schema field (LivraisonArticle.
// investissement) already existed; only this report page was missing.

function parseDate(v: string | undefined, fallback: Date) {
  if (!v) return fallback;
  const d = new Date(v);
  return isNaN(d.getTime()) ? fallback : d;
}

export default async function BudgetInvestissementPage({
  searchParams,
}: {
  searchParams: { d1?: string; d2?: string };
}) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1);
  const start = parseDate(searchParams.d1, defaultStart);
  const end = parseDate(searchParams.d2, now);

  const lignes = await prisma.livraisonArticle.findMany({
    where: {
      investissement: true,
      livraison: { dateReel: { gte: start, lte: end } },
    },
    include: {
      article: true,
      livraison: {
        include: {
          reception: {
            include: {
              lignes: {
                include: { commande: { include: { fournisseur: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { livraison: { dateReel: "asc" } },
  });

  function fournisseurFor(l: (typeof lignes)[number]) {
    const match = l.livraison.reception.lignes.find((ra) => ra.idArticle === l.idArticle && ra.commande);
    return match?.commande?.fournisseur?.nom ?? "—";
  }

  const total = lignes.reduce((acc, l) => {
    const brut = Number(l.qt) * Number(l.prixHt);
    const remise = brut * (Number(l.remise) / 100);
    return acc + (brut - remise);
  }, 0);

  return (
    <>
      <PageHeader eyebrow="Gestion de budget" title="Investissement" hideBack />
      <div className="p-8 space-y-4">
        <form className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Du</label>
            <input
              type="date"
              name="d1"
              defaultValue={start.toISOString().slice(0, 10)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Au</label>
            <input
              type="date"
              name="d2"
              defaultValue={end.toISOString().slice(0, 10)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors"
          >
            Filtrer
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Date livraison</th>
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold w-20 text-right">Qté</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Prix HT</th>
                <th className="px-4 py-3 font-semibold w-20 text-right">Remise</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => {
                const brut = Number(l.qt) * Number(l.prixHt);
                const net = brut - brut * (Number(l.remise) / 100);
                return (
                  <tr key={l.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {l.livraison.dateReel?.toLocaleDateString("fr-FR") ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink">
                      {l.article.codeArticle ? `${l.article.codeArticle} — ` : ""}{l.article.designation}
                    </td>
                    <td className="px-4 py-2.5 text-ink text-xs">{fournisseurFor(l)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{l.qt.toString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{Number(l.prixHt).toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{l.remise.toString()}%</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {net.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                  </tr>
                );
              })}
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun article d&apos;investissement sur cette période.
                  </td>
                </tr>
              )}
            </tbody>
            {lignes.length > 0 && (
              <tfoot>
                <tr className="bg-paper/60">
                  <td colSpan={6} className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide text-right">
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm text-ink font-semibold">
                    {total.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
