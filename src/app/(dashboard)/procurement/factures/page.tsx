import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// CORRECTED — same real bug already found and fixed on
// procurement/devis: this page was a near-duplicate of
// sous-traitance/factures's page (prisma.dsFacture, links pointing at
// /sous-traitance/factures/...) sitting under this Achats-module route
// instead of using the real, separate Facture model that always
// existed in the schema. Rebuilt from that real model.
//
// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit.

export default async function ProcurementFacturesPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "nFacture": return { nFacture: dir };
      case "fournisseur": return { fournisseur: { nom: dir } };
      case "date": return { dateFacture: dir };
      default: return { dateFacture: "desc" as const };
    }
  }

  const [totalCount, factures] = await Promise.all([
    prisma.facture.count(),
    prisma.facture.findMany({
      orderBy: sortOrderFor(searchParams.sort),
      include: { fournisseur: true, livraisons: true },
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
        title="Factures"
        action={{ href: "/procurement/factures/new", label: "+ Nouvelle facture" }} hideBack
      />
      <div className="p-8 space-y-4">
        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune facture pour le moment."
          itemLabel="facture"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="nFacture" label="N° Facture" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="fournisseur" label="Fournisseur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">TVA</th>
                <th className="px-4 py-3 font-semibold">BL rattachés</th>
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/procurement/factures/${f.id}`}>
                      <Nameplate>{f.nFacture ?? `FAC-${f.id}`}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{f.fournisseur.nom}</td>
                  <td className="px-4 py-3 text-muted text-xs">{f.tva.toString()}%</td>
                  <td className="px-4 py-3 text-muted text-xs">{f.livraisons.length}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {f.dateFacture.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
              {factures.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune facture pour le moment.
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
