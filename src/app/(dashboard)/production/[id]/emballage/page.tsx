import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ReportTabs } from "@/components/ReportTabs";
import { updateEmbProduit, updateCfEmballage } from "../../actions";
import { notFound } from "next/navigation";

export default async function EmballagePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const rapport = await prisma.prodRapportGeneral.findUnique({ where: { id } });
  if (!rapport) notFound();

  const [rows, cfRows, intervenants] = await Promise.all([
    prisma.prodRapportEmbProduit.findMany({
      where: { idRapport: id },
      include: { unite: true, produit: true },
      orderBy: [{ idUnite: "asc" }, { idProduit: "asc" }],
    }),
    prisma.prodRapportCfEmballage.findMany({
      where: { idRapport: id },
      include: { unite: true, cf: true },
      orderBy: { idUnite: "asc" },
    }),
    prisma.intervenant.findMany({
      where: { deleted: false, chefEquipe: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Rapport de production"
        title={`RP-${String(id).padStart(4, "0")} — Emballage`}
        backHref="/production"
      />
      <ReportTabs id={id} active="emballage" />
      <div className="p-8 space-y-8">
        {cfRows.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Chef d&apos;équipe par ligne
            </div>
            <div className="bg-surface border border-hairline rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">Équipement</th>
                    <th className="px-4 py-3 font-semibold w-56">Chef d&apos;équipe</th>
                    <th className="px-4 py-3 font-semibold w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {cfRows.map((row) => {
                    const formId = `cf-${row.id}`;
                    return (
                      <tr key={row.id} className="border-b border-hairline last:border-0">
                        <td className="px-4 py-2.5 text-ink">
                          {row.unite.designation}
                        </td>
                        <td className="px-4 py-2">
                          <select
                            name="idCf"
                            form={formId}
                            defaultValue={row.idCf?.toString() ?? ""}
                            className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
                          >
                            <option value="">Non assigné</option>
                            {intervenants.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.nom}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <form id={formId} action={updateCfEmballage.bind(null, row.id)}>
                            <button
                              type="submit"
                              className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-2.5 py-1.5 hover:bg-paper transition-colors"
                            >
                              Enregistrer
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Équipement</th>
                <th className="px-4 py-3 font-semibold">Type de brique</th>
                <th className="px-4 py-3 font-semibold w-28">Quantité</th>
                <th className="px-4 py-3 font-semibold w-32">Bobines feuillard</th>
                <th className="px-4 py-3 font-semibold w-28">Palettes</th>
                <th className="px-4 py-3 font-semibold w-28"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const formId = `row-${row.id}`;
                return (
                  <tr key={row.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">
                      {row.unite.designation}
                    </td>
                    <td className="px-4 py-2.5 text-ink">{row.produit.designation}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        name="quantite"
                        form={formId}
                        defaultValue={row.quantite.toString()}
                        className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        name="nbrBobineFeuillard"
                        form={formId}
                        defaultValue={row.nbrBobineFeuillard?.toString() ?? "0"}
                        className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        name="nbrPallette"
                        form={formId}
                        defaultValue={row.nbrPallette?.toString() ?? "0"}
                        className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <form id={formId} action={updateEmbProduit.bind(null, row.id)}>
                        <button
                          type="submit"
                          className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-2.5 py-1.5 hover:bg-paper transition-colors"
                        >
                          Enregistrer
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune ligne d'emballage.
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

