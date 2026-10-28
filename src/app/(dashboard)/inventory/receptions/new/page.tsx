import { PageHeader } from "@/components/PageHeader";
import { createReception } from "../../actions";

export default function NewReceptionPage() {
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Inventaire" title="Nouvelle réception" />
      <form action={createReception} className="p-8 max-w-md space-y-5">
        <p className="text-sm text-muted -mt-2">
          Vous pourrez rattacher chaque ligne à une commande d&apos;achat
          (module Achats) sur la page suivante, ou la laisser en réception
          libre.
        </p>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateReception"
            defaultValue={now}
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Reçu par
          </label>
          <input
            type="text"
            name="receptionPar"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Commentaire
          </label>
          <textarea
            name="commentaire"
            rows={3}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer la réception
          </button>
        </div>
      </form>
    </>
  );
}
