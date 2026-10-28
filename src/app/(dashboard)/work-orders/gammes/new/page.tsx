import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createGamme } from "../../actions";

export default async function NewGammePage() {
  const classes = await prisma.parametreClasseIntervention.findMany({
    orderBy: { designation: "asc" },
  });

  return (
    <>
      <PageHeader eyebrow="Maintenance" title="Nouvelle gamme opératoire" />
      <form action={createGamme} className="p-8 max-w-md space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code
            </label>
            <input
              type="text"
              name="code"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Type
            </label>
            <input
              type="text"
              name="type"
              placeholder="ex : Préventive"
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
              Classe d&apos;intervention
            </label>
            <select
              name="idClasse"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.designation}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Durée (h)
            </label>
            <input
              type="number"
              name="duree"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer la gamme
          </button>
        </div>
      </form>
    </>
  );
}
