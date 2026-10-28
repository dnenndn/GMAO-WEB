import Link from "next/link";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function buildSortHref(
  searchParams: SearchParamsInput,
  columnKey: string,
  nextDir: "asc" | "desc",
  sortParam: string,
  dirParam: string
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === sortParam || key === dirParam) continue;
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  params.set(sortParam, columnKey);
  params.set(dirParam, nextDir);
  return `?${params.toString()}`;
}

export function SortableTh({
  searchParams,
  columnKey,
  label,
  currentSort,
  currentDir,
  className,
  sortParam = "sort",
  dirParam = "dir",
}: {
  readonly searchParams: SearchParamsInput;
  readonly columnKey: string;
  readonly label: string;
  readonly currentSort?: string;
  readonly currentDir?: string;
  readonly className?: string;
  // Only needed on a page with more than one independently-sortable
  // table (e.g. matiere-premiere's two unrelated lists) — lets each
  // table use its own query params (mpSort/mpDir vs nvSort/nvDir)
  // instead of both fighting over the same "sort"/"dir" pair.
  readonly sortParam?: string;
  readonly dirParam?: string;
}) {
  const isActive = currentSort === columnKey;
  const nextDir: "asc" | "desc" = isActive && currentDir === "asc" ? "desc" : "asc";

  return (
    <th className={`px-4 py-3 font-semibold ${className ?? ""}`}>
      <Link
        href={buildSortHref(searchParams, columnKey, nextDir, sortParam, dirParam)}
        scroll={false}
        className="inline-flex items-center gap-1 hover:text-ink transition-colors"
      >
        {label}
        <span className="text-[10px] leading-none">
          {isActive ? (currentDir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </Link>
    </th>
  );
}
