import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { EquipementTabs } from "@/components/EquipementTabs";
import { updateEquipementPrevision } from "../../actions";
import { notFound } from "next/navigation";

export default async function EquipementPrevisionPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const equipement = await prisma.equipement.findUnique({
    where: { id },
    include: { prevision: true },
  });

  if (!equipement) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Équipement"
        title={`${equipement.code ?? `EQ-${equipement.id}`} — ${equipement.designation}`}
      />
      <EquipementTabs id={id} active="prevision" />
      <div className="p-8 max-w-md space-y-6">
        <p className="text-sm text-muted -mt-2">
          Estimation du coût et de la fréquence des arrêts, sur une base
          récurrente — utilisée pour la planification budgétaire/fiabilité.
        </p>
        <form
          action={updateEquipementPrevision.bind(null, id)}
          className="bg-surface border border-hairline rounded p-4 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Coût d&apos;arrêt (DT)
            </label>
            <input
              type="number"
              step="0.01"
              name="coutArret"
              defaultValue={equipement.prevision?.coutArret?.toString() ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Nombre d&apos;arrêts prévus
            </label>
            <input
              type="number"
              step="0.01"
              name="nbreArret"
              defaultValue={equipement.prevision?.nbreArret?.toString() ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Sur une période de
              </label>
              <input
                type="number"
                name="periodeNbr"
                defaultValue={equipement.prevision?.periodeNbr?.toString() ?? ""}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Unité
              </label>
              <select
                name="periode"
                defaultValue={equipement.prevision?.periode ?? ""}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">—</option>
                <option value="Jour">Jour</option>
                <option value="Semaine">Semaine</option>
                <option value="Mois">Mois</option>
                <option value="Année">Année</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </>
  );
}
