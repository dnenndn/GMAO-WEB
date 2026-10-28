import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

export default async function SousTraitanceHubPage() {
  const [devisCount, commandeAttente, commandeEnCours, livraisonCount] = await Promise.all([
    prisma.dsDevis.count({ where: { statut: "En cours" } }),
    prisma.dsCommande.count({ where: { statut: "En attente" } }),
    prisma.dsCommande.count({ where: { statut: "En cours" } }),
    prisma.dsBonLivraison.count(),
  ]);

  const cards = [
    { label: "Devis en cours", value: devisCount, href: "/sous-traitance/devis" },
    { label: "Commandes en attente", value: commandeAttente, href: "/sous-traitance/commandes?statut=En+attente" },
    { label: "Commandes en cours", value: commandeEnCours, href: "/sous-traitance/commandes?statut=En+cours" },
    { label: "Livraisons", value: livraisonCount, href: "/sous-traitance/livraisons" },
  ];

  const links = [
    { href: "/sous-traitance/devis", label: "Devis" },
    { href: "/sous-traitance/commandes", label: "Commandes" },
    { href: "/sous-traitance/livraisons", label: "Livraisons" },
    { href: "/sous-traitance/factures", label: "Factures" },
    { href: "/sous-traitance/matiere-premiere", label: "Matière première & pièces nouvelles" },
    { href: "/sous-traitance/magasin", label: "Magasin sous-traitance" },
    { href: "/sous-traitance/mouvements", label: "Mouvements (Usine/Magasin/Réparation)" },
    { href: "/sous-traitance/settings/activites", label: "Paramètres" },
  ];

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Sous-traitance" hideBack />
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
