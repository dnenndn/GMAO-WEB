import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SortableTh } from "@/components/SortableTh";

// Reproduces the legacy app's "Liste article" screen — genuinely
// distinct from "Articles" (which shows one aggregate stock number):
// this one breaks stock down by physical condition (Neuf/Usé/Rebuté/
// Réparable). Resolved a previously-flagged ambiguity — this page used
// to just point at the same Articles list. The reference shows a 5th,
// truncated stock column that couldn't be confidently read from the
// screenshot; not guessed at here, only the 4 confirmed real fields are
// shown.

export default async function ListeArticlePage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; sort?: string; dir?: string };
}) {
  const q = searchParams.q?.trim();
  const pageSize = 200;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "id": return { id: dir };
      case "codeArticle": return { codeArticle: dir };
      case "reference": return { reference: dir };
      case "designation": return { designation: dir };
      case "marque": return { marque: dir };
      case "stockNeuf": return { stockNeuf: dir };
      case "stockUse": return { stockUse: dir };
      case "stockRebute": return { stockRebute: dir };
      case "stockReparableManuel": return { stockReparableManuel: dir };
      default: return { id: "asc" as const };
    }
  }

  const where = {
    deleted: false,
    ...(q
      ? {
          OR: [
            { codeArticle: { contains: q, mode: "insensitive" as const } },
            { reference: { contains: q, mode: "insensitive" as const } },
            { designation: { contains: q, mode: "insensitive" as const } },
            { marque: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Same fix as the Articles page — this used to have `take: 200` with
  // no pagination, silently hiding every article past the first 200.
  const [totalCount, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

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
      <PageHeader eyebrow="Gestion de stock" title="Liste article" hideBack />
      <div className="p-8 space-y-4">
        <form method="get" className="max-w-sm">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Recherche
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Code, référence, désignation, marque"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </form>

        <div className="text-xs text-muted">
          {totalCount === 0
            ? "Aucun article pour ces critères."
            : `Affichage ${rangeStart}–${rangeEnd} sur ${totalCount} article${totalCount > 1 ? "s" : ""}`}
        </div>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="ID" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="codeArticle" label="Code Article" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="reference" label="Référence" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="designation" label="Désignation" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="marque" label="Marque" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="stockNeuf" label="Stock Neuf" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="stockUse" label="Stock Usé" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="stockRebute" label="Stock Rebuté" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="stockReparableManuel" label="Stock Réparable" className="w-24 text-right" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">{a.id}</td>
                  <td className="px-4 py-2.5">
                    <Nameplate>{a.codeArticle ?? `ART-${a.id}`}</Nameplate>
                  </td>
                  <td className="px-4 py-2.5 text-ink text-xs">{a.reference ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink">{a.designation}</td>
                  <td className="px-4 py-2.5 text-ink text-xs">{a.marque ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-right text-ink">
                    {a.stockNeuf.toString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-right text-ink">
                    {a.stockUse.toString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-right text-ink">
                    {a.stockRebute.toString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-right text-ink">
                    {a.stockReparableManuel?.toString() ?? "0"}
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun article pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href={pageHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`px-3 py-1.5 text-sm rounded border border-hairline ${
                page <= 1 ? "text-muted/40 pointer-events-none" : "text-ink hover:border-steel-400"
              }`}
            >
              ← Précédent
            </Link>
            <span className="text-xs text-muted px-2">
              Page {page} / {totalPages}
            </span>
            <Link
              href={pageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`px-3 py-1.5 text-sm rounded border border-hairline ${
                page >= totalPages ? "text-muted/40 pointer-events-none" : "text-ink hover:border-steel-400"
              }`}
            >
              Suivant →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
