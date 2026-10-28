import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { recordDopFini, createDevisFromDop, markDopFiniDone } from "../../actions";
import { notFound } from "next/navigation";

export default async function DopDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const dop = await prisma.dop.findUnique({
    where: { id },
    include: {
      articles: { include: { article: true } },
      fournisseurs: { include: { fournisseur: true } },
      resultats: { include: { article: true, fournisseur: true } },
      devis: { include: { fournisseurs: { include: { fournisseur: true } } } },
    },
  });

  if (!dop) notFound();

  const resultByKey = new Map(
    dop.resultats.map((r) => [`${r.idArticle}-${r.idFournisseur}`, r])
  );

  // Total per supplier, across all articles quoted so far — makes the
  // comparison actually useful at a glance.
  const totalsByFournisseur = new Map<number, number>();
  for (const r of dop.resultats) {
    const net = Number(r.prixHt) * (1 - Number(r.remise) / 100);
    totalsByFournisseur.set(r.idFournisseur, (totalsByFournisseur.get(r.idFournisseur) ?? 0) + net);
  }

  return (
    <>
      <PageHeader eyebrow="DOP" title={`DOP-${String(dop.id).padStart(4, "0")}`} />
      <div className="p-8 space-y-8">
        <div className="text-xs text-muted font-mono">
          {dop.dateDop.toLocaleDateString("fr-FR")}
        </div>

        <div className="bg-surface border border-hairline rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold sticky left-0 bg-surface">Article</th>
                {dop.fournisseurs.map((f) => (
                  <th key={f.id} className="px-4 py-3 font-semibold whitespace-nowrap">
                    {f.fournisseur.nom}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dop.articles.map((a) => (
                <tr key={a.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink whitespace-nowrap sticky left-0 bg-surface">
                    {a.article.designation}
                  </td>
                  {dop.fournisseurs.map((f) => {
                    const existing = resultByKey.get(`${a.idArticle}-${f.idFournisseur}`);
                    const formId = `dopfini-${a.idArticle}-${f.idFournisseur}`;
                    return (
                      <td key={f.id} className="px-4 py-2 align-top">
                        <form
                          id={formId}
                          action={recordDopFini.bind(null, id)}
                          className="flex flex-col gap-1"
                        >
                          <input type="hidden" name="idArticle" value={a.idArticle} />
                          <input type="hidden" name="idFournisseur" value={f.idFournisseur} />
                          <input
                            type="number"
                            step="0.01"
                            name="prixHt"
                            placeholder="Prix HT"
                            defaultValue={existing?.prixHt?.toFixed(3) ?? ""}
                            form={formId}
                            className="w-24 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface"
                          />
                          <input
                            type="number"
                            step="0.01"
                            name="remise"
                            placeholder="Remise %"
                            defaultValue={existing?.remise?.toString() ?? ""}
                            form={formId}
                            className="w-24 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface"
                          />
                          <button
                            type="submit"
                            form={formId}
                            className="text-[10px] font-semibold text-steel-600 hover:text-steel-700"
                          >
                            Enregistrer
                          </button>
                          {existing && (
                            <form action={markDopFiniDone.bind(null, existing.id, id)}>
                              <button
                                type="submit"
                                disabled={existing.fini}
                                className={`text-[10px] font-semibold ${
                                  existing.fini
                                    ? "text-muted cursor-default"
                                    : "text-steel-600 hover:text-steel-700"
                                }`}
                              >
                                {existing.fini ? "✓ Terminé" : "Marquer terminé"}
                              </button>
                            </form>
                          )}
                        </form>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {dop.articles.length === 0 && (
                <tr>
                  <td
                    colSpan={dop.fournisseurs.length + 1}
                    className="px-4 py-8 text-center text-muted text-sm"
                  >
                    Aucun article dans cette DOP.
                  </td>
                </tr>
              )}
            </tbody>
            {dop.resultats.length > 0 && (
              <tfoot>
                <tr className="bg-paper/60">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide sticky left-0 bg-paper/60">
                    Total net
                  </td>
                  {dop.fournisseurs.map((f) => (
                    <td key={f.id} className="px-4 py-2.5 text-xs font-mono text-ink">
                      {(totalsByFournisseur.get(f.idFournisseur) ?? 0).toLocaleString("fr-FR", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      DT
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Formaliser un devis
          </div>
          <form
            action={createDevisFromDop.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end"
          >
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Fournisseur retenu <span className="text-urgent">*</span>
              </label>
              <select
                name="idFournisseur"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {dop.fournisseurs.map((f) => (
                  <option key={f.id} value={f.idFournisseur}>
                    {f.fournisseur.nom} —{" "}
                    {(totalsByFournisseur.get(f.idFournisseur) ?? 0).toLocaleString("fr-FR", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    DT
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2.5 rounded hover:bg-safety/90 transition-colors"
            >
              Créer le devis
            </button>
          </form>
        </div>

        {dop.devis.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Devis générés
            </div>
            <div className="flex flex-wrap gap-2">
              {dop.devis.map((d) => (
                <a key={d.id} href={`/procurement/devis/${d.id}`}>
                  <Nameplate>
                    DEV-{String(d.id).padStart(4, "0")}
                    {d.fournisseurs[0] ? ` — ${d.fournisseurs[0].fournisseur.nom}` : ""}
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
