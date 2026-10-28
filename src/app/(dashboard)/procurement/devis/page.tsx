import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { daStatutColor } from "@/lib/constants";

// CORRECTED — this page was a near-duplicate of sous-traitance/devis's
// own page (same layout, but its header/links/tabs all pointed at
// /sous-traitance/devis/... instead of this real Achats-module route),
// apparently copy-pasted at some point rather than genuinely built.
// The real, separate procurement Devis model always existed in the
// schema (distinct from DsDevis, the sous-traitance one) — this page
// just wasn't using it. Rebuilt from that real model, with its own
// real links.
//
// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit.

export default async function ProcurementDevisPage({
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
      case "createur": return { createur: dir };
      case "statut": return { statut: dir };
      case "date": return { dateDevis: dir };
      default: return { dateDevis: "desc" as const };
    }
  }

  const [totalCount, devis] = await Promise.all([
    prisma.devis.count(),
    prisma.devis.findMany({
      orderBy: sortOrderFor(searchParams.sort),
      include: {
        fournisseurs: { include: { fournisseur: true } },
        _count: { select: { lignes: true } },
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
        title="Devis"
        action={{ href: "/procurement/devis/new", label: "+ Nouveau devis" }} hideBack
      />
      <div className="p-8 space-y-4">
        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun devis pour le moment."
          itemLabel="devis"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="Devis" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Fournisseurs consultés</th>
                <th className="px-4 py-3 font-semibold">Lignes</th>
                <SortableTh searchParams={searchParams} columnKey="createur" label="Créateur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="statut" label="Statut" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {devis.map((d) => {
                const s = daStatutColor(d.statut === "En cours" ? "En cours" : "Clôturée");
                return (
                  <tr key={d.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/procurement/devis/${d.id}`}>
                        <Nameplate>DEV-{String(d.id).padStart(4, "0")}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {d.fournisseurs.map((f) => f.fournisseur.nom).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{d._count.lignes}</td>
                    <td className="px-4 py-3 text-ink text-xs">{d.createur ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={d.statut} fg={s.fg} bg={s.bg} />
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {d.dateDevis.toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
              {devis.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun devis pour le moment.
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
