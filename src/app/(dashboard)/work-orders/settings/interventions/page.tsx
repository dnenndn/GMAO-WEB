import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { getSession } from "@/lib/auth";
import { createParametreIntervention, deleteParametreIntervention } from "../../actions";

export default async function InterventionsSettingsPage() {
  const interventions = await prisma.parametreIntervention.findMany({
    where: { deleted: false },
    include: { _count: { select: { operations: true } } },
    orderBy: { intervention: "asc" },
  });

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Maintenance — Paramètres" title="Types d'intervention" />
      <div className="p-8 max-w-2xl space-y-6">
        <p className="text-sm text-muted -mt-2">
          Types d&apos;intervention corrective utilisés sur les ordres de
          travail. Chaque type peut avoir sa propre checklist
          d&apos;opérations de maintenance.
        </p>
        <form
          action={createParametreIntervention}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code
            </label>
            <input
              type="text"
              name="code"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Intervention <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="intervention"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Type
            </label>
            <input
              type="text"
              name="typpe"
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
              {interventions.map((i) => (
                <tr key={i.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5">
                    <a href={`/work-orders/settings/interventions/${i.id}`}>
                      <Nameplate>{i.intervention}</Nameplate>
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs">{i.code ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">
                    {i._count.operations} opération(s)
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin && (
                      <form action={deleteParametreIntervention.bind(null, i.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {interventions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun type d&apos;intervention défini.
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
