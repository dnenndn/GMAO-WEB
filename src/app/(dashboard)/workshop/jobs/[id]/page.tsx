import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { JobTabs } from "@/components/JobTabs";
import { atelierEtatColor, ATELIER_ETATS } from "@/lib/constants";
import {
  updateJobEtat,
  linkArticle,
  linkBsm,
  addJobCommentaire,
  addJobFichier,
  deleteJobFichier,
  addJobReception,
} from "../../actions";
import { notFound } from "next/navigation";

export default async function WorkshopJobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const job = await prisma.atelierCreer.findUnique({
    where: { id },
    include: {
      equipementRef: true,
      demandeur: true,
      parametrePiece: true,
      parametrePriorite: true,
      parametreConception: true,
      article: true,
      historique: { orderBy: { dateChangement: "desc" } },
      bsms: { include: { bsm: true } },
      commentaires: { orderBy: { date: "desc" } },
      fichiers: { orderBy: { id: "desc" } },
      receptions: { orderBy: { dateReception: "desc" } },
    },
  });

  if (!job) notFound();

  const [articles, bsmsDisponibles] = await Promise.all([
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" }, take: 200 }),
    prisma.bsm.findMany({ orderBy: { dateBsm: "desc" }, take: 50 }),
  ]);

  const e = atelierEtatColor(job.etat);
  const nextEtats = ATELIER_ETATS.filter((et) => et !== job.etat);

  return (
    <>
      <PageHeader eyebrow="Ordre de fabrication" title={job.nOf ?? `OF-${job.id}`} />
      <JobTabs id={id} active="" />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap">
          <StatusPill label={job.etat} fg={e.fg} bg={e.bg} />
          {job.parametrePriorite && (
            <span className="text-xs text-muted">Priorité : {job.parametrePriorite.designation}</span>
          )}
        </div>

        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Équipement" value={job.equipementRef?.designation ?? "—"} />
          <Row label="Demandeur" value={job.demandeur?.nom ?? "—"} />
          <Row
            label="Plan / Révision"
            value={job.nPlan ? `${job.nPlan} / ${job.nRevision ?? "—"}` : "—"}
          />
          <Row label="Quantité" value={job.quantite?.toString() ?? "—"} />
          <Row label="Dimension" value={job.dimension ?? "—"} />
          <Row label="Type de pièce" value={job.parametrePiece?.designation ?? "—"} />
          <Row label="Conception" value={job.parametreConception?.designation ?? "—"} />
          <Row
            label="Date prévue"
            value={job.datePrevu ? job.datePrevu.toLocaleDateString("fr-FR") : "—"}
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Changer l&apos;état
          </div>
          <div className="flex gap-2 flex-wrap">
            {nextEtats.map((et) => (
              <form key={et} action={updateJobEtat.bind(null, id, et)}>
                <button
                  type="submit"
                  className="text-xs font-semibold border border-hairline text-ink px-3 py-1.5 rounded hover:border-steel-400 hover:bg-paper transition-colors"
                >
                  {et}
                </button>
              </form>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Article résultant (stock)
            </div>
            <form action={linkArticle.bind(null, id)} className="flex gap-2">
              <select
                name="idArticle"
                defaultValue={job.idArticle?.toString() ?? ""}
                className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Non lié</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codeArticle ? `${a.codeArticle} — ` : ""}
                    {a.designation}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-2 hover:bg-paper transition-colors whitespace-nowrap"
              >
                Lier
              </button>
            </form>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Matière première (BSM)
            </div>
            <form action={linkBsm.bind(null, id)} className="flex gap-2">
              <select
                name="idBsm"
                required
                className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {bsmsDisponibles.map((b) => (
                  <option key={b.id} value={b.id}>
                    BSM-{String(b.id).padStart(4, "0")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-2 hover:bg-paper transition-colors whitespace-nowrap"
              >
                Lier
              </button>
            </form>
            {job.bsms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {job.bsms.map((b) => (
                  <a key={b.id} href={`/inventory/bsm/${b.idBsm}`}>
                    <Nameplate>BSM-{String(b.idBsm).padStart(4, "0")}</Nameplate>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Historique des états
          </div>
          <div className="space-y-2">
            {job.historique.map((h) => (
              <div key={h.id} className="flex gap-2 items-center text-sm">
                <Nameplate>{h.etat}</Nameplate>
                <span className="text-muted text-xs">
                  {h.dateChangement.toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Commentaires
            </div>
            <form action={addJobCommentaire.bind(null, id)} className="flex gap-2 mb-4">
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
              {job.commentaires.map((c) => (
                <div key={c.id} className="border-l-2 border-hairline pl-3">
                  <div className="text-sm text-ink">{c.texte}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {c.auteur} · {c.date.toLocaleString("fr-FR")}
                  </div>
                </div>
              ))}
              {job.commentaires.length === 0 && (
                <div className="text-sm text-muted">Aucun commentaire.</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Fichiers joints
            </div>
            <form action={addJobFichier.bind(null, id)} className="flex gap-2 mb-4">
              <input
                type="text"
                name="adresse"
                placeholder="Chemin ou URL du fichier…"
                className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
              <button
                type="submit"
                className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
              >
                Ajouter
              </button>
            </form>
            <div className="space-y-2">
              {job.fichiers.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <a
                    href={f.adresse ?? "#"}
                    className="text-steel-600 hover:underline truncate max-w-[220px]"
                  >
                    {f.adresse}
                  </a>
                  <form action={deleteJobFichier.bind(null, f.id, id)}>
                    <button type="submit" className="text-xs text-urgent hover:underline">
                      Supprimer
                    </button>
                  </form>
                </div>
              ))}
              {job.fichiers.length === 0 && (
                <div className="text-sm text-muted">Aucun fichier joint.</div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Réceptions
          </div>
          <form action={addJobReception.bind(null, id)} className="flex gap-2 mb-3 flex-wrap">
            <input
              type="date"
              name="dateReception"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
            />
            <input
              type="number"
              step="0.01"
              name="qtRecu"
              placeholder="Qté reçue"
              required
              className="w-28 border border-hairline rounded px-2 py-1.5 text-sm font-mono bg-surface"
            />
            <input
              type="text"
              name="etat"
              placeholder="État"
              className="flex-1 min-w-[120px] border border-hairline rounded px-2 py-1.5 text-sm bg-surface"
            />
            <button
              type="submit"
              className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-1.5 hover:bg-paper transition-colors"
            >
              Ajouter
            </button>
          </form>
          <div className="space-y-1.5">
            {job.receptions.map((r) => (
              <div key={r.id} className="text-sm text-ink">
                {r.qtRecu.toString()} — {r.etat ?? "—"}
                <span className="text-muted text-xs ml-2">
                  {r.dateReception.toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
            {job.receptions.length === 0 && (
              <div className="text-sm text-muted">Aucune réception enregistrée.</div>
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
