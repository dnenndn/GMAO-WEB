import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { addLivraisonLigne } from "../../actions";
import { notFound } from "next/navigation";

export default async function LivraisonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const livraison = await prisma.dsBonLivraison.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      commande: true,
      lignes: { include: { commandeArticle: { include: { activite: true } } } },
    },
  });

  if (!livraison) notFound();

  const commandeLignes = livraison.idCommande
    ? await prisma.dsCommandeArticle.findMany({
        where: { idCommande: livraison.idCommande },
        include: { activite: true },
      })
    : [];

  return (
    <>
      <PageHeader eyebrow="Bon de livraison" title={`BL-${String(livraison.id).padStart(4, "0")}`} />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap">
          {livraison.commande && <Nameplate>{livraison.commande.nCommande}</Nameplate>}
          <span className="text-sm text-ink">{livraison.fournisseur?.nom}</span>
          <span className="text-xs text-muted font-mono">
            {livraison.dateLivraison.toLocaleDateString("fr-FR")}
          </span>
          {livraison.blFournisseur && (
            <span className="text-xs text-muted">— BL fournisseur : {livraison.blFournisseur}</span>
          )}
        </div>

        {commandeLignes.length > 0 && (
          <form
            action={addLivraisonLigne.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
          >
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Ligne de commande <span className="text-urgent">*</span>
              </label>
              <select
                name="idDsCommandeArticle"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {commandeLignes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.activite?.designation ?? l.descr ?? "—"} (commandé: {l.qt.toString()}, reçu:{" "}
                    {l.reception?.toString() ?? "0"})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Quantité reçue <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="qt"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>
        )}

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Prestation</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Quantité</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Prix HT</th>
              </tr>
            </thead>
            <tbody>
              {livraison.lignes.map((l) => (
                <tr key={l.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">
                    {l.commandeArticle.activite?.designation ?? l.commandeArticle.descr ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.qt.toString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.prixHt?.toFixed(3) ?? "—"}
                  </td>
                </tr>
              ))}
              {livraison.lignes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune ligne ajoutée.
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
