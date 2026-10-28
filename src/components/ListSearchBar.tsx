type SearchParamsInput = Record<string, string | string[] | undefined>;

// A standalone search form, meant to sit between the filter panel and
// the results table (not embedded inside the filter panel itself, per
// explicit request). Since it's a separate <form> from the main
// filters, every other currently-active param gets carried over as a
// hidden input so searching never silently drops an existing filter.
export function ListSearchBar({
  searchParams,
  placeholder,
}: {
  readonly searchParams: SearchParamsInput;
  readonly placeholder: string;
}) {
  const hiddenEntries: [string, string][] = [];
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "q" || value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) hiddenEntries.push([key, v]);
    } else {
      hiddenEntries.push([key, value]);
    }
  }

  return (
    <form method="get" className="relative">
      {hiddenEntries.map(([key, value], i) => (
        <input key={`${key}-${i}`} type="hidden" name={key} value={value} />
      ))}
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        name="q"
        defaultValue={typeof searchParams.q === "string" ? searchParams.q : ""}
        placeholder={placeholder}
        className="w-full border border-hairline rounded pl-9 pr-3 py-2.5 text-sm bg-surface"
      />
    </form>
  );
}
