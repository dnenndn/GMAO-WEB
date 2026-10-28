import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { addDevisLigne, updateDevisLigne } from "../../actions";
import { notFound } from "next/navigation";

export default async function DevisDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [devis, activites] = await Promise.all([
    prisma.dsDevis.findUnique({
      where: { id },
      include: {
        fournisseurs: { include: { fournisseur: true } },
        lignes: { include: { activite: true } },
      },
    }),
    prisma.activiteSousTraitance.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  if (!devis) notFound();

  return (
    <>
      <PageHeader eyebrow="Devis" title={`DEV-${String(devis.id).padStart(4, "0")}`} />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-muted font-mono">
            {devis.dateDevis.toLocaleDateString("fr-FR")}
          </span>
          {devis.fournisseurs.map((f) => (
            <Nameplate key={f.id}>{f.fournisseur.nom}</Nameplate>
          ))}
        </div>

        <form
          action={addDevisLigne.bind(null, id)}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Prestation
            </label>
            <select
              name="idActivite"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {activites.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.designation}
                </option>
              ))}
            </select>
          </div>
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
              Source
            </label>
            <input
              type="text"
              name="source"
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
                <th className="px-4 py-3 font-semibold">Prestation</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Quantité</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Prix HT</th>
                <th className="px-4 py-3 font-semibold w-20 text-right">Remise</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold w-24"></th>
              </tr>
            </thead>
            <tbody>
              {devis.lignes.map((l) => {
                const formId = `ligne-${l.id}`;
                return (
                  <tr key={l.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{l.activite?.designation ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {l.qt.toString()}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        name="prixHt"
                        form={formId}
                        defaultValue={l.prixHt?.toFixed(3) ?? ""}
                        className="w-20 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface text-right"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        name="remise"
                        form={formId}
                        defaultValue={l.remise?.toString() ?? ""}
                        className="w-16 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface text-right"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{l.source ?? "—"}</td>
                    <td className="px-4 py-2">
                      <form id={formId} action={updateDevisLigne.bind(null, l.id, id)}>
                        <button
                          type="submit"
                          className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-2.5 py-1 hover:bg-paper transition-colors"
                        >
                          Enregistrer
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {devis.lignes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune ligne ajoutée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <a
          href={`/sous-traitance/commandes/new?idDevis=${devis.id}`}
          className="inline-block bg-safety text-white text-sm font-semibold px-4 py-2.5 rounded hover:bg-safety/90 transition-colors"
        >
          Créer une commande à partir de ce devis
        </a>
      </div>
    </>
  );
}
