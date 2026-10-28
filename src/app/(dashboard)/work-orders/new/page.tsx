import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createOrdreTravail } from "../actions";
import { URGENCES, OT_TYPES } from "@/lib/constants";

export default async function NewWorkOrderPage() {
  const [equipements, classes, superviseurs, interventions] = await Promise.all([
    prisma.equipement.findMany({ where: { deleted: false }, orderBy: { designation: "asc" }, take: 200 }),
    prisma.parametreClasseIntervention.findMany({ orderBy: { designation: "asc" } }),
    prisma.intervenant.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
    prisma.parametreIntervention.findMany({ where: { deleted: false }, orderBy: { intervention: "asc" } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Maintenance" title="Nouvel ordre de travail" />
      <form action={createOrdreTravail} className="p-8 max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Type d'intervention <span className="text-urgent">*</span>
            </label>
            <select name="type" required className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface">
              {OT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Urgence <span className="text-urgent">*</span>
            </label>
            <select name="urgence" required className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface">
              {URGENCES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Équipement
          </label>
          <select name="equipement" className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface">
            <option value="">Sélectionner…</option>
            {equipements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code ? `${e.code} — ` : ""}{e.designation}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Classe d'intervention
            </label>
            <select name="idClasse" className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface">
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.designation}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Superviseur
            </label>
            <select name="idSuperviseur" className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface">
              <option value="">—</option>
              {superviseurs.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Intervention
          </label>
          <select name="idIntervention" className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface">
            <option value="">—</option>
            {interventions.map((i) => (
              <option key={i.id} value={i.id}>{i.intervention}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Début prévu
          </label>
          <input
            type="datetime-local"
            name="debutPrevu"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Commentaire
          </label>
          <textarea
            name="commentaire"
            rows={3}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer l'ordre de travail
          </button>
        </div>
      </form>
    </>
  );
}
