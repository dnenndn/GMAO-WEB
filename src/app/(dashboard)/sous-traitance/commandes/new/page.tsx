import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createCommandeSt } from "../../actions";
import { URGENCES } from "@/lib/constants";

export default async function NewCommandeStPage({
  searchParams,
}: {
  searchParams: { idDevis?: string };
}) {
  const fournisseurs = await prisma.fournisseur.findMany({
    where: { deleted: false },
    orderBy: { nom: "asc" },
  });
  const now = new Date().toISOString().slice(0, 10);
  const idDevis = searchParams.idDevis ?? "";

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Nouvelle commande" />
      <form action={createCommandeSt} className="p-8 max-w-md space-y-5">
        <input type="hidden" name="idDevis" value={idDevis} />
        {idDevis && (
          <p className="text-sm text-muted -mt-2">
            Cette commande sera liée au devis DEV-{idDevis.padStart(4, "0")}.
          </p>
        )}

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
