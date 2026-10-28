import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import {
  createCauseRealisation,
  deleteCauseRealisation,
  createCentreCharge,
  deleteCentreCharge,
} from "../../actions";

export default async function CauseCentreChargePage() {
  const [causes, centres] = await Promise.all([
    prisma.parametreCauseRealisation.findMany({ orderBy: { designation: "asc" } }),
    prisma.parametreCentreCharge.findMany({ orderBy: { designation: "asc" } }),
  ]);

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Maintenance — Paramètres" title="Cause de réalisation & Centre de charge" />
      <div className="p-8 max-w-3xl space-y-10">
        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Causes de réalisation
          </div>
          <form action={createCauseRealisation} className="flex gap-2 mb-3">
            <input
              type="text"
              name="code"
              placeholder="Code"
              className="w-28 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="text"
              name="designation"
              required
              placeholder="Désignation"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
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
                {causes.map((c) => (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{c.designation}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{c.code}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin && (
                        <form action={deleteCauseRealisation.bind(null, c.id)}>
                          <button type="submit" className="text-xs text-urgent hover:underline">
                            Supprimer
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {causes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted text-sm">
                      Aucune cause définie.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Centres de charge
          </div>
          <form action={createCentreCharge} className="flex gap-2 mb-3">
            <input
              type="text"
              name="code"
              placeholder="Code"
              className="w-28 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="text"
              name="designation"
              required
              placeholder="Désignation"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="number"
              step="0.01"
              name="budget"
              placeholder="Budget"
              className="w-32 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
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
                {centres.map((c) => (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{c.designation}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{c.code}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">
                      {c.budget != null ? `${c.budget.toString()} DT` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin && (
                        <form action={deleteCentreCharge.bind(null, c.id)}>
                          <button type="submit" className="text-xs text-urgent hover:underline">
                            Supprimer
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {centres.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted text-sm">
                      Aucun centre de charge défini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
