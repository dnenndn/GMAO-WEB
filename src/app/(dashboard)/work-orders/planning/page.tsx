import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OtTabBar } from "@/components/OtTabBar";
import { SortableTh } from "@/components/SortableTh";
import { sortRows } from "@/lib/sortRows";

// Reproduces the legacy app's ot_planning.cs ("Les Tâches") — for a
// chosen date range, the distinct equipment with an upcoming
// prev_annuel.date_echeance in range, then per-equipment the specific
// scheduled tasks (échéance date, gamme désignation, type de période).
//
// prev_annuel.idRep -> prev_systematique.id is a relation this file's
// own real SQL confirms — the schema's PrevAnnuel model comment had
// flagged it as unconfirmed pending exactly this kind of evidence.

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function PlanningTachesPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; sort?: string; dir?: string };
}) {
  const now = new Date();
  const defaultTo = new Date(now);
  defaultTo.setMonth(defaultTo.getMonth() + 1);
  const from = searchParams.from ? new Date(searchParams.from) : now;
  const to = searchParams.to ? new Date(searchParams.to) : defaultTo;

  const echeances = await prisma.prevAnnuel.findMany({
    where: { dateEcheance: { gte: from, lte: to } },
    orderBy: { dateEcheance: "asc" },
    take: 1000,
  });

  const systIds = [...new Set(echeances.map((e) => e.idRep))];
  const systematiques = await prisma.prevSystematique.findMany({
    where: { id: { in: systIds } },
  });
  const systById = new Map(systematiques.map((s) => [s.id, s]));

  const equipIds = [...new Set(systematiques.map((s) => s.equipement).filter((id): id is number => id != null))];
  const gammeIds = [...new Set(systematiques.map((s) => s.idGamme).filter((id): id is number => id != null))];
  const [equipements, gammes] = await Promise.all([
    prisma.equipement.findMany({ where: { id: { in: equipIds } } }),
    prisma.gammeOperatoire.findMany({ where: { id: { in: gammeIds } } }),
  ]);
  const equipById = new Map(equipements.map((e) => [e.id, e]));
  const gammeById = new Map(gammes.map((g) => [g.id, g]));

  const byEquip = new Map<number, { equipement: (typeof equipements)[number]; tasks: { date: Date; gamme: string; periode: string | null }[] }>();

  for (const ech of echeances) {
    const syst = systById.get(ech.idRep);
    if (!syst?.equipement) continue;
    const equip = equipById.get(syst.equipement);
    if (!equip) continue;
    if (!byEquip.has(equip.id)) byEquip.set(equip.id, { equipement: equip, tasks: [] });
    byEquip.get(equip.id)!.tasks.push({
      date: ech.dateEcheance,
      gamme: syst.idGamme ? (gammeById.get(syst.idGamme)?.designation ?? "—") : "—",
      periode: ech.typePeriode,
    });
  }

  const rows = Array.from(byEquip.values()).sort((a, b) => a.equipement.designation.localeCompare(b.equipement.designation));

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT · Planning" title="Les Tâches" />
      <OtTabBar active="/work-orders/planning" />
      <div className="p-8 space-y-5">
        <form method="get" className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Du</label>
            <input type="date" name="from" defaultValue={fmt(from)} className="border border-hairline rounded px-3 py-2 text-sm bg-surface" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Au</label>
            <input type="date" name="to" defaultValue={fmt(to)} className="border border-hairline rounded px-3 py-2 text-sm bg-surface" />
          </div>
          <button type="submit" className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors">
            Filtrer
          </button>
        </form>

        {rows.length === 0 ? (
          <div className="bg-surface border border-hairline rounded px-4 py-8 text-center text-muted text-sm">
            Aucune tâche planifiée pour cette période.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.equipement.id} className="bg-surface border border-hairline rounded overflow-hidden">
                <div className="px-4 py-2.5 bg-paper border-b border-hairline text-sm font-semibold text-ink">
                  {r.equipement.code ? `${r.equipement.code} — ` : ""}{r.equipement.designation}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                      <SortableTh searchParams={searchParams} columnKey="date" label="Échéance" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                      <SortableTh searchParams={searchParams} columnKey="gamme" label="Gamme" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                      <SortableTh searchParams={searchParams} columnKey="periode" label="Période" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortRows(
                      [...r.tasks].sort((a, b) => a.date.getTime() - b.date.getTime()),
                      searchParams.sort,
                      searchParams.dir === "desc" ? "desc" : "asc",
                      { date: (t) => t.date, gamme: (t) => t.gamme, periode: (t) => t.periode }
                    ).map((t, i) => (
                        <tr key={i} className="border-b border-hairline last:border-0">
                          <td className="px-4 py-2 text-muted font-mono text-xs">{t.date.toLocaleDateString("fr-FR")}</td>
                          <td className="px-4 py-2 text-ink">{t.gamme}</td>
                          <td className="px-4 py-2 text-ink text-xs">{t.periode ?? "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
