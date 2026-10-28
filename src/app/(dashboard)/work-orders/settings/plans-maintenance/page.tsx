import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import { createPlanMaintenance, deletePlanMaintenance } from "../../actions";

export default async function PlansMaintenanceSettingsPage() {
  const plans = await prisma.planMaintenance.findMany({
    where: { deleted: false },
    orderBy: { designation: "asc" },
  });

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Maintenance — Paramètres" title="Plans de maintenance" />
      <div className="p-8 max-w-2xl space-y-6">
        <p className="text-sm text-muted -mt-2">
          Modèles de plans de maintenance — une liste de référence
          standalone dans la base d&apos;origine, sans lien confirmé vers
          une autre table.
        </p>
        <form
          action={createPlanMaintenance}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end"
        >
          <div className="w-32">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="code"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1">
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
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-muted text-xs">{p.code}</td>
                  <td className="px-4 py-2.5 text-ink">{p.designation}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin && (
                      <form action={deletePlanMaintenance.bind(null, p.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun plan défini.
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
