import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { addBsmLigne, validateBsm } from "../../actions";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function BsmDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [bsm, articles] = await Promise.all([
    prisma.bsm.findUnique({
      where: { id },
      include: { lignes: { include: { article: true } } },
    }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  if (!bsm) notFound();

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  const total = bsm.lignes.reduce(
    (acc, l) => acc + Number(l.quantite) * Number(l.prixHt ?? 0),
    0
  );

  return (
    <>
      <PageHeader
        eyebrow="Bon de sortie magasin"
        title={`BSM-${String(bsm.id).padStart(4, "0")}`}
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap">
          <StatusPill
            label={bsm.validation ? "Validé" : "En attente"}
            fg={bsm.validation ? "#3D7A4E" : "#C97A0C"}
            bg={bsm.validation ? "#E7F2E9" : "#FBF0DE"}
          />
          {bsm.nOt && <Nameplate>{bsm.nOt}</Nameplate>}
          <span className="text-xs text-muted font-mono">
            {bsm.dateBsm.toLocaleDateString("fr-FR")}
          </span>
        </div>

        {!bsm.validation && (
          <form
            action={addBsmLigne.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
          >
            <div className="flex-1 min-w-[200px]">
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
                    {a.codeArticle ? `${a.codeArticle} — ` : ""}
                    {a.designation} (stock: {a.stockNeuf.toString()})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Quantité <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="quantite"
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
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Quantité</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Prix HT</th>
              </tr>
            </thead>
            <tbody>
              {bsm.lignes.map((l) => (
                <tr key={l.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{l.article.designation}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.quantite.toString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.prixHt?.toFixed(3) ?? "—"}
                  </td>
                </tr>
              ))}
              {bsm.lignes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun article ajouté.
                  </td>
                </tr>
              )}
            </tbody>
            {bsm.lignes.length > 0 && (
              <tfoot>
                <tr className="bg-paper/60">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                    Total HT
                  </td>
                  <td colSpan={2} className="px-4 py-2.5 text-right font-mono text-sm text-ink">
                    {total.toLocaleString("fr-FR")} DT
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {!bsm.validation && bsm.lignes.length > 0 && isAdmin && (
          <form action={validateBsm.bind(null, id)}>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
            >
              Valider le BSM
            </button>
          </form>
        )}
      </div>
    </>
  );
}
