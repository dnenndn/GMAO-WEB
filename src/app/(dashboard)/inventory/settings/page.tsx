import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const LINKS = [
  {
    href: "/inventory/settings/familles",
    title: "Familles",
    desc: "Catégorie de premier niveau pour les articles.",
  },
  {
    href: "/inventory/settings/sous-familles",
    title: "Sous-familles",
    desc: "Catégorie de second niveau, rattachée à une famille.",
  },
  {
    href: "/inventory/settings/magasins",
    title: "Magasins",
    desc: "Emplacements de stockage.",
  },
  {
    href: "/inventory/settings/caracteristiques",
    title: "Caractéristiques",
    desc: "Champs personnalisés définis par sous-famille (dimensions, propriétés spécifiques).",
  },
  {
    href: "/inventory/settings/unites",
    title: "Unités",
    desc: "Unités de mesure pour les articles.",
  },
  {
    href: "/inventory/settings/article-reference",
    title: "Profil article",
    desc: "Classification, emplacement et conditions de stockage — listes de référence pour la fiche article.",
  },
];

export default function InventorySettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Inventaire" title="Paramètres" />
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
