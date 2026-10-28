import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import {
  createSymptome,
  deleteSymptome,
  linkSymptomeDefaillance,
  unlinkSymptomeDefaillance,
  createOperationDiagnostic,
  deleteOperationDiagnostic,
  linkRelationAnomalie,
  unlinkRelationAnomalie,
} from "../../actions";

export default async function DiagnosticSettingsPage() {
  const [symptomes, anomalies, operations, symptomeDefaillances, relationsAnomalie] =
    await Promise.all([
      prisma.symptome.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
      prisma.parametreAnomalie.findMany({ where: { deleted: false }, orderBy: { anomalie: "asc" } }),
      prisma.operationDiagnostic.findMany({
        where: { deleted: false },
        include: { defaillance: true },
        orderBy: { designation: "asc" },
      }),
      prisma.symptomeDefaillance.findMany({
        include: { symptome: true, defaillance: true },
      }),
      prisma.relationAnomalie.findMany({
        include: {
          anomalie: true,
          parent: true,
        },
      }),
    ]);

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Maintenance — Paramètres" title="Diagnostic (Ishikawa/AMDEC)" />
      <div className="p-8 max-w-4xl space-y-10">
        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Symptômes
          </div>
          <form
            action={createSymptome}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
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
                {symptomes.map((s) => (
                  <tr key={s.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{s.designation}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{s.code}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin && (
                        <form action={deleteSymptome.bind(null, s.id)}>
                          <button type="submit" className="text-xs text-urgent hover:underline">
                            Supprimer
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {symptomes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                      Aucun symptôme défini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Symptômes associés à une défaillance
          </div>
          <p className="text-xs text-muted mb-3">
            Détermine quels symptômes seront proposés lors du diagnostic
            d&apos;un OT, une fois la défaillance identifiée.
          </p>
          <form
            action={linkSymptomeDefaillance}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Symptôme <span className="text-urgent">*</span>
              </label>
              <select
                name="idSymptome"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {symptomes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Défaillance <span className="text-urgent">*</span>
              </label>
              <select
                name="idDefaillance"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {anomalies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.anomalie}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Associer
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {symptomeDefaillances.map((sd) => (
              <div key={sd.id} className="flex items-center gap-1.5 bg-surface border border-hairline rounded-full px-3 py-1 text-xs">
                <span className="text-ink">
                  {sd.symptome.designation} → {sd.defaillance.anomalie}
                </span>
                <form action={unlinkSymptomeDefaillance.bind(null, sd.id)}>
                  <button type="submit" className="text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {symptomeDefaillances.length === 0 && (
              <span className="text-sm text-muted">Aucune association définie.</span>
            )}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Opérations de diagnostic
          </div>
          <p className="text-xs text-muted mb-3">
            Les tests/vérifications à effectuer pour une défaillance donnée
            — proposées lors du diagnostic d&apos;un OT.
          </p>
          <form
            action={createOperationDiagnostic}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Défaillance <span className="text-urgent">*</span>
              </label>
              <select
                name="idDefaillance"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {anomalies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.anomalie}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Désignation <span className="text-urgent">*</span>
              </label>
              <input
                type="text"
                name="designation"
                required
                placeholder="ex : Vérifier niveau d'huile"
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
                {operations.map((o) => (
                  <tr key={o.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-muted text-xs">{o.defaillance.anomalie}</td>
                    <td className="px-4 py-2.5 text-ink">{o.designation}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin && (
                        <form action={deleteOperationDiagnostic.bind(null, o.id)}>
                          <button type="submit" className="text-xs text-urgent hover:underline">
                            Supprimer
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {operations.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune opération définie.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Relations entre anomalies (cause racine)
          </div>
          <p className="text-xs text-muted mb-3">
            Construit un arbre de causes — associe une défaillance à une
            défaillance &quot;parente&quot; sous-jacente (approche
            Ishikawa/5 Pourquoi).
          </p>
          <form
            action={linkRelationAnomalie}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Défaillance <span className="text-urgent">*</span>
              </label>
              <select
                name="idAnomalie"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {anomalies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.anomalie}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Cause racine (parent) <span className="text-urgent">*</span>
              </label>
              <select
                name="idParent"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {anomalies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.anomalie}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Associer
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {relationsAnomalie.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5 bg-surface border border-hairline rounded-full px-3 py-1 text-xs">
                <span className="text-ink">
                  {r.anomalie.anomalie} ← {r.parent.anomalie}
                </span>
                <form action={unlinkRelationAnomalie.bind(null, r.id)}>
                  <button type="submit" className="text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {relationsAnomalie.length === 0 && (
              <span className="text-sm text-muted">Aucune relation définie.</span>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
