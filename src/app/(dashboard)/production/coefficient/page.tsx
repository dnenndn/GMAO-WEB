import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { upsertCoefficientGaz } from "../actions";

export default async function CoefficientGazPage() {
  const rows = await prisma.prodCoefficientGaz.findMany({
    orderBy: { date: "desc" },
    take: 60,
  });

  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Production" title="Coefficient gaz" hideBack />
      <div className="p-8 space-y-6">
        <p className="text-sm text-muted max-w-2xl">
          Coefficient de conversion/tarification du gaz, saisi par jour —
          une valeur par date, indépendante des rapports d&apos;équipe.
        </p>

        <form
          action={upsertCoefficientGaz}
          className="bg-surface border border-hairline rounded p-4 flex gap-4 items-end max-w-lg"
        >
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Date <span className="text-urgent">*</span>
            </label>
            <input
              type="date"
              name="date"
              defaultValue={now}
              required
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Coefficient <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="0.0001"
              name="coefficient"
              required
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface w-32"
            />
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Enregistrer
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden max-w-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Coefficient</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 text-ink font-mono">
                    {r.coefficient?.toString() ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {r.date ? r.date.toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun coefficient enregistré.
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
