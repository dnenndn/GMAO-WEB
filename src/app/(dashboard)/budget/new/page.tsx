import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createBudget } from "../actions";
import { BUDGET_DUREES } from "@/lib/constants";

export default async function NewBudgetPage() {
  const [familles, fournisseurs] = await Promise.all([
    prisma.famille.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.fournisseur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
  ]);
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Finance" title="Nouveau budget" />
      <form action={createBudget} className="p-8 max-w-2xl space-y-5">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Nom <span className="text-urgent">*</span>
          </label>
          <input
            type="text"
            name="nom"
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Description
          </label>
          <textarea
            name="description"
            rows={2}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Date de début <span className="text-urgent">*</span>
            </label>
            <input
              type="date"
              name="dateCreation"
              defaultValue={now}
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Récurrence
            </label>
            <select
              name="duree"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {BUDGET_DUREES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Montant alloué (DT) <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="montant"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Portée
          </label>
          <div className="flex gap-4 text-sm text-ink mb-3">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="scope" value="global" defaultChecked className="rounded" />
              Global
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="scope" value="categorie" className="rounded" />
              Par catégorie
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="scope" value="fournisseur" className="rounded" />
              Par fournisseur
            </label>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Catégories (si portée = catégorie)
              </label>
              <select
                name="idsCategories"
                multiple
                size={6}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                {familles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.designation}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Fournisseurs (si portée = fournisseur)
              </label>
              <select
                name="idsFournisseurs"
                multiple
                size={6}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="creationAuto" className="rounded" />
          Renouvellement automatique à chaque période
        </label>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer le budget
          </button>
        </div>
      </form>
    </>
  );
}
