import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

// Reproduces the legacy app's ot_tb_general.cs — closed OTs split into
// corrective (type NOT LIKE '%Prév%') vs préventive, each with a count
// and average repair duration.

function avgDurationHours(
  ots: { dateDebut: Date | null; heureDebut: string | null; dateFin: Date | null; heureFin: string | null }[]
) {
  const durations: number[] = [];
  for (const ot of ots) {
    if (!ot.dateDebut || !ot.heureDebut || !ot.dateFin || !ot.heureFin) continue;
    const [h1, m1] = ot.heureDebut.split(":").map(Number);
    const [h2, m2] = ot.heureFin.split(":").map(Number);
    const start = new Date(ot.dateDebut);
    start.setHours(h1 || 0, m1 || 0, 0, 0);
    const end = new Date(ot.dateFin);
    end.setHours(h2 || 0, m2 || 0, 0, 0);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) durations.push(hours);
  }
  return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
}

export default async function TbGeneralPage() {
  const [correctives, preventives] = await Promise.all([
    prisma.ordreTravail.findMany({
      where: { deleted: false, statut: "Clôturé", type: { not: { contains: "Préventive" } } },
      select: { dateDebut: true, heureDebut: true, dateFin: true, heureFin: true },
    }),
    prisma.ordreTravail.findMany({
      where: { deleted: false, statut: "Clôturé", type: { contains: "Préventive" } },
      select: { dateDebut: true, heureDebut: true, dateFin: true, heureFin: true },
    }),
  ]);

  const cards = [
    { label: "Corrective", count: correctives.length, avg: avgDurationHours(correctives) },
    { label: "Préventive", count: preventives.length, avg: avgDurationHours(preventives) },
  ];

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT · Tableau de bord" title="Général" />
      <div className="p-8 space-y-5">
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          {cards.map((c) => (
            <div key={c.label} className="bg-surface border border-hairline rounded-lg p-6">
              <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{c.label}</div>
              <div className="flex items-end gap-6">
                <div>
                  <div className="text-3xl font-bold text-ink">{c.count}</div>
                  <div className="text-xs text-muted mt-1">OT clôturés</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-ink">{c.avg != null ? c.avg.toFixed(1) : "—"}</div>
                  <div className="text-xs text-muted mt-1">Durée moy. (h)</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
