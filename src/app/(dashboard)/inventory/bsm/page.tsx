import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Pagination added — the previous version had a flat `take: 100` with
// no pagination at all, same class of bug already confirmed and fixed
// on the Articles page (silently hides everything past the limit with
// no indication more exists). Sortable columns added too, same pattern
// as the OT/DI lists.

export default async function BsmPage({
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
      case "date": return { dateBsm: dir };
      case "createur": return { createur: dir };
      case "nOt": return { nOt: dir };
      case "type": return { typeStock: dir };
      default: return { dateBsm: "desc" as const };
    }
  }

  const [totalCount, bsms] = await Promise.all([
    prisma.bsm.count(),
    prisma.bsm.findMany({
      orderBy: sortOrderFor(searchParams.sort),
      include: {
        _count: { select: { lignes: true } },
        equipements: { include: { equipement: true }, take: 1 },
      },
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
        eyebrow="Gestion de stock"
        title="Historique BSM"
        action={{ href: "/inventory/bsm/new", label: "+ Nouveau BSM" }} hideBack
      />
      <div className="p-8 space-y-4">
        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun BSM pour le moment."
          itemLabel="BSM"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="ID" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date de création" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Heure</th>
                <SortableTh searchParams={searchParams} columnKey="createur" label="Créé par" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="nOt" label="N° OT" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Emplacement</th>
                <SortableTh searchParams={searchParams} columnKey="type" label="Type" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Lignes</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {bsms.map((b) => (
                <tr key={b.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/inventory/bsm/${b.id}`}>
                      <Nameplate>BSM-{String(b.id).padStart(4, "0")}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {b.dateBsm.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{b.heureBsm ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">{b.createur ?? "—"}</td>
                  <td className="px-4 py-3 text-ink font-mono text-xs">{b.nOt ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">
                    {b.equipements[0]?.equipement.designation ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink text-xs">{b.typeStock ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{b._count.lignes}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={b.validation ? "Validé" : "En attente"}
                      fg={b.validation ? "#3D7A4E" : "#C97A0C"}
                      bg={b.validation ? "#E7F2E9" : "#FBF0DE"}
                    />
                  </td>
                </tr>
              ))}
              {bsms.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun BSM pour le moment.
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
