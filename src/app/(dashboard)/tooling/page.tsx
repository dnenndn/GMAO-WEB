import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

export default async function ToolingHubPage() {
  const [total, enUtilisation] = await Promise.all([
    prisma.outil.count(),
    prisma.outil.count({ where: { statut: false } }),
  ]);

  const cards = [
    { label: "Outils", value: total, href: "/tooling/outils" },
    { label: "En cours d'utilisation", value: enUtilisation, href: "/tooling/outils" },
  ];

  const links = [
    { href: "/tooling/outils", label: "Outils" },
    { href: "/tooling/settings/secteurs", label: "Secteurs" },
    { href: "/tooling/settings/types", label: "Types d'outils" },
    { href: "/tooling/settings/utilisations", label: "Utilisations" },
  ];

  return (
    <>
      <PageHeader eyebrow="Outillage" title="Outillage" hideBack />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 gap-4 max-w-md">
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
