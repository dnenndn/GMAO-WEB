import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Reproduces the legacy app's "Utilisation" tab on the Outillage screen
// — tool checkout/allocation history, a real gap found while checking
// this module against the reference: only the settings/lookup page for
// "types d'utilisation" existed, not this actual tracking list.
//
// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 200` with no
// pagination silently hides everything past the limit.

export default async function ToolingUtilisationPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "outil": return { outilRef: { designation: dir } };
      case "utilisateur": return { intervenant: { nom: dir } };
      case "nOt": return { nOt: dir };
      case "debut": return { dateDebut: dir };
      case "fin": return { dateFin: dir };
      default: return { dateDebut: "desc" as const };
    }
  }

  const [totalCount, affectations] = await Promise.all([
    prisma.tabLancementAffectation.count(),
    prisma.tabLancementAffectation.findMany({
      orderBy: sortOrderFor(searchParams.sort),
      include: { intervenant: true, outilRef: true },
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
      <PageHeader eyebrow="Outillage" title="Utilisation" />
      <div className="p-8 space-y-4">
        <div className="flex gap-1 border-b border-hairline">
          <Link
            href="/tooling/outils"
            className="px-4 py-2 text-sm font-semibold text-steel-600 hover:bg-paper border border-hairline border-b-0 rounded-t"
          >
            Liste des outillages
          </Link>
          <span className="px-4 py-2 text-sm font-semibold rounded-t bg-steel-600 text-white">
            Utilisation
          </span>
        </div>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune utilisation d'outil pour le moment."
          itemLabel="utilisation"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="outil" label="Outil" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="utilisateur" label="Utilisateur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="nOt" label="N° OT" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="debut" label="Date début" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="fin" label="Date fin" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {affectations.map((a) => (
                <tr key={a.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 text-ink">
                    {a.outilRef?.codeOutils ?? a.outilRef?.designation ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink text-xs">{a.intervenant?.nom ?? "—"}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{a.nOt ?? "—"}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {a.dateDebut ? a.dateDebut.toLocaleDateString("fr-FR") : "—"}
                    {a.heureDebut ? ` ${a.heureDebut}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {a.dateFin ? a.dateFin.toLocaleDateString("fr-FR") : "—"}
                    {a.heureFin ? ` ${a.heureFin}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={a.encours ? "En cours" : "Terminé"}
                      fg={a.encours ? "#C97A0C" : "#3D7A4E"}
                      bg={a.encours ? "#FBF0DE" : "#E7F2E9"}
                    />
                  </td>
                  <td className="px-4 py-3 text-ink text-xs">{a.commentaire ?? "—"}</td>
                </tr>
              ))}
              {affectations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune utilisation d'outil pour le moment.
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
