import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SousTraitanceAchatTabs } from "@/components/SousTraitanceAchatTabs";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { commandeStatutColor, COMMANDE_STATUTS } from "@/lib/constants";

export default async function CommandesStPage({
  searchParams,
}: {
  searchParams: { statut?: string };
}) {
  const commandes = await prisma.dsCommande.findMany({
    where: searchParams.statut ? { statut: searchParams.statut } : undefined,
    include: { fournisseur: true },
    orderBy: { dateCommande: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        eyebrow="Sous-traitance"
        title="Commandes"
        action={{ href: "/sous-traitance/commandes/new", label: "+ Nouvelle commande" }} hideBack
      />
      <div className="p-8">
        <SousTraitanceAchatTabs active="/sous-traitance/commandes" />
        <div className="flex gap-2 mb-4 flex-wrap">
          <FilterLink href="/sous-traitance/commandes" label="Toutes" active={!searchParams.statut} />
          {COMMANDE_STATUTS.map((s) => (
            <FilterLink
              key={s}
              href={`/sous-traitance/commandes?statut=${encodeURIComponent(s)}`}
              label={s}
              active={searchParams.statut === s}
            />
          ))}
        </div>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">N° Commande</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((c) => {
                const s = commandeStatutColor(c.statut);
                return (
                  <tr key={c.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/sous-traitance/commandes/${c.id}`}>
                        <Nameplate>{c.nCommande}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{c.fournisseur?.nom ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={c.statut} fg={s.fg} bg={s.bg} />
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {c.dateCommande.toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
              {commandes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune commande pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-steel-600 text-white border-steel-600"
          : "bg-surface text-muted border-hairline hover:border-steel-400"
      }`}
    >
      {label}
    </Link>
  );
}
