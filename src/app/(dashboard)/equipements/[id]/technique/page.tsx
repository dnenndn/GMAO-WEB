import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { EquipementTabs } from "@/components/EquipementTabs";
import {
  addEquipementTechnique,
  deleteEquipementTechnique,
  addEquipementObservation,
  deleteEquipementObservation,
} from "../../actions";
import { notFound } from "next/navigation";

export default async function EquipementTechniquePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const equipement = await prisma.equipement.findUnique({
    where: { id },
    include: {
      techniques: { orderBy: { id: "desc" } },
      observations: { orderBy: { id: "desc" } },
    },
  });

  if (!equipement) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Équipement"
        title={`${equipement.code ?? `EQ-${equipement.id}`} — ${equipement.designation}`}
      />
      <EquipementTabs id={id} active="technique" />
      <div className="p-8 max-w-3xl space-y-8">
        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Caractéristiques techniques
          </div>
          <form
            action={addEquipementTechnique.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Désignation <span className="text-urgent">*</span>
              </label>
              <input
                type="text"
                name="designation"
                required
                placeholder="ex : Puissance moteur"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Valeur
              </label>
              <input
                type="text"
                name="observation"
                placeholder="ex : 50 kW"
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
              <tbody>
                {equipement.techniques.map((t) => (
                  <tr key={t.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{t.designation}</td>
                    <td className="px-4 py-2.5 text-muted">{t.observation}</td>
                    <td className="px-4 py-2.5 text-right w-20">
                      <form action={deleteEquipementTechnique.bind(null, t.id, id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Retirer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {equipement.techniques.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune caractéristique technique.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Observations
          </div>
          <form
            action={addEquipementObservation.bind(null, id)}
            className="flex gap-2 mb-3"
          >
            <input
              type="text"
              name="observation"
              placeholder="Ajouter une observation…"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>
          <div className="space-y-2">
            {equipement.observations.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm border-l-2 border-hairline pl-3">
                <span className="text-ink">{o.observation}</span>
                <form action={deleteEquipementObservation.bind(null, o.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    Supprimer
                  </button>
                </form>
              </div>
            ))}
            {equipement.observations.length === 0 && (
              <div className="text-sm text-muted">Aucune observation.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
