import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SortableTh } from "@/components/SortableTh";
import { sortRows } from "@/lib/sortRows";

// Reproduces the legacy app's AMDEC screen (ot_analyse_amdec.cs) —
// classic FMEA scoring: Fréquence (F, occurrence count) × Gravité (G,
// severity from repair duration), each bucketed 1-4, giving a
// criticality score F×G used to prioritize failure modes.
//
// The real screen lets the user manually configure the F=1..4 and
// G=1..4 threshold boundaries via two "Choix de Fréquence/Gravité"
// panels. That configuration UI isn't reproduced here — instead F and
// G are assigned by quartile of the real data's own distribution,
// which gives the same F×G prioritization output (highest-criticality
// failure modes first) without requiring the person to first pick
// thresholds before seeing anything.

function quartileBucket(value: number, sorted: number[]): 1 | 2 | 3 | 4 {
  if (sorted.length === 0) return 1;
  const rank = sorted.filter((v) => v <= value).length / sorted.length;
  if (rank <= 0.25) return 1;
  if (rank <= 0.5) return 2;
  if (rank <= 0.75) return 3;
  return 4;
}

export default async function AmdecPage({
  searchParams,
}: {
  searchParams: { sort?: string; dir?: string };
}) {
  // Real source groups ot_diagnostic_detection by défaillance, counting
  // OTs (fréquence) and averaging repair duration in hours (gravité) —
  // scoped to closed OTs only, same statut filter as the real query.
  //
  // No `take` limit here on purpose — unlike a browsable list, this
  // feeds an aggregation (F/G scored per défaillance below). Capping
  // the raw detection records wouldn't just hide some rows from
  // display, it would silently undercount some failure modes and skew
  // every criticality score in the output, since the aggregated table
  // itself only ever has one row per distinct défaillance (naturally
  // small) regardless of how many raw detection records exist.
  const detections = await prisma.otDiagnosticDetection.findMany({
    where: { ordreTravail: { deleted: false, statut: "Clôturé" } },
    include: { defaillance: true, ordreTravail: true },
  });

  const byDefaillance = new Map<
    number,
    { anomalie: string; durations: number[] }
  >();

  for (const d of detections) {
    const ot = d.ordreTravail;
    if (!ot.dateDebut || !ot.heureDebut || !ot.dateFin || !ot.heureFin) continue;
    const [h1, m1] = ot.heureDebut.split(":").map(Number);
    const [h2, m2] = ot.heureFin.split(":").map(Number);
    const start = new Date(ot.dateDebut);
    start.setHours(h1 || 0, m1 || 0, 0, 0);
    const end = new Date(ot.dateFin);
    end.setHours(h2 || 0, m2 || 0, 0, 0);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (hours < 0) continue;

    if (!byDefaillance.has(d.idDefaillance)) {
      byDefaillance.set(d.idDefaillance, { anomalie: d.defaillance.anomalie, durations: [] });
    }
    byDefaillance.get(d.idDefaillance)!.durations.push(hours);
  }

  const raw = Array.from(byDefaillance.entries()).map(([id, g]) => ({
    id,
    anomalie: g.anomalie,
    frequence: g.durations.length,
    graviteMoyenne: g.durations.reduce((a, b) => a + b, 0) / g.durations.length,
  }));

  const freqSorted = raw.map((r) => r.frequence).sort((a, b) => a - b);
  const graviteSorted = raw.map((r) => r.graviteMoyenne).sort((a, b) => a - b);

  const scored = raw
    .map((r) => {
      const f = quartileBucket(r.frequence, freqSorted);
      const g = quartileBucket(r.graviteMoyenne, graviteSorted);
      return { ...r, f, g, criticite: f * g };
    })
    .sort((a, b) => b.criticite - a.criticite);

  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";
  const rows = sortRows(scored, searchParams.sort, dir, {
    defaillance: (r) => r.anomalie,
    nbOt: (r) => r.frequence,
    duree: (r) => r.graviteMoyenne,
    f: (r) => r.f,
    g: (r) => r.g,
    criticite: (r) => r.criticite,
  });

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT · Analyses" title="AMDEC" />
      <div className="p-8 space-y-5">
        <p className="text-xs text-muted max-w-2xl">
          Criticité = Fréquence (F) × Gravité (G), chacune classée en quartile 1
          à 4 selon la distribution réelle des données (nombre d&apos;OT
          correctifs clôturés par défaillance, durée moyenne de réparation).
          Calculé uniquement sur les OT correctifs clôturés.
        </p>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="defaillance" label="Défaillance" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="nbOt" label="Nb OT" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="duree" label="Durée moy. (h)" className="w-28 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="f" label="F" className="w-20 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="g" label="G" className="w-20 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="criticite" label="Criticité" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-2.5 text-ink">{r.anomalie}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{r.frequence}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{r.graviteMoyenne.toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{r.f}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{r.g}</td>
                  <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${r.criticite >= 12 ? "text-urgent" : r.criticite >= 6 ? "text-amber-600" : "text-ink"}`}>
                    {r.criticite}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune donnée pour ces critères.
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
