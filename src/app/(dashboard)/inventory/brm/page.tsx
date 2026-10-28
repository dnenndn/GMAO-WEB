import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit.

export default async function BrmPage({
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
      case "date": return { dateRetour: dir };
      case "retourPar": return { retourPar: dir };
      case "stock": return { typeStock: dir };
      case "typeRetour": return { typeRetour: dir };
      default: return { dateRetour: "desc" as const };
    }
  }

  const [totalCount, brms] = await Promise.all([
    prisma.brm.count(),
    prisma.brm.findMany({
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
        eyebrow="Gestion de stock"
        title="Historique Bon de retour"
        action={{ href: "/inventory/brm/new", label: "+ Nouveau BRM" }} hideBack
      />
      <div className="p-8 space-y-4">
        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun BRM pour le moment."
          itemLabel="BRM"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="BRM" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date de retour" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Heure</th>
                <SortableTh searchParams={searchParams} columnKey="retourPar" label="Retour par" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">N° BSM</th>
                <SortableTh searchParams={searchParams} columnKey="stock" label="Stock" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="typeRetour" label="Type retour" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Lignes</th>
              </tr>
            </thead>
            <tbody>
              {brms.map((b) => (
                <tr key={b.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/inventory/brm/${b.id}`}>
                      <Nameplate>BRM-{String(b.id).padStart(4, "0")}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {b.dateRetour.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{b.heureRetour ?? "—"}</td>
                  <td className="px-4 py-3 text-ink">{b.retourPar ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs font-mono">
                    {b.idBsm ? `BSM-${String(b.idBsm).padStart(4, "0")}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink text-xs">{b.typeStock ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">{b.typeRetour ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{b._count.lignes}</td>
                </tr>
              ))}
              {brms.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun BRM pour le moment.
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
