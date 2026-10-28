import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { addProdEquipement, deleteProdEquipement } from "../../actions";
import { UNITES_PRODUCTION } from "@/lib/constants";
import { getSession } from "@/lib/auth";

export default async function ProdEquipementsSettingsPage() {
  const [assigned, allEquipements] = await Promise.all([
    prisma.prodEquipement.findMany({
      include: { equipement: true },
      orderBy: [{ uniteProduction: "asc" }],
    }),
    prisma.equipement.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  const assignedIds = new Set(assigned.map((a) => a.idEquipement));
  const available = allEquipements.filter((e) => !assignedIds.has(e.id));

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Production — Paramètres" title="Équipements par section" />
      <div className="p-8 max-w-2xl space-y-6">
        <form
          action={addProdEquipement}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Équipement <span className="text-urgent">*</span>
            </label>
            <select
              name="idEquipement"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code ? `${e.code} — ` : ""}
                  {e.designation}
                </option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Section <span className="text-urgent">*</span>
            </label>
            <select
              name="uniteProduction"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {UNITES_PRODUCTION.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Assigner
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Équipement</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((row) => (
                <tr key={row.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{row.equipement.designation}</td>
                  <td className="px-4 py-2.5 text-ink">{row.uniteProduction}</td>
                  <td className="px-4 py-2.5">
                    {isAdmin && (
                      <form action={deleteProdEquipement.bind(null, row.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Retirer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {assigned.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun équipement assigné.
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
