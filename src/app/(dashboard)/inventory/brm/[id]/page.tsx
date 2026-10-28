import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { addBrmLigne } from "../../actions";
import { notFound } from "next/navigation";

export default async function BrmDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [brm, articles] = await Promise.all([
    prisma.brm.findUnique({
      where: { id },
      include: { lignes: { include: { article: true } } },
    }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  if (!brm) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Bon de retour magasin"
        title={`BRM-${String(brm.id).padStart(4, "0")}`}
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap">
          {brm.idBsm && <Nameplate>BSM-{String(brm.idBsm).padStart(4, "0")}</Nameplate>}
          <span className="text-xs text-muted font-mono">
            {brm.dateRetour.toLocaleDateString("fr-FR")}
          </span>
        </div>

        <form
          action={addBrmLigne.bind(null, id)}
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
                  {a.designation}
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

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Quantité</th>
              </tr>
            </thead>
            <tbody>
              {brm.lignes.map((l) => (
                <tr key={l.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{l.article.designation}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.quantite.toString()}
                  </td>
                </tr>
              ))}
              {brm.lignes.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun article ajouté.
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
