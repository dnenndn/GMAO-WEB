import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import {
  createParametreClassificationArticle,
  createParametreEmplacementArticle,
  createParametreStockageArticle,
  deleteParametreClassificationArticle,
  deleteParametreEmplacementArticle,
  deleteParametreStockageArticle,
} from "../../actions";

export default async function ArticleReferencePage() {
  const [classifications, emplacements, stockages] = await Promise.all([
    prisma.parametreClassificationArticle.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreEmplacementArticle.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreStockageArticle.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Inventaire — Paramètres" title="Profil article" />
      <div className="p-8 max-w-3xl space-y-10">
        <p className="text-sm text-muted -mt-2">
          Listes de référence utilisées sur la fiche article — classification,
          emplacement de stockage, conditions de stockage. Les équipements
          compatibles et fournisseurs habituels s&apos;associent directement
          depuis chaque fiche article.
        </p>

        <Section title="Classifications">
          <form action={createParametreClassificationArticle} className="flex gap-2 mb-3">
            <input
              type="text"
              name="codeClassification"
              placeholder="Code"
              className="w-28 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="text"
              name="designation"
              required
              placeholder="Désignation"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <AddButton />
          </form>
          <List
            items={classifications.map((c) => ({
              id: c.id,
              label: `${c.codeClassification ? `${c.codeClassification} — ` : ""}${c.designation}`,
            }))}
            deleteAction={deleteParametreClassificationArticle}
            isAdmin={isAdmin}
          />
        </Section>

        <Section title="Emplacements">
          <form action={createParametreEmplacementArticle} className="flex gap-2 mb-3">
            <input
              type="text"
              name="codeEmplacement"
              placeholder="Code"
              className="w-28 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="text"
              name="designation"
              required
              placeholder="Désignation"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <AddButton />
          </form>
          <List
            items={emplacements.map((e) => ({
              id: e.id,
              label: `${e.codeEmplacement ? `${e.codeEmplacement} — ` : ""}${e.designation}`,
            }))}
            deleteAction={deleteParametreEmplacementArticle}
            isAdmin={isAdmin}
          />
        </Section>

        <Section title="Conditions de stockage">
          <form action={createParametreStockageArticle} className="flex gap-2 mb-3">
            <input
              type="text"
              name="codeStockage"
              placeholder="Code"
              className="w-28 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="text"
              name="designation"
              required
              placeholder="Désignation"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <AddButton />
          </form>
          <List
            items={stockages.map((s) => ({
              id: s.id,
              label: `${s.codeStockage ? `${s.codeStockage} — ` : ""}${s.designation}`,
            }))}
            deleteAction={deleteParametreStockageArticle}
            isAdmin={isAdmin}
          />
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{title}</div>
      {children}
    </section>
  );
}

function List({
  items,
  deleteAction,
  isAdmin,
}: {
  items: { id: number; label: string }[];
  deleteAction: (id: number) => Promise<void>;
  isAdmin: boolean;
}) {
  return (
    <div className="bg-surface border border-hairline rounded overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-hairline last:border-0">
              <td className="px-4 py-2.5 text-ink">{item.label}</td>
              <td className="px-4 py-2.5 text-right w-20">
                {isAdmin && (
                  <form action={deleteAction.bind(null, item.id)}>
                    <button type="submit" className="text-xs text-urgent hover:underline">
                      Supprimer
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-muted text-sm">
                Aucun élément défini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AddButton() {
  return (
    <button
      type="submit"
      className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors whitespace-nowrap"
    >
      Ajouter
    </button>
  );
}
