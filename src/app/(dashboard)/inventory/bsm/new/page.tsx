import { PageHeader } from "@/components/PageHeader";
import { createBsm } from "../../actions";

export default function NewBsmPage() {
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Inventaire" title="Nouveau bon de sortie magasin" />
      <form action={createBsm} className="p-8 max-w-md space-y-5">
        <p className="text-sm text-muted -mt-2">
          Créez d&apos;abord l&apos;en-tête du BSM, puis ajoutez les articles
          sur la page suivante — chaque ligne ajoutée décrémente
          automatiquement le stock neuf de l&apos;article.
        </p>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateBsm"
            defaultValue={now}
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            N° OT lié (optionnel)
          </label>
          <input
            type="text"
            name="nOt"
            placeholder="ex : OT-2026-0001"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Type de sortie
          </label>
          <input
            type="text"
            name="typeStock"
            placeholder="ex : Maintenance, Sous-traitance…"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="bsmMaintenance" className="rounded" />
          Sortie liée à la maintenance
        </label>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer le BSM
          </button>
        </div>
      </form>
    </>
  );
}
