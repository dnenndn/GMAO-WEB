import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

// Reproduces the legacy app's ot_tb_realisation.cs — two panels:
// "OT en retard" (started later than debut_prevu) and a completion
// cause breakdown (ot_cause_realisation, grouped by parametre_cause_
// realisation, for OTs in progress or closed — matching the real
// query's two-statut filter).

export default async function TbRealisationPage() {
  const closedOts = await prisma.ordreTravail.findMany({
    where: { deleted: false, statut: "Clôturé", debutPrevu: { not: null }, dateDebut: { not: null } },
    select: { debutPrevu: true, dateDebut: true, heureDebut: true },
  });

  const enRetard = closedOts.filter((ot) => {
    if (!ot.debutPrevu || !ot.dateDebut) return false;
    const [h, m] = (ot.heureDebut ?? "00:00").split(":").map(Number);
    const actualStart = new Date(ot.dateDebut);
    actualStart.setHours(h || 0, m || 0, 0, 0);
    return actualStart.getTime() > ot.debutPrevu.getTime();
  }).length;

  const causesRaw = await prisma.otCauseRealisation.findMany({
    where: { ordreTravail: { deleted: false, statut: { in: ["En Cours", "Clôturé"] } } },
    include: { cause: true },
  });
  const byCause = new Map<string, number>();
  for (const c of causesRaw) {
    const key = c.cause.code ?? c.cause.designation;
    byCause.set(key, (byCause.get(key) ?? 0) + 1);
  }
  const causeRows = Array.from(byCause.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...causeRows.map((r) => r.count), 1);

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT · Tableau de bord" title="Réalisation des travaux" />
      <div className="p-8 space-y-5">
        <div className="bg-surface border border-hairline rounded-lg p-6 max-w-sm">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">OT commencés en retard</div>
          <div className="text-3xl font-bold text-ink">{enRetard}</div>
          <div className="text-xs text-muted mt-1">sur {closedOts.length} OT clôturés (avec date prévue)</div>
        </div>

        <div className="bg-surface border border-hairline rounded-lg p-6 max-w-2xl">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Causes de réalisation</div>
          {causeRows.length === 0 ? (
            <div className="text-sm text-muted">Aucune cause enregistrée.</div>
          ) : (
            <div className="space-y-2.5">
              {causeRows.map((r) => (
                <div key={r.code} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-ink truncate">{r.code}</div>
                  <div className="flex-1 bg-paper rounded h-5 overflow-hidden">
                    <div
                      className="h-full bg-steel-600 rounded"
                      style={{ width: `${(r.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-xs text-ink text-right font-mono">{r.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
