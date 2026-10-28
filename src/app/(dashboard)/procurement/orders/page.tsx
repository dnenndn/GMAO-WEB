import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { commandeStatutColor, COMMANDE_STATUTS } from "@/lib/constants";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit.

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { statut?: string; page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";
  const where = searchParams.statut ? { statut: searchParams.statut } : undefined;

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "nCommande": return { nCommande: dir };
      case "fournisseur": return { fournisseur: { nom: dir } };
      case "statut": return { statut: dir };
      case "date": return { dateCommande: dir };
      default: return { dateCommande: "desc" as const };
    }
  }

  const [totalCount, commandes] = await Promise.all([
    prisma.commande.count({ where }),
    prisma.commande.findMany({
      where,
      include: { fournisseur: true },
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.statut) params.set("statut", searchParams.statut);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Achats"
        title="Commandes"
        action={{ href: "/procurement/orders/new", label: "+ Nouvelle commande" }} hideBack
      />
      <div className="p-8">
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <FilterLink href="/procurement/orders" label="Toutes" active={!searchParams.statut} />
          {COMMANDE_STATUTS.map((s) => (
            <FilterLink
              key={s}
              href={`/procurement/orders?statut=${encodeURIComponent(s)}`}
              label={s}
              active={searchParams.statut === s}
            />
          ))}
          <Link
            href="/sous-traitance/commandes"
            className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-1.5 ml-2"
            title="Commandes de sous-traitance — un module distinct (DsCommande), pas un statut de cette même table"
          >
            Commande Sous-traitance →
          </Link>
        </div>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune commande pour ces critères."
          itemLabel="commande"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="nCommande" label="N° Commande" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="fournisseur" label="Fournisseur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="statut" label="Statut" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {commandes.map((c) => {
                const s = commandeStatutColor(c.statut);
                return (
                  <tr key={c.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/procurement/orders/${c.id}`}>
                        <Nameplate>{c.nCommande}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{c.fournisseur?.nom ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={c.statut} fg={s.fg} bg={s.bg} />
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {c.dateCommande.toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
              {commandes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune commande pour ces critères.
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

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-steel-600 text-white border-steel-600"
          : "bg-surface text-muted border-hairline hover:border-steel-400"
      }`}
    >
      {label}
    </Link>
  );
}
