import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createBrm } from "../../actions";

export default async function NewBrmPage() {
  const bsms = await prisma.bsm.findMany({
    where: { validation: true },
    orderBy: { dateBsm: "desc" },
    take: 100,
  });
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Inventaire" title="Nouveau bon de retour magasin" />
      <form action={createBrm} className="p-8 max-w-md space-y-5">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateRetour"
            defaultValue={now}
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Retourné par
          </label>
          <input
            type="text"
            name="retourPar"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            BSM d&apos;origine (optionnel)
          </label>
          <select
            name="idBsm"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            <option value="">—</option>
            {bsms.map((b) => (
              <option key={b.id} value={b.id}>
                BSM-{String(b.id).padStart(4, "0")} — {b.nOt ?? b.dateBsm.toLocaleDateString("fr-FR")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Type de retour
          </label>
          <input
            type="text"
            name="typeRetour"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer le BRM
          </button>
        </div>
      </form>
    </>
  );
}
