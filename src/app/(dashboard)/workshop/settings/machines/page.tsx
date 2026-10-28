import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { addMachine, deleteMachine } from "../../actions";
import { getSession } from "@/lib/auth";

export default async function MachinesSettingsPage() {
  const machines = await prisma.atelierMachine.findMany({
    where: { deleted: false },
    orderBy: { designation: "asc" },
  });

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Atelier — Paramètres" title="Machines" />
      <div className="p-8 max-w-xl space-y-6">
        <form
          action={addMachine}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end"
        >
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
              {machines.map((m) => (
                <tr key={m.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{m.designation}</td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin && (
                      <form action={deleteMachine.bind(null, m.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {machines.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune machine définie.
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
