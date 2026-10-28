import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OtTabBar } from "@/components/OtTabBar";

// Reproduces the legacy app's ot_planning_annuel.cs — a 52-week grid
// per equipment for a chosen year, each cell marked if that week has
// a scheduled task, colored by the most "significant" type_periode
// that week (the real SQL's CASE ranks Au < Q < H < M < T < S < A,
// taking the max — reproduced identically below).

const PERIODE_RANK: Record<string, number> = { Au: 0, Q: 1, H: 2, M: 3, T: 4, S: 5, A: 6 };
const PERIODE_COLOR: Record<string, string> = {
  Au: "#8A8177", Q: "#5B7C99", H: "#3D6B35", M: "#C97A0C", T: "#A8451B", S: "#8A6D9E", A: "#B3261E",
};

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = date.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

export default async function PlanningAnnuelPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const year = searchParams.year ? Number(searchParams.year) : new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  // No take limit — already bounded by the year range itself (a
  // natural, fixed bound), and the displayed grid's size depends only
  // on the number of distinct equipment × 52 weeks, not on how many
  // raw schedule entries exist. Capping this could silently make a
  // busy year's schedule look incomplete (some weeks missing their
  // marker) for equipment with frequent preventive maintenance,
  // without any benefit to display size.
  const echeances = await prisma.prevAnnuel.findMany({
    where: { dateEcheance: { gte: yearStart, lte: yearEnd } },
  });

  const systIds = [...new Set(echeances.map((e) => e.idRep))];
  const systematiques = await prisma.prevSystematique.findMany({ where: { id: { in: systIds } } });
  const systById = new Map(systematiques.map((s) => [s.id, s]));

  const equipIds = [...new Set(systematiques.map((s) => s.equipement).filter((id): id is number => id != null))];
  const equipements = await prisma.equipement.findMany({ where: { id: { in: equipIds } }, orderBy: { designation: "asc" } });

  // equipId -> week (1-52) -> highest-ranked periode that week
  const grid = new Map<number, Map<number, string>>();
  for (const ech of echeances) {
    const syst = systById.get(ech.idRep);
    if (!syst?.equipement) continue;
    const week = Math.min(isoWeek(ech.dateEcheance), 52);
    const periode = ech.typePeriode ?? "Au";
    if (!grid.has(syst.equipement)) grid.set(syst.equipement, new Map());
    const equipGrid = grid.get(syst.equipement)!;
    const current = equipGrid.get(week);
    if (!current || (PERIODE_RANK[periode] ?? 0) > (PERIODE_RANK[current] ?? 0)) {
      equipGrid.set(week, periode);
    }
  }

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT · Planning" title="Annuel" />
      <OtTabBar active="/work-orders/planning" />
      <div className="p-8 space-y-5">
        <form method="get" className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Année</label>
            <input type="number" name="year" defaultValue={year} className="border border-hairline rounded px-3 py-2 text-sm bg-surface w-28" />
          </div>
          <button type="submit" className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors">
            Afficher
          </button>
        </form>

        <div className="flex gap-4 text-xs">
          {Object.entries(PERIODE_COLOR).map(([code, color]) => (
            <div key={code} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
              <span className="text-muted">{code}</span>
            </div>
          ))}
        </div>

        {equipements.length === 0 ? (
          <div className="bg-surface border border-hairline rounded px-4 py-8 text-center text-muted text-sm">
            Aucune tâche planifiée pour {year}.
          </div>
        ) : (
          <div className="bg-surface border border-hairline rounded overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface px-3 py-2 text-left font-semibold text-muted border-b border-r border-hairline min-w-[220px]">
                    Équipement
                  </th>
                  {weeks.map((w) => (
                    <th key={w} className="px-0.5 py-2 text-center font-normal text-muted border-b border-hairline w-5">
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipements.map((e) => {
                  const equipGrid = grid.get(e.id) ?? new Map();
                  return (
                    <tr key={e.id}>
                      <td className="sticky left-0 bg-surface px-3 py-1.5 text-ink border-r border-b border-hairline whitespace-nowrap">
                        {e.code ? `${e.code} — ` : ""}{e.designation}
                      </td>
                      {weeks.map((w) => {
                        const periode = equipGrid.get(w);
                        return (
                          <td key={w} className="border-b border-hairline p-0.5">
                            <div
                              className="w-4 h-4 rounded-sm mx-auto"
                              style={{ backgroundColor: periode ? PERIODE_COLOR[periode] ?? "#8A8177" : "transparent" }}
                              title={periode ? `Semaine ${w} — ${periode}` : undefined}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
