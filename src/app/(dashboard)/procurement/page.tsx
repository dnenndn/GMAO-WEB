import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { CreerDemandeTab } from "@/components/CreerDemandeTab";

// Reproduces the legacy app's DA screen tabs.
//
// CORRECTED — this page originally filtered by each DA's most recent
// DaAction, based on an assumption that DemandeAchat.statut only had 2
// real values. That was wrong, found by re-checking the decompiled C#
// source directly: demande_achat.statut is a real INTEGER field with 5
// distinct codes, confirmed from the source's own hardcoded SQL
// parameters — 0=En cours (liste_da.cs), 1=Confirmée (da_confirmer.cs),
// 2=Refusée (da_refuser.cs), 4=Reportée (da_reporter.cs), 10=Clôturée
// (da_cloturer.cs's own UPDATE statement) — the same 0/1/2/4/10-style
// convention already confirmed for Commande.statut elsewhere in this
// app. The tabs below now filter directly on the real statut string,
// matching the C# source's actual logic, instead of guessing through
// DaAction. See prisma/schema.prisma's DemandeAchat.statut comment and
// migration/fixups/da-statut-recovery.ts for the full account — the
// already-migrated data had this distinction collapsed away and needed
// an actual data-recovery pass, not just a UI fix.
//
// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 300` with no
// pagination silently hides everything past the limit.
//
// "Créer une demande" restored as a real tab, matching the reference
// screen exactly — this app previously only offered a separate
// "+ Nouvelle demande" button leading to a 2-step flow (empty header
// first, then add articles on the next page). The reference builds
// the whole DA — délai plus several article lines — on one screen
// before anything is submitted; see CreerDemandeTab.tsx for that.

const STATUS_TABS = [
  { key: "En cours", label: "DA en cours" },
  { key: "Confirmée", label: "DA Confirmée" },
  { key: "Refusée", label: "DA Refusée" },
  { key: "Reportée", label: "DA Reportée" },
  { key: "Admin", label: "DA Admin" },
  { key: "Clôturée", label: "Historique DA" },
] as const;

const ALL_TABS = [{ key: "creer", label: "Créer une demande" }, ...STATUS_TABS] as const;

export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string; sort?: string; dir?: string };
}) {
  const tab = ALL_TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab! : "creer";

  if (tab === "creer") {
    const articles = await prisma.article.findMany({
      where: { deleted: false },
      select: { id: true, codeArticle: true, designation: true },
      orderBy: { designation: "asc" },
    });

    return (
      <>
        <PageHeader eyebrow="Achats" title="Demandes d'achat" hideBack />
        <div className="p-8 space-y-4">
          <TabBar activeTab={tab} />
          <CreerDemandeTab articles={articles} />
        </div>
      </>
    );
  }

  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "id": return { id: dir };
      case "date": return { dateDa: dir };
      case "createur": return { createur: dir };
      case "demandeur": return { demandeur: dir };
      default: return { dateDa: "desc" as const };
    }
  }

  const [totalCount, das] = await Promise.all([
    prisma.demandeAchat.count({ where: { statut: tab } }),
    prisma.demandeAchat.findMany({
      where: { statut: tab },
      orderBy: sortOrderFor(searchParams.sort),
      include: { _count: { select: { lignes: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader eyebrow="Achats" title="Demandes d'achat" hideBack />
      <div className="p-8 space-y-4">
        <TabBar activeTab={tab} />

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune demande d'achat pour cet onglet."
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
                <SortableTh searchParams={searchParams} columnKey="demandeur" label="Demandeur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold">Delai Souhaité</th>
                <th className="px-4 py-3 font-semibold">Lignes</th>
              </tr>
            </thead>
            <tbody>
              {das.map((da) => (
                <tr key={da.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/procurement/requests/${da.id}`}>
                      <Nameplate>DA-{String(da.id).padStart(4, "0")}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {da.dateDa.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{da.heureDa ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">{da.createur ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">{da.demandeur ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">
                    {da.delai != null ? `${da.delai} ${da.periode ?? "Jour"}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{da._count.lignes}</td>
                </tr>
              ))}
              {das.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune demande d'achat pour cet onglet.
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

function TabBar({ activeTab }: { activeTab: string }) {
  return (
    <div className="flex gap-1 border-b border-hairline flex-wrap">
      {ALL_TABS.map((t) => (
        <Link
          key={t.key}
          href={`/procurement/requests?tab=${encodeURIComponent(t.key)}`}
          className={`px-4 py-2 text-sm font-semibold rounded-t ${
            activeTab === t.key
              ? "bg-steel-600 text-white"
              : "text-steel-600 hover:bg-paper border border-hairline border-b-0"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
