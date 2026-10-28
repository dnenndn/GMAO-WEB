import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SortableTh } from "@/components/SortableTh";
import { sortRows } from "@/lib/sortRows";

const DIMENSIONS = [
  { key: "equipement", label: "Équipement", cost: "both" },
  { key: "sousEquipement", label: "Sous-équipement", cost: "both" },
  { key: "organe", label: "Organe", cost: "both" },
  { key: "classe", label: "Classe d'intervention", cost: "parts" },
  { key: "defaillance", label: "Défaillance", cost: "parts" },
  { key: "famille", label: "Famille (article)", cost: "parts" },
  { key: "sousFamille", label: "Sous-famille (article)", cost: "parts" },
  { key: "fonction", label: "Fonction", cost: "labor" },
  { key: "intervenant", label: "Intervenant", cost: "labor" },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]["key"];

export default async function CostAnalysisPage({
  searchParams,
}: {
  searchParams: { dimension?: string; from?: string; to?: string; sort?: string; dir?: string };
}) {
  const dimension = (DIMENSIONS.find((d) => d.key === searchParams.dimension)?.key ??
    "equipement") as DimensionKey;
  const dimConfig = DIMENSIONS.find((d) => d.key === dimension)!;

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setMonth(defaultFrom.getMonth() - 3);
  const from = searchParams.from ? new Date(searchParams.from) : defaultFrom;
  const to = searchParams.to ? new Date(searchParams.to) : now;

  const ots = await prisma.ordreTravail.findMany({
    where: { deleted: false, statut: "Clôturé", dateDebut: { gte: from, lte: to } },
    select: {
      id: true,
      nOt: true,
      equipement: true,
      sousEquipement: true,
      organe: true,
      idClasse: true,
      idDefaillance: true,
    },
  });
  const otIds = ots.map((o) => o.id);
  type OtRow = (typeof ots)[number];
  const otById = new Map(ots.map((o): [number, OtRow] => [o.id, o]));
  const otByNumber = new Map(ots.map((o): [string, OtRow] => [o.nOt, o]));

  const rows = new Map<number, number>(); // id -> cost
  const labels = new Map<number, string>();

  if (dimConfig.cost === "both" || dimConfig.cost === "parts") {
    // Matches on Bsm.nOt (free-text OT reference) rather than Bsm.liOt —
    // corrected after a real schema export showed li_ot is a varchar(100)
    // field, not the integer FK to OrdreTravail an earlier pass assumed.
    // See docs/12-schema-validation-findings.md.
    const otNumbers = ots.map((o) => o.nOt).filter((n): n is string => n != null);
    // Real crash found on an actual run: `quantite: { not: 0 }` — a plain
    // number compared against a Decimal field — inside this same query's
    // `where` clause caused a hard Rust-level panic in the Prisma query
    // engine (confirmed NOT the empty-array/relation-filter theory tried
    // first: the crash persisted with 156 real, non-empty OT numbers).
    // Decimal-field filter comparisons have a known history of exactly
    // this class of engine bug in some Prisma 5.x builds. Moved this one
    // comparison out of the database query and into plain JS after
    // fetching — same end result, since it's just filtering an
    // already-small in-memory array, and it completely sidesteps
    // whatever the engine-level issue actually is.
    //
    // Second real crash found on a later run, different error this
    // time ("Invalid field passed validation"), on the *nested relation*
    // filter `bsm: { nOt: { in: ... }, typeStock: { not: ... } }` — the
    // same engine-bug class hitting a different filter shape. Resolved
    // the same way: no nested relation filter at all. Bsm rows matching
    // nOt are fetched first via a flat, single-model query, then
    // BsmArticle is queried by the resulting `idBsm: { in: [...] }` —
    // a plain scalar filter, the one shape that's proven reliable
    // across every crash seen on this query so far.
    // Second real crash, different error again ("Invalid field passed
    // validation"), this time triggered by filtering Bsm.nOt with an
    // `in: [...]` array — even without any nested relation involved.
    // Given plain equality, `contains`, and now `in` have each crashed
    // this same engine on this same field in different ways across
    // three separate runs, the only shape left that hasn't crashed is
    // no where-filter at all on this field. Fetching every Bsm row
    // unfiltered and matching against otNumbers via a Set in plain JS
    // — slower than a targeted query, but the one approach that
    // reliably avoids whatever is actually broken in this engine build.
    const otNumberSet = new Set(otNumbers);
    const allBsms = await prisma.bsm.findMany({
      select: { id: true, nOt: true, typeStock: true },
    });
    const matchingBsms = allBsms.filter((b) => b.nOt != null && otNumberSet.has(b.nOt));
    const bsmIds = matchingBsms.filter((b) => b.typeStock !== "Retour").map((b) => b.id);
    const bsmById = new Map(matchingBsms.map((b): [number, (typeof matchingBsms)[number]] => [b.id, b]));

    const bsmLignes =
      bsmIds.length === 0
        ? []
        : (
            await prisma.bsmArticle.findMany({
              where: { idBsm: { in: bsmIds } },
              include: {
                article: { include: { sousFamilles: { include: { sousFamille: { include: { famille: true } } } } } },
              },
            })
          ).filter((l) => Number(l.quantite) !== 0);

    for (const l of bsmLignes) {
      const cost = Number(l.quantite) * Number(l.prixHt ?? 0);
      const bsmNOt = bsmById.get(l.idBsm)?.nOt;
      const ot = bsmNOt != null ? otByNumber.get(bsmNOt) : undefined;

      let groupId: number | null = null;
      let label = "—";

      if (dimension === "equipement" || dimension === "sousEquipement" || dimension === "organe") {
        groupId = ot ? ot[dimension] : null;
      } else if (dimension === "classe") {
        groupId = ot?.idClasse ?? null;
      } else if (dimension === "defaillance") {
        groupId = ot?.idDefaillance ?? null;
      } else if (dimension === "famille" || dimension === "sousFamille") {
        const sf = l.article.sousFamilles[0]?.sousFamille;
        if (dimension === "sousFamille") {
          groupId = sf?.id ?? null;
          label = sf?.designation ?? "—";
        } else {
          groupId = sf?.famille?.id ?? null;
          label = sf?.famille?.designation ?? "—";
        }
      }

      if (groupId == null) continue;
      rows.set(groupId, (rows.get(groupId) ?? 0) + cost);
      if (label !== "—") labels.set(groupId, label);
    }
  }

  if (dimConfig.cost === "both" || dimConfig.cost === "labor") {
    // Same empty-array-through-a-relation-filter risk as bsmLignes above
    // — guarded the same way.
    const laborLignes =
      otIds.length === 0
        ? []
        : await prisma.otOrdoIntervenant.findMany({
            where: { ressourceFonction: { idOt: { in: otIds } } },
            include: { ressourceFonction: { include: { fonction: true } }, intervenant: true },
          });

    for (const l of laborLignes) {
      const hours = (l.fin.getTime() - l.debut.getTime()) / (1000 * 60 * 60);
      const cost = Number(l.coutHoraire ?? 0) * hours;
      const ot = otById.get(l.ressourceFonction.idOt);

      let groupId: number | null = null;
      let label = "—";

      if (dimension === "equipement" || dimension === "sousEquipement" || dimension === "organe") {
        groupId = ot ? ot[dimension] : null;
      } else if (dimension === "fonction") {
        groupId = l.ressourceFonction.idFonction ?? null;
        label = l.ressourceFonction.fonction?.designation ?? "—";
      } else if (dimension === "intervenant") {
        groupId = l.idIntervenant;
        label = l.intervenant.nom;
      }

      if (groupId == null) continue;
      rows.set(groupId, (rows.get(groupId) ?? 0) + cost);
      if (label !== "—") labels.set(groupId, label);
    }
  }

  // Resolve equipment-hierarchy labels (not covered by the loop above,
  // since those group ids come straight from OrdreTravail fields).
  if (dimension === "equipement" || dimension === "sousEquipement" || dimension === "organe") {
    const equipements = await prisma.equipement.findMany({
      where: { id: { in: Array.from(rows.keys()) } },
    });
    for (const e of equipements) labels.set(e.id, e.designation);
  }
  if (dimension === "classe") {
    const classes = await prisma.parametreClasseIntervention.findMany({
      where: { id: { in: Array.from(rows.keys()) } },
    });
    for (const c of classes) labels.set(c.id, c.designation);
  }
  if (dimension === "defaillance") {
    const anomalies = await prisma.parametreAnomalie.findMany({
      where: { id: { in: Array.from(rows.keys()) } },
    });
    for (const a of anomalies) labels.set(a.id, a.anomalie);
  }

  const total = Array.from(rows.values()).reduce((a, b) => a + b, 0);
  const ranked = Array.from(rows.entries())
    .map(([id, cout]) => ({ id, label: labels.get(id) ?? `#${id}`, cout }))
    .sort((a, b) => b.cout - a.cout);

  let cumulative = 0;
  const withCumulative = ranked.map((r) => {
    cumulative += r.cout;
    return { ...r, pct: total > 0 ? (r.cout / total) * 100 : 0, cumPct: total > 0 ? (cumulative / total) * 100 : 0 };
  });

  // Displayed order can be changed via sortable columns, but cumPct is
  // inherently a Pareto concept — it's computed once, in cout-descending
  // order, above. Re-sorting for display doesn't recompute it; each
  // row keeps the cumulative-% value that reflects its real rank by
  // cost, even if it's now shown in a different position.
  const displayRows = sortRows(
    withCumulative,
    searchParams.sort,
    searchParams.dir === "desc" ? "desc" : "asc",
    {
      label: (r) => r.label,
      cout: (r) => r.cout,
      pct: (r) => r.pct,
      cumPct: (r) => r.cumPct,
    }
  );

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Analyse & KPI" title="Coûts (Pareto)" />
      <div className="p-8 space-y-6">
        <form className="flex gap-3 items-end flex-wrap" method="get">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Dimension
            </label>
            <select
              name="dimension"
              defaultValue={dimension}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {DIMENSIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
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
          {dimConfig.cost === "both" &&
            "Coût pièces (sorties magasin) + coût main d'œuvre (heures × taux horaire)."}
          {dimConfig.cost === "parts" && "Coût pièces uniquement (sorties magasin liées à un OT clôturé)."}
          {dimConfig.cost === "labor" && "Coût main d'œuvre uniquement (heures × taux horaire)."}
        </p>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="label" label={dimConfig.label} currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="cout" label="Coût (DT)" className="w-28 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="pct" label="%" className="w-20 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="cumPct" label="% cumulé" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{r.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.cout.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                    {r.pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.cumPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
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
