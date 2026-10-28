import Link from "next/link";

const SECTIONS = [
  { key: "", label: "Aperçu" },
  { key: "suivi", label: "Suivi journalier" },
  { key: "qualite", label: "Qualité" },
];

export function JobTabs({ id, active }: { id: number; active: string }) {
  return (
    <div className="flex gap-1 border-b border-hairline px-8 -mt-px">
      {SECTIONS.map((s) => {
        const href = s.key ? `/workshop/jobs/${id}/${s.key}` : `/workshop/jobs/${id}`;
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
