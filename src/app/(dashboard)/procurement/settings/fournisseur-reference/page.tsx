import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import {
  createParametreActiviteFournisseur,
  createParametreCompteFournisseur,
  createParametreDeviseFournisseur,
  createParametreLivraisonFournisseur,
  createParametreReglementFournisseur,
  deleteParametreActiviteFournisseur,
  deleteParametreCompteFournisseur,
  deleteParametreDeviseFournisseur,
  deleteParametreLivraisonFournisseur,
  deleteParametreReglementFournisseur,
} from "../../actions";

const PERIODES = ["Jour", "Semaine", "Mois", "Année"];

export default async function FournisseurReferencePage() {
  const [activites, comptes, devises, livraisons, reglements] = await Promise.all([
    prisma.parametreActiviteFournisseur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreCompteFournisseur.findMany({ where: { deleted: false }, orderBy: { numero: "asc" } }),
    prisma.parametreDeviseFournisseur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreLivraisonFournisseur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreReglementFournisseur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Achats — Paramètres" title="Profil fournisseur" />
      <div className="p-8 max-w-3xl space-y-10">
        <p className="text-sm text-muted -mt-2">
          Listes de référence utilisées sur l&apos;onglet Profil de chaque
          fiche fournisseur — activité, compte interne, devise, conditions
          de livraison, conditions de règlement.
        </p>

        <Section title="Activités">
          <form action={createParametreActiviteFournisseur} className="flex gap-2 mb-3">
            <input
              type="text"
              name="codeActivite"
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
            items={activites.map((a) => ({
              id: a.id,
              label: `${a.codeActivite ? `${a.codeActivite} — ` : ""}${a.designation}`,
            }))}
            deleteAction={deleteParametreActiviteFournisseur}
            isAdmin={isAdmin}
          />
        </Section>

        <Section title="Comptes internes">
          <form action={createParametreCompteFournisseur} className="flex gap-2 mb-3 flex-wrap">
            <input
              type="number"
              name="numero"
              required
              placeholder="N°"
              className="w-24 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="text"
              name="designation"
              required
              placeholder="Désignation"
              className="flex-1 min-w-[140px] border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="number"
              step="0.01"
              name="estimation"
              placeholder="Estimation"
              className="w-28 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="number"
              name="periodeNbre"
              defaultValue={1}
              className="w-16 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <select name="periode" className="border border-hairline rounded px-3 py-2 text-sm bg-surface">
              {PERIODES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <AddButton />
          </form>
          <List
            items={comptes.map((c) => ({
              id: c.id,
              label: `N°${c.numero} — ${c.designation} (${c.estimation.toString()} / ${c.periodeNbre.toString()} ${c.periode})`,
            }))}
            deleteAction={deleteParametreCompteFournisseur}
            isAdmin={isAdmin}
          />
        </Section>

        <Section title="Devises">
          <form action={createParametreDeviseFournisseur} className="flex gap-2 mb-3">
            <input
              type="text"
              name="designation"
              required
              placeholder="Désignation"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <input
              type="number"
              step="0.0001"
              name="conversion"
              placeholder="Taux de conversion"
              className="w-40 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <AddButton />
          </form>
          <List
            items={devises.map((d) => ({
              id: d.id,
              label: `${d.designation} (taux : ${d.conversion.toString()})`,
            }))}
            deleteAction={deleteParametreDeviseFournisseur}
            isAdmin={isAdmin}
          />
        </Section>

        <Section title="Conditions de livraison">
          <form action={createParametreLivraisonFournisseur} className="flex gap-2 mb-3">
            <input
              type="text"
              name="codeLivraison"
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
            items={livraisons.map((l) => ({
              id: l.id,
              label: `${l.codeLivraison ? `${l.codeLivraison} — ` : ""}${l.designation}`,
            }))}
            deleteAction={deleteParametreLivraisonFournisseur}
            isAdmin={isAdmin}
          />
        </Section>

        <Section title="Conditions de règlement">
          <form action={createParametreReglementFournisseur} className="flex gap-2 mb-3">
            <input
              type="text"
              name="codeReglement"
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
            items={reglements.map((r) => ({
              id: r.id,
              label: `${r.codeReglement ? `${r.codeReglement} — ` : ""}${r.designation}`,
            }))}
            deleteAction={deleteParametreReglementFournisseur}
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
