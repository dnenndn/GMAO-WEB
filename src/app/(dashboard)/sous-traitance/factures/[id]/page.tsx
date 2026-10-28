import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { notFound } from "next/navigation";

export default async function DsFactureDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const facture = await prisma.dsFacture.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      livraisons: {
        include: {
          livraison: {
            include: { lignes: { include: { commandeArticle: { include: { activite: true } } } } },
          },
        },
      },
    },
  });

  if (!facture) notFound();

  const total = facture.livraisons.reduce((acc, fl) => {
    const lignesTotal = fl.livraison.lignes.reduce(
      (a, l) => a + Number(l.qt) * Number(l.prixHt ?? 0) * (1 - Number(l.remise ?? 0) / 100),
      0
    );
    return acc + lignesTotal;
  }, 0);

  return (
    <>
      <PageHeader
        eyebrow="Facture"
        title={facture.nFacture ?? `FAC-${facture.id}`}
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Fournisseur" value={facture.fournisseur.nom} />
          <Row label="Date" value={facture.dateFacture.toLocaleDateString("fr-FR")} />
          <Row label="TVA" value={`${facture.tva.toString()}%`} />
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Bons de livraison rattachés
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {facture.livraisons.map((fl) => (
              <a key={fl.id} href={`/sous-traitance/livraisons/${fl.livraison.id}`}>
                <Nameplate>BL-{String(fl.livraison.id).padStart(4, "0")}</Nameplate>
              </a>
            ))}
            {facture.livraisons.length === 0 && (
              <span className="text-sm text-muted">Aucun bon de livraison rattaché.</span>
            )}
          </div>

          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Prestation</th>
                  <th className="px-4 py-3 font-semibold w-24 text-right">Qté</th>
                  <th className="px-4 py-3 font-semibold w-24 text-right">Prix HT</th>
                </tr>
              </thead>
              <tbody>
                {facture.livraisons.flatMap((fl) =>
                  fl.livraison.lignes.map((l) => (
                    <tr key={l.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-ink">
                        {l.commandeArticle.activite?.designation ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                        {l.qt.toString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                        {l.prixHt?.toFixed(3) ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {total > 0 && (
                <tfoot>
                  <tr className="bg-paper/60">
                    <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                      Total net
                    </td>
                    <td colSpan={2} className="px-4 py-2.5 text-right font-mono text-sm text-ink">
                      {total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DT
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 px-4 py-3">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="col-span-2 text-sm text-ink">{value}</div>
    </div>
  );
}
