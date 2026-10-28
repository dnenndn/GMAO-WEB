import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 200` with no
// pagination silently hides everything past the limit.

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "code": return { codeFournisseur: dir };
      case "nom": return { nom: dir };
      case "activite": return { activite: dir };
      case "ville": return { ville: dir };
      case "delai": return { delai: dir };
      default: return { nom: "asc" as const };
    }
  }

  const [totalCount, fournisseurs] = await Promise.all([
    prisma.fournisseur.count({ where: { deleted: false } }),
    prisma.fournisseur.findMany({
      where: { deleted: false },
      orderBy: sortOrderFor(searchParams.sort),
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
        title="Fournisseurs"
        action={{ href: "/procurement/suppliers/new", label: "+ Nouveau fournisseur" }} hideBack
      />
      <div className="p-8 space-y-4">
        <div className="flex justify-end">
          <Link
            href="/procurement/settings/fournisseur-reference"
            className="text-xs font-semibold text-steel-600 hover:text-steel-700"
          >
            Paramètres profil fournisseur →
          </Link>
        </div>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun fournisseur pour le moment."
          itemLabel="fournisseur"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="code" label="Code" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="nom" label="Nom" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="activite" label="Activité" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="ville" label="Ville" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="delai" label="Délai" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {fournisseurs.map((f) => (
                <tr key={f.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/procurement/suppliers/${f.id}`}>
                      <Nameplate>{f.codeFournisseur ?? `FRS-${f.id}`}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{f.nom}</td>
                  <td className="px-4 py-3 text-muted text-xs">{f.activite ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{f.ville ?? "—"}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {f.delai != null ? `${f.delai} j` : "—"}
                  </td>
                </tr>
              ))}
              {fournisseurs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun fournisseur pour le moment.
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
