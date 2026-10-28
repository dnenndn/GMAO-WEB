import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { addVoyage, deleteVoyage } from "../actions";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit. "Distance
// totale" now comes from a separate aggregate across every non-deleted
// row, not just the current page.

export default async function VoyagesPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "vehicule": return { engin: { designation: dir } };
      case "chauffeur": return { chauffeur: { nom: dir } };
      case "distance": return { distance: dir };
      case "date": return { date: dir };
      default: return { date: "desc" as const };
    }
  }

  const [totalCount, voyages, engins, chauffeurs, distanceAgg] = await Promise.all([
    prisma.voyage.count({ where: { deleted: false } }),
    prisma.voyage.findMany({
      where: { deleted: false },
      include: { engin: true, chauffeur: true },
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.engin.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.chauffeur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
    prisma.voyage.aggregate({ where: { deleted: false }, _sum: { distance: true } }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);
  const totalDistance = Number(distanceAgg._sum.distance ?? 0);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Flotte" title="Voyages" hideBack />
      <div className="p-8 space-y-6">
        <form
          action={addVoyage}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Véhicule <span className="text-urgent">*</span>
            </label>
            <select
              name="idEngin"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {engins.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.matricule ?? e.designation}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Chauffeur <span className="text-urgent">*</span>
            </label>
            <select
              name="idChauffeur"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {chauffeurs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Départ <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="depart"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Arrivée <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="arrive"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Distance (km) <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="distance"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Heure départ
            </label>
            <input
              type="time"
              name="heureDep"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Heure arrivée
            </label>
            <input
              type="time"
              name="heureArr"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Date <span className="text-urgent">*</span>
            </label>
            <input
              type="date"
              name="date"
              defaultValue={now}
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Enregistrer
          </button>
        </form>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun voyage enregistré."
          itemLabel="voyage"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="vehicule" label="Véhicule" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="chauffeur" label="Chauffeur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Trajet</th>
                <SortableTh searchParams={searchParams} columnKey="distance" label="Distance" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {voyages.map((v) => (
                <tr key={v.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5">
                    <Nameplate>{v.engin.matricule ?? v.engin.designation}</Nameplate>
                  </td>
                  <td className="px-4 py-2.5 text-ink">{v.chauffeur.nom}</td>
                  <td className="px-4 py-2.5 text-ink">
                    {v.depart} → {v.arrive}
                    {v.heureDep && v.heureArr && (
                      <span className="text-muted text-xs ml-2">
                        ({v.heureDep} — {v.heureArr})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {v.distance.toString()} km
                  </td>
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">
                    {v.date.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteVoyage.bind(null, v.id)}>
                      <button type="submit" className="text-xs text-urgent hover:underline">
                        Supprimer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {voyages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun voyage enregistré.
                  </td>
                </tr>
              )}
            </tbody>
            {voyages.length > 0 && (
              <tfoot>
                <tr className="bg-paper/60">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                    Distance totale
                  </td>
                  <td colSpan={5} className="px-4 py-2.5 font-mono text-sm text-ink">
                    {totalDistance.toLocaleString("fr-FR")} km (toutes pages)
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <PaginationControls page={page} totalPages={totalPages} buildHref={pageHref} />
      </div>
    </>
  );
}
