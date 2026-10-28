import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SortableTh } from "@/components/SortableTh";
import { sortRows } from "@/lib/sortRows";

const LEVELS = [
  { key: "equipement", label: "Équipement" },
  { key: "sousEquipement", label: "Sous-équipement" },
  { key: "organe", label: "Organe" },
  { key: "atelier", label: "Atelier" },
  { key: "classe", label: "Classe d'intervention" },
  { key: "defaillance", label: "Défaillance" },
] as const;

type LevelKey = (typeof LEVELS)[number]["key"];

export default async function ReliabilityPage({
  searchParams,
}: {
  searchParams: { level?: string; from?: string; to?: string; sort?: string; dir?: string };
}) {
  const level = (LEVELS.find((l) => l.key === searchParams.level)?.key ??
    "equipement") as LevelKey;

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setMonth(defaultFrom.getMonth() - 3);
  const from = searchParams.from ? new Date(searchParams.from) : defaultFrom;
  const to = searchParams.to ? new Date(searchParams.to) : now;

  // Reliability metrics only make sense for unplanned (corrective) work —
  // matches the legacy SQL's `type NOT LIKE '%Prév%'` filter.
  const ots = await prisma.ordreTravail.findMany({
    where: {
      deleted: false,
      statut: "Clôturé",
      type: { not: { contains: "Préventive" } },
      dateDebut: { gte: from, lte: to },
      dateFin: { not: null },
    },
    select: {
      id: true,
      dateDebut: true,
      heureDebut: true,
      dateFin: true,
      heureFin: true,
      equipement: true,
      sousEquipement: true,
      organe: true,
      atelier: true,
      idClasse: true,
      idDefaillance: true,
    },
  });

  // "classe" and "defaillance" don't live in the Equipement table like
  // the other four levels — resolved via their own lookup tables and
  // merged into one label map, keyed the same way as equipementById.
  function groupIdFor(ot: (typeof ots)[number]): number | null {
    if (level === "classe") return ot.idClasse;
    if (level === "defaillance") return ot.idDefaillance;
    return ot[level as "equipement" | "sousEquipement" | "organe" | "atelier"];
  }

  const equipementIds = new Set<number>();
  for (const ot of ots) {
    const id = groupIdFor(ot);
    if (id != null && (level === "equipement" || level === "sousEquipement" || level === "organe" || level === "atelier")) {
      equipementIds.add(id);
    }
  }
  const equipements = await prisma.equipement.findMany({
    where: { id: { in: Array.from(equipementIds) } },
  });
  const equipementById = new Map(equipements.map((e): [number, typeof e] => [e.id, e]));

  const classeIds = new Set<number>();
  const defaillanceIds = new Set<number>();
  for (const ot of ots) {
    if (level === "classe" && ot.idClasse != null) classeIds.add(ot.idClasse);
    if (level === "defaillance" && ot.idDefaillance != null) defaillanceIds.add(ot.idDefaillance);
  }
  const [classes, defaillances] = await Promise.all([
    classeIds.size > 0
      ? prisma.parametreClasseIntervention.findMany({ where: { id: { in: Array.from(classeIds) } } })
      : Promise.resolve([]),
    defaillanceIds.size > 0
      ? prisma.parametreAnomalie.findMany({ where: { id: { in: Array.from(defaillanceIds) } } })
      : Promise.resolve([]),
  ]);
  const classeById = new Map(classes.map((c): [number, string] => [c.id, c.designation]));
  const defaillanceById = new Map(defaillances.map((d): [number, string] => [d.id, d.anomalie]));

  function labelFor(id: number): { designation: string; code?: string | null } {
    if (level === "classe") return { designation: classeById.get(id) ?? `#${id}` };
    if (level === "defaillance") return { designation: defaillanceById.get(id) ?? `#${id}` };
    return { designation: equipementById.get(id)?.designation ?? `#${id}`, code: equipementById.get(id)?.code };
  }

  type Group = { durations: number[]; starts: Date[]; ends: Date[] };
  const groups = new Map<number, Group>();

  for (const ot of ots) {
    const groupId = groupIdFor(ot);
    if (groupId == null) continue;
    if (!ot.dateDebut || !ot.heureDebut || !ot.dateFin || !ot.heureFin) continue;

    const start = combineDateTime(ot.dateDebut, ot.heureDebut);
    const end = combineDateTime(ot.dateFin, ot.heureFin);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours < 0) continue;

    if (!groups.has(groupId)) groups.set(groupId, { durations: [], starts: [], ends: [] });
    const g = groups.get(groupId)!;
    g.durations.push(durationHours);
    g.starts.push(start);
    g.ends.push(end);
  }

  const defaultRows = Array.from(groups.entries())
    .map(([id, g]) => {
      const ttr = g.durations.reduce((a, b) => a + b, 0);
      const mttr = ttr / g.durations.length;
      const nbreOt = g.durations.length;
      const minStart = new Date(Math.min(...g.starts.map((d) => d.getTime())));
      const maxEnd = new Date(Math.max(...g.ends.map((d) => d.getTime())));
      const totalWindowHours = (maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60);
      const tbf = totalWindowHours - ttr;
      // Matches the legacy edge-case guard: divide by (n) when tbf is
      // exactly zero, otherwise (n - 1).
      const mtbf = tbf === 0 ? tbf / nbreOt : tbf / Math.max(nbreOt - 1, 1);

      return {
        id,
        designation: labelFor(id).designation,
        code: labelFor(id).code,
        ttr,
        mttr,
        nbreOt,
        tbf,
        mtbf,
      };
    })
    .sort((a, b) => b.ttr - a.ttr);

  const rows = sortRows(defaultRows, searchParams.sort, searchParams.dir === "desc" ? "desc" : "asc", {
    designation: (r) => r.designation,
    nbreOt: (r) => r.nbreOt,
    ttr: (r) => r.ttr,
    mttr: (r) => r.mttr,
    mtbf: (r) => r.mtbf,
  });

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Analyse & KPI" title="Fiabilité" />
      <div className="p-8 space-y-6">
        <form className="flex gap-3 items-end flex-wrap" method="get">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Niveau
            </label>
            <select
              name="level"
              defaultValue={level}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {LEVELS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Du
            </label>
            <input
              type="date"
              name="from"
              defaultValue={fmt(from)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Au
            </label>
            <input
              type="date"
              name="to"
              defaultValue={fmt(to)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors"
          >
            Filtrer
          </button>
        </form>

        <p className="text-xs text-muted max-w-2xl">
          Calculé uniquement à partir des ordres de travail correctifs
          clôturés (les interventions préventives sont exclues, comme dans
          l&apos;application d&apos;origine). TTR = temps total de
          réparation, MTTR = temps moyen de réparation, MTBF = temps moyen
          entre pannes.
        </p>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="designation" label={LEVELS.find((l) => l.key === level)?.label ?? ""} currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="nbreOt" label="Nb OT" className="w-20 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="ttr" label="TTR (h)" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="mttr" label="MTTR (h)" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="mtbf" label="MTBF (h)" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">
                    {r.code ? `${r.code} — ` : ""}
                    {r.designation}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.nbreOt}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.ttr.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.mttr.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.mtbf.toFixed(1)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
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

function combineDateTime(date: Date, time: string): Date {
  const d = new Date(date);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
