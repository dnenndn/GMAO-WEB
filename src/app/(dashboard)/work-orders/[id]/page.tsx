import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { urgenceColor, statutColor, OT_STATUTS } from "@/lib/constants";
import { updateStatut, addCommentaire, addOtRessourceOutil, addOtRessourcePdr, setOtCauseRealisation, setOtCentreCharge } from "../actions";
import { notFound } from "next/navigation";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [ot, types, articles, causes, centres] = await Promise.all([
    prisma.ordreTravail.findUnique({
      where: { id },
      include: {
        equipementRef: true,
        atelierRef: true,
        superviseur: true,
        classe: true,
        intervention: true,
        defaillance: true,
        demandeIntervention: true,
        commentaires: { orderBy: { date: "desc" } },
        ressourcesOutil: { include: { type: true }, orderBy: { dateSh: "desc" } },
        ressourcesPdr: { include: { article: true }, orderBy: { dateSh: "desc" } },
        causesRealisation: { include: { cause: true } },
        centreCharge: { include: { centreCharge: true } },
      },
    }),
    prisma.tabType.findMany({ orderBy: { designation: "asc" } }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreCauseRealisation.findMany({ orderBy: { designation: "asc" } }),
    prisma.parametreCentreCharge.findMany({ orderBy: { designation: "asc" } }),
  ]);

  if (!ot) notFound();

  const u = urgenceColor(ot.urgence);
  const s = statutColor(ot.statut);
  const nextStatuses = OT_STATUTS.filter((st) => st !== ot.statut);

  return (
    <>
      <PageHeader eyebrow="Ordre de travail" title={ot.nOt} />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex justify-end -mt-2">
          <a
            href={`/work-orders/${id}/diagnostic`}
            className="text-xs font-semibold text-steel-600 hover:text-steel-700"
          >
            Diagnostic (Ishikawa/AMDEC) →
          </a>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <StatusPill label={ot.urgence ?? "—"} fg={u.fg} bg={u.bg} />
          <StatusPill label={ot.statut} fg={s.fg} bg={s.bg} />
          <span className="text-xs text-muted font-mono ml-1">{ot.type}</span>
          {ot.demandeIntervention && (
            <a href={`/interventions/${ot.demandeIntervention.id}`} className="ml-2">
              <Nameplate>{ot.demandeIntervention.nDi}</Nameplate>
            </a>
          )}
        </div>

        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Atelier" value={ot.atelierRef?.designation ?? "—"} />
          <Row label="Équipement" value={ot.equipementRef?.designation ?? "—"} />
          <Row label="Défaillance" value={ot.defaillance?.anomalie ?? "—"} />
          <Row label="Classe" value={ot.classe?.designation ?? "—"} />
          <Row label="Intervention" value={ot.intervention?.intervention ?? "—"} />
          <Row label="Superviseur" value={ot.superviseur?.nom ?? "—"} />
          <Row
            label="Début prévu"
            value={ot.debutPrevu ? ot.debutPrevu.toLocaleString("fr-FR") : "—"}
          />
          <Row
            label="Début réel"
            value={
              ot.dateDebut
                ? `${ot.dateDebut.toLocaleDateString("fr-FR")} ${ot.heureDebut ?? ""}`
                : "—"
            }
          />
          <Row
            label="Fin réelle"
            value={
              ot.dateFin
                ? `${ot.dateFin.toLocaleDateString("fr-FR")} ${ot.heureFin ?? ""}`
                : "—"
            }
          />
          <Row label="Commentaire" value={ot.commentaire ?? "—"} />
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Changer le statut
          </div>
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((st) => (
              <form key={st} action={updateStatut.bind(null, id, st)}>
                <button
                  type="submit"
                  className="text-xs font-semibold border border-hairline text-ink px-3 py-1.5 rounded hover:border-steel-400 hover:bg-paper transition-colors"
                >
                  {st}
                </button>
              </form>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Outillage utilisé
            </div>
            <form
              action={addOtRessourceOutil.bind(null, id)}
              className="flex gap-2 mb-3"
            >
              <select
                name="idType"
                required
                className="flex-1 border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.designation}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="quantite"
                defaultValue={1}
                className="w-16 border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
              />
              <button
                type="submit"
                className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-1.5 hover:bg-paper transition-colors"
              >
                Ajouter
              </button>
            </form>
            <div className="space-y-1.5">
              {ot.ressourcesOutil.map((r) => (
                <div key={r.id} className="text-sm text-ink">
                  {r.type.designation} — {r.quantite}x
                  <span className="text-muted text-xs ml-2">
                    {r.dateSh.toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ))}
              {ot.ressourcesOutil.length === 0 && (
                <div className="text-sm text-muted">Aucun outil enregistré.</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Pièces de rechange utilisées
            </div>
            <form
              action={addOtRessourcePdr.bind(null, id)}
              className="flex gap-2 mb-3"
            >
              <select
                name="idArticle"
                required
                className="flex-1 border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.designation}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                name="quantite"
                defaultValue={1}
                className="w-16 border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
              />
              <button
                type="submit"
                className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-1.5 hover:bg-paper transition-colors"
              >
                Ajouter
              </button>
            </form>
            <div className="space-y-1.5">
              {ot.ressourcesPdr.map((r) => (
                <div key={r.id} className="text-sm text-ink">
                  {r.article.designation} — {r.quantite.toString()}x
                  <span className="text-muted text-xs ml-2">
                    {r.dateSh.toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ))}
              {ot.ressourcesPdr.length === 0 && (
                <div className="text-sm text-muted">Aucune pièce enregistrée.</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Cause de réalisation
            </div>
            <form action={setOtCauseRealisation.bind(null, id)} className="flex gap-2">
              <select
                name="idCause"
                defaultValue={ot.causesRealisation[0]?.idCause ?? ""}
                className="flex-1 border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
              >
                <option value="">—</option>
                {causes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.designation}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-1.5 hover:bg-paper transition-colors"
              >
                Enregistrer
              </button>
            </form>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Centre de charge
            </div>
            <form action={setOtCentreCharge.bind(null, id)} className="flex gap-2">
              <select
                name="idCentreCharge"
                defaultValue={ot.centreCharge[0]?.idCentreCharge ?? ""}
                className="flex-1 border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
              >
                <option value="">—</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.designation}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-1.5 hover:bg-paper transition-colors"
              >
                Enregistrer
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Commentaires
          </div>
          <form action={addCommentaire.bind(null, id)} className="flex gap-2 mb-4">
            <input
              type="text"
              name="texte"
              placeholder="Ajouter un commentaire…"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>
          <div className="space-y-3">
            {ot.commentaires.map((c) => (
              <div key={c.id} className="border-l-2 border-hairline pl-3">
                <div className="text-sm text-ink">{c.texte}</div>
                <div className="text-xs text-muted mt-0.5">
                  {c.auteur} · {c.date.toLocaleString("fr-FR")}
                </div>
              </div>
            ))}
            {ot.commentaires.length === 0 && (
              <div className="text-sm text-muted">Aucun commentaire.</div>
            )}
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
