import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { addSaisie, deleteSaisie } from "../../actions";
import { getSession } from "@/lib/auth";

const CIBLES = [
  { value: 1, label: "Préparation générale" },
  { value: 3, label: "Four — qualité" },
  { value: 4, label: "Fabrication — qualité" },
  { value: 5, label: "Fabrication — horaire" },
];

export default async function SaisieSettingsPage() {
  const saisies = await prisma.prodSaisie.findMany({
    where: { deleted: false },
    orderBy: [{ cible: "asc" }, { designation: "asc" }],
  });

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Production — Paramètres" title="Paramètres de mesure" />
      <div className="p-8 max-w-3xl space-y-6">
        <p className="text-sm text-muted -mt-2">
          Ces paramètres génèrent automatiquement une ligne de saisie dans
          chaque nouveau rapport, selon leur catégorie (« cible »). Voir la
          spec du module pour le détail des catégories non listées ici
          (Préparation A/S).
        </p>

        <form
          action={addSaisie}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Désignation <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="designation"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              placeholder="ex : Température four"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Unité
            </label>
            <input
              type="text"
              name="unite"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              placeholder="°C, %, bar…"
            />
          </div>
          <div className="w-56">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Catégorie <span className="text-urgent">*</span>
            </label>
            <select
              name="cible"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {CIBLES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-ink pb-2.5">
            <input type="checkbox" name="poidFour" className="rounded" />
            Poids four
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
                <th className="px-4 py-3 font-semibold">Désignation</th>
                <th className="px-4 py-3 font-semibold">Unité</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {saisies.map((s) => (
                <tr key={s.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-ink">
                    {s.designation}
                    {s.poidFour && (
                      <span className="ml-2 text-[10px] font-semibold text-steel-600 uppercase">
                        Poids four
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs">{s.unite ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink text-xs">
                    {CIBLES.find((c) => c.value === s.cible)?.label ?? s.cible}
                  </td>
                  <td className="px-4 py-2.5">
                    {isAdmin && (
                      <form action={deleteSaisie.bind(null, s.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {saisies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun paramètre de mesure défini.
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
