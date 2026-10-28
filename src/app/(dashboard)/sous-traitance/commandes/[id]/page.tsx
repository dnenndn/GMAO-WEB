import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { commandeStatutColor, COMMANDE_STATUTS } from "@/lib/constants";
import { addCommandeStLigne, updateCommandeStStatut, signCommandeSt } from "../../actions";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function CommandeStDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { signError?: string };
}) {
  const id = Number(params.id);
  const commande = await prisma.dsCommande.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      lignes: { include: { activite: true } },
    },
  });

  if (!commande) notFound();

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  // Devis lines available to pull in — id_ds is a real relation to
  // DemandeSousTraitance (see schema/docs correction), matched here by
  // value since Devis and Commande both reference it independently.
  const devisLignes = commande.idDs
    ? await prisma.dsDevisArticle.findMany({
        where: { devis: { idDs: commande.idDs } },
        include: { activite: true, devis: true },
      })
    : [];

  const s = commandeStatutColor(commande.statut);
  const nextStatuses = COMMANDE_STATUTS.filter((st) => st !== commande.statut);

  const total = commande.lignes.reduce(
    (acc, l) => acc + Number(l.qt) * Number(l.prixHt ?? 0) * (1 - Number(l.remise ?? 0) / 100),
    0
  );

  return (
    <>
      <PageHeader eyebrow="Commande sous-traitance" title={commande.nCommande ?? `DS-CMD-${commande.id}`} />
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
              <form key={st} action={updateCommandeStStatut.bind(null, id, st)}>
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

        {commande.statut === "En attente" && (
          <div className="bg-surface border border-hairline rounded p-4 max-w-sm">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Signer la commande
            </div>
            {searchParams.signError && (
              <div className="text-xs text-urgent bg-urgent/10 border border-urgent/20 rounded px-3 py-2 mb-3">
                {decodeURIComponent(searchParams.signError)}
              </div>
            )}
            <form action={signCommandeSt.bind(null, id)} className="flex gap-2">
              <input
                type="password"
                name="pin"
                placeholder="Code de signature"
                required
                className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
              <button
                type="submit"
                className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
              >
                Signer
              </button>
            </form>
            <a
              href="/sous-traitance/settings/signature"
              className="text-xs text-steel-600 hover:underline mt-2 inline-block"
            >
              Configurer mon code de signature →
            </a>
          </div>
        )}

        {commande.statut !== "Clôturée" && commande.statut !== "Annulée" && (
          <form
            action={addCommandeStLigne.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
          >
            {devisLignes.length > 0 && (
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                  Ligne devis (optionnel)
                </label>
                <select
                  name="idDevisArticle"
                  className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
                >
                  <option value="">Saisie libre</option>
                  {devisLignes.map((l) => (
                    <option key={l.id} value={l.id}>
                      DEV-{String(l.idDevis).padStart(4, "0")} — {l.activite?.designation ?? "—"} (
                      {l.qt.toString()})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Quantité <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="qt"
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
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Description
              </label>
              <input
                type="text"
                name="descr"
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
                <th className="px-4 py-3 font-semibold w-24 text-right">Reçu</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Prix HT</th>
              </tr>
            </thead>
            <tbody>
              {commande.lignes.map((l) => (
                <tr key={l.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">
                    {l.activite?.designation ?? l.descr ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.qt.toString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.reception?.toString() ?? "0"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.prixHt?.toFixed(3) ?? "—"}
                  </td>
                </tr>
              ))}
              {commande.lignes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
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
                  <td colSpan={3} className="px-4 py-2.5 text-right font-mono text-sm text-ink">
                    {total.toLocaleString("fr-FR")} DT
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <a
          href={`/sous-traitance/livraisons/new?idCommande=${commande.id}`}
          className="inline-block bg-safety text-white text-sm font-semibold px-4 py-2.5 rounded hover:bg-safety/90 transition-colors"
        >
          Créer un bon de livraison
        </a>
      </div>
    </>
  );
}
