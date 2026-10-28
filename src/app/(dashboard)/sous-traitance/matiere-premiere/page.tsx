import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import {
  addDsMp,
  deleteDsMp,
  addDsNvArticle,
  deleteDsNvArticle,
} from "../actions";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { SortableTh } from "@/components/SortableTh";

// Pagination added to both independent tables on this page — same
// class of gap already confirmed and fixed on Articles/BSM: a flat
// `take: 100` with no pagination silently hides everything past the
// limit. Each table gets its own page param (mpPage / nvPage) so
// paging through one doesn't reset the other.

export default async function MatierePremierePage({
  searchParams,
}: {
  searchParams: {
    mpPage?: string; nvPage?: string;
    mpSort?: string; mpDir?: string;
    nvSort?: string; nvDir?: string;
  };
}) {
  const pageSize = 100;
  const mpPage = Math.max(1, Number(searchParams.mpPage) || 1);
  const nvPage = Math.max(1, Number(searchParams.nvPage) || 1);
  const mpDir: "asc" | "desc" = searchParams.mpDir === "desc" ? "desc" : "asc";
  const nvDir: "asc" | "desc" = searchParams.nvDir === "desc" ? "desc" : "asc";

  function mpSortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "demande": return { idDemande: mpDir };
      case "article": return { article: { designation: mpDir } };
      case "quantite": return { qt: mpDir };
      default: return { id: "desc" as const };
    }
  }
  function nvSortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "demande": return { idDemande: nvDir };
      case "article": return { article: { designation: nvDir } };
      case "activite": return { activite: { designation: nvDir } };
      case "quantite": return { quantite: nvDir };
      default: return { id: "desc" as const };
    }
  }

  const [mpTotal, mpLignes, nvTotal, nvLignes, articles, activites] = await Promise.all([
    prisma.dsMp.count(),
    prisma.dsMp.findMany({
      include: { article: true },
      orderBy: mpSortOrderFor(searchParams.mpSort),
      skip: (mpPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dsNvArticle.count(),
    prisma.dsNvArticle.findMany({
      include: { article: true, activite: true },
      orderBy: nvSortOrderFor(searchParams.nvSort),
      skip: (nvPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.activiteSousTraitance.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  const mpPagination = paginationMath(mpTotal, mpPage, pageSize);
  const nvPagination = paginationMath(nvTotal, nvPage, pageSize);

  function mpPageHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.nvPage) params.set("nvPage", searchParams.nvPage);
    if (searchParams.mpSort) params.set("mpSort", searchParams.mpSort);
    if (searchParams.mpDir) params.set("mpDir", searchParams.mpDir);
    params.set("mpPage", String(p));
    return `?${params.toString()}`;
  }
  function nvPageHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.mpPage) params.set("mpPage", searchParams.mpPage);
    if (searchParams.nvSort) params.set("nvSort", searchParams.nvSort);
    if (searchParams.nvDir) params.set("nvDir", searchParams.nvDir);
    params.set("nvPage", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Matière première & pièces nouvelles" />
      <div className="p-8 space-y-10">
        <p className="text-sm text-muted max-w-2xl">
          <code>id_demande</code> identifie la demande de sous-traitance
          concernée — aucune contrainte de clé étrangère formelle
          n&apos;existe dans la base d&apos;origine pour ce champ (comme
          partout ailleurs dans cette application), saisissez le numéro
          correspondant manuellement.
        </p>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Matière première fournie au sous-traitant
          </div>
          <form
            action={addDsMp}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="w-32">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                N° demande <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                name="idDemande"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
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
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Quantité <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="qt"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>

          <RangeSummary
            totalCount={mpTotal}
            rangeStart={mpPagination.rangeStart}
            rangeEnd={mpPagination.rangeEnd}
            emptyLabel="Aucune matière première enregistrée."
            itemLabel="ligne"
          />

          <div className="bg-surface border border-hairline rounded overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <SortableTh searchParams={searchParams} columnKey="demande" label="Demande" currentSort={searchParams.mpSort} currentDir={searchParams.mpDir} sortParam="mpSort" dirParam="mpDir" />
                  <SortableTh searchParams={searchParams} columnKey="article" label="Article" currentSort={searchParams.mpSort} currentDir={searchParams.mpDir} sortParam="mpSort" dirParam="mpDir" />
                  <SortableTh searchParams={searchParams} columnKey="quantite" label="Quantité" className="w-24 text-right" currentSort={searchParams.mpSort} currentDir={searchParams.mpDir} sortParam="mpSort" dirParam="mpDir" />
                  <th className="px-4 py-3 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody>
                {mpLignes.map((l) => (
                  <tr key={l.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">#{l.idDemande}</td>
                    <td className="px-4 py-2.5 text-ink">{l.article.designation}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {l.qt.toString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={deleteDsMp.bind(null, l.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {mpLignes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune matière première enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls page={mpPage} totalPages={mpPagination.totalPages} buildHref={mpPageHref} />
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Pièces nouvelles / fabrications personnalisées
          </div>
          <form
            action={addDsNvArticle}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="w-32">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                N° demande <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                name="idDemande"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Article de base <span className="text-urgent">*</span>
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
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Activité <span className="text-urgent">*</span>
              </label>
              <select
                name="idActivite"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {activites.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Quantité <span className="text-urgent">*</span>
              </label>
              <input
                type="number"
                name="quantite"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Description
              </label>
              <input
                type="text"
                name="description"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>

          <RangeSummary
            totalCount={nvTotal}
            rangeStart={nvPagination.rangeStart}
            rangeEnd={nvPagination.rangeEnd}
            emptyLabel="Aucune fabrication personnalisée enregistrée."
            itemLabel="ligne"
          />

          <div className="bg-surface border border-hairline rounded overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <SortableTh searchParams={searchParams} columnKey="demande" label="Demande" currentSort={searchParams.nvSort} currentDir={searchParams.nvDir} sortParam="nvSort" dirParam="nvDir" />
                  <SortableTh searchParams={searchParams} columnKey="article" label="Article de base" currentSort={searchParams.nvSort} currentDir={searchParams.nvDir} sortParam="nvSort" dirParam="nvDir" />
                  <SortableTh searchParams={searchParams} columnKey="activite" label="Activité" currentSort={searchParams.nvSort} currentDir={searchParams.nvDir} sortParam="nvSort" dirParam="nvDir" />
                  <SortableTh searchParams={searchParams} columnKey="quantite" label="Qté" className="w-20 text-right" currentSort={searchParams.nvSort} currentDir={searchParams.nvDir} sortParam="nvSort" dirParam="nvDir" />
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody>
                {nvLignes.map((l) => (
                  <tr key={l.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">#{l.idDemande}</td>
                    <td className="px-4 py-2.5 text-ink">{l.article.designation}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{l.activite.designation}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {l.quantite}
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{l.description ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={deleteDsNvArticle.bind(null, l.id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {nvLignes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune fabrication personnalisée enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls page={nvPage} totalPages={nvPagination.totalPages} buildHref={nvPageHref} />
        </section>
      </div>
    </>
  );
}
