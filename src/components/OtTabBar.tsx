import Link from "next/link";

const TABS = [
  { href: "/work-orders", label: "Liste des OT" },
  { href: "/work-orders/calendrier", label: "Calendrier" },
  { href: "/work-orders/tableaux", label: "Tableaux" },
  { href: "/work-orders/analyses", label: "Analyses" },
  { href: "/work-orders/tableau-de-bord", label: "Tableaux de bord" },
  { href: "/work-orders/checklist", label: "CheckList" },
  { href: "/work-orders/planning", label: "Planning" },
] as const;

// Reproduces the legacy app's real OT tab bar (button2-7 in
// ordre_travail.cs). Removed once when only "Liste des OT" had real
// content behind it; restored now that all 6 other tabs are actually
// built, so this belongs as in-page sub-navigation under OT rather
// than as flat, separate sidebar entries.
export function OtTabBar({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="flex gap-1 border-b border-hairline px-8 bg-surface overflow-x-auto">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
            t.href === active
              ? "border-steel-600 text-steel-700"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
