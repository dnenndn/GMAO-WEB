import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const LINKS = [
  { href: "/tooling/settings/secteurs", title: "Secteurs", desc: "Zones/secteurs d'affectation des outils." },
  { href: "/tooling/settings/types", title: "Types d'outils", desc: "Catégories d'outils." },
  { href: "/tooling/settings/utilisations", title: "Utilisations", desc: "Liste de référence (lien non confirmé, voir spec)." },
];

export default function ToolingSettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Outillage" title="Paramètres" />
      <div className="p-8 grid grid-cols-3 gap-4 max-w-4xl">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="bg-surface border border-hairline rounded p-5 hover:border-steel-400 transition-colors"
          >
            <div className="text-sm font-semibold text-ink">{l.title}</div>
            <div className="text-xs text-muted mt-1.5">{l.desc}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
