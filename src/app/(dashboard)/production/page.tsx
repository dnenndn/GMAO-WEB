import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { posteColor } from "@/lib/constants";

export default async function ProductionPage() {
  const rapports = await prisma.prodRapportGeneral.findMany({
    orderBy: [{ dateRapport: "desc" }, { poste: "asc" }],
    take: 100,
    include: {
      _count: {
        select: { fabProduits: true, fourSortie: true, embProduits: true },
      },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Production"
        title="Rapports de production"
        action={{ href: "/production/new", label: "+ Nouveau rapport" }} hideBack
      />
      <div className="px-8 pt-4">
        <Link
          href="/production/recap"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
        >
          ← Récapitulatif &amp; KPI
        </Link>
      </div>
      <div className="p-8">
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Rapport</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Poste</th>
                <th className="px-4 py-3 font-semibold">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {rapports.map((r) => {
                const p = posteColor(r.poste);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-hairline last:border-0 hover:bg-paper/60"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/production/${r.id}`}>
                        <Nameplate>RP-{String(r.id).padStart(4, "0")}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink font-mono text-xs">
                      {r.dateRapport.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill label={r.poste} fg={p.fg} bg={p.bg} />
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {r.createdAt.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
              {rapports.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun rapport de production pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
