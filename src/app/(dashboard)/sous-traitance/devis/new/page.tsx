import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createDevis } from "../../actions";

export default async function NewDevisPage() {
  const fournisseurs = await prisma.fournisseur.findMany({
    where: { deleted: false },
    orderBy: { nom: "asc" },
  });
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Nouveau devis" />
      <form action={createDevis} className="p-8 max-w-md space-y-5">
        <p className="text-sm text-muted -mt-2">
          Créez d&apos;abord l&apos;en-tête du devis, puis ajoutez les
          prestations demandées sur la page suivante.
        </p>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateDevis"
            defaultValue={now}
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Fournisseurs à consulter
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

        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="livr" className="rounded" />
          Livraison incluse dans le devis
        </label>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer le devis
          </button>
        </div>
      </form>
    </>
  );
}
