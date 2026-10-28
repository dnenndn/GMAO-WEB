import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { addBonCarburant, deleteBonCarburant } from "../actions";

// Pagination and sortable columns added — same class of gap already
// confirmed and fixed on Articles/BSM: a flat `take: 100` with no
// pagination silently hides everything past the limit.

export default async function BonsCarburantPage({
  searchParams,
}: {
  searchParams: { page?: string; sort?: string; dir?: string };
}) {
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "reference": return { nom: dir };
      case "vehicule": return { engin: { designation: dir } };
      case "chauffeur": return { chauffeur: { nom: dir } };
      case "quantite": return { quantite: dir };
      case "prix": return { prixTtc: dir };
      case "date": return { date: dir };
      default: return { date: "desc" as const };
    }
  }

  const [totalCount, bons, engins, chauffeurs, typesCarburant] = await Promise.all([
    prisma.bonDeCarburant.count({ where: { deleted: false } }),
    prisma.bonDeCarburant.findMany({
      where: { deleted: false },
      include: { engin: true, chauffeur: true, typeCarburant: true },
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.engin.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.chauffeur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
    prisma.typeCarburant.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Flotte" title="Bons de carburant" hideBack />
      <div className="p-8 space-y-6">
        <p className="text-sm text-muted max-w-2xl">
          Bon d&apos;autorisation de carburant émis à un chauffeur —
          distinct des pleins réellement effectués (voir Carburant), qui
          eux enregistrent un relevé de compteur.
        </p>

        <form
          action={addBonCarburant}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="w-40">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Référence
            </label>
            <input
              type="text"
              name="nom"
              placeholder="ex : BC-2026-001"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Véhicule <span className="text-urgent">*</span>
            </label>
            <select
              name="idEngin"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {engins.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.matricule ?? e.designation}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Chauffeur <span className="text-urgent">*</span>
            </label>
            <select
              name="idChauffeur"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {chauffeurs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Type carburant <span className="text-urgent">*</span>
            </label>
            <select
              name="idTypeCarburant"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {typesCarburant.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.designation}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Quantité (L) <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="quantite"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Prix U. <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              name="prixU"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Date <span className="text-urgent">*</span>
            </label>
            <input
              type="date"
              name="date"
              defaultValue={now}
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Émettre le bon
          </button>
        </form>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun bon émis."
          itemLabel="bon"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="reference" label="Référence" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="vehicule" label="Véhicule" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="chauffeur" label="Chauffeur" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="quantite" label="Quantité" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="prix" label="Prix TTC" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="date" label="Date" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <th className="px-4 py-3 font-semibold w-20"></th>
              </tr>
            </thead>
            <tbody>
              {bons.map((b) => (
                <tr key={b.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5">
                    <Nameplate>{b.nom}</Nameplate>
                  </td>
                  <td className="px-4 py-2.5 text-ink">{b.engin.matricule ?? b.engin.designation}</td>
                  <td className="px-4 py-2.5 text-ink">{b.chauffeur.nom}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {b.quantite.toString()} L
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                    {b.prixTtc.toFixed(3)}
                  </td>
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">
                    {b.date.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteBonCarburant.bind(null, b.id)}>
                      <button type="submit" className="text-xs text-urgent hover:underline">
                        Supprimer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {bons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun bon émis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls page={page} totalPages={totalPages} buildHref={pageHref} />
      </div>
    </>
  );
}
