import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createDemandeIntervention } from "../actions";
import { URGENCES } from "@/lib/constants";

export default async function NewInterventionPage() {
  const equipements = await prisma.equipement.findMany({
    where: { deleted: false },
    orderBy: { designation: "asc" },
    take: 200,
  });

  return (
    <>
      <PageHeader eyebrow="Maintenance" title="Nouvelle demande d'intervention" />
      <form action={createDemandeIntervention} className="p-8 max-w-2xl space-y-5">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Équipement concerné <span className="text-urgent">*</span>
          </label>
          <select
            name="equipement"
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            <option value="">Sélectionner…</option>
            {equipements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code ? `${e.code} — ` : ""}
                {e.designation}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Description de la défaillance <span className="text-urgent">*</span>
          </label>
          <textarea
            name="description"
            required
            rows={4}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            placeholder="Décrire le problème observé…"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Urgence <span className="text-urgent">*</span>
            </label>
            <select
              name="urgence"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {URGENCES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-2.5">
            <label className="inline-flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="arretMachine" className="rounded" />
              Arrêt machine requis
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Soumettre la demande
          </button>
        </div>
      </form>
    </>
  );
}
