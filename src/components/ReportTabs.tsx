import Link from "next/link";

const SECTIONS = [
  { key: "", label: "Aperçu" },
  { key: "fabrication", label: "Fabrication" },
  { key: "four", label: "Four" },
  { key: "emballage", label: "Emballage" },
  { key: "preparation", label: "Préparation" },
  { key: "qualite", label: "Qualité" },
  { key: "fuel", label: "Fuel" },
  { key: "gaz", label: "Gaz" },
  { key: "anomalies", label: "Anomalies" },
];

export function ReportTabs({ id, active }: { id: number; active: string }) {
  // No `replace` here on purpose — it used to overwrite each tab's
  // history entry instead of pushing a new one, so the page header's
  // back button (browser history via router.back()) skipped straight
  // past the whole tab-navigation trail to whatever page was open
  // before the report was even opened. A normal push means back now
  // correctly steps through the tabs actually visited, then the
  // report list, matching what a person expects "back" to do.
  return (
    <div className="flex gap-1 border-b border-hairline px-8 -mt-px">
      {SECTIONS.map((s) => {
        const href = s.key ? `/production/${id}/${s.key}` : `/production/${id}`;
        const isActive = active === s.key;
        return (
          <Link
            key={s.key}
            href={href}
            className={`text-sm font-medium px-3 py-2.5 border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-safety text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
