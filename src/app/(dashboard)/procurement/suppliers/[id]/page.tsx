import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { SupplierTabs } from "@/components/SupplierTabs";
import { commandeStatutColor } from "@/lib/constants";
import { notFound } from "next/navigation";

export default async function SupplierDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const fournisseur = await prisma.fournisseur.findUnique({
    where: { id },
    include: { commandes: { orderBy: { dateCommande: "desc" }, take: 20 } },
  });

  if (!fournisseur) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Fournisseur"
        title={`${fournisseur.codeFournisseur ?? `FRS-${fournisseur.id}`} — ${fournisseur.nom}`}
      />
      <SupplierTabs id={id} active="" />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Activité" value={fournisseur.activite ?? "—"} />
          <Row label="Email" value={fournisseur.email ?? "—"} />
          <Row label="Téléphone" value={fournisseur.telephone1 ?? "—"} />
          <Row label="Délai" value={fournisseur.delai != null ? `${fournisseur.delai} jours` : "—"} />
          <Row
            label="TVA / remise par défaut"
            value={`${fournisseur.tvaDefaut?.toString() ?? "—"}% / ${
              fournisseur.remiseDefaut?.toString() ?? "—"
            }%`}
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Commandes récentes
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">N° Commande</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {fournisseur.commandes.map((c) => {
                  const s = commandeStatutColor(c.statut);
                  return (
                    <tr key={c.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5">
                        <a href={`/procurement/orders/${c.id}`}>
                          <Nameplate>{c.nCommande}</Nameplate>
                        </a>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill label={c.statut} fg={s.fg} bg={s.bg} />
                      </td>
                      <td className="px-4 py-2.5 text-muted font-mono text-xs">
                        {c.dateCommande.toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })}
                {fournisseur.commandes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune commande pour ce fournisseur.
                    </td>
                  </tr>
                )}
              </tbody>
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
