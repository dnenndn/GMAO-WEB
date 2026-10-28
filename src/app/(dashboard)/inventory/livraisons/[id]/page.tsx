import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { addLivraisonLigne, deleteLivraisonLigne } from "../../actions";
import { notFound } from "next/navigation";

export default async function BonLivraisonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [bl, articles] = await Promise.all([
    prisma.bonLivraison.findUnique({
      where: { id },
      include: {
        reception: { include: { lignes: { include: { article: true } } } },
        factures: { include: { facture: { include: { fournisseur: true } } } },
        lignes: { include: { article: true }, orderBy: { id: "asc" } },
      },
    }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  if (!bl) notFound();

  const totalHt = bl.lignes.reduce(
    (acc, l) => acc + Number(l.qt) * Number(l.prixHt) * (1 - Number(l.remise) / 100),
    0
  );

  return (
    <>
      <PageHeader eyebrow="Bon de livraison" title={`BL-${String(bl.id).padStart(4, "0")}`} />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap text-sm">
          <span className="text-muted font-mono">
            {bl.dateLivraison.toLocaleDateString("fr-FR")}
          </span>
          {bl.blFournisseur && (
            <span className="text-muted">— BL fournisseur : {bl.blFournisseur}</span>
          )}
          <a href={`/inventory/receptions/${bl.idReception}`}>
            <Nameplate>Réception liée</Nameplate>
          </a>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Lignes du bon de livraison
          </div>
          <form
            action={addLivraisonLigne.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Article <span className="text-urgent">*</span>
              </label>
              <select
                name="idArticle"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Qté <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="qt"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Prix HT
              </label>
              <input
                type="number"
                step="0.01"
                name="prixHt"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Remise %
              </label>
              <input
                type="number"
                step="0.01"
                name="remise"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-ink pb-2">
              <input type="checkbox" name="investissement" className="rounded" />
              Investissement
            </label>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Article</th>
                  <th className="px-4 py-3 font-semibold w-16 text-right">Qté</th>
                  <th className="px-4 py-3 font-semibold w-20 text-right">Prix HT</th>
                  <th className="px-4 py-3 font-semibold w-16 text-right">Remise</th>
                  <th className="px-4 py-3 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody>
                {bl.lignes.map((l) => (
                  <tr key={l.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">
                      {l.article.designation}
                      {l.investissement && <span className="text-muted text-xs ml-1">(invest.)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{l.qt.toString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{l.prixHt.toFixed(3)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{l.remise.toString()}%</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={deleteLivraisonLigne.bind(null, l.id, id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {bl.lignes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune ligne ajoutée.
                    </td>
                  </tr>
                )}
              </tbody>
              {bl.lignes.length > 0 && (
                <tfoot>
                  <tr className="bg-paper/60">
                    <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                      Total HT
                    </td>
                    <td colSpan={4} className="px-4 py-2.5 text-right font-mono text-sm text-ink">
                      {totalHt.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Quantités reçues (réception liée)
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Article</th>
                  <th className="px-4 py-3 font-semibold w-24 text-right">Qté reçue</th>
                </tr>
              </thead>
              <tbody>
                {bl.reception.lignes.map((l) => (
                  <tr key={l.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{l.article.designation}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {l.qtRecu.toString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {bl.factures.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Facturé sur
            </div>
            <div className="flex flex-wrap gap-2">
              {bl.factures.map((fl) => (
                <a key={fl.id} href={`/procurement/factures/${fl.facture.id}`}>
                  <Nameplate>
                    {fl.facture.nFacture ?? `FAC-${fl.facture.id}`} — {fl.facture.fournisseur.nom}
                  </Nameplate>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
