import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { addChauffeur, deleteChauffeur } from "../../actions";
import { getSession } from "@/lib/auth";

export default async function DriversSettingsPage() {
  const chauffeurs = await prisma.chauffeur.findMany({
    where: { deleted: false },
    orderBy: { nom: "asc" },
  });

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Flotte — Paramètres" title="Chauffeurs" />
      <div className="p-8 max-w-xl space-y-6">
        <form
          action={addChauffeur}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[160px]">
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
              {chauffeurs.map((c) => (
                <tr key={c.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{c.nom}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{c.code ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin && (
                      <form action={deleteChauffeur.bind(null, c.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {chauffeurs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun chauffeur défini.
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
