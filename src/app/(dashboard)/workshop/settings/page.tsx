import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const LINKS = [
  { href: "/workshop/settings/machines", title: "Machines", desc: "Parc machines de l'atelier." },
  { href: "/workshop/settings/types-piece", title: "Types de pièce", desc: "Classification des pièces fabriquées." },
  { href: "/workshop/settings/priorites", title: "Priorités", desc: "Niveaux de priorité des ordres de fabrication." },
  { href: "/workshop/settings/conceptions", title: "Types de conception", desc: "Classification par mode de conception." },
];

export default function WorkshopSettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Atelier" title="Paramètres" hideBack />
      <div className="p-8 grid grid-cols-2 gap-4 max-w-3xl">
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
