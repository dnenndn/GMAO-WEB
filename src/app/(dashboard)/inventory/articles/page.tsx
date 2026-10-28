import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// RESTORED — this file was found to be a byte-for-byte duplicate of
// liste-article/page.tsx, which is a genuinely different screen (that
// one breaks stock down by physical condition — Neuf/Usé/Rebuté/
// Réparable; this one is the main article catalog with a single
// aggregate stock figure, matching the reference screenshot's own
// columns: ID, Code Article, Référence, Désignation, Marque, Magasin,
// Qt en stock, PU HT). Rebuilt from the original design rather than
// left as an accidental duplicate.
//
// Pagination added after a real, confirmed gap: the previous version
// had a flat `take: 200` limit with no pagination at all — for a
// catalog with 8,232 real articles, everything past the first 200
// (alphabetically) was silently invisible, confirmed directly against
// a real SQL Server vs Postgres row-count comparison.
//
// Sortable columns added — every column here now works the same way
// as the OT/DI lists' sortable headers.

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; sort?: string; dir?: string };
}) {
  const q = searchParams.q?.trim();
  const pageSize = 200;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const qAsId = q && /^\d+$/.test(q) ? Number(q) : null;
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  const where = {
    deleted: false,
    ...(q
      ? {
          OR: [
            { codeArticle: { contains: q, mode: "insensitive" as const } },
            { reference: { contains: q, mode: "insensitive" as const } },
            { designation: { contains: q, mode: "insensitive" as const } },
            { marque: { contains: q, mode: "insensitive" as const } },
            // A purely-numeric search also matches the article's own id
            // directly — a real gap found via a real report: searching
            // an article by its ID (as shown in the old app) returned
            // nothing, since none of the text fields above contain it.
            ...(qAsId != null ? [{ id: qAsId }] : []),
          ],
        }
      : {}),
  };

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "id": return { id: dir };
      case "codeArticle": return { codeArticle: dir };
      case "reference": return { reference: dir };
      case "designation": return { designation: dir };
      case "marque": return { marque: dir };
      case "magasin": return { magasin: { designation: dir } };
      case "stockNeuf": return { stockNeuf: dir };
      case "prixHt": return { prixHt: dir };
      default: return { designation: "asc" as const };
    }
  }

  const [totalCount, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      include: { magasin: true },
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Gestion de stock"
        title="Liste des articles"
        action={{ href: "/inventory/articles/new", label: "+ Nouvel article" }} hideBack
      />
      <div className="p-8 space-y-4">
        <form method="get" className="max-w-sm">
          {searchParams.sort && <input type="hidden" name="sort" value={searchParams.sort} />}
          {searchParams.dir && <input type="hidden" name="dir" value={searchParams.dir} />}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Recherche (ID, code, référence, désignation, marque)"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </form>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun article pour ces critères."
          itemLabel="article"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="ID" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="codeArticle" label="Code Article" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="reference" label="Référence" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="designation" label="Désignation" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="marque" label="Marque" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="magasin" label="Magasin" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="stockNeuf" label="Qt en stock" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="prixHt" label="PU HT" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => {
                const low = a.stockMini != null && Number(a.stockNeuf) < Number(a.stockMini);
                return (
                  <tr key={a.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 text-muted font-mono text-xs">{a.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/articles/${a.id}`}>
                        <Nameplate>{a.codeArticle ?? `ART-${a.id}`}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink text-xs">{a.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-ink">{a.designation}</td>
                    <td className="px-4 py-3 text-ink text-xs">{a.marque ?? "—"}</td>
                    <td className="px-4 py-3 text-muted text-xs">{a.magasin?.designation ?? "—"}</td>
                    <td
                      className={`px-4 py-3 font-mono text-xs text-right ${
                        low ? "text-urgent font-semibold" : "text-ink"
                      }`}
                    >
                      {a.stockNeuf.toString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-right text-ink">
                      {a.prixHt?.toFixed(3) ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun article pour ces critères.
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
