import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ReportTabs } from "@/components/ReportTabs";
import { updateMesure, updatePrepAS } from "../../actions";
import { notFound } from "next/navigation";

export default async function PreparationPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const rapport = await prisma.prodRapportGeneral.findUnique({ where: { id } });
  if (!rapport) notFound();

  const [general, prepAS] = await Promise.all([
    prisma.prodMesureRapport.findMany({
      where: { idRapport: id, categorie: "prep_general" },
      include: { saisie: true },
      orderBy: { idSaisie: "asc" },
    }),
    prisma.prodRapportPrepAS.findMany({
      where: { idRapport: id },
      include: { saisie: true },
      orderBy: { idSaisie: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Rapport de production"
        title={`RP-${String(id).padStart(4, "0")} — Préparation`}
        backHref="/production"
      />
      <ReportTabs id={id} active="preparation" />
      <div className="p-8 space-y-6">
        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Relevés généraux
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Paramètre</th>
                  <th className="px-4 py-3 font-semibold">Unité</th>
                  <th className="px-4 py-3 font-semibold w-32">Valeur</th>
                  <th className="px-4 py-3 font-semibold w-28"></th>
                </tr>
              </thead>
              <tbody>
                {general.map((row) => {
                  const formId = `row-${row.id}`;
                  return (
                    <tr key={row.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-ink">{row.saisie.designation}</td>
                      <td className="px-4 py-2.5 text-muted text-xs">
                        {row.saisie.unite ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          name="valeur"
                          form={formId}
                          defaultValue={row.valeur.toString()}
                          className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <form id={formId} action={updateMesure.bind(null, row.id)}>
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
                {general.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                      Aucun paramètre de préparation configuré (catégorie
                      « cible = 1 » dans les paramètres de saisie).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Relevés A/S
          </div>
          <p className="text-xs text-muted mb-3">
            La signification exacte de « A » / « S » n&apos;est pas
            confirmée dans le code source (probablement deux points de
            prélèvement, ou avant/après) — voir la spec du module,
            section 5. Étiquetage neutre en attendant confirmation.
          </p>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Paramètre</th>
                  <th className="px-4 py-3 font-semibold w-28">Valeur A</th>
                  <th className="px-4 py-3 font-semibold w-28">Valeur S</th>
                  <th className="px-4 py-3 font-semibold w-28"></th>
                </tr>
              </thead>
              <tbody>
                {prepAS.map((row) => {
                  const formId = `as-${row.id}`;
                  return (
                    <tr key={row.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-ink">{row.saisie.designation}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          name="valeurA"
                          form={formId}
                          defaultValue={row.valeurA.toString()}
                          className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          name="valeurS"
                          form={formId}
                          defaultValue={row.valeurS.toString()}
                          className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <form id={formId} action={updatePrepAS.bind(null, row.id)}>
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
                {prepAS.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                      Aucun paramètre A/S configuré (catégorie « cible = 2 »
                      dans les paramètres de saisie).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
