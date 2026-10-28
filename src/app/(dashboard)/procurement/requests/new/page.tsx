import { PageHeader } from "@/components/PageHeader";
import { createDemandeAchat } from "../../actions";

export default function NewPurchaseRequestPage() {
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Achats" title="Nouvelle demande d'achat" />
      <form action={createDemandeAchat} className="p-8 max-w-md space-y-5">
        <p className="text-sm text-muted -mt-2">
          Créez d&apos;abord l&apos;en-tête, puis ajoutez les articles
          demandés sur la page suivante.
        </p>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateDa"
            defaultValue={now}
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Demandeur
          </label>
          <input
            type="text"
            name="demandeur"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Période
            </label>
            <input
              type="text"
              name="periode"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Délai (jours)
            </label>
            <input
              type="number"
              name="delai"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer la demande
          </button>
        </div>
      </form>
    </>
  );
}
