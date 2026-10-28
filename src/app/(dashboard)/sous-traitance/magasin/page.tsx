import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import Link from "next/link";
import { createMagasinSousTraitance, updateMagasinSousTraitance } from "../actions";

// Reproduces the legacy app's "Etat de stock" tab with its 3
// sub-tabs — a real gap found on revisiting this module: this page
// originally showed one flat list with a free-text "emplacement" field.
// Confirmed the 3 real values directly from the already-migrated data
// (SELECT emplacement_actuel, COUNT(*) FROM magasin_sous_traitance GROUP
// BY emplacement_actuel): "Magasin" (270), "Usine" (223), and
// "Reparation" (2 — note: no accent on the é in the real stored data,
// used exactly as-is below rather than "corrected" to avoid a mismatch
// with real rows). "Mouvement de" and "Liste MP Sortie" (the other two
// top-level tabs shown in the reference) are separate, not yet traced
// to a confirmed data source — not built here rather than guessed at.

const EMPLACEMENTS = ["Magasin", "Usine", "Reparation"] as const;

export default async function MagasinSousTraitancePage({
  searchParams,
}: {
  searchParams: { emplacement?: string };
}) {
  const emplacement = EMPLACEMENTS.includes(searchParams.emplacement as any)
    ? searchParams.emplacement!
    : "Magasin";

  const [items, articles, activites] = await Promise.all([
    prisma.magasinSousTraitance.findMany({
      where: { emplacementActuel: emplacement },
      include: { article: true, activite: true, demande: true, equipement: true },
      orderBy: { id: "desc" },
      take: 100,
    }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.activiteSousTraitance.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Etat de stock" hideBack />
      <div className="p-8 space-y-6">
        <p className="text-sm text-muted max-w-2xl">
          Suivi d&apos;un article/outil physique confié à un sous-traitant
          à travers son cycle de vie — demande en cours, activité,
          emplacement, équipement associé, et nombre de réparations.
        </p>

        <div className="flex gap-1 border-b border-hairline">
          {EMPLACEMENTS.map((e) => (
            <Link
              key={e}
              href={`/sous-traitance/magasin?emplacement=${e}`}
              className={`px-4 py-2 text-sm font-semibold rounded-t ${
                emplacement === e
                  ? "bg-steel-600 text-white"
                  : "text-steel-600 hover:bg-paper border border-hairline border-b-0"
              }`}
            >
              {e === "Reparation" ? "Réparation" : e}
            </Link>
          ))}
        </div>

        <form
          action={createMagasinSousTraitance}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="flex-1 min-w-[160px]">
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
                  {a.designation}
                </option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Réf. interne <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="refInterne"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Emplacement actuel
            </label>
            <select
              name="emplacementActuel"
              defaultValue={emplacement}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              {EMPLACEMENTS.map((e) => (
                <option key={e} value={e}>
                  {e === "Reparation" ? "Réparation" : e}
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
                <th className="px-4 py-3 font-semibold">Réf.</th>
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold">Emplacement</th>
                <th className="px-4 py-3 font-semibold">Activité</th>
                <th className="px-4 py-3 font-semibold w-20 text-right">Réparations</th>
                <th className="px-4 py-3 font-semibold w-20">Reçu</th>
                <th className="px-4 py-3 font-semibold w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => {
                const formId = `mst-${m.id}`;
                return (
                  <tr key={m.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5">
                      <Nameplate>{m.refInterne}</Nameplate>
                    </td>
                    <td className="px-4 py-2.5 text-ink">{m.article.designation}</td>
                    <td className="px-4 py-2">
                      <select
                        name="emplacementActuel"
                        form={formId}
                        defaultValue={m.emplacementActuel ?? ""}
                        className="w-32 border border-hairline rounded px-2 py-1 text-xs bg-surface"
                      >
                        {EMPLACEMENTS.map((e) => (
                          <option key={e} value={e}>
                            {e === "Reparation" ? "Réparation" : e}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        name="activiteActuel"
                        form={formId}
                        defaultValue={m.activiteActuel ?? ""}
                        className="w-36 border border-hairline rounded px-2 py-1 text-xs bg-surface"
                      >
                        <option value="">—</option>
                        {activites.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.designation}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        name="nbrReparation"
                        form={formId}
                        defaultValue={m.nbrReparation}
                        className="w-16 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface text-right"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        name="reception"
                        form={formId}
                        defaultChecked={m.reception}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <form id={formId} action={updateMagasinSousTraitance.bind(null, m.id)}>
                        <button
                          type="submit"
                          className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-2.5 py-1 hover:bg-paper transition-colors"
                        >
                          Enregistrer
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun article suivi pour cet emplacement.
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
