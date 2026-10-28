import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { JobTabs } from "@/components/JobTabs";
import { addSuivi } from "../../../actions";
import { notFound } from "next/navigation";

export default async function SuiviPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const job = await prisma.atelierCreer.findUnique({ where: { id } });
  if (!job || !job.nOf) notFound();

  const [suivis, machines, intervenants] = await Promise.all([
    prisma.atelierSuiviJournalier.findMany({
      where: { nOf: job.nOf, deleted: false },
      include: { machine: true, operateur: true },
      orderBy: { date: "desc" },
    }),
    prisma.atelierMachine.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.intervenant.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
  ]);

  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow="Ordre de fabrication"
        title={`${job.nOf} — Suivi journalier`}
      />
      <JobTabs id={id} active="suivi" />
      <div className="p-8 space-y-6">
        <form
          action={addSuivi.bind(null, job.nOf, id)}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
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
              Début
            </label>
            <input
              type="time"
              name="heureDeb"
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Fin
            </label>
            <input
              type="time"
              name="heureFin"
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Machine
            </label>
            <select
              name="idMachine"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.designation}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Opérateur
            </label>
            <select
              name="idOperateur"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {intervenants.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Qté solde
            </label>
            <input
              type="number"
              step="0.01"
              name="qtSolde"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Ajouter
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Horaire</th>
                <th className="px-4 py-3 font-semibold">Machine</th>
                <th className="px-4 py-3 font-semibold">Opérateur</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Qté solde</th>
              </tr>
            </thead>
            <tbody>
              {suivis.map((s) => (
                <tr key={s.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">
                    {s.date.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-ink text-xs">
                    {s.heureDeb ?? "—"} → {s.heureFin ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink">{s.machine?.designation ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink">{s.operateur?.nom ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {s.qtSolde?.toString() ?? "—"}
                  </td>
                </tr>
              ))}
              {suivis.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune entrée de suivi journalier.
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
