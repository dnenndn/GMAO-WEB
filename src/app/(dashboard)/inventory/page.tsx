import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

export default async function InventoryHubPage() {
  const [articleCount, lowStockArticles, bsmEnAttente, receptionCount] = await Promise.all([
    prisma.article.count({ where: { deleted: false } }),
    prisma.article.findMany({
      where: { deleted: false, stockMini: { not: null } },
      select: { stockNeuf: true, stockMini: true },
    }),
    prisma.bsm.count({ where: { validation: false } }),
    prisma.reception.count(),
  ]);

  const lowStockCount = lowStockArticles.filter(
    (a) => a.stockMini != null && Number(a.stockNeuf) < Number(a.stockMini)
  ).length;

  const cards = [
    { label: "Articles", value: articleCount, href: "/inventory/articles" },
    { label: "Sous seuil mini", value: lowStockCount, href: "/inventory/articles" },
    { label: "BSM en attente", value: bsmEnAttente, href: "/inventory/bsm" },
    { label: "Réceptions", value: receptionCount, href: "/inventory/receptions" },
  ];

  const links = [
    { href: "/inventory/articles", label: "Articles" },
    { href: "/inventory/bsm", label: "Bons de sortie (BSM)" },
    { href: "/inventory/brm", label: "Bons de retour (BRM)" },
    { href: "/inventory/receptions", label: "Réceptions" },
    { href: "/inventory/mouvements", label: "Mouvements de stock" },
    { href: "/inventory/reapprovisionnement", label: "Réapprovisionnement automatique" },
    { href: "/inventory/settings", label: "Paramètres" },
  ];

  return (
    <>
      <PageHeader eyebrow="Inventaire" title="Stock" hideBack />
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
