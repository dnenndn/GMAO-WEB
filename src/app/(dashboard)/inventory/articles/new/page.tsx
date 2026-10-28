import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createArticle } from "../../actions";

export default async function NewArticlePage() {
  const [magasins, sousFamilles] = await Promise.all([
    prisma.magasin.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.sousFamille.findMany({
      where: { deleted: false },
      include: { famille: true },
      orderBy: { designation: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Inventaire" title="Nouvel article" />
      <form action={createArticle} className="p-8 max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code article
            </label>
            <input
              type="text"
              name="codeArticle"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Référence
            </label>
            <input
              type="text"
              name="reference"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div>
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

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Prix HT
            </label>
            <input
              type="number"
              step="0.01"
              name="prixHt"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Marque
            </label>
            <input
              type="text"
              name="marque"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Magasin
            </label>
            <select
              name="idMagasin"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {magasins.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.designation}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Sous-famille
          </label>
          <select
            name="idSousFamille"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            <option value="">—</option>
            {sousFamilles.map((sf) => (
              <option key={sf.id} value={sf.id}>
                {sf.famille?.designation ? `${sf.famille.designation} — ` : ""}
                {sf.designation}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Stock mini
            </label>
            <input
              type="number"
              step="0.01"
              name="stockMini"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Stock maxi
            </label>
            <input
              type="number"
              step="0.01"
              name="stockMaxi"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Stock sécurité
            </label>
            <input
              type="number"
              step="0.01"
              name="stockSecurite"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
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
            Créer l'article
          </button>
        </div>
      </form>
    </>
  );
}
