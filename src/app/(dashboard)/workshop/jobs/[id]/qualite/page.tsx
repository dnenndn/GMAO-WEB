import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { JobTabs } from "@/components/JobTabs";
import { addDonnees, addPieceMesure } from "../../../actions";
import { notFound } from "next/navigation";

export default async function QualitePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const job = await prisma.atelierCreer.findUnique({
    where: { id },
    include: {
      donnees: { orderBy: { id: "desc" } },
      pieces: { orderBy: { id: "desc" } },
    },
  });
  if (!job) notFound();

  return (
    <>
      <PageHeader eyebrow="Ordre de fabrication" title={`${job.nOf} — Qualité`} />
      <JobTabs id={id} active="qualite" />
      <div className="p-8 space-y-8">
        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Réception / contrôle
          </div>
          <form
            action={addDonnees.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 grid grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Sous-traitant
              </label>
              <input
                type="text"
                name="sousTraitant"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Qté reçue
              </label>
              <input
                type="number"
                step="0.01"
                name="qtRecu"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="liberation" className="rounded" />
                Libération
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Pièces approuvées
              </label>
              <input
                type="number"
                step="0.01"
                name="pieceApp"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Pièces bloquées
              </label>
              <input
                type="number"
                step="0.01"
                name="pieceBloque"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Remarque
              </label>
              <input
                type="text"
                name="remarque"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="col-span-3">
              <button
                type="submit"
                className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </form>

          <div className="bg-surface border border-hairline rounded overflow-hidden mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Sous-traitant</th>
                  <th className="px-4 py-3 font-semibold text-right">Reçu</th>
                  <th className="px-4 py-3 font-semibold text-right">Approuvé</th>
                  <th className="px-4 py-3 font-semibold text-right">Bloqué</th>
                  <th className="px-4 py-3 font-semibold">Libération</th>
                </tr>
              </thead>
              <tbody>
                {job.donnees.map((d) => (
                  <tr key={d.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{d.sousTraitant ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {d.qtRecu?.toString() ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {d.pieceApp?.toString() ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-urgent">
                      {d.pieceBloque?.toString() ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs">{d.liberation ? "Oui" : "Non"}</td>
                  </tr>
                ))}
                {job.donnees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted text-sm">
                      Aucune donnée de réception.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Relevés dimensionnels
          </div>
          <form
            action={addPieceMesure.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-2 items-end flex-wrap"
          >
            <div className="w-28">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                N° mesure
              </label>
              <input
                type="text"
                name="numMes"
                className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Nominale
              </label>
              <input
                type="number"
                step="0.001"
                name="mesureNominale"
                className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Tol +
              </label>
              <input
                type="number"
                step="0.001"
                name="plus"
                className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Tol -
              </label>
              <input
                type="number"
                step="0.001"
                name="tire"
                className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
              />
            </div>
            {(["p1", "p2", "p3", "p4", "p5", "p6"] as const).map((p) => (
              <div key={p} className="w-16">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                  {p.toUpperCase()}
                </label>
                <input
                  type="number"
                  step="0.001"
                  name={p}
                  className="w-full border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
                />
              </div>
            ))}
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>

          <div className="bg-surface border border-hairline rounded overflow-hidden mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-3 font-semibold">N°</th>
                  <th className="px-3 py-3 font-semibold text-right">Nominale</th>
                  <th className="px-3 py-3 font-semibold text-right">Tol +/-</th>
                  {["P1", "P2", "P3", "P4", "P5", "P6"].map((p) => (
                    <th key={p} className="px-3 py-3 font-semibold text-right">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {job.pieces.map((p) => (
                  <tr key={p.id} className="border-b border-hairline last:border-0">
                    <td className="px-3 py-2.5 text-ink text-xs">{p.numMes ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink">
                      {p.mesureNominale?.toString() ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-muted">
                      +{p.plus?.toString() ?? "0"} / -{p.tire?.toString() ?? "0"}
                    </td>
                    {[p.p1, p.p2, p.p3, p.p4, p.p5, p.p6].map((v, i) => (
                      <td key={i} className="px-3 py-2.5 text-right font-mono text-xs text-ink">
                        {v?.toString() ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {job.pieces.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-muted text-sm">
                      Aucun relevé dimensionnel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
