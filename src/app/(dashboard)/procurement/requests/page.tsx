import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";

// Reproduces the legacy app's DA screen tabs.
//
// CORRECTED — this page originally filtered by each DA's most recent
// DaAction, based on an assumption that DemandeAchat.statut only had 2
// real values. That was wrong, found by re-checking the decompiled C#
// source directly: demande_achat.statut is a real INTEGER field with 5
// distinct codes, confirmed from the source's own hardcoded SQL
// parameters — 0=En cours (liste_da.cs), 1=Confirmée (da_confirmer.cs),
// 2=Refusée (da_refuser.cs), 4=Reportée (da_reporter.cs), 10=Clôturée
// (da_cloturer.cs's own UPDATE statement) — the same 0/1/2/4/10-style
// convention already confirmed for Commande.statut elsewhere in this
// app. The tabs below now filter directly on the real statut string,
// matching the C# source's actual logic, instead of guessing through
// DaAction. See prisma/schema.prisma's DemandeAchat.statut comment and
// migration/fixups/da-statut-recovery.ts for the full account — the
// already-migrated data had this distinction collapsed away and needed
// an actual data-recovery pass, not just a UI fix.

const TABS = [
  { key: "En cours", label: "DA en cours" },
  { key: "Confirmée", label: "DA Confirmée" },
  { key: "Refusée", label: "DA Refusée" },
  { key: "Reportée", label: "DA Reportée" },
  { key: "Admin", label: "DA Admin" },
  { key: "Clôturée", label: "Historique DA" },
] as const;

export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab! : "En cours";

  const das = await prisma.demandeAchat.findMany({
    where: { statut: tab },
    orderBy: { dateDa: "desc" },
    include: { _count: { select: { lignes: true } } },
    take: 300,
  });

  return (
    <>
      <PageHeader
        eyebrow="Achats"
        title="Demandes d'achat"
        action={{ href: "/procurement/requests/new", label: "+ Nouvelle demande" }} hideBack
      />
      <div className="p-8 space-y-4">
        <div className="flex gap-1 border-b border-hairline">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/procurement/requests?tab=${encodeURIComponent(t.key)}`}
              className={`px-4 py-2 text-sm font-semibold rounded-t ${
                tab === t.key
                  ? "bg-steel-600 text-white"
                  : "text-steel-600 hover:bg-paper border border-hairline border-b-0"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Heure</th>
                <th className="px-4 py-3 font-semibold">Créateur</th>
                <th className="px-4 py-3 font-semibold">Demandeur</th>
                <th className="px-4 py-3 font-semibold">Delai Souhaité</th>
                <th className="px-4 py-3 font-semibold">Lignes</th>
              </tr>
            </thead>
            <tbody>
              {das.map((da) => (
                <tr key={da.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/procurement/requests/${da.id}`}>
                      <Nameplate>DA-{String(da.id).padStart(4, "0")}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {da.dateDa.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{da.heureDa ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">{da.createur ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">{da.demandeur ?? "—"}</td>
                  <td className="px-4 py-3 text-ink text-xs">
                    {da.delai != null ? `${da.delai} ${da.periode ?? "Jour"}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{da._count.lignes}</td>
                </tr>
              ))}
              {das.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune demande d'achat pour cet onglet.
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
