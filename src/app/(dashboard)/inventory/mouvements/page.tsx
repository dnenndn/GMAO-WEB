import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function MouvementsPage({
  searchParams,
}: {
  searchParams: { d1?: string; d2?: string };
}) {
  const d1 = searchParams.d1 ? new Date(searchParams.d1) : startOfMonth();
  const d2 = searchParams.d2 ? new Date(searchParams.d2) : new Date();
  const d2End = new Date(d2);
  d2End.setHours(23, 59, 59, 999);

  // Same union-of-three-sources pattern as the legacy mvt_stock.cs — there
  // is no stored ledger table, see docs/03-inventory-module-spec.md §1.
  const [receptions, sorties, retours] = await Promise.all([
    prisma.receptionArticle.findMany({
      where: { reception: { dateReception: { gte: d1, lte: d2End } } },
      include: {
        article: { include: { sousFamilles: { include: { sousFamille: { include: { famille: true } } }, take: 1 } } },
        reception: true,
      },
    }),
    prisma.bsmArticle.findMany({
      where: { bsm: { dateBsm: { gte: d1, lte: d2End } } },
      include: {
        article: { include: { sousFamilles: { include: { sousFamille: { include: { famille: true } } }, take: 1 } } },
        bsm: true,
      },
    }),
    prisma.brmArticle.findMany({
      where: { brm: { dateRetour: { gte: d1, lte: d2End } } },
      include: {
        article: { include: { sousFamilles: { include: { sousFamille: { include: { famille: true } } }, take: 1 } } },
        brm: true,
      },
    }),
  ]);

  const movements = [
    ...receptions.map((r) => ({
      id: r.id,
      type: "Entrée" as const,
      date: r.reception.dateReception,
      article: r.article.designation,
      code: r.article.codeArticle,
      famille: r.article.sousFamilles[0]?.sousFamille.famille?.designation ?? null,
      sousFamille: r.article.sousFamilles[0]?.sousFamille.designation ?? null,
      ref: `Réception #${r.idReception}`,
      qty: Number(r.qtRecu),
    })),
    ...sorties.map((s) => ({
      id: s.id,
      type: "Sortie" as const,
      date: s.bsm.dateBsm,
      article: s.article.designation,
      code: s.article.codeArticle,
      famille: s.article.sousFamilles[0]?.sousFamille.famille?.designation ?? null,
      sousFamille: s.article.sousFamilles[0]?.sousFamille.designation ?? null,
      ref: s.bsm.nOt ? `BSM #${s.idBsm} — ${s.bsm.nOt}` : `BSM #${s.idBsm}`,
      qty: -Number(s.quantite),
    })),
    ...retours.map((r) => ({
      id: r.id,
      type: "Retour" as const,
      date: r.brm.dateRetour,
      article: r.article.designation,
      code: r.article.codeArticle,
      famille: r.article.sousFamilles[0]?.sousFamille.famille?.designation ?? null,
      sousFamille: r.article.sousFamilles[0]?.sousFamille.designation ?? null,
      ref: `BRM #${r.idBrm}`,
      qty: Number(r.quantite),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Inventaire" title="Mouvements de stock" hideBack />
      <div className="p-8 space-y-6">
        <p className="text-sm text-muted -mt-2 max-w-2xl">
          Cette vue est calculée à partir des réceptions, sorties (BSM) et
          retours (BRM) sur la période — il n&apos;existe pas de table de
          mouvements séparée, comme dans l&apos;application d&apos;origine.
        </p>

        <form className="flex gap-3 items-end" method="get">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Du
            </label>
            <input
              type="date"
              name="d1"
              defaultValue={fmt(d1)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Au
            </label>
            <input
              type="date"
              name="d2"
              defaultValue={fmt(d2)}
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
                <th className="px-4 py-3 font-semibold">ID Mvt</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Famille</th>
                <th className="px-4 py-3 font-semibold">Sous Famille</th>
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold">Référence</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Quantité</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m, i) => (
                <tr key={i} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">{m.id}</td>
                  <td className="px-4 py-2.5">
                    <Nameplate>{m.type}</Nameplate>
                  </td>
                  <td className="px-4 py-2.5 text-ink text-xs">{m.famille ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink text-xs">{m.sousFamille ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink">
                    {m.code ? `${m.code} — ` : ""}
                    {m.article}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs">{m.ref}</td>
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">
                    {m.date.toLocaleDateString("fr-FR")}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono text-xs ${
                      m.qty < 0 ? "text-urgent" : "text-ink"
                    }`}
                  >
                    {m.qty > 0 ? "+" : ""}
                    {m.qty}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun mouvement sur cette période.
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
