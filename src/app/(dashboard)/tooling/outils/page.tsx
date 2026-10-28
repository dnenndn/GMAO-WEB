import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";

export default async function OutilsPage() {
  const outils = await prisma.outil.findMany({
    include: { secteur: true, type: true },
    orderBy: { designation: "asc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Outillage"
        title="Outils"
        action={{ href: "/tooling/outils/new", label: "+ Nouvel outil" }}
      />
      <div className="p-8 space-y-4">
        <div className="flex gap-1 border-b border-hairline">
          <span className="px-4 py-2 text-sm font-semibold rounded-t bg-steel-600 text-white">
            Liste des outillages
          </span>
          <Link
            href="/tooling/utilisation"
            className="px-4 py-2 text-sm font-semibold text-steel-600 hover:bg-paper border border-hairline border-b-0 rounded-t"
          >
            Utilisation
          </Link>
        </div>
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Désignation</th>
                <th className="px-4 py-3 font-semibold">Secteur</th>
                <th className="px-4 py-3 font-semibold">N° Série</th>
                <th className="px-4 py-3 font-semibold">N° Modèle</th>
                <th className="px-4 py-3 font-semibold">Fabriquant</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Disponibilité</th>
              </tr>
            </thead>
            <tbody>
              {outils.map((o) => (
                <tr key={o.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/tooling/outils/${o.id}`}>
                      <Nameplate>{o.codeOutils ?? `OUT-${o.id}`}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{o.designation}</td>
                  <td className="px-4 py-3 text-muted text-xs">{o.secteur?.designation ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{o.numSerie ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{o.numModele ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{o.fabriquant ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{o.type?.designation ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={o.statut ? "Disponible" : "En utilisation"}
                      fg={o.statut ? "#3D7A4E" : "#C97A0C"}
                      bg={o.statut ? "#E7F2E9" : "#FBF0DE"}
                    />
                  </td>
                </tr>
              ))}
              {outils.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted text-sm">
                    Aucun outil pour le moment.
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
