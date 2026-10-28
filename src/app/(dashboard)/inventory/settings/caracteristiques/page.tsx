import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createCaracteristique, deleteCaracteristique } from "../../actions";
import { getSession } from "@/lib/auth";

const TYPES = ["TextBox", "Select Unique", "Select Multiple", "CheckBox", "Radio Button"];
const TEXTBOX_TYPES = ["Chaîne de caractères", "Entier", "Réel"];

export default async function CaracteristiquesSettingsPage() {
  const [caracteristiques, sousFamilles] = await Promise.all([
    prisma.caracteristique.findMany({
      where: { deleted: false },
      include: { sousFamille: true, options: true, textboxes: true },
      orderBy: { nom: "asc" },
    }),
    prisma.sousFamille.findMany({
      where: { deleted: false },
      include: { famille: true },
      orderBy: { designation: "asc" },
    }),
  ]);

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Inventaire — Paramètres" title="Caractéristiques" />
      <div className="p-8 max-w-3xl space-y-6">
        <p className="text-sm text-muted -mt-2">
          Chaque sous-famille d&apos;articles peut définir ses propres
          champs personnalisés (ex : &quot;Diamètre intérieur&quot; pour
          des roulements). Ces champs apparaissent ensuite sur la fiche de
          chaque article de cette sous-famille.
        </p>

        <form
          action={createCaracteristique}
          className="bg-surface border border-hairline rounded p-4 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Sous-famille <span className="text-urgent">*</span>
              </label>
              <select
                name="idSousFamille"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {sousFamilles.map((sf) => (
                  <option key={sf.id} value={sf.id}>
                    {sf.famille?.designation ? `${sf.famille.designation} — ` : ""}
                    {sf.designation}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Nom du champ <span className="text-urgent">*</span>
              </label>
              <input
                type="text"
                name="nom"
                required
                placeholder="ex : Diamètre intérieur"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Type de champ <span className="text-urgent">*</span>
            </label>
            <select
              name="type"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Sous-type (si TextBox)
            </label>
            <select
              name="textboxType"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">—</option>
              {TEXTBOX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Options (si Select/Radio — séparées par des virgules)
            </label>
            <input
              type="text"
              name="options"
              placeholder="ex : Rouge, Vert, Bleu"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="champObligatoire" className="rounded" />
            Champ obligatoire
          </label>

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
                <th className="px-4 py-3 font-semibold">Sous-famille</th>
                <th className="px-4 py-3 font-semibold">Champ</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Détail</th>
                <th className="px-4 py-3 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {caracteristiques.map((c) => (
                <tr key={c.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">{c.sousFamille.designation}</td>
                  <td className="px-4 py-2.5 text-ink">
                    {c.nom}
                    {c.champObligatoire && <span className="text-urgent"> *</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs">{c.type}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">
                    {c.options.length > 0 && c.options.map((o) => o.valeurOption).join(", ")}
                    {c.textboxes[0]?.type}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isAdmin && (
                      <form action={deleteCaracteristique.bind(null, c.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {caracteristiques.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune caractéristique définie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
