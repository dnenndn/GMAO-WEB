import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createCommande } from "../../actions";
import { URGENCES } from "@/lib/constants";

export default async function NewOrderPage() {
  const fournisseurs = await prisma.fournisseur.findMany({
    where: { deleted: false },
    orderBy: { nom: "asc" },
  });
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Achats" title="Nouvelle commande" />
      <form action={createCommande} className="p-8 max-w-md space-y-5">
        <p className="text-sm text-muted -mt-2">
          Créez d&apos;abord l&apos;en-tête, puis ajoutez les lignes en
          piochant dans les demandes d&apos;achat confirmées sur la page
          suivante.
        </p>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Fournisseur <span className="text-urgent">*</span>
          </label>
          <select
            name="idFournisseur"
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            <option value="">Sélectionner…</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateCommande"
            defaultValue={now}
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Urgence
            </label>
            <select
              name="urgence"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {URGENCES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Personne à contacter
            </label>
            <input
              type="text"
              name="personneContacter"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer la commande
          </button>
        </div>
      </form>
    </>
  );
}
