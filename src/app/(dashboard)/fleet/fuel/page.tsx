import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { addSortieCarburant } from "../actions";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit. The "Total"
// footer now comes from a separate aggregate query across every
// non-deleted row, not just the current page, so it stays the real
// grand total regardless of which page is showing.

export default async function FuelPage({
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
      case "carburant": return { carburant: { designation: dir } };
      case "quantite": return { quantite: dir };
      case "prix": return { prixTtc: dir };
      case "date": return { date: dir };
      default: return { date: "desc" as const };
    }
  }

  const [totalCount, sorties, engins, typesCarburant, totalAgg] = await Promise.all([
    prisma.enginSortieCarburant.count({ where: { deleted: false } }),
    prisma.enginSortieCarburant.findMany({
      where: { deleted: false },
      include: { engin: true, carburant: true },
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.engin.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.typeCarburant.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.enginSortieCarburant.aggregate({ where: { deleted: false }, _sum: { prixTtc: true } }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);
  const total = Number(totalAgg._sum.prixTtc ?? 0);

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
      <PageHeader eyebrow="Flotte" title="Carburant" />
      <div className="p-8 space-y-6">
        <form
          action={addSortieCarburant}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[180px]">
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
          <div className="w-40">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Carburant
            </label>
            <select
              name="idCarbu"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {typesCarburant.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.designation}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Quantité (L) <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="quantite"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Prix U.
            </label>
            <input
              type="number"
              step="0.001"
              name="prixU"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Compteur
            </label>
            <input
              type="number"
              step="1"
              name="compteur"
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
          emptyLabel="Aucun plein enregistré."
          itemLabel="plein"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="vehicule" label="Véhicule" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="carburant" label="Carburant" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="quantite" label="Quantité" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="prix" label="Prix TTC" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {sorties.map((s) => (
                <tr key={s.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5">
                    <Nameplate>{s.engin.matricule ?? s.engin.designation}</Nameplate>
                  </td>
                  <td className="px-4 py-2.5 text-ink">{s.carburant?.designation ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {s.quantite.toString()} L
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {s.prixTtc?.toFixed(3) ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">
                    {s.date.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
              {sorties.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun plein enregistré.
                  </td>
                </tr>
              )}
            </tbody>
            {sorties.length > 0 && (
              <tfoot>
                <tr className="bg-paper/60">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                    Total (toutes pages)
                  </td>
                  <td colSpan={4} className="px-4 py-2.5 text-right font-mono text-sm text-ink">
                    {total.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT
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
