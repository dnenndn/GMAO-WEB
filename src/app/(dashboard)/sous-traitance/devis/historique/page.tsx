import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";

export default async function DevisHistoriquePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; devisId?: string; demandeId?: string };
}) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setMonth(defaultFrom.getMonth() - 3);
  const from = searchParams.from ? new Date(searchParams.from) : defaultFrom;
  const to = searchParams.to ? new Date(searchParams.to) : now;

  const devisIdFilter = searchParams.devisId ? Number(searchParams.devisId) : undefined;
  const demandeIdFilter = searchParams.demandeId ? Number(searchParams.demandeId) : undefined;

  const devis = await prisma.dsDevis.findMany({
    where: {
      dateDevis: { gte: from, lte: to },
      ...(devisIdFilter ? { id: devisIdFilter } : {}),
      ...(demandeIdFilter ? { idDs: demandeIdFilter } : {}),
      // Confirmed via historique_devis_st.cs: excludes demandes whose
      // parent request is still active (statut = 0) — this screen only
      // shows history for requests that have moved past "in progress".
      ds: { statut: { not: 0 } },
    },
    include: {
      fournisseurs: { include: { fournisseur: true } },
      ds: true,
    },
    orderBy: { dateDevis: "desc" },
    take: 100,
  });

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Historique des devis" />
      <div className="p-8 space-y-6">
        <p className="text-sm text-muted max-w-2xl">
          Ne montre que les devis dont la demande de sous-traitance
          parente n&apos;est plus en cours (confirmé :{" "}
          <code className="font-mono">statut = 0</code> signifie
          &quot;en cours&quot; et est exclu ici).
        </p>

        <form className="flex gap-3 items-end flex-wrap" method="get">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Du
            </label>
            <input
              type="date"
              name="from"
              defaultValue={fmt(from)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Au
            </label>
            <input
              type="date"
              name="to"
              defaultValue={fmt(to)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              N° Devis
            </label>
            <input
              type="number"
              name="devisId"
              defaultValue={searchParams.devisId ?? ""}
              className="w-28 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              N° Demande
            </label>
            <input
              type="number"
              name="demandeId"
              defaultValue={searchParams.demandeId ?? ""}
              className="w-28 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors"
          >
            Rechercher
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Devis</th>
                <th className="px-4 py-3 font-semibold">Demande</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold">Créateur</th>
                <th className="px-4 py-3 font-semibold">Livraison incluse</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {devis.map((d) => (
                <tr key={d.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/sous-traitance/devis/${d.id}`}>
                      <Nameplate>DEV-{String(d.id).padStart(4, "0")}</Nameplate>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs font-mono">#{d.idDs}</td>
                  <td className="px-4 py-3 text-ink">
                    {d.fournisseurs.map((f) => f.fournisseur.nom).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{d.createur ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{d.livr ? "Oui" : "Non"}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">
                    {d.dateDevis.toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
              {devis.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted text-sm">
                    Aucun devis pour ces critères.
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
