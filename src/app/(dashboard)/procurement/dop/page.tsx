import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit.

export default async function DopPage({
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
      case "date": return { dateDop: dir };
      default: return { dateDop: "desc" as const };
    }
  }

  const [totalCount, dops] = await Promise.all([
    prisma.dop.count(),
    prisma.dop.findMany({
      orderBy: sortOrderFor(searchParams.sort),
      include: {
        _count: { select: { articles: true, fournisseurs: true, devis: true } },
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
        eyebrow="Achats"
        title="Demandes d'ouverture de prix (DOP)"
        action={{ href: "/procurement/dop/new", label: "+ Nouvelle DOP" }} hideBack
      />
      <div className="p-8 space-y-6">
        <p className="text-sm text-muted max-w-2xl">
          Comparez les prix de plusieurs fournisseurs pour un ensemble
          d&apos;articles avant de créer un devis formel. Cette étape est
          indépendante des demandes d&apos;achat/commandes — aucun lien de
          base de données ne les relie (comme dans l&apos;application
          d&apos;origine).
        </p>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune DOP pour le moment."
          itemLabel="DOP"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="DOP" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Articles</th>
                <th className="px-4 py-3 font-semibold">Fournisseurs consultés</th>
                <th className="px-4 py-3 font-semibold">Devis générés</th>
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {dops.map((d) => (
                <tr key={d.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/procurement/dop/${d.id}`}>
                      <Nameplate>DOP-{String(d.id).padStart(4, "0")}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{d._count.articles}</td>
                  <td className="px-4 py-3 text-muted text-xs">{d._count.fournisseurs}</td>
                  <td className="px-4 py-3 text-muted text-xs">{d._count.devis}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {d.dateDop.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
              {dops.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune DOP pour le moment.
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
