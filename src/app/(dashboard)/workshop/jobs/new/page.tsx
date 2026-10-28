import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createJob } from "../../actions";

export default async function NewWorkshopJobPage() {
  const [equipements, intervenants, typesPiece, priorites, conceptions] = await Promise.all([
    prisma.equipement.findMany({ where: { deleted: false }, orderBy: { designation: "asc" }, take: 200 }),
    prisma.intervenant.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
    prisma.atelierParametrePiece.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.atelierParametrePriorite.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.atelierParametreConception.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Atelier" title="Nouvel ordre de fabrication" />
      <form action={createJob} className="p-8 max-w-2xl space-y-5">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Équipement concerné
          </label>
          <select
            name="equipement"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            <option value="">—</option>
            {equipements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code ? `${e.code} — ` : ""}
                {e.designation}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              N° Plan
            </label>
            <input
              type="text"
              name="nPlan"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              N° Révision
            </label>
            <input
              type="text"
              name="nRevision"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Quantité
            </label>
            <input
              type="number"
              step="0.01"
              name="quantite"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Dimension
            </label>
            <input
              type="text"
              name="dimension"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Date prévue
            </label>
            <input
              type="date"
              name="datePrevu"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Demandeur
          </label>
          <select
            name="idDemandeur"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            <option value="">—</option>
            {intervenants.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Type de pièce
            </label>
            <select
              name="idParametrePiece"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {typesPiece.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.designation}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Priorité
            </label>
            <select
              name="idParametrePriorite"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {priorites.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.designation}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Conception
            </label>
            <select
              name="idParametreConception"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {conceptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.designation}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer l'ordre de fabrication
          </button>
        </div>
      </form>
    </>
  );
}
