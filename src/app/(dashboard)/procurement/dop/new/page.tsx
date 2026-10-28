import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createDop } from "../../actions";

export default async function NewDopPage() {
  const [articles, fournisseurs] = await Promise.all([
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.fournisseur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
  ]);
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Achats" title="Nouvelle demande d'ouverture de prix" />
      <form action={createDop} className="p-8 max-w-2xl space-y-5">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateDop"
            defaultValue={now}
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Articles à consulter
            </label>
            <select
              name="idsArticles"
              multiple
              size={8}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codeArticle ? `${a.codeArticle} — ` : ""}
                  {a.designation}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Fournisseurs à consulter
            </label>
            <select
              name="idsFournisseurs"
              multiple
              size={8}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer la DOP
          </button>
        </div>
      </form>
    </>
  );
}
