import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

// Reproduces the legacy app's Ishikawa screen (ot_analyse_ishikawa.cs
// / ot_diagnostic_ishikawa.cs) — the classic 5M fishbone: for a chosen
// "Effet" (failure mode / défaillance), shows the confirmed causes
// recorded against it, grouped into the 5 real category strings found
// in the source ("Main-d'œuvre", "Matériel", "Matière", "Méthode",
// "Milieu" — copied verbatim, including the real hyphen and accents,
// since these are exact string matches against real stored data).

const CATEGORIES = ["Main-d'œuvre", "Matériel", "Matière", "Méthode", "Milieu"] as const;

export default async function IshikawaPage({
  searchParams,
}: {
  searchParams: { defaillance?: string };
}) {
  // Only offer défaillances that actually have Ishikawa causes recorded
  // — an empty diagram for every other défaillance wouldn't be useful.
  const withCauses = await prisma.otDiagnosticM.findMany({
    distinct: ["idDefaillance"],
    select: { idDefaillance: true, defaillance: { select: { anomalie: true } } },
    orderBy: { idDefaillance: "asc" },
  });

  const selectedId = searchParams.defaillance ? Number(searchParams.defaillance) : withCauses[0]?.idDefaillance;

  const causes = selectedId
    ? await prisma.otDiagnosticM.findMany({
        where: { idDefaillance: selectedId },
        include: { defaillance: true },
      })
    : [];

  const byCategory = new Map<string, Set<string>>();
  for (const c of causes) {
    if (!byCategory.has(c.typeM)) byCategory.set(c.typeM, new Set());
    byCategory.get(c.typeM)!.add(c.defaillance.anomalie);
  }

  const effet = withCauses.find((c) => c.idDefaillance === selectedId)?.defaillance.anomalie;

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT · Analyses" title="Ishikawa" />
      <div className="p-8 space-y-5">
        <form method="get" className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Effet (défaillance)
            </label>
            <select
              name="defaillance"
              defaultValue={selectedId ?? ""}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface min-w-[280px]"
            >
              {withCauses.map((c) => (
                <option key={c.idDefaillance} value={c.idDefaillance}>
                  {c.defaillance.anomalie}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors">
            Afficher
          </button>
        </form>

        {withCauses.length === 0 ? (
          <div className="bg-surface border border-hairline rounded px-4 py-8 text-center text-muted text-sm">
            Aucune cause Ishikawa enregistrée pour le moment.
          </div>
        ) : (
          <div className="bg-surface border border-hairline rounded p-6">
            <div className="text-center mb-6">
              <span className="text-xs text-muted uppercase tracking-wide">Effet</span>
              <div className="text-lg font-semibold text-ink">{effet}</div>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {CATEGORIES.map((cat) => {
                const items = Array.from(byCategory.get(cat) ?? []);
                return (
                  <div key={cat} className="border-t-2 border-steel-600 pt-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-steel-700 mb-2">{cat}</div>
                    <ul className="space-y-1.5">
                      {items.map((item) => (
                        <li key={item} className="text-sm text-ink px-2 py-1 bg-paper rounded">
                          {item}
                        </li>
                      ))}
                      {items.length === 0 && <li className="text-xs text-muted italic">Aucune cause</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
