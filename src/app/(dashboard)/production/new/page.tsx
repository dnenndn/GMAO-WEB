import { PageHeader } from "@/components/PageHeader";
import { createRapport } from "../actions";
import { POSTES } from "@/lib/constants";

export default function NewProductionReportPage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Production" title="Nouveau rapport de production" />
      <form action={createRapport} className="p-8 max-w-md space-y-5">
        <p className="text-sm text-muted -mt-2">
          Un rapport regroupe toutes les saisies (fabrication, four,
          emballage, fuel) pour une date et un poste donnés. Les lignes de
          saisie sont générées automatiquement pour chaque équipement et
          type de brique.
        </p>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateRapport"
            required
            defaultValue={today}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Poste <span className="text-urgent">*</span>
          </label>
          <select
            name="poste"
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            <option value="">Sélectionner…</option>
            {POSTES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer le rapport
          </button>
        </div>
      </form>
    </>
  );
}
