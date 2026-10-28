import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";

const HORIZON_DAYS = 30;

export default async function FleetHubPage() {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + HORIZON_DAYS);

  const [vehicleCount, assurances, vignettes, visites] = await Promise.all([
    prisma.engin.count({ where: { deleted: false } }),
    prisma.enginAssurance.findMany({
      where: { deleted: false, dateExp: { lte: horizon } },
      include: { engin: true },
      orderBy: { dateExp: "asc" },
    }),
    prisma.enginVignette.findMany({
      where: { deleted: false, dateExp: { lte: horizon } },
      include: { engin: true },
      orderBy: { dateExp: "asc" },
    }),
    prisma.enginVisiteTechnique.findMany({
      where: { deleted: false, dateExp: { lte: horizon } },
      include: { engin: true },
      orderBy: { dateExp: "asc" },
    }),
  ]);

  // Same union-of-sources pattern as the Inventory movements ledger —
  // computed on demand rather than relying on a stored notification table.
  const expiring = [
    ...assurances.map((a) => ({
      type: "Assurance",
      engin: a.engin,
      dateExp: a.dateExp,
    })),
    ...vignettes.map((v) => ({
      type: "Vignette",
      engin: v.engin,
      dateExp: v.dateExp,
    })),
    ...visites.map((v) => ({
      type: "Visite technique",
      engin: v.engin,
      dateExp: v.dateExp,
    })),
  ].sort((a, b) => a.dateExp.getTime() - b.dateExp.getTime());

  const links = [
    { href: "/fleet/vehicles", label: "Véhicules" },
    { href: "/fleet/fuel", label: "Carburant" },
    { href: "/fleet/bons-carburant", label: "Bons de carburant" },
    { href: "/fleet/voyages", label: "Voyages" },
    { href: "/fleet/reclamations", label: "Réclamations" },
    { href: "/fleet/settings", label: "Paramètres" },
  ];

  return (
    <>
      <PageHeader eyebrow="Parc engin" title="Flotte" hideBack />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/fleet/vehicles"
            className="bg-surface border border-hairline rounded p-5 hover:border-steel-400 transition-colors"
          >
            <div className="text-3xl font-semibold font-mono text-ink">{vehicleCount}</div>
            <div className="text-sm text-muted mt-1">Véhicules</div>
          </Link>
          <div className="bg-surface border border-hairline rounded p-5">
            <div className="text-3xl font-semibold font-mono text-ink">{expiring.length}</div>
            <div className="text-sm text-muted mt-1">
              Documents expirant sous {HORIZON_DAYS} jours
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Échéances à venir
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Véhicule</th>
                  <th className="px-4 py-3 font-semibold">Document</th>
                  <th className="px-4 py-3 font-semibold">Expire le</th>
                </tr>
              </thead>
              <tbody>
                {expiring.map((e, i) => {
                  const isPast = e.dateExp < now;
                  return (
                    <tr key={i} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/fleet/vehicles/${e.engin.id}`}>
                          <Nameplate>{e.engin.matricule ?? e.engin.designation}</Nameplate>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink">{e.type}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill
                          label={e.dateExp.toLocaleDateString("fr-FR")}
                          fg={isPast ? "#B3261E" : "#C97A0C"}
                          bg={isPast ? "#FBE9E7" : "#FBF0DE"}
                        />
                      </td>
                    </tr>
                  );
                })}
                {expiring.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune échéance dans les {HORIZON_DAYS} prochains jours.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-steel-600 hover:text-steel-700"
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
