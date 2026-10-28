import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { checkoutOutil, returnOutil, linkOutilUtilisation, unlinkOutilUtilisation } from "../../actions";
import { notFound } from "next/navigation";

export default async function OutilDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [outil, intervenants, utilisations] = await Promise.all([
    prisma.outil.findUnique({
      where: { id },
      include: {
        secteur: true,
        type: true,
        affectations: {
          include: { intervenant: true },
          orderBy: { id: "desc" },
          take: 20,
        },
        utilisations: { include: { utilisation: true } },
      },
    }),
    prisma.intervenant.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
    prisma.utilisation.findMany({ orderBy: { designation: "asc" } }),
  ]);

  if (!outil) notFound();

  const activeAffectation = outil.affectations.find((a) => a.encours);

  return (
    <>
      <PageHeader
        eyebrow="Outil"
        title={`${outil.codeOutils ?? `OUT-${outil.id}`} — ${outil.designation}`}
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="flex gap-2 items-center">
          <StatusPill
            label={outil.statut ? "Disponible" : "En utilisation"}
            fg={outil.statut ? "#3D7A4E" : "#C97A0C"}
            bg={outil.statut ? "#E7F2E9" : "#FBF0DE"}
          />
        </div>

        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Secteur" value={outil.secteur?.designation ?? "—"} />
          <Row label="Type" value={outil.type?.designation ?? "—"} />
          <Row label="N° série" value={outil.numSerie ?? "—"} />
          <Row label="N° modèle" value={outil.numModele ?? "—"} />
          <Row label="Fabricant" value={outil.fabriquant ?? "—"} />
          <Row label="État" value={outil.etatOutil ?? "—"} />
        </div>

        {outil.statut ? (
          <form
            action={checkoutOutil.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
          >
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Attribué à <span className="text-urgent">*</span>
              </label>
              <select
                name="idIntervenant"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {intervenants.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                N° OT (optionnel)
              </label>
              <input
                type="text"
                name="nOt"
                placeholder="ex : OT-2026-0001"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Commentaire
              </label>
              <input
                type="text"
                name="commentaire"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Sortir l&apos;outil
            </button>
          </form>
        ) : (
          activeAffectation && (
            <div className="bg-surface border border-hairline rounded p-4 flex items-center justify-between">
              <div className="text-sm text-ink">
                Actuellement chez{" "}
                <span className="font-semibold">{activeAffectation.intervenant?.nom}</span>
                {activeAffectation.nOt && (
                  <>
                    {" "}
                    — <Nameplate>{activeAffectation.nOt}</Nameplate>
                  </>
                )}
              </div>
              <form action={returnOutil.bind(null, activeAffectation.id, id)}>
                <button
                  type="submit"
                  className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
                >
                  Retourner l&apos;outil
                </button>
              </form>
            </div>
          )
        )}

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Utilisations
          </div>
          <form action={linkOutilUtilisation.bind(null, id)} className="flex gap-2 mb-3">
            <select
              name="idUtilisation"
              required
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {utilisations.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.designation}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-2 hover:bg-paper transition-colors"
            >
              Associer
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {outil.utilisations.map((ou) => (
              <div key={ou.id} className="flex items-center gap-1.5">
                <Nameplate>{ou.utilisation.designation}</Nameplate>
                <form action={unlinkOutilUtilisation.bind(null, ou.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {outil.utilisations.length === 0 && (
              <span className="text-sm text-muted">Aucune association.</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Historique
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Intervenant</th>
                  <th className="px-4 py-3 font-semibold">Sortie</th>
                  <th className="px-4 py-3 font-semibold">Retour</th>
                  <th className="px-4 py-3 font-semibold">OT</th>
                </tr>
              </thead>
              <tbody>
                {outil.affectations.map((a) => (
                  <tr key={a.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">{a.intervenant?.nom ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {a.dateDebut?.toLocaleDateString("fr-FR")} {a.heureDebut}
                    </td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {a.dateFin ? `${a.dateFin.toLocaleDateString("fr-FR")} ${a.heureFin}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{a.nOt ?? "—"}</td>
                  </tr>
                ))}
                {outil.affectations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                      Aucun historique.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 px-4 py-3">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="col-span-2 text-sm text-ink">{value}</div>
    </div>
  );
}
