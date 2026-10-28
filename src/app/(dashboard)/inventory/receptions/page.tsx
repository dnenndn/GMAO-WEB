import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit.

export default async function ReceptionsPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "id": return { id: dir };
      case "receptionPar": return { receptionPar: dir };
      case "statut": return { statut: dir };
      case "date": return { dateReception: dir };
      default: return { dateReception: "desc" as const };
    }
  }

  const [totalCount, receptions] = await Promise.all([
    prisma.reception.count(),
    prisma.reception.findMany({
      orderBy: sortOrderFor(searchParams.sort),
      include: { _count: { select: { lignes: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventaire"
        title="Réceptions"
        action={{ href: "/inventory/receptions/new", label: "+ Nouvelle réception" }}
      />
      <div className="p-8 space-y-4">
        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune réception pour le moment."
          itemLabel="réception"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="Réception" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="receptionPar" label="Reçu par" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Lignes</th>
                <SortableTh searchParams={searchParams} columnKey="statut" label="Statut" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {receptions.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/inventory/receptions/${r.id}`}>
                      <Nameplate>REC-{String(r.id).padStart(4, "0")}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{r.receptionPar ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{r._count.lignes}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={r.statut ?? "—"}
                      fg={r.statut === "Terminée" ? "#3D7A4E" : "#C97A0C"}
                      bg={r.statut === "Terminée" ? "#E7F2E9" : "#FBF0DE"}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {r.dateReception.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
              {receptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune réception pour le moment.
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
