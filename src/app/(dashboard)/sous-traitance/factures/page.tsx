import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";

export default async function DsFacturesPage() {
  const factures = await prisma.dsFacture.findMany({
    orderBy: { dateFacture: "desc" },
    include: { fournisseur: true, livraisons: true },
    take: 100,
  });

  return (
    <>
      <PageHeader
        eyebrow="Sous-traitance"
        title="Factures"
        action={{ href: "/sous-traitance/factures/new", label: "+ Nouvelle facture" }}
      />
      <div className="p-8">
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">N° Facture</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold">TVA</th>
                <th className="px-4 py-3 font-semibold">BL rattachés</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/sous-traitance/factures/${f.id}`}>
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
                  <td colSpan={5} className="px-4 py-10 text-center text-muted text-sm">
                    Aucune facture pour le moment.
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
