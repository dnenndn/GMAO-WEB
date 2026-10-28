import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { atelierEtatColor, ATELIER_ETATS } from "@/lib/constants";
import { SortableTh } from "@/components/SortableTh";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";

// Reproduces the legacy app's "Gestion des ateliers" / "Suivi Atelier"
// screen with full filter fidelity — date range plus the reference's
// column-visibility checkbox grid. The reference also shows a
// "Sous-traitant / Non" radio filter with no obvious matching field on
// AtelierCreer — not built here rather than guessed at.

const COLUMN_DEFS = [
  { key: "dateConsultation", label: "Date consultation", defaultOn: true },
  { key: "datePrevu", label: "Date prévu", defaultOn: true },
  { key: "createur", label: "Créateur", defaultOn: false },
  { key: "demandeur", label: "Demandeur", defaultOn: true },
  { key: "plan", label: "N° Plan / Révision", defaultOn: true },
  { key: "atelier", label: "Atelier", defaultOn: false },
  { key: "equipement", label: "Équipement", defaultOn: true },
  { key: "sousEquipement", label: "Sous-équipement", defaultOn: false },
  { key: "organe", label: "Organe", defaultOn: false },
  { key: "typePiece", label: "Type pièce", defaultOn: false },
  { key: "priorite", label: "Priorité", defaultOn: true },
  { key: "dimension", label: "Dimension", defaultOn: false },
  { key: "quantite", label: "Quantité", defaultOn: true },
] as const;

function parseMulti(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function WorkshopJobsPage({
  searchParams,
}: {
  searchParams: {
    etat?: string | string[];
    dateDebut?: string;
    dateFin?: string;
    col?: string | string[];
    page?: string;
    sort?: string;
    dir?: string;
  };
}) {
  const etatFilters = parseMulti(searchParams.etat);
  const activeCols = new Set(
    searchParams.col
      ? parseMulti(searchParams.col)
      : COLUMN_DEFS.filter((c) => c.defaultOn).map((c) => c.key)
  );

  const dateDebut = searchParams.dateDebut ? new Date(searchParams.dateDebut) : undefined;
  const dateFin = searchParams.dateFin ? new Date(searchParams.dateFin) : undefined;
  const pageSize = 100;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  function sortOrderFor(sort: string | undefined) {
    switch (sort) {
      case "id": return { id: dir };
      case "nOf": return { nOf: dir };
      case "etat": return { etat: dir };
      case "dateConsultation": return { dateConsultation: dir };
      case "datePrevu": return { datePrevu: dir };
      case "equipement": return { equipementRef: { designation: dir } };
      default: return { dateConsultation: "desc" as const };
    }
  }

  const where = {
    ...(etatFilters.length > 0 ? { etat: { in: etatFilters } } : {}),
    ...(dateDebut || dateFin
      ? { dateConsultation: { ...(dateDebut ? { gte: dateDebut } : {}), ...(dateFin ? { lte: dateFin } : {}) } }
      : {}),
  };

  const [totalCount, jobs] = await Promise.all([
    prisma.atelierCreer.count({ where }),
    prisma.atelierCreer.findMany({
      where,
      include: {
        equipementRef: true,
        atelierRef: true,
        sousEquipementRef: true,
        organeRef: true,
        demandeur: true,
        parametrePriorite: true,
        parametrePiece: true,
      },
      orderBy: sortOrderFor(searchParams.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    for (const e of etatFilters) params.append("etat", e);
    if (searchParams.dateDebut) params.set("dateDebut", searchParams.dateDebut);
    if (searchParams.dateFin) params.set("dateFin", searchParams.dateFin);
    for (const c of activeCols) params.append("col", c);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.dir) params.set("dir", searchParams.dir);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Atelier"
        title="Gestion des ateliers"
        action={{ href: "/workshop/jobs/new", label: "+ Nouvel OF" }} hideBack
      />
      <div className="p-8 space-y-5">
        <form method="get" className="bg-surface border border-hairline rounded p-5 space-y-4">
          <div className="text-xs font-semibold text-urgent uppercase tracking-wide border-b border-hairline pb-2">
            Filtre de date de consultation
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Date début</label>
              <input type="date" name="dateDebut" defaultValue={searchParams.dateDebut} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Date fin</label>
              <input type="date" name="dateFin" defaultValue={searchParams.dateFin} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface" />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">État</div>
            <div className="flex gap-3 flex-wrap text-sm">
              {ATELIER_ETATS.map((e) => (
                <label key={e} className="flex items-center gap-1.5">
                  <input type="checkbox" name="etat" value={e} defaultChecked={etatFilters.length === 0 || etatFilters.includes(e)} />
                  {e}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Colonnes affichées</div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {COLUMN_DEFS.map((c) => (
                <label key={c.key} className="flex items-center gap-1.5">
                  <input type="checkbox" name="col" value={c.key} defaultChecked={activeCols.has(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button type="submit" className="bg-steel-600 text-white text-sm font-semibold px-5 py-2 rounded hover:bg-steel-700 transition-colors">
              Actualiser
            </button>
          </div>
        </form>

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun ordre de fabrication pour ces critères."
          itemLabel="ordre de fabrication"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="id" label="ID" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="nOf" label="N° OF" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="etat" label="État" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                {activeCols.has("dateConsultation") && <SortableTh searchParams={searchParams} columnKey="dateConsultation" label="Date consultation" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("datePrevu") && <SortableTh searchParams={searchParams} columnKey="datePrevu" label="Date prévu" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("createur") && <th className="px-4 py-3 font-semibold">Créateur</th>}
                {activeCols.has("demandeur") && <th className="px-4 py-3 font-semibold">Demandeur</th>}
                {activeCols.has("plan") && <th className="px-4 py-3 font-semibold">N° Plan / Révision</th>}
                {activeCols.has("atelier") && <th className="px-4 py-3 font-semibold">Atelier</th>}
                {activeCols.has("equipement") && <SortableTh searchParams={searchParams} columnKey="equipement" label="Équipement" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("sousEquipement") && <th className="px-4 py-3 font-semibold">Sous-équipement</th>}
                {activeCols.has("organe") && <th className="px-4 py-3 font-semibold">Organe</th>}
                {activeCols.has("typePiece") && <th className="px-4 py-3 font-semibold">Type pièce</th>}
                {activeCols.has("priorite") && <th className="px-4 py-3 font-semibold">Priorité</th>}
                {activeCols.has("dimension") && <th className="px-4 py-3 font-semibold">Dimension</th>}
                {activeCols.has("quantite") && <th className="px-4 py-3 font-semibold w-20 text-right">Quantité</th>}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const e = atelierEtatColor(j.etat);
                return (
                  <tr key={j.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 text-muted font-mono text-xs">{j.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/workshop/jobs/${j.id}`}>
                        <Nameplate>{j.nOf}</Nameplate>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill label={j.etat} fg={e.fg} bg={e.bg} />
                    </td>
                    {activeCols.has("dateConsultation") && (
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        {j.dateConsultation ? j.dateConsultation.toLocaleDateString("fr-FR") : "—"}
                      </td>
                    )}
                    {activeCols.has("datePrevu") && (
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        {j.datePrevu ? j.datePrevu.toLocaleDateString("fr-FR") : "—"}
                      </td>
                    )}
                    {activeCols.has("createur") && (
                      <td className="px-4 py-3 text-ink text-xs">{j.createur ?? "—"}</td>
                    )}
                    {activeCols.has("demandeur") && (
                      <td className="px-4 py-3 text-ink">{j.demandeur?.nom ?? "—"}</td>
                    )}
                    {activeCols.has("plan") && (
                      <td className="px-4 py-3 text-muted text-xs font-mono">
                        {j.nPlan ? `${j.nPlan} / ${j.nRevision ?? "—"}` : "—"}
                      </td>
                    )}
                    {activeCols.has("atelier") && (
                      <td className="px-4 py-3 text-ink text-xs">{j.atelierRef?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("equipement") && (
                      <td className="px-4 py-3 text-ink">{j.equipementRef?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("sousEquipement") && (
                      <td className="px-4 py-3 text-ink text-xs">{j.sousEquipementRef?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("organe") && (
                      <td className="px-4 py-3 text-ink text-xs">{j.organeRef?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("typePiece") && (
                      <td className="px-4 py-3 text-ink text-xs">{j.parametrePiece?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("priorite") && (
                      <td className="px-4 py-3 text-ink text-xs">{j.parametrePriorite?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("dimension") && (
                      <td className="px-4 py-3 text-ink text-xs">{j.dimension ?? "—"}</td>
                    )}
                    {activeCols.has("quantite") && (
                      <td className="px-4 py-3 font-mono text-xs text-right text-ink">
                        {j.quantite?.toString() ?? "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun ordre de fabrication pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls page={page} totalPages={totalPages} buildHref={pageHref} />
      </div>
    </>
  );
}
