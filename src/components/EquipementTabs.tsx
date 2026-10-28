import Link from "next/link";

const SECTIONS = [
  { key: "", label: "Aperçu" },
  { key: "technique", label: "Technique & Observations" },
  { key: "documents", label: "Documents" },
  { key: "prevision", label: "Prévision" },
];

export function EquipementTabs({ id, active }: { id: number; active: string }) {
  return (
    <div className="flex gap-1 border-b border-hairline px-8 -mt-px">
      {SECTIONS.map((s) => {
        const href = s.key ? `/equipements/${id}/${s.key}` : `/equipements/${id}`;
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
