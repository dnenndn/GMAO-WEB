import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import {
  setOtDiagnosticM,
  addOtDiagnosticSymptome,
  removeOtDiagnosticSymptome,
  addOtDiagnosticDetection,
  removeOtDiagnosticDetection,
  addOtDiagnosticDef,
  removeOtDiagnosticDef,
  addOtDiagnosticOperation,
  closeOtDiagnosticOperation,
} from "../../actions";
import { notFound } from "next/navigation";

export default async function WorkOrderDiagnosticPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [ot, anomalies, symptomes] = await Promise.all([
    prisma.ordreTravail.findUnique({
      where: { id },
      include: {
        diagnosticM: { include: { defaillance: true } },
        diagnosticSymptome: { include: { symptome: true, defaillance: true } },
        diagnosticDetection: { include: { defaillance: true } },
        diagnosticDef: { include: { defaillance: true } },
        diagnosticOperation: { include: { operation: true } },
      },
    }),
    prisma.parametreAnomalie.findMany({ where: { deleted: false }, orderBy: { anomalie: "asc" } }),
    prisma.symptome.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  if (!ot) notFound();

  const diagnosticPrincipal = ot.diagnosticM[0];

  // Operations available depend on the confirmed failure mode(s) —
  // gathered from the root diagnostic entry plus any confirmed causes.
  const defaillanceIds = [
    ...(diagnosticPrincipal ? [diagnosticPrincipal.idDefaillance] : []),
    ...ot.diagnosticDef.map((d) => d.idDefaillance),
  ];
  const operations = defaillanceIds.length
    ? await prisma.operationDiagnostic.findMany({
        where: { idDefaillance: { in: defaillanceIds }, deleted: false },
      })
    : [];

  return (
    <>
      <PageHeader eyebrow="Ordre de travail" title={`${ot.nOt} — Diagnostic`} />
      <div className="p-8 max-w-3xl space-y-8">
        <div className="flex justify-between -mt-2">
          <a
            href={`/work-orders/${id}`}
            className="text-xs font-semibold text-steel-600 hover:text-steel-700"
          >
            ← Retour à l&apos;OT
          </a>
          <a
            href="/work-orders/settings/diagnostic"
            className="text-xs font-semibold text-steel-600 hover:text-steel-700"
          >
            Gérer symptômes/opérations →
          </a>
        </div>
        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Mode de défaillance identifié
          </div>
          <form
            action={setOtDiagnosticM.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Défaillance <span className="text-urgent">*</span>
              </label>
              <select
                name="idDefaillance"
                required
                defaultValue={diagnosticPrincipal?.idDefaillance ?? ""}
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
            <div className="w-40">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Classification
              </label>
              <input
                type="text"
                name="typeM"
                defaultValue={diagnosticPrincipal?.typeM ?? ""}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Enregistrer
            </button>
          </form>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Symptômes observés
          </div>
          <form
            action={addOtDiagnosticSymptome.bind(null, id)}
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
                Défaillance associée <span className="text-urgent">*</span>
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
              Ajouter
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {ot.diagnosticSymptome.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <Nameplate>{s.symptome.designation}</Nameplate>
                <form action={removeOtDiagnosticSymptome.bind(null, s.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {ot.diagnosticSymptome.length === 0 && (
              <span className="text-sm text-muted">Aucun symptôme enregistré.</span>
            )}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Détection
          </div>
          <form
            action={addOtDiagnosticDetection.bind(null, id)}
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
            <div className="w-32">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Type (code) <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                name="typeD"
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
          <div className="flex flex-wrap gap-2">
            {ot.diagnosticDetection.map((d) => (
              <div key={d.id} className="flex items-center gap-1.5">
                <Nameplate>
                  {d.defaillance.anomalie} (type {d.typeD})
                </Nameplate>
                <form action={removeOtDiagnosticDetection.bind(null, d.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {ot.diagnosticDetection.length === 0 && (
              <span className="text-sm text-muted">Aucune détection enregistrée.</span>
            )}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Causes confirmées (chaîne de causalité)
          </div>
          <form
            action={addOtDiagnosticDef.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Cause <span className="text-urgent">*</span>
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
              Ajouter
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {ot.diagnosticDef.map((d) => (
              <div key={d.id} className="flex items-center gap-1.5">
                <Nameplate>{d.defaillance.anomalie}</Nameplate>
                <form action={removeOtDiagnosticDef.bind(null, d.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {ot.diagnosticDef.length === 0 && (
              <span className="text-sm text-muted">Aucune cause confirmée.</span>
            )}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Opérations de diagnostic
          </div>
          {operations.length > 0 && (
            <form
              action={addOtDiagnosticOperation.bind(null, id)}
              className="flex gap-2 mb-3"
            >
              <select
                name="idOperation"
                required
                className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {operations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.designation}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
              >
                Lancer
              </button>
            </form>
          )}
          {operations.length === 0 && (
            <p className="text-sm text-muted mb-3">
              Aucune opération de diagnostic n&apos;est cataloguée pour les
              défaillances identifiées ci-dessus.
            </p>
          )}
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Opération</th>
                  <th className="px-4 py-3 font-semibold">Début</th>
                  <th className="px-4 py-3 font-semibold">Fin</th>
                  <th className="px-4 py-3 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody>
                {ot.diagnosticOperation.map((o) => (
                  <tr key={o.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{o.operation.designation}</td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {o.debut.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {o.fin.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={closeOtDiagnosticOperation.bind(null, o.id, id)}>
                        <button type="submit" className="text-xs text-steel-600 hover:underline">
                          Clôturer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {ot.diagnosticOperation.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune opération lancée.
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
