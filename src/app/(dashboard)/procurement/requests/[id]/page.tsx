import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { daStatutColor } from "@/lib/constants";
import { addDaLigne, confirmerDa, refuserDa, reporterDa, cloturerDa } from "../../actions";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function PurchaseRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [da, articles, admin, cloture, confirmation, modification, refus, report, retour, vues] = await Promise.all([
    prisma.demandeAchat.findUnique({
      where: { id },
      include: {
        lignes: { include: { article: true, commandeLignes: true } },
        actions: { orderBy: { date: "desc" } },
      },
    }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.daAdministrateur.findMany({ where: { idDa: id } }),
    prisma.daCloturer.findMany({ where: { idDa: id } }),
    prisma.daConfirmer.findMany({ where: { idDa: id } }),
    prisma.daModifier.findMany({ where: { idDa: id } }),
    prisma.daRefuser.findMany({ where: { idDa: id } }),
    prisma.daReporter.findMany({ where: { idDa: id } }),
    prisma.daRetourner.findMany({ where: { idDa: id } }),
    prisma.daVue.findMany({ where: { idDa: id } }),
  ]);

  if (!da) notFound();

  // "par" on each of the 8 real audit tables is an unconfirmed FK (see
  // the schema comment) — resolved here by trying Intervenant first,
  // then Utilisateur, rather than a guessed relation. Names are looked
  // up once for every id that appears across all 8 tables' rows for
  // this DA, not per-row, to avoid N+1 queries.
  const allParIds = new Set<number>();
  for (const r of [...admin, ...cloture, ...confirmation, ...modification, ...refus, ...report, ...retour]) {
    if ("envoyerPar" in r && r.envoyerPar != null) allParIds.add(r.envoyerPar);
    if ("cloturerPar" in r && r.cloturerPar != null) allParIds.add(r.cloturerPar);
    if ("confirmerPar" in r && r.confirmerPar != null) allParIds.add(r.confirmerPar);
    if ("modifierPar" in r && r.modifierPar != null) allParIds.add(r.modifierPar);
    if ("refuserPar" in r && r.refuserPar != null) allParIds.add(r.refuserPar);
    if ("reporterPar" in r && r.reporterPar != null) allParIds.add(r.reporterPar);
    if ("retournerPar" in r && r.retournerPar != null) allParIds.add(r.retournerPar);
  }
  for (const v of vues) if (v.vuePar != null) allParIds.add(v.vuePar);

  const [intervenants, utilisateurs] = await Promise.all([
    prisma.intervenant.findMany({ where: { id: { in: [...allParIds] } } }),
    prisma.utilisateur.findMany({ where: { id: { in: [...allParIds] } } }),
  ]);
  const intervenantById = new Map(intervenants.map((i) => [i.id, i.nom]));
  const utilisateurById = new Map(utilisateurs.map((u) => [u.id, u.login]));
  function resolvePar(parId: number | null): string {
    if (parId == null) return "—";
    return intervenantById.get(parId) ?? utilisateurById.get(parId) ?? `#${parId}`;
  }

  type TimelineEntry = { label: string; par: string; date: Date; extra?: string };
  const timeline: TimelineEntry[] = [
    ...admin.map((r): TimelineEntry => ({ label: "Envoyée (admin)", par: resolvePar(r.envoyerPar), date: r.dateEnvoyer })),
    ...cloture.map((r): TimelineEntry => ({ label: "Clôturée", par: resolvePar(r.cloturerPar), date: r.dateCloture })),
    ...confirmation.map((r): TimelineEntry => ({ label: "Confirmée", par: resolvePar(r.confirmerPar), date: r.dateConfirmer })),
    ...modification.map((r): TimelineEntry => ({ label: "Modifiée", par: resolvePar(r.modifierPar), date: r.dateModifier })),
    ...refus.map((r): TimelineEntry => ({ label: "Refusée", par: resolvePar(r.refuserPar), date: r.dateRefus, extra: r.cause ?? undefined })),
    ...report.map((r): TimelineEntry => ({
      label: "Reportée",
      par: resolvePar(r.reporterPar),
      date: r.dateReport,
      extra: r.nouvelDate ? `nouvelle date : ${r.nouvelDate.toLocaleDateString("fr-FR")}` : undefined,
    })),
    ...retour.map((r): TimelineEntry => ({ label: "Retournée", par: resolvePar(r.retournerPar), date: r.dateRetourner })),
    ...vues.map((r): TimelineEntry => ({ label: "Vue", par: resolvePar(r.vuePar), date: r.dateVue })),
    ...da!.actions.map((a): TimelineEntry => ({ label: a.type, par: a.par ?? "—", date: a.date })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const session = await getSession();
  const isAdmin = session?.role === "Admin";
  const s = daStatutColor(da.statut);
  const isOpen = da.statut === "En cours";
  const hasConfirmation = da.actions.some((a) => a.type === "Confirmée");

  return (
    <>
      <PageHeader eyebrow="Demande d'achat" title={`DA-${String(da.id).padStart(4, "0")}`} />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex gap-2 items-center flex-wrap">
          <StatusPill label={da.statut} fg={s.fg} bg={s.bg} />
          <span className="text-xs text-muted font-mono">
            {da.dateDa.toLocaleDateString("fr-FR")}
          </span>
          {da.demandeur && <span className="text-xs text-muted">— {da.demandeur}</span>}
        </div>

        {isOpen && isAdmin && (
          <div className="flex gap-2 flex-wrap">
            {!hasConfirmation && (
              <form action={confirmerDa.bind(null, id)}>
                <button
                  type="submit"
                  className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
                >
                  Confirmer
                </button>
              </form>
            )}
            <form action={reporterDa.bind(null, id)}>
              <button
                type="submit"
                className="border border-hairline text-ink text-sm font-semibold px-4 py-2 rounded hover:bg-paper transition-colors"
              >
                Reporter
              </button>
            </form>
            <form action={refuserDa.bind(null, id)}>
              <button
                type="submit"
                className="border border-hairline text-urgent text-sm font-semibold px-4 py-2 rounded hover:bg-paper transition-colors"
              >
                Refuser
              </button>
            </form>
            <form action={cloturerDa.bind(null, id)}>
              <button
                type="submit"
                className="border border-hairline text-ink text-sm font-semibold px-4 py-2 rounded hover:bg-paper transition-colors"
              >
                Clôturer
              </button>
            </form>
          </div>
        )}

        {isOpen && (
          <form
            action={addDaLigne.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Article <span className="text-urgent">*</span>
              </label>
              <select
                name="idArticle"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codeArticle ? `${a.codeArticle} — ` : ""}
                    {a.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Quantité <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="qt"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Motif
              </label>
              <input
                type="text"
                name="motif"
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
        )}

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold">Motif</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Qté demandée</th>
                <th className="px-4 py-3 font-semibold w-24 text-right">Qté restante</th>
              </tr>
            </thead>
            <tbody>
              {da.lignes.map((l) => (
                <tr key={l.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{l.article.designation}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{l.motif ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.qt.toString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.qtRestant.toString()}
                  </td>
                </tr>
              ))}
              {da.lignes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun article demandé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {timeline.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Historique
            </div>
            <div className="space-y-2">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-2 items-baseline text-sm border-b border-hairline last:border-0 pb-2 last:pb-0">
                  <Nameplate>{t.label}</Nameplate>
                  <span className="text-muted text-xs">
                    {t.par} · {t.date.toLocaleString("fr-FR")}
                    {t.extra ? ` · ${t.extra}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
