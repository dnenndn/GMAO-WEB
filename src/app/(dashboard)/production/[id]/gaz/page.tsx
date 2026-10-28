import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ReportTabs } from "@/components/ReportTabs";
import { updateGaz } from "../../actions";
import { notFound } from "next/navigation";

export default async function GazPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const rapport = await prisma.prodRapportGeneral.findUnique({ where: { id } });
  if (!rapport) notFound();

  const rows = await prisma.prodGaz.findMany({
    where: { idRapport: id },
    orderBy: { id: "asc" },
  });

  const total = rows.reduce((a, r) => a + Number(r.quantite), 0);

  return (
    <>
      <PageHeader
        eyebrow="Rapport de production"
        title={`RP-${String(id).padStart(4, "0")} — Gaz`}
        backHref="/production"
      />
      <ReportTabs id={id} active="gaz" />
      <div className="p-8 max-w-xl">
        <p className="text-sm text-muted mb-4">
          Consommation de gaz par point de brûlage. Contrairement aux
          points de fuel (confirmés dans le code source), les libellés
          exacts ici sont une estimation à confirmer avec l&apos;équipe de
          production — voir la note dans la spec du module.
        </p>
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Point de consommation</th>
                <th className="px-4 py-3 font-semibold w-32">Quantité</th>
                <th className="px-4 py-3 font-semibold w-28"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const formId = `row-${row.id}`;
                return (
                  <tr key={row.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{row.typeSaisie}</td>
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
                      <form id={formId} action={updateGaz.bind(null, row.id)}>
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
            <tfoot>
              <tr className="bg-paper/60">
                <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                  Total
                </td>
                <td className="px-4 py-2.5 font-mono text-sm text-ink" colSpan={2}>
                  {total.toLocaleString("fr-FR")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
