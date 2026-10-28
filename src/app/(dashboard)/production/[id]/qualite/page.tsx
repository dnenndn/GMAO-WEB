import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ReportTabs } from "@/components/ReportTabs";
import { updateMesure, updateHoraire, updateTonnage } from "../../actions";
import { notFound } from "next/navigation";

export default async function QualitePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const rapport = await prisma.prodRapportGeneral.findUnique({ where: { id } });
  if (!rapport) notFound();

  const [fourQualite, fabQualite, horaire, tonnages] = await Promise.all([
    prisma.prodMesureRapport.findMany({
      where: { idRapport: id, categorie: "four_qualite" },
      include: { saisie: true, unite: true },
      orderBy: [{ idUnite: "asc" }, { idSaisie: "asc" }],
    }),
    prisma.prodMesureRapport.findMany({
      where: { idRapport: id, categorie: "fabrication_qualite" },
      include: { saisie: true, unite: true },
      orderBy: [{ idUnite: "asc" }, { idSaisie: "asc" }],
    }),
    prisma.prodRapportHoraireFabrication.findMany({
      where: { idRapport: id },
      orderBy: [{ idUnite: "asc" }, { idSaisie: "asc" }],
    }),
    prisma.prodFabTonnage.findMany({
      where: { idRapport: id },
      include: { unite: true },
      orderBy: { idUnite: "asc" },
    }),
  ]);

  const saisieById = new Map(
    (await prisma.prodSaisie.findMany()).map((s) => [s.id, s])
  );
  const uniteById = new Map(
    (
      await prisma.prodEquipement.findMany({ include: { equipement: true } })
    ).map((u) => [u.id, u])
  );

  return (
    <>
      <PageHeader
        eyebrow="Rapport de production"
        title={`RP-${String(id).padStart(4, "0")} — Qualité`}
        backHref="/production"
      />
      <ReportTabs id={id} active="qualite" />
      <div className="p-8 space-y-8">
        <MesureSection title="Qualité four" rows={fourQualite} />
        <MesureSection title="Qualité fabrication" rows={fabQualite} />

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Débit horaire fabrication
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Équipement</th>
                  <th className="px-4 py-3 font-semibold">Paramètre</th>
                  {["H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8"].map((h) => (
                    <th key={h} className="px-2 py-3 font-semibold w-14 text-center">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold w-24"></th>
                </tr>
              </thead>
              <tbody>
                {horaire.map((row) => {
                  const formId = `row-h-${row.id}`;
                  const saisie = saisieById.get(row.idSaisie);
                  const unite = uniteById.get(row.idUnite);
                  return (
                    <tr key={row.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-ink whitespace-nowrap">
                        {unite?.equipement.designation ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-ink whitespace-nowrap">
                        {saisie?.designation ?? "—"}
                      </td>
                      {(["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"] as const).map(
                        (h) => (
                          <td key={h} className="px-1 py-2">
                            <input
                              type="number"
                              step="0.01"
                              name={h}
                              form={formId}
                              defaultValue={row[h].toString()}
                              className="w-14 border border-hairline rounded px-1.5 py-1.5 text-xs font-mono bg-surface"
                            />
                          </td>
                        )
                      )}
                      <td className="px-4 py-2">
                        <form id={formId} action={updateHoraire.bind(null, row.id)}>
                          <button
                            type="submit"
                            className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-2.5 py-1.5 hover:bg-paper transition-colors whitespace-nowrap"
                          >
                            Sauver
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {horaire.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted text-sm">
                      Aucun paramètre horaire configuré (catégorie « cible = 5 »).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Tonnage fabrication (total jour)
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Équipement</th>
                  <th className="px-4 py-3 font-semibold w-32">Tonnage</th>
                  <th className="px-4 py-3 font-semibold w-28"></th>
                </tr>
              </thead>
              <tbody>
                {tonnages.map((row) => {
                  const formId = `row-t-${row.id}`;
                  return (
                    <tr key={row.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-ink">
                        {row.unite.designation}
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
                        <form id={formId} action={updateTonnage.bind(null, row.id)}>
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
                {tonnages.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune ligne de tonnage.
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

function MesureSection({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: number;
    valeur: unknown;
    saisie: { designation: string; unite: string | null };
    unite: { designation: string } | null;
  }[];
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
              <th className="px-4 py-3 font-semibold">Paramètre</th>
              <th className="px-4 py-3 font-semibold w-24">Unité</th>
              <th className="px-4 py-3 font-semibold w-32">Valeur</th>
              <th className="px-4 py-3 font-semibold w-28"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const formId = `row-m-${row.id}`;
              return (
                <tr key={row.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">
                    {row.unite?.designation ?? "—"}
                  </td>
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
                      defaultValue={String(row.valeur)}
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
