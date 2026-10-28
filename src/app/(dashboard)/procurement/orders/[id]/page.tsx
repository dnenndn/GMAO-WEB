import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { commandeStatutColor, COMMANDE_STATUTS } from "@/lib/constants";
import { addCommandeLigne, updateCommandeStatut, updateCommandeLigne } from "../../actions";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const commande = await prisma.commande.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      lignes: { include: { daArticle: { include: { article: true } } } },
      modifications: {
        include: { lignes: { include: { article: true } } },
        orderBy: { dateModification: "desc" },
        take: 10,
      },
    },
  });

  if (!commande) notFound();

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  // Only DA lines with remaining quantity, and belonging to a confirmed DA,
  // are eligible to be pulled into this order.
  // `qtRestant: { gt: 0 }` was filtered in the database query here
  // originally — moved to a plain JS filter after fetching instead,
  // following the same fix applied to analytics/cost/page.tsx after a
  // real crash there: comparing a Decimal field directly against a
  // literal number inside a Prisma filter has a confirmed history of
  // triggering a hard Rust-level query-engine panic in some Prisma 5.x
  // builds, independent of the actual data. This sidesteps that
  // entirely rather than waiting to find out whether this specific
  // query also triggers it.
  const availableDaLignesRaw = await prisma.daArticle.findMany({
    where: {
      da: { actions: { some: { type: "Confirmée" } } },
    },
    include: { article: true, da: true },
    orderBy: { id: "desc" },
    take: 200,
  });
  const availableDaLignes = availableDaLignesRaw.filter((l) => Number(l.qtRestant) > 0).slice(0, 100);

  const s = commandeStatutColor(commande.statut);
  const nextStatuses = COMMANDE_STATUTS.filter((st) => st !== commande.statut);

  const total = commande.lignes.reduce(
    (acc, l) => acc + Number(l.qtCommande) * Number(l.prixHt ?? 0) * (1 - Number(l.remise ?? 0) / 100),
    0
  );

  return (
    <>
      <PageHeader eyebrow="Commande" title={commande.nCommande ?? `CMD-${commande.id}`} />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap">
          <StatusPill label={commande.statut} fg={s.fg} bg={s.bg} />
          <span className="text-sm text-ink">{commande.fournisseur?.nom}</span>
          <span className="text-xs text-muted font-mono">
            {commande.dateCommande.toLocaleDateString("fr-FR")}
          </span>
        </div>

        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((st) => (
              <form key={st} action={updateCommandeStatut.bind(null, id, st)}>
                <button
                  type="submit"
                  className="text-xs font-semibold border border-hairline text-ink px-3 py-1.5 rounded hover:border-steel-400 hover:bg-paper transition-colors"
                >
                  {st}
                </button>
              </form>
            ))}
          </div>
        )}

        {commande.statut !== "Clôturée" && commande.statut !== "Annulée" && (
          <form
            action={addCommandeLigne.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
          >
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Ligne DA confirmée <span className="text-urgent">*</span>
              </label>
              <select
                name="idDaArticle"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {availableDaLignes.map((l) => (
                  <option key={l.id} value={l.id}>
                    DA-{String(l.idDa).padStart(4, "0")} — {l.article.designation} (restant:{" "}
                    {l.qtRestant.toString()})
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
                name="qtCommande"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="w-28">
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
                <th className="px-4 py-3 font-semibold w-24 text-right">Prix HT</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Remise</th>
                {isAdmin && <th className="px-4 py-3 font-semibold w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {commande.lignes.map((l) => {
                const formId = `ligne-${l.id}`;
                return (
                  <tr key={l.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{l.daArticle.article.designation}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin ? (
                        <input
                          type="number"
                          step="0.01"
                          name="qtCommande"
                          form={formId}
                          defaultValue={l.qtCommande.toString()}
                          className="w-20 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface text-right"
                        />
                      ) : (
                        <span className="font-mono text-xs text-ink">{l.qtCommande.toString()}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin ? (
                        <input
                          type="number"
                          step="0.01"
                          name="prixHt"
                          form={formId}
                          defaultValue={l.prixHt?.toFixed(3) ?? ""}
                          className="w-20 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface text-right"
                        />
                      ) : (
                        <span className="font-mono text-xs text-ink">{l.prixHt?.toFixed(3) ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin ? (
                        <input
                          type="number"
                          step="0.01"
                          name="remise"
                          form={formId}
                          defaultValue={l.remise?.toString() ?? ""}
                          className="w-20 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface text-right"
                        />
                      ) : (
                        <span className="font-mono text-xs text-ink">{l.remise?.toString() ?? "—"}</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        <form id={formId} action={updateCommandeLigne.bind(null, l.id, id)}>
                          <button
                            type="submit"
                            className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-2.5 py-1 hover:bg-paper transition-colors"
                          >
                            Enregistrer
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                );
              })}
              {commande.lignes.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune ligne ajoutée.
                  </td>
                </tr>
              )}
            </tbody>
            {commande.lignes.length > 0 && (
              <tfoot>
                <tr className="bg-paper/60">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                    Total HT
                  </td>
                  <td colSpan={isAdmin ? 4 : 2} className="px-4 py-2.5 text-right font-mono text-sm text-ink">
                    {total.toLocaleString("fr-FR")} DT
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {commande.modifications.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Historique des modifications
            </div>
            <div className="space-y-3">
              {commande.modifications.map((mod) => (
                <div key={mod.id} className="border-l-2 border-hairline pl-3 text-sm">
                  <div className="text-xs text-muted mb-1">
                    {mod.modifierPar} · {mod.dateModification.toLocaleDateString("fr-FR")}{" "}
                    {mod.heureModification}
                  </div>
                  {mod.lignes.map((l) => (
                    <div key={l.id} className="text-ink">
                      {l.article.designation} — {l.qt.toString()} × {l.prixHt.toFixed(3)} DT
                      {Number(l.remise) > 0 && ` (remise ${l.remise.toString()}%)`}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
