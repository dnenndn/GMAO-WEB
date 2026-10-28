import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import Link from "next/link";

// Reproduces the legacy app's "Demande Sous Traitance" list (the
// "Intervention" sidebar item under Sous Traitance).
//
// RESOLVED — this page originally showed one flat, unfiltered list,
// since statut was flagged as genuinely unconfirmed. Since then, found
// and confirmed via the decompiled C# source's own dedicated
// status-transition screens (dist_encours.cs / dist_cloture.cs /
// dist_annule.cs — the same pattern as DA's da_confirmer/da_refuser/
// da_reporter files): 0 = "En cours", 1 = "Clôturé", 5 = "Annulé" (the
// same 5=cancelled convention already confirmed for both
// DemandeIntervention.statut and DemandeAchat.statut). The reference
// screenshot's 3 identical-looking tabs are exactly these 3 states. See
// prisma/schema.prisma's DemandeSousTraitance.statut comment for the
// full evidence trail — no data correction was needed here (unlike DA),
// since the real column is genuinely an int and nothing was miscoded.
//
// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 200` with no
// pagination silently hides everything past the limit.

const STATUT_LABELS: Record<number, string> = {
  0: "En cours",
  1: "Clôturé",
  5: "Annulé",
};

const TABS = [
  { key: "0", label: "En cours" },
  { key: "1", label: "Clôturé" },
  { key: "5", label: "Annulé" },
] as const;

export default async function SousTraitanceDemandesPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; sort?: string; dir?: string };
}) {
  const tab = TABS.some((t) => t.key === searchParams.tab) ? Number(searchParams.tab) : 0;
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "id": return { id: dir };
      case "date": return { dateCreation: dir };
      case "createur": return { createur: dir };
      default: return { dateCreation: "desc" as const };
    }
  }

  const [totalCount, demandes] = await Promise.all([
    prisma.demandeSousTraitance.count({ where: { statut: tab } }),
    prisma.demandeSousTraitance.findMany({
      where: { statut: tab },
      orderBy: sortOrderFor(searchParams.sort),
      include: {
        _count: { select: { devis: true, commandes: true, magasinItems: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    params.set("tab", String(tab));
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader eyebrow="Sous Traitance" title="Demande Sous Traitance" hideBack />
      <div className="p-8 space-y-4">
        <div className="flex gap-1 border-b border-hairline">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/sous-traitance/demandes?tab=${t.key}`}
              className={`px-4 py-2 text-sm font-semibold rounded-t ${
                tab === Number(t.key)
                  ? "bg-steel-600 text-white"
                  : "text-steel-600 hover:bg-paper border border-hairline border-b-0"
              }`}
            >
              Demande Sous Traitance — {t.label}
            </Link>
          ))}
        </div>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune demande de sous-traitance pour cet onglet."
          itemLabel="demande"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="ID" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Heure</th>
                <SortableTh searchParams={searchParams} columnKey="createur" label="Créateur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Devis</th>
                <th className="px-4 py-3 font-semibold">Commandes</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 text-ink">
                    <Nameplate>DS-{String(d.id).padStart(4, "0")}</Nameplate>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {d.dateCreation.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{d.heureCreation ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">{d.createur ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={d.statut != null ? (STATUT_LABELS[d.statut] ?? `#${d.statut}`) : "—"}
                      fg={d.statut === 5 ? "#B3261E" : d.statut === 1 ? "#3D7A4E" : "#C97A0C"}
                      bg={d.statut === 5 ? "#FBE9E7" : d.statut === 1 ? "#E7F2E9" : "#FBF0DE"}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{d._count.devis}</td>
                  <td className="px-4 py-3 text-muted text-xs">{d._count.commandes}</td>
                </tr>
              ))}
              {demandes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune demande de sous-traitance pour cet onglet.
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
