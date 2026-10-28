// For tables whose rows come from multi-step application-code joins
// (rather than a single Prisma query that could use `orderBy`), this
// sorts the already-fetched array in memory based on the `sort`/`dir`
// URL params, using a small map of column-key -> value-extractor
// functions supplied by the page. Handles strings, numbers, Dates,
// Decimals (via their .toString()), and nulls (always sorted last,
// regardless of direction, so incomplete rows don't scatter through
// the middle of the results).
export function sortRows<T>(
  rows: T[],
  sort: string | undefined,
  dir: "asc" | "desc",
  extractors: Record<string, (row: T) => string | number | Date | null | undefined>
): T[] {
  if (!sort || !extractors[sort]) return rows;
  const extract = extractors[sort];

  return [...rows].sort((a, b) => {
    const va = extract(a);
    const vb = extract(b);

    const aNull = va == null;
    const bNull = vb == null;
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;

    let cmp: number;
    if (va instanceof Date && vb instanceof Date) {
      cmp = va.getTime() - vb.getTime();
    } else if (typeof va === "number" && typeof vb === "number") {
      cmp = va - vb;
    } else {
      cmp = String(va).localeCompare(String(vb), "fr");
    }
    return dir === "asc" ? cmp : -cmp;
  });
}
