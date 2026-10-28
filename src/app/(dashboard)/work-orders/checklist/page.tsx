import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OtTabBar } from "@/components/OtTabBar";
import { SortableTh } from "@/components/SortableTh";
import { sortRows } from "@/lib/sortRows";
import { statutColor } from "@/lib/constants";

// Reproduces the legacy app's CheckList screen (ot_checklist.cs) —
// active préventive OTs (statut not in "Annulé"/"Clôturé", matching
// the real query's `<> @st1 and <> @st2` — a checklist only needs to
// track work still ahead), grouped by their plan_maintenance, showing
// planned vs actual dates and the assigned superviseur.
//
// idIntervention is polymorphic in the real schema (see the model
// comment on OrdreTravail): only a real FK to ParametreIntervention
// for Corrective OTs. For Préventive OTs it actually points to
// GammeOperatoire.id instead — resolved here as an explicit lookup in
// application code, exactly as the schema comment instructs, since
// Prisma can't express two FK targets on one column.

export default async function OtChecklistPage({
  searchParams,
}: {
  searchParams: { plan?: string; sort?: string; dir?: string };
}) {
  const ots = await prisma.ordreTravail.findMany({
    where: {
      deleted: false,
      type: { contains: "Préventive" },
      statut: { notIn: ["Annulé", "Clôturé"] },
      idIntervention: { not: null },
    },
    include: { equipementRef: true, superviseur: true },
    orderBy: { debutPrevu: "asc" },
    take: 500,
  });

  const gammeIds = [...new Set(ots.map((ot) => ot.idIntervention!))];
  const gammes = await prisma.gammeOperatoire.findMany({ where: { id: { in: gammeIds } } });
  const gammeById = new Map(gammes.map((g) => [g.id, g]));

  const planIds = [...new Set(gammes.map((g) => g.idPlan).filter((id): id is number => id != null))];
  const plans = await prisma.planMaintenance.findMany({ where: { id: { in: planIds } } });
  const planById = new Map(plans.map((p) => [p.id, p]));

  const rows = ots
    .map((ot) => {
      const gamme = gammeById.get(ot.idIntervention!);
      const plan = gamme?.idPlan ? planById.get(gamme.idPlan) : undefined;
      return { ot, gamme, plan };
    })
    .filter((r) => r.gamme);

  const filteredRows = searchParams.plan
    ? rows.filter((r) => r.plan?.id === Number(searchParams.plan))
    : rows;

  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";
  const sortedRows = sortRows(filteredRows, searchParams.sort, dir, {
    plan: (r) => r.plan?.designation,
    equipement: (r) => r.ot.equipementRef?.designation,
    gamme: (r) => r.gamme!.designation,
    statut: (r) => r.ot.statut,
    superviseur: (r) => r.ot.superviseur?.nom,
    operation: (r) => r.gamme!.operation,
    debutPrevu: (r) => r.ot.debutPrevu,
    finPrevu: (r) => r.ot.finPrevu,
  });

  const availablePlans = Array.from(
    new Map(rows.filter((r) => r.plan).map((r) => [r.plan!.id, r.plan!])).values()
  );

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT" title="CheckList" />
      <OtTabBar active="/work-orders/checklist" />
      <div className="p-8 space-y-5">
        <form method="get" className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Plan de maintenance
            </label>
            <select
              name="plan"
              defaultValue={searchParams.plan ?? ""}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface min-w-[280px]"
            >
              <option value="">Tous les plans</option>
              {availablePlans.map((p) => (
                <option key={p!.id} value={p!.id}>{p!.designation}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors">
            Filtrer
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="plan" label="Plan" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="equipement" label="Équipement" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="gamme" label="Gamme" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="statut" label="Statut" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="superviseur" label="Superviseur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="operation" label="Opération" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="debutPrevu" label="Début prévu" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="finPrevu" label="Fin prévue" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(({ ot, gamme, plan }) => {
                const s = statutColor(ot.statut);
                return (
                  <tr key={ot.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 text-ink">{plan?.designation ?? "—"}</td>
                    <td className="px-4 py-3 text-ink">{ot.equipementRef?.designation ?? "—"}</td>
                    <td className="px-4 py-3 text-ink">{gamme!.designation}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.fg }}>
                        {ot.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{ot.superviseur?.nom ?? "—"}</td>
                    <td className="px-4 py-3 text-ink text-xs">{gamme!.operation ?? "—"}</td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {ot.debutPrevu ? ot.debutPrevu.toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {ot.finPrevu ? ot.finPrevu.toLocaleDateString("fr-FR") : "—"}
                    </td>
                  </tr>
                );
              })}
              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune tâche préventive active pour ce filtre.
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
