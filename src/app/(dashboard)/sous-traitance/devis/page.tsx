import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { daStatutColor } from "@/lib/constants";
import { StatusPill } from "@/components/StatusPill";

export default async function DevisPage() {
  const devis = await prisma.dsDevis.findMany({
    orderBy: { dateDevis: "desc" },
    include: {
      fournisseurs: { include: { fournisseur: true } },
      _count: { select: { lignes: true } },
    },
    take: 100,
  });

  return (
    <>
      <PageHeader
        eyebrow="Sous-traitance"
        title="Devis"
        action={{ href: "/sous-traitance/devis/new", label: "+ Nouveau devis" }}
      />
      <div className="p-8">
        <div className="flex justify-end mb-4">
          <Link
            href="/sous-traitance/devis/historique"
            className="text-xs font-semibold text-steel-600 hover:text-steel-700"
          >
            Historique →
          </Link>
        </div>
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Devis</th>
                <th className="px-4 py-3 font-semibold">Fournisseurs consultés</th>
                <th className="px-4 py-3 font-semibold">Lignes</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {devis.map((d) => {
                const s = daStatutColor(d.statut === "En cours" ? "En cours" : "Clôturée");
                return (
                  <tr key={d.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/sous-traitance/devis/${d.id}`}>
                        <Nameplate>DEV-{String(d.id).padStart(4, "0")}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {d.fournisseurs.map((f) => f.fournisseur.nom).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{d._count.lignes}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={d.statut} fg={s.fg} bg={s.bg} />
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {d.dateDevis.toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
              {devis.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted text-sm">
                    Aucun devis pour le moment.
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
