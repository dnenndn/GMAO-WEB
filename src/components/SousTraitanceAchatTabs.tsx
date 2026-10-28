import Link from "next/link";

const TABS = [
  { href: "/sous-traitance/devis", label: "Devis" },
  { href: "/sous-traitance/commandes", label: "Commande" },
  { href: "/sous-traitance/livraisons", label: "Livraison" },
  { href: "/sous-traitance/factures", label: "Facture" },
] as const;

// Reproduces the legacy app's Achat sub-module tab bar under Sous
// Traitance — a real gap found on revisiting this module: all 4 real
// pages already existed, but nothing linked them together the way the
// reference shows (Devis/Commande/Livraison/Facture as sibling tabs).
export function SousTraitanceAchatTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="flex gap-1 border-b border-hairline mb-4">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`px-4 py-2 text-sm font-semibold rounded-t ${
            active === t.href
              ? "bg-steel-600 text-white"
              : "text-steel-600 hover:bg-paper border border-hairline border-b-0"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
