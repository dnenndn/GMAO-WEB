import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import {
  updateArticleStock,
  addArticleCommentaire,
  addArticleFichier,
  deleteArticleFichier,
  setArticleCaracteristique,
  setArticleUnite,
  updateArticlePhoto,
  deleteArticlePhoto,
  linkArticleClassification,
  unlinkArticleClassification,
  linkArticleEmplacement,
  unlinkArticleEmplacement,
  linkArticleStockage,
  unlinkArticleStockage,
  linkArticleEquipement,
  unlinkArticleEquipement,
  linkArticleFournisseur,
  unlinkArticleFournisseur,
} from "../../actions";
import { notFound } from "next/navigation";

export default async function ArticleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [article, classifications, emplacements, stockages, equipements, fournisseurs] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: {
        magasin: true,
        sousFamilles: { include: { sousFamille: { include: { famille: true } } } },
        bsmLignes: { include: { bsm: true }, orderBy: { id: "desc" }, take: 10 },
        brmLignes: { include: { brm: true }, orderBy: { id: "desc" }, take: 10 },
        receptionLignes: { include: { reception: true }, orderBy: { id: "desc" }, take: 10 },
        commentaires: { orderBy: { date: "desc" } },
        fichiers: { orderBy: { id: "desc" } },
        caracteristiques: true,
        unites: { include: { unite: true } },
        modificationsHistorique: { orderBy: { dateModification: "desc" }, take: 10 },
        classifications: { include: { classification: true } },
        emplacements: { include: { emplacement: true } },
        stockages: { include: { stockage: true } },
        equipements: { include: { equipement: true } },
        fournisseursListe: { include: { fournisseur: true } },
      },
    }),
    prisma.parametreClassificationArticle.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreEmplacementArticle.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreStockageArticle.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.equipement.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.fournisseur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
  ]);

  if (!article) notFound();

  // Characteristics available for this article's sous-famille(s), with
  // the article's current value (if any) already resolved.
  const sousFamilleIds = article.sousFamilles.map((sf) => sf.idSousFamille);
  const caracteristiquesDefinies = sousFamilleIds.length
    ? await prisma.caracteristique.findMany({
        where: { idSousFamille: { in: sousFamilleIds }, deleted: false },
        include: { options: true },
      })
    : [];
  const valeurByCaracteristique = new Map(
    article.caracteristiques.map((v) => [v.idCaracteristique, v.valeur])
  );
  const unites = await prisma.parametreUniteArticle.findMany({ where: { deleted: false } });

  const low =
    article.stockMini != null && Number(article.stockNeuf) < Number(article.stockMini);


  // Merge the three transactional sources into one movement list, client-side,
  // same pattern as the legacy mvt_stock.cs union.
  const movements = [
    ...article.receptionLignes.map((r) => ({
      type: "Entrée" as const,
      date: r.reception.dateReception,
      qty: Number(r.qtRecu),
      ref: `Réception #${r.idReception}`,
    })),
    ...article.bsmLignes.map((b) => ({
      type: "Sortie" as const,
      date: b.bsm.dateBsm,
      qty: -Number(b.quantite),
      ref: b.bsm.nOt ? `BSM #${b.idBsm} — ${b.bsm.nOt}` : `BSM #${b.idBsm}`,
    })),
    ...article.brmLignes.map((r) => ({
      type: "Retour" as const,
      date: r.brm.dateRetour,
      qty: Number(r.quantite),
      ref: `BRM #${r.idBrm}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Article.photo has no stored content-type (confirmed: the legacy
  // schema never tracked one), so sniff common web image formats from
  // the leading bytes to build a usable data URI.
  const photoDataUri = article.photo ? bufferToImageDataUri(article.photo) : null;

  return (
    <>
      <PageHeader
        eyebrow="Article"
        title={`${article.codeArticle ?? `ART-${article.id}`} — ${article.designation}`}
      />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex gap-6">
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Photo
            </div>
            {photoDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoDataUri}
                alt={article.designation}
                className="w-32 h-32 object-cover rounded border border-hairline bg-surface"
              />
            ) : (
              <div className="w-32 h-32 rounded border border-hairline bg-paper flex items-center justify-center text-xs text-muted">
                Aucune photo
              </div>
            )}
            <div className="mt-2 space-y-1.5">
              <form action={updateArticlePhoto.bind(null, id)} className="flex flex-col gap-1.5">
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  required
                  className="text-xs text-muted file:mr-2 file:text-xs file:font-semibold file:text-steel-600 file:border file:border-hairline file:rounded file:px-2 file:py-1 file:bg-surface hover:file:bg-paper file:cursor-pointer"
                />
                <button
                  type="submit"
                  className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-2.5 py-1 hover:bg-paper transition-colors w-fit"
                >
                  Téléverser
                </button>
              </form>
              {photoDataUri && (
                <form action={deleteArticlePhoto.bind(null, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    Supprimer la photo
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Référence" value={article.reference ?? "—"} />
          <Row
            label="Sous-famille"
            value={
              article.sousFamilles
                .map(
                  (sf) =>
                    `${sf.sousFamille.famille?.designation ? sf.sousFamille.famille.designation + " — " : ""}${sf.sousFamille.designation}`
                )
                .join(", ") || "—"
            }
          />
          <Row label="Magasin" value={article.magasin?.designation ?? "—"} />
          <Row label="Marque" value={article.marque ?? "—"} />
          <Row
            label="Prix HT"
            value={article.prixHt ? `${article.prixHt.toFixed(3)} DT` : "—"}
          />
          <Row
            label="Seuils"
            value={`mini ${article.stockMini?.toString() ?? "—"} · maxi ${
              article.stockMaxi?.toString() ?? "—"
            } · sécurité ${article.stockSecurite?.toString() ?? "—"}`}
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Niveaux de stock {low && <span className="text-urgent ml-2">— sous le seuil mini</span>}
          </div>
          <form
            action={updateArticleStock.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Neuf
              </label>
              <input
                type="number"
                step="0.01"
                name="stockNeuf"
                defaultValue={article.stockNeuf.toString()}
                className="w-28 border border-hairline rounded px-3 py-2 text-sm font-mono bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Usagé
              </label>
              <input
                type="number"
                step="0.01"
                name="stockUse"
                defaultValue={article.stockUse.toString()}
                className="w-28 border border-hairline rounded px-3 py-2 text-sm font-mono bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Rebuté
              </label>
              <input
                type="number"
                step="0.01"
                name="stockRebute"
                defaultValue={article.stockRebute.toString()}
                className="w-28 border border-hairline rounded px-3 py-2 text-sm font-mono bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Enregistrer
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Unité de mesure
            </div>
            <form
              action={setArticleUnite.bind(null, id)}
              className="bg-surface border border-hairline rounded p-4 flex gap-2 items-end"
            >
              <select
                name="idUnite"
                defaultValue={article.unites[0]?.idUnite ?? ""}
                className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">—</option>
                {unites.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.designation} {u.codeUnite ? `(${u.codeUnite})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-2 hover:bg-paper transition-colors"
              >
                Enregistrer
              </button>
            </form>
          </div>

          {caracteristiquesDefinies.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Caractéristiques
              </div>
              <div className="bg-surface border border-hairline rounded p-4 space-y-3">
                {caracteristiquesDefinies.map((c) => {
                  const formId = `caract-${c.id}`;
                  const currentValue = valeurByCaracteristique.get(c.id) ?? "";
                  return (
                    <div key={c.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                          {c.nom}
                          {c.champObligatoire && <span className="text-urgent"> *</span>}
                        </label>
                        {c.type === "CheckBox" ? (
                          <input
                            type="checkbox"
                            name="valeur"
                            form={formId}
                            value="true"
                            defaultChecked={currentValue === "true"}
                            className="rounded"
                          />
                        ) : c.type === "Select Unique" || c.type === "Radio Button" ? (
                          <select
                            name="valeur"
                            form={formId}
                            defaultValue={currentValue}
                            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
                          >
                            <option value="">—</option>
                            {c.options.map((o) => (
                              <option key={o.id} value={o.valeurOption}>
                                {o.valeurOption}
                              </option>
                            ))}
                          </select>
                        ) : c.type === "Select Multiple" ? (
                          <select
                            name="valeur"
                            form={formId}
                            multiple
                            size={Math.min(c.options.length || 1, 4)}
                            defaultValue={currentValue ? currentValue.split(",") : []}
                            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
                          >
                            {c.options.map((o) => (
                              <option key={o.id} value={o.valeurOption}>
                                {o.valeurOption}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            name="valeur"
                            form={formId}
                            defaultValue={currentValue}
                            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
                          />
                        )}
                      </div>
                      <form
                        id={formId}
                        action={setArticleCaracteristique.bind(null, id, c.id)}
                      >
                        <button
                          type="submit"
                          className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-2 hover:bg-paper transition-colors"
                        >
                          Sauver
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Derniers mouvements
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Référence</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold w-24 text-right">Quantité</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={i} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5">
                      <Nameplate>{m.type}</Nameplate>
                    </td>
                    <td className="px-4 py-2.5 text-ink">{m.ref}</td>
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {m.date.toLocaleDateString("fr-FR")}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono text-xs ${
                        m.qty < 0 ? "text-urgent" : "text-ink"
                      }`}
                    >
                      {m.qty > 0 ? "+" : ""}
                      {m.qty}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                      Aucun mouvement enregistré pour cet article.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Commentaires
            </div>
            <form
              action={addArticleCommentaire.bind(null, id)}
              className="flex gap-2 mb-4"
            >
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
              {article.commentaires.map((c) => (
                <div key={c.id} className="border-l-2 border-hairline pl-3">
                  <div className="text-sm text-ink">{c.texte}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {c.auteur} · {c.date.toLocaleString("fr-FR")}
                  </div>
                </div>
              ))}
              {article.commentaires.length === 0 && (
                <div className="text-sm text-muted">Aucun commentaire.</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Fichiers joints
            </div>
            <form
              action={addArticleFichier.bind(null, id)}
              className="flex gap-2 mb-4"
            >
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
              {article.fichiers.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <a
                    href={f.adresse ?? "#"}
                    className="text-steel-600 hover:underline truncate max-w-[220px]"
                  >
                    {f.adresse}
                  </a>
                  <form action={deleteArticleFichier.bind(null, f.id, id)}>
                    <button type="submit" className="text-xs text-urgent hover:underline">
                      Supprimer
                    </button>
                  </form>
                </div>
              ))}
              {article.fichiers.length === 0 && (
                <div className="text-sm text-muted">Aucun fichier joint.</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <LinkSection
            title="Classification"
            items={article.classifications.map((c) => ({ linkId: c.id, label: c.classification.designation }))}
            options={classifications.map((c) => [c.id, c.designation] as const)}
            fieldName="idClassification"
            linkAction={linkArticleClassification.bind(null, id)}
            unlinkAction={unlinkArticleClassification}
            articleId={id}
          />
          <LinkSection
            title="Emplacement"
            items={article.emplacements.map((e) => ({ linkId: e.id, label: e.emplacement.designation }))}
            options={emplacements.map((e) => [e.id, e.designation] as const)}
            fieldName="idEmplacement"
            linkAction={linkArticleEmplacement.bind(null, id)}
            unlinkAction={unlinkArticleEmplacement}
            articleId={id}
          />
          <LinkSection
            title="Conditions de stockage"
            items={article.stockages.map((s) => ({ linkId: s.id, label: s.stockage.designation }))}
            options={stockages.map((s) => [s.id, s.designation] as const)}
            fieldName="idStockage"
            linkAction={linkArticleStockage.bind(null, id)}
            unlinkAction={unlinkArticleStockage}
            articleId={id}
          />
          <LinkSection
            title="Équipements compatibles"
            items={article.equipements.map((e) => ({ linkId: e.id, label: e.equipement.designation }))}
            options={equipements.map((e) => [e.id, e.designation] as const)}
            fieldName="idEquipement"
            linkAction={linkArticleEquipement.bind(null, id)}
            unlinkAction={unlinkArticleEquipement}
            articleId={id}
          />
          <LinkSection
            title="Fournisseurs habituels"
            items={article.fournisseursListe.map((f) => ({ linkId: f.id, label: f.fournisseur.nom }))}
            options={fournisseurs.map((f) => [f.id, f.nom] as const)}
            fieldName="idFournisseur"
            linkAction={linkArticleFournisseur.bind(null, id)}
            unlinkAction={unlinkArticleFournisseur}
            articleId={id}
          />
        </div>

        {article.modificationsHistorique.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Historique des modifications (stock/prix)
            </div>
            <div className="bg-surface border border-hairline rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold w-20 text-right">Stock neuf</th>
                    <th className="px-4 py-3 font-semibold w-20 text-right">Stock usé</th>
                    <th className="px-4 py-3 font-semibold w-20 text-right">Rebuté</th>
                  </tr>
                </thead>
                <tbody>
                  {article.modificationsHistorique.map((m) => (
                    <tr key={m.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-muted font-mono text-xs">
                        {m.dateModification.toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                        {m.stockNeuf?.toString() ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                        {m.stockUse?.toString() ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                        {m.stockRebute?.toString() ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

/** Article.photo has no stored content-type — the legacy schema never
 * tracked one (confirmed via article_image.cs, a plain SqlDbType.Image
 * column) — so detect common web image formats from magic bytes to
 * build a usable data URI. Falls back to a generic type if unrecognized,
 * which browsers still render correctly for most real image data. */
function bufferToImageDataUri(buffer: Buffer): string {
  let mime = "application/octet-stream";
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    mime = "image/png";
  } else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    mime = "image/jpeg";
  } else if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") {
    mime = "image/gif";
  } else if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    mime = "image/webp";
  }
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function LinkSection({
  title,
  items,
  options,
  fieldName,
  linkAction,
  unlinkAction,
  articleId,
}: {
  title: string;
  items: { linkId: number; label: string }[];
  options: readonly (readonly [number, string])[];
  fieldName: string;
  linkAction: (formData: FormData) => Promise<void>;
  unlinkAction: (id: number, articleId: number) => Promise<void>;
  articleId: number;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{title}</div>
      <form action={linkAction} className="flex gap-2 mb-3">
        <select
          name={fieldName}
          required
          className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
        >
          <option value="">Sélectionner…</option>
          {options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
        {items.map((item) => (
          <div key={item.linkId} className="flex items-center gap-1.5">
            <Nameplate>{item.label}</Nameplate>
            <form action={unlinkAction.bind(null, item.linkId, articleId)}>
              <button type="submit" className="text-xs text-urgent hover:underline">
                ×
              </button>
            </form>
          </div>
        ))}
        {items.length === 0 && <span className="text-sm text-muted">Aucune association.</span>}
      </div>
    </div>
  );
}
