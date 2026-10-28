import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { addTabType, deleteTabType } from "../../actions";
import { getSession } from "@/lib/auth";

export default async function TypesSettingsPage() {
  const types = await prisma.tabType.findMany({ orderBy: { designation: "asc" } });

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Outillage — Paramètres" title="Types d'outils" />
      <div className="p-8 max-w-xl space-y-6">
        <form
          action={addTabType}
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
          <div className="w-32">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code
            </label>
            <input
              type="text"
              name="code"
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
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{t.designation}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{t.code ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin && (
                      <form action={deleteTabType.bind(null, t.id)}>
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
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun type défini.
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
