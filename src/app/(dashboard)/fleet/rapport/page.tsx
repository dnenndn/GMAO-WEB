import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";

// Reproduces the legacy app's "parc_engin_rapport" screen — a real gap
// found while checking the C# source for Parc Engin, since no reference
// screenshot exists for this module: a per-vehicle cost summary across
// the 3 document types (Assurance/Vignette/Visite Technique), summed
// within a date range. Matches the real query's own date_deb-based
// range filter (not date_exp), and its own 3 separate cost columns.

function startOfYear() {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1);
}

export default async function FleetRapportPage({
  searchParams,
}: {
  searchParams: { d1?: string; d2?: string };
}) {
  const d1 = searchParams.d1 ? new Date(searchParams.d1) : startOfYear();
  const d2 = searchParams.d2 ? new Date(searchParams.d2) : new Date();
  const d2End = new Date(d2);
  d2End.setHours(23, 59, 59, 999);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const inRange = { dateDeb: { gte: d1, lte: d2End } };

  const [engins, assurances, vignettes, visites] = await Promise.all([
    prisma.engin.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.enginAssurance.findMany({ where: inRange }),
    prisma.enginVignette.findMany({ where: inRange }),
    prisma.enginVisiteTechnique.findMany({ where: inRange }),
  ]);

  const sumBy = (rows: { idEngin: number; prix: any }[]) => {
    const map = new Map<number, number>();
    for (const r of rows) map.set(r.idEngin, (map.get(r.idEngin) ?? 0) + Number(r.prix ?? 0));
    return map;
  };
  const assuranceByEngin = sumBy(assurances);
  const vignetteByEngin = sumBy(vignettes);
  const visiteByEngin = sumBy(visites);

  const rows = engins
    .map((e) => ({
      engin: e,
      assurance: assuranceByEngin.get(e.id) ?? 0,
      vignette: vignetteByEngin.get(e.id) ?? 0,
      visite: visiteByEngin.get(e.id) ?? 0,
    }))
    .filter((r) => r.assurance > 0 || r.vignette > 0 || r.visite > 0);

  const totals = rows.reduce(
    (acc, r) => ({
      assurance: acc.assurance + r.assurance,
      vignette: acc.vignette + r.vignette,
      visite: acc.visite + r.visite,
    }),
    { assurance: 0, vignette: 0, visite: 0 }
  );

  return (
    <>
      <PageHeader eyebrow="Parc Engin" title="Rapport de coûts" hideBack />
      <div className="p-8 space-y-6">
        <form method="get" className="flex gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Du
            </label>
            <input
              type="date"
              name="d1"
              defaultValue={fmt(d1)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Au
            </label>
            <input
              type="date"
              name="d2"
              defaultValue={fmt(d2)}
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

        <div className="grid grid-cols-3 gap-4 max-w-xl">
          <div className="bg-surface border border-hairline rounded p-4">
            <div className="text-xs text-muted uppercase tracking-wide">Assurance</div>
            <div className="text-xl font-semibold font-mono text-ink mt-1">
              {totals.assurance.toLocaleString("fr-FR")} DT
            </div>
          </div>
          <div className="bg-surface border border-hairline rounded p-4">
            <div className="text-xs text-muted uppercase tracking-wide">Vignette</div>
            <div className="text-xl font-semibold font-mono text-ink mt-1">
              {totals.vignette.toLocaleString("fr-FR")} DT
            </div>
          </div>
          <div className="bg-surface border border-hairline rounded p-4">
            <div className="text-xs text-muted uppercase tracking-wide">Visite Technique</div>
            <div className="text-xl font-semibold font-mono text-ink mt-1">
              {totals.visite.toLocaleString("fr-FR")} DT
            </div>
          </div>
        </div>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Engin</th>
                <th className="px-4 py-3 font-semibold">Matricule</th>
                <th className="px-4 py-3 font-semibold">N° Carte</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Assurance</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Vignette</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Visite Technique</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.engin.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-2.5">
                    <Nameplate>{r.engin.designation}</Nameplate>
                  </td>
                  <td className="px-4 py-2.5 text-ink text-xs font-mono">{r.engin.matricule ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink text-xs font-mono">{r.engin.numCarte ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.assurance.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.vignette.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {r.visite.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun coût enregistré sur cette période.
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
