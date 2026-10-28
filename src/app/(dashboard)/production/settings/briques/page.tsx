import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { addTypeBrique, deleteTypeBrique } from "../../actions";
import { getSession } from "@/lib/auth";

export default async function TypesBriqueSettingsPage() {
  const types = await prisma.prodTypeBrique.findMany({
    orderBy: { designation: "asc" },
  });

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Production — Paramètres" title="Types de briques" />
      <div className="p-8 max-w-2xl space-y-6">
        <form
          action={addTypeBrique}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Désignation <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="designation"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              placeholder="ex : Brique 8 trous"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Poids cuit (kg)
            </label>
            <input
              type="number"
              step="0.01"
              name="poid"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Poids cru (kg)
            </label>
            <input
              type="number"
              step="0.01"
              name="poidVert"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Ajouter
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Désignation</th>
                <th className="px-4 py-3 font-semibold w-28">Poids cuit</th>
                <th className="px-4 py-3 font-semibold w-28">Poids cru</th>
                <th className="px-4 py-3 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{t.designation}</td>
                  <td className="px-4 py-2.5 text-ink font-mono text-xs">
                    {t.poid?.toString() ?? "—"} kg
                  </td>
                  <td className="px-4 py-2.5 text-ink font-mono text-xs">
                    {t.poidVert?.toString() ?? "—"} kg
                  </td>
                  <td className="px-4 py-2.5">
                    {isAdmin && (
                      <form action={deleteTypeBrique.bind(null, t.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {types.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun type de brique défini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
