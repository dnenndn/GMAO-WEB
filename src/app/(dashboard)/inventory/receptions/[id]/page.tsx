import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import {
  addReceptionLigne,
  createBonLivraison,
  linkReceptionCommande,
  unlinkReceptionCommande,
} from "../../actions";
import { notFound } from "next/navigation";

export default async function ReceptionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [reception, articles, commandesOuvertes, bonsLivraison, commandesLiees] = await Promise.all([
    prisma.reception.findUnique({
      where: { id },
      include: { lignes: { include: { article: true, commande: true } } },
    }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.commande.findMany({
      where: { statut: { in: ["En attente", "En cours"] } },
      include: { fournisseur: true },
      orderBy: { dateCommande: "desc" },
      take: 100,
    }),
    prisma.bonLivraison.findMany({ where: { idReception: id }, orderBy: { id: "desc" } }),
    prisma.receptionCommande.findMany({
      where: { idReception: id },
      include: { commande: true },
    }),
  ]);

  if (!reception) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Réception"
        title={`REC-${String(reception.id).padStart(4, "0")}`}
      />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Reçu par" value={reception.receptionPar ?? "—"} />
          <Row label="Date" value={reception.dateReception.toLocaleDateString("fr-FR")} />
          <Row label="Commentaire" value={reception.commentaire ?? "—"} />
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Commandes correspondant à cette livraison
          </div>
          <p className="text-xs text-muted mb-3">
            Rattachement au niveau de l&apos;ensemble de la réception —
            distinct du rattachement par ligne ci-dessous, qui associe
            chaque article reçu à une ligne de commande précise.
          </p>
          <form
            action={linkReceptionCommande.bind(null, id)}
            className="flex gap-2 mb-3"
          >
            <select
              name="idCommande"
              required
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {commandesOuvertes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nCommande} — {c.fournisseur?.nom}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-2 hover:bg-paper transition-colors"
            >
              Rattacher
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {commandesLiees.map((rc) => (
              <div key={rc.id} className="flex items-center gap-1.5">
                <Nameplate>{rc.commande.nCommande}</Nameplate>
                <form action={unlinkReceptionCommande.bind(null, rc.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {commandesLiees.length === 0 && (
              <span className="text-sm text-muted">Aucune commande rattachée.</span>
            )}
          </div>
        </div>

        <form
          action={addReceptionLigne.bind(null, id)}
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
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Qté reçue <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="qtRecu"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Commande liée (optionnel)
            </label>
            <select
              name="idCommande"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Réception libre</option>
              {commandesOuvertes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nCommande} — {c.fournisseur?.nom ?? "—"}
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

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold">Commande liée</th>
                <th className="px-4 py-3 font-semibold w-28 text-right">Qté reçue</th>
              </tr>
            </thead>
            <tbody>
              {reception.lignes.map((l) => (
                <tr key={l.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{l.article.designation}</td>
                  <td className="px-4 py-2.5">
                    {l.commande ? <Nameplate>{l.commande.nCommande}</Nameplate> : <span className="text-muted text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {l.qtRecu.toString()}
                  </td>
                </tr>
              ))}
              {reception.lignes.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun article ajouté.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Bons de livraison
          </div>
          <form
            action={createBonLivraison.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Date
              </label>
              <input
                type="date"
                name="dateLivraison"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                N° BL fournisseur
              </label>
              <input
                type="text"
                name="blFournisseur"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Créer un bon de livraison
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {bonsLivraison.map((bl) => (
              <a key={bl.id} href={`/inventory/livraisons/${bl.id}`}>
                <Nameplate>
                  BL-{String(bl.id).padStart(4, "0")} · {bl.dateLivraison.toLocaleDateString("fr-FR")}
                </Nameplate>
              </a>
            ))}
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
