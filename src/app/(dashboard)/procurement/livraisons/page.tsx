import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { statutColor } from "@/lib/constants";

// "Bon de Livraison" — real Achat sidebar item (button15 in
// Form1.Designer.cs, opens the `livraison` form). A BonLivraison is always
// created from within a Reception (see createBonLivraison(receptionId,...)
// in inventory/actions.ts) — there's no standalone "new BL" flow in the
// legacy app either, a delivery note is always tied to the receipt it
// belongs to. This page is the list view the real menu item opens; "new"
// still happens from inside a reception.
export default async function LivraisonsPage() {
  const livraisons = await prisma.bonLivraison.findMany({
    orderBy: { dateLivraison: "desc" },
    include: {
      reception: { select: { id: true, receptionPar: true } },
      _count: { select: { lignes: true } },
    },
    take: 100,
  });

  return (
    <>
      <PageHeader eyebrow="Achats" title="Bon de Livraison" />
      <div className="p-8">
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Bon de livraison</th>
                <th className="px-4 py-3 font-semibold">Réf. fournisseur</th>
                <th className="px-4 py-3 font-semibold">Réception liée</th>
                <th className="px-4 py-3 font-semibold">Lignes</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {livraisons.map((bl) => {
                const s = statutColor(bl.statut);
                return (
                  <tr key={bl.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/inventory/livraisons/${bl.id}`}>
                        <Nameplate>BL-{String(bl.id).padStart(4, "0")}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{bl.blFournisseur ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/receptions/${bl.reception.id}`}
                        className="text-steel-600 hover:text-steel-700 font-mono text-xs"
                      >
                        REC-{String(bl.reception.id).padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{bl._count.lignes}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={bl.statut} fg={s.fg} bg={s.bg} />
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {bl.dateLivraison.toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
              {livraisons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted text-sm">
                    Aucun bon de livraison pour le moment.
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
