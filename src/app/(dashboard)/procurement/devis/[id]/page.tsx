import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { notFound } from "next/navigation";

export default async function DevisDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const devis = await prisma.devis.findUnique({
    where: { id },
    include: {
      fournisseurs: { include: { fournisseur: true } },
      lignes: { include: { article: true } },
      fichiers: true,
    },
  });

  if (!devis) notFound();

  const total = devis.lignes.reduce(
    (acc, l) => acc + Number(l.qtDisponible) * Number(l.prixHt) * (1 - Number(l.remise) / 100),
    0
  );

  return (
    <>
      <PageHeader eyebrow="Devis" title={`DEV-${String(devis.id).padStart(4, "0")}`} />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap">
          <a href={`/procurement/dop/${devis.idDop}`}>
            <Nameplate>DOP-{String(devis.idDop).padStart(4, "0")}</Nameplate>
          </a>
          <span className="text-sm text-ink">
            {devis.fournisseurs.map((f) => f.fournisseur.nom).join(", ")}
          </span>
          <span className="text-xs text-muted font-mono">
            {devis.dateDevis.toLocaleDateString("fr-FR")}
          </span>
        </div>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Qté dispo.</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Prix HT</th>
                <th className="px-4 py-3 font-semibold w-20 text-right">Remise</th>
              </tr>
            </thead>
            <tbody>
              {devis.lignes.map((l) => (
                <tr key={l.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{l.article.designation}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.qtDisponible.toString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.prixHt.toFixed(3)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.remise.toString()}%
                  </td>
                </tr>
              ))}
              {devis.lignes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune ligne.
                  </td>
                </tr>
              )}
            </tbody>
            {devis.lignes.length > 0 && (
              <tfoot>
                <tr className="bg-paper/60">
                  <td className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                    Total net
                  </td>
                  <td colSpan={3} className="px-4 py-2.5 text-right font-mono text-sm text-ink">
                    {total.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DT
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="text-sm text-muted">
          Pour créer une commande à partir de ce devis, utilisez les prix
          ci-dessus lors de la création d&apos;une commande fournisseur —
          rappel : aucun lien de base de données ne relie automatiquement
          devis et commande dans l&apos;application d&apos;origine.
        </p>

        {devis.fichiers.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Fichiers joints
            </div>
            <div className="space-y-1">
              {devis.fichiers.map((f) => (
                <a
                  key={f.id}
                  href={f.adresse}
                  className="block text-sm text-steel-600 hover:underline"
                >
                  {f.adresse}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
