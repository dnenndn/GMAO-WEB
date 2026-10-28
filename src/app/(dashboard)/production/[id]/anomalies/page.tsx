import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ReportTabs } from "@/components/ReportTabs";
import { addAnomalie, deleteAnomalie } from "../../actions";
import { notFound } from "next/navigation";

export default async function AnomaliesPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const rapport = await prisma.prodRapportGeneral.findUnique({ where: { id } });
  if (!rapport) notFound();

  const [logged, unites, anomaliesRef] = await Promise.all([
    prisma.prodRapportAnomalie.findMany({
      where: { idRapport: id },
      include: {
        anomalie: true,
        unite: true,
      },
      orderBy: { id: "desc" },
    }),
    prisma.prodEquipement.findMany({ include: { equipement: true } }),
    prisma.prodAnomalie.findMany(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Rapport de production"
        title={`RP-${String(id).padStart(4, "0")} — Anomalies`}
        backHref="/production"
      />
      <ReportTabs id={id} active="anomalies" />
      <div className="p-8 max-w-3xl space-y-6">
        <form
          action={addAnomalie.bind(null, id)}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Équipement <span className="text-urgent">*</span>
            </label>
            <select
              name="idUnite"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {unites.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.equipement.designation} ({u.uniteProduction})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Anomalie <span className="text-urgent">*</span>
            </label>
            <select
              name="idAnomalie"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {anomaliesRef.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.anomalie}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Durée (min) <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="1"
              name="duree"
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
                <th className="px-4 py-3 font-semibold">Équipement</th>
                <th className="px-4 py-3 font-semibold">Anomalie</th>
                <th className="px-4 py-3 font-semibold w-28">Durée</th>
                <th className="px-4 py-3 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {logged.map((row) => (
                <tr key={row.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">
                    {row.unite.designation}
                  </td>
                  <td className="px-4 py-2.5 text-ink">{row.anomalie.anomalie}</td>
                  <td className="px-4 py-2.5 text-ink font-mono text-xs">
                    {row.duree.toString()} min
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={deleteAnomalie.bind(null, row.id, id)}>
                      <button
                        type="submit"
                        className="text-xs text-urgent hover:underline"
                      >
                        Supprimer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {logged.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune anomalie enregistrée pour ce rapport.
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
