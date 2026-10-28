import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";

export default async function GammesPage() {
  const gammes = await prisma.gammeOperatoire.findMany({
    where: { deleted: false },
    include: {
      _count: {
        select: { ressourcesFonction: true, ressourcesOutillage: true, ressourcesPdr: true },
      },
    },
    orderBy: { designation: "asc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Maintenance"
        title="Gammes opératoires"
        action={{ href: "/work-orders/gammes/new", label: "+ Nouvelle gamme" }}
      />
      <div className="p-8">
        <p className="text-sm text-muted mb-4 max-w-2xl">
          Une gamme définit les ressources nécessaires (fonction, outillage,
          pièces de rechange) pour un type d&apos;intervention — utilisée
          comme modèle de planification.
        </p>
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Désignation</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Ressources planifiées</th>
              </tr>
            </thead>
            <tbody>
              {gammes.map((g) => (
                <tr key={g.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/work-orders/gammes/${g.id}`}>
                      <Nameplate>{g.code ?? `GAM-${g.id}`}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{g.designation}</td>
                  <td className="px-4 py-3 text-muted text-xs">{g.type ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {g._count.ressourcesFonction} fonction(s) · {g._count.ressourcesOutillage} outil(s) ·{" "}
                    {g._count.ressourcesPdr} pièce(s)
                  </td>
                </tr>
              ))}
              {gammes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted text-sm">
                    Aucune gamme pour le moment.
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
