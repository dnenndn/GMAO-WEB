import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SousTraitanceAchatTabs } from "@/components/SousTraitanceAchatTabs";
import { Nameplate } from "@/components/Nameplate";

export default async function LivraisonsPage() {
  const livraisons = await prisma.dsBonLivraison.findMany({
    orderBy: { dateLivraison: "desc" },
    include: { fournisseur: true, commande: true, _count: { select: { lignes: true } } },
    take: 100,
  });

  return (
    <>
      <PageHeader
        eyebrow="Sous-traitance"
        title="Bons de livraison"
        action={{ href: "/sous-traitance/livraisons/new", label: "+ Nouvelle livraison" }}
      />
      <div className="p-8">
        <SousTraitanceAchatTabs active="/sous-traitance/livraisons" />
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Livraison</th>
                <th className="px-4 py-3 font-semibold">Commande liée</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold">Lignes</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {livraisons.map((l) => (
                <tr key={l.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/sous-traitance/livraisons/${l.id}`}>
                      <Nameplate>BL-{String(l.id).padStart(4, "0")}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs font-mono">
                    {l.commande?.nCommande ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink">{l.fournisseur?.nom ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{l._count.lignes}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {l.dateLivraison.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
              {livraisons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted text-sm">
                    Aucune livraison pour le moment.
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
