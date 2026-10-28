import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createEngin } from "../../actions";

export default async function NewVehiclePage() {
  const [typesVehicule, chauffeurs, categories] = await Promise.all([
    prisma.typeVehicule.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.chauffeur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
    prisma.categorieDeCharge.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Flotte" title="Nouveau véhicule" />
      <form action={createEngin} className="p-8 max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Matricule
            </label>
            <input
              type="text"
              name="matricule"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              N° carte carburant
            </label>
            <input
              type="text"
              name="numCarte"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Désignation <span className="text-urgent">*</span>
          </label>
          <input
            type="text"
            name="designation"
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Marque
            </label>
            <input
              type="text"
              name="marque"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Type de véhicule
            </label>
            <select
              name="idVehicule"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {typesVehicule.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.designation}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Chauffeur
            </label>
            <select
              name="idChauffeur"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {chauffeurs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Catégorie de charge
            </label>
            <select
              name="idCategorie"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.designation}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Liaison
          </label>
          <input
            type="text"
            name="liaison"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer le véhicule
          </button>
        </div>
      </form>
    </>
  );
}
