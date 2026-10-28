import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const LINKS = [
  {
    href: "/production/settings/equipements",
    title: "Équipements par section",
    desc: "Assigner chaque équipement à une section (Préparation, Fabrication, Four, Emballage).",
  },
  {
    href: "/production/settings/briques",
    title: "Types de briques",
    desc: "Gérer les types de produits (poids cru / cuit) utilisés dans les rapports.",
  },
  {
    href: "/production/settings/parametres",
    title: "Paramètres de mesure",
    desc: "Gérer les paramètres de qualité générés automatiquement dans chaque rapport.",
  },
];

export default function ProductionSettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Production" title="Paramètres" />
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
