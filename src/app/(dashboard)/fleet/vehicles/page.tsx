import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";

export default async function VehiclesPage() {
  const engins = await prisma.engin.findMany({
    where: { deleted: false },
    include: { typeVehicule: true, chauffeur: true },
    orderBy: { designation: "asc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Flotte"
        title="Véhicules"
        action={{ href: "/fleet/vehicles/new", label: "+ Nouveau véhicule" }} hideBack
      />
      <div className="p-8">
        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Matricule</th>
                <th className="px-4 py-3 font-semibold">Désignation</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Chauffeur</th>
                <th className="px-4 py-3 font-semibold">Marque</th>
              </tr>
            </thead>
            <tbody>
              {engins.map((e) => (
                <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/fleet/vehicles/${e.id}`}>
                      <Nameplate>{e.matricule ?? `ENG-${e.id}`}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{e.designation}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {e.typeVehicule?.designation ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{e.chauffeur?.nom ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{e.marque ?? "—"}</td>
                </tr>
              ))}
              {engins.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun véhicule pour le moment.
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
