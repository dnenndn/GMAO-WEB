import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 200` with no
// pagination silently hides everything past the limit.

const LOCATION_COLORS: Record<string, { fg: string; bg: string }> = {
  Usine: { fg: "#2B5C6B", bg: "#EEF3F5" },
  Magasin: { fg: "#C97A0C", bg: "#FBF0DE" },
  Réparation: { fg: "#204450", bg: "#D6E2E6" },
};

export default async function MouvementsStPage({
  searchParams,
}: {
  searchParams: { location?: string; page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";
  const where = searchParams.location ? { mvt: searchParams.location } : undefined;

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "localisation": return { mvt: dir };
      case "ref": return { idT: dir };
      case "date": return { dateMvt: dir };
      default: return { dateMvt: "desc" as const };
    }
  }

  const [totalCount, mouvements] = await Promise.all([
    prisma.dsHistoriqueMvt.count({ where }),
    prisma.dsHistoriqueMvt.findMany({
      where,
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);
  const locations = ["Usine", "Magasin", "Réparation"];

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.location) params.set("location", searchParams.location);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Mouvements (localisation)" />
      <div className="p-8 space-y-6">
        <p className="text-sm text-muted max-w-2xl">
          Contrairement au registre de mouvements de stock (module
          Inventaire), cette table existe réellement dans l&apos;application
          d&apos;origine — elle suit la localisation physique du matériel
          confié en sous-traitance.
        </p>

        <div className="flex gap-2">
          <FilterLink href="/sous-traitance/mouvements" label="Tous" active={!searchParams.location} />
          {locations.map((loc) => (
            <FilterLink
              key={loc}
              href={`/sous-traitance/mouvements?location=${encodeURIComponent(loc)}`}
              label={loc}
              active={searchParams.location === loc}
            />
          ))}
        </div>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun mouvement enregistré."
          itemLabel="mouvement"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="localisation" label="Localisation" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="ref" label="Réf. matériel (id_t)" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {mouvements.map((m) => {
                const c = LOCATION_COLORS[m.mvt] ?? { fg: "#6B7280", bg: "#EEEEEC" };
                return (
                  <tr key={m.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5">
                      <StatusPill label={m.mvt} fg={c.fg} bg={c.bg} />
                    </td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">{m.idT ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {m.dateMvt.toLocaleDateString("fr-FR")} {m.heureMvt ?? ""}
                    </td>
                  </tr>
                );
              })}
              {mouvements.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun mouvement enregistré.
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

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-steel-600 text-white border-steel-600"
          : "bg-surface text-muted border-hairline hover:border-steel-400"
      }`}
    >
      {label}
    </Link>
  );
}
