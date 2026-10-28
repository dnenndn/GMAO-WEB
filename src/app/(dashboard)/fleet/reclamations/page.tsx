import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { addReclamation, deleteReclamation } from "../actions";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit.

export default async function ReclamationsPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "anomalie": return { anomalie: dir };
      case "vehicule": return { engin: { designation: dir } };
      case "chauffeur": return { chauffeur: { nom: dir } };
      case "date": return { date: dir };
      default: return { date: "desc" as const };
    }
  }

  const [totalCount, reclamations, engins, chauffeurs] = await Promise.all([
    prisma.reclamationAnomalie.count({ where: { deleted: false } }),
    prisma.reclamationAnomalie.findMany({
      where: { deleted: false },
      include: { engin: true, chauffeur: true },
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.engin.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.chauffeur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

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
      <PageHeader eyebrow="Flotte" title="Réclamations" hideBack />
      <div className="p-8 space-y-6">
        <form
          action={addReclamation}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Anomalie <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="anomalie"
              required
              placeholder="Description du problème signalé"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
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
            Signaler
          </button>
        </form>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune réclamation."
          itemLabel="réclamation"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="anomalie" label="Anomalie" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="vehicule" label="Véhicule" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="chauffeur" label="Chauffeur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {reclamations.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{r.anomalie}</td>
                  <td className="px-4 py-2.5">
                    <Nameplate>{r.engin.matricule ?? r.engin.designation}</Nameplate>
                  </td>
                  <td className="px-4 py-2.5 text-ink">{r.chauffeur.nom}</td>
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">
                    {r.date.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteReclamation.bind(null, r.id)}>
                      <button type="submit" className="text-xs text-urgent hover:underline">
                        Supprimer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {reclamations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune réclamation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls page={page} totalPages={totalPages} buildHref={pageHref} />
      </div>
    </>
  );
}
