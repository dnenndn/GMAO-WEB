import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { addSousFamille, deleteSousFamille } from "../../actions";
import { getSession } from "@/lib/auth";

export default async function SousFamillesSettingsPage() {
  const [sousFamilles, familles] = await Promise.all([
    prisma.sousFamille.findMany({
      where: { deleted: false },
      include: { famille: true },
      orderBy: { designation: "asc" },
    }),
    prisma.famille.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Inventaire — Paramètres" title="Sous-familles" />
      <div className="p-8 max-w-xl space-y-6">
        <form
          action={addSousFamille}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[160px]">
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
          <div className="w-40">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Famille <span className="text-urgent">*</span>
            </label>
            <select
              name="idFamille"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {familles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.designation}
                </option>
              ))}
            </select>
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
            <tbody>
              {sousFamilles.map((sf) => (
                <tr key={sf.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{sf.designation}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">
                    {sf.famille?.designation ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin && (
                      <form action={deleteSousFamille.bind(null, sf.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {sousFamilles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune sous-famille définie.
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
