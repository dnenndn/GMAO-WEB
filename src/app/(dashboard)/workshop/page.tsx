import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

export default async function WorkshopHubPage() {
  const [enCours, enAttente, aVerifier, total] = await Promise.all([
    prisma.atelierCreer.count({ where: { etat: { in: ["En Cours Atelier", "En Cours Méthode"] } } }),
    prisma.atelierCreer.count({ where: { etat: { in: ["En Attente", "En Attente MP", "En Attente Achat"] } } }),
    prisma.atelierCreer.count({ where: { etat: "A Vérifié" } }),
    prisma.atelierCreer.count(),
  ]);

  const cards = [
    { label: "OF en cours", value: enCours, href: "/workshop/jobs?etat=En+Cours+Atelier" },
    { label: "OF en attente", value: enAttente, href: "/workshop/jobs?etat=En+Attente" },
    { label: "À vérifier", value: aVerifier, href: "/workshop/jobs?etat=A+V%C3%A9rifi%C3%A9" },
    { label: "Total OF", value: total, href: "/workshop/jobs" },
  ];

  const links = [
    { href: "/workshop/jobs", label: "Ordres de fabrication" },
    { href: "/workshop/settings", label: "Paramètres" },
  ];

  return (
    <>
      <PageHeader eyebrow="Atelier" title="Atelier de fabrication" hideBack />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="bg-surface border border-hairline rounded p-5 hover:border-steel-400 transition-colors"
            >
              <div className="text-3xl font-semibold font-mono text-ink">{c.value}</div>
              <div className="text-sm text-muted mt-1">{c.label}</div>
            </Link>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-steel-600 hover:text-steel-700"
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
