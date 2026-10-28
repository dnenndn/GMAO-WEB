import Link from "next/link";

// Shared pagination footer — same UI already proven on the Articles
// page fix (Précédent/Suivant + "Page X / Y"), extracted here so every
// list page that needs real pagination uses identical behavior and
// styling instead of each reimplementing it slightly differently.
export function PaginationControls({
  page,
  totalPages,
  buildHref,
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Link
        href={buildHref(Math.max(1, page - 1))}
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
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`px-3 py-1.5 text-sm rounded border border-hairline ${
          page >= totalPages ? "text-muted/40 pointer-events-none" : "text-ink hover:border-steel-400"
        }`}
      >
        Suivant →
      </Link>
    </div>
  );
}

// Shared "Affichage X–Y sur Z" count line, same as Articles.
export function RangeSummary({
  totalCount,
  rangeStart,
  rangeEnd,
  emptyLabel,
  itemLabel,
}: {
  readonly totalCount: number;
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly emptyLabel: string;
  readonly itemLabel: string;
}) {
  return (
    <div className="text-xs text-muted">
      {totalCount === 0
        ? emptyLabel
        : `Affichage ${rangeStart}–${rangeEnd} sur ${totalCount} ${itemLabel}${totalCount > 1 ? "s" : ""}`}
    </div>
  );
}

export function paginationMath(totalCount: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);
  return { totalPages, rangeStart, rangeEnd };
}
