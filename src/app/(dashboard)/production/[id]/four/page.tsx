import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ReportTabs } from "@/components/ReportTabs";
import { updateFourEntre, updateFourSortie } from "../../actions";
import { notFound } from "next/navigation";

export default async function FourPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const rapport = await prisma.prodRapportGeneral.findUnique({ where: { id } });
  if (!rapport) notFound();

  const [entre, sortie] = await Promise.all([
    prisma.prodRapportFourEntre.findMany({
      where: { idRapport: id },
      include: { unite: true, produit: true },
      orderBy: [{ idUnite: "asc" }, { idProduit: "asc" }],
    }),
    prisma.prodRapportFourSortie.findMany({
      where: { idRapport: id },
      include: { unite: true, produit: true },
      orderBy: [{ idUnite: "asc" }, { idProduit: "asc" }],
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Rapport de production"
        title={`RP-${String(id).padStart(4, "0")} — Four`}
        backHref="/production"
      />
      <ReportTabs id={id} active="four" />
      <div className="p-8 space-y-8">
        <Section title="Entrée (produit cru)" rows={entre} action={updateFourEntre} />
        <Section title="Sortie (produit cuit)" rows={sortie} action={updateFourSortie} />
      </div>
    </>
  );
}

function Section({
  title,
  rows,
  action,
}: {
  title: string;
  rows: {
    id: number;
    quantite: unknown;
    tonnage: unknown;
    unite: { designation: string };
    produit: { designation: string };
  }[];
  action: (id: number, formData: FormData) => Promise<void>;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="bg-surface border border-hairline rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Équipement</th>
              <th className="px-4 py-3 font-semibold">Type de brique</th>
              <th className="px-4 py-3 font-semibold w-32">Quantité</th>
              <th className="px-4 py-3 font-semibold w-32">Tonnage</th>
              <th className="px-4 py-3 font-semibold w-28"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const formId = `row-${title}-${row.id}`;
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
                      defaultValue={String(row.quantite)}
                      className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      name="tonnage"
                      form={formId}
                      defaultValue={String(row.tonnage)}
                      className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <form id={formId} action={action.bind(null, row.id)}>
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
                <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                  Aucune ligne pour cette section.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
