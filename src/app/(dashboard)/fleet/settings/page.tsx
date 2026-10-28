import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const LINKS = [
  { href: "/fleet/settings/vehicle-types", title: "Types de véhicule", desc: "Catégories de véhicules (camion, voiture, engin de chantier…)." },
  { href: "/fleet/settings/drivers", title: "Chauffeurs", desc: "Liste des chauffeurs assignables aux véhicules." },
  { href: "/fleet/settings/fuel-types", title: "Types de carburant", desc: "Essence, gasoil, etc." },
  { href: "/fleet/settings/categories", title: "Catégories de charge", desc: "Classes de charge utile pour les véhicules lourds." },
];

export default function FleetSettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Flotte" title="Paramètres" />
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
