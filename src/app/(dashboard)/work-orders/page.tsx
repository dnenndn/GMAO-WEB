import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OtTabBar } from "@/components/OtTabBar";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { SortableTh } from "@/components/SortableTh";
import { ListSearchBar } from "@/components/ListSearchBar";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { urgenceColor, statutColor, URGENCES, OT_STATUTS } from "@/lib/constants";

// Reproduces the legacy app's "Liste des OT" screen. The reference's
// tab bar (Liste des OT / Calendrier / Tableaux / Analyses / Tableaux
// de bord / CheckList / Planning) was removed per explicit request —
// most of those were placeholder tabs with no real content behind
// them anyway.
//
// Added per explicit request: a free-text search box, and per-column
// sorting (click a header to sort by it, click again to reverse) —
// both implemented as plain GET query params, consistent with every
// other filter on this page, rather than client-side state.

const COLUMN_DEFS = [
  { key: "nDi", label: "N° DI", defaultOn: true },
  { key: "type", label: "Type d'intervention", defaultOn: true },
  { key: "classe", label: "Classe d'intervention", defaultOn: true },
  { key: "dateDebut", label: "Date début", defaultOn: true },
  { key: "heureDebut", label: "Heure début", defaultOn: false },
  { key: "atelier", label: "Atelier", defaultOn: false },
  { key: "equipement", label: "Équipement", defaultOn: true },
  { key: "superviseur", label: "Superviseur", defaultOn: true },
  { key: "createur", label: "Créateur", defaultOn: false },
] as const;

function sortOrderFor(sort: string | undefined, dir: "asc" | "desc") {
  switch (sort) {
    case "statut":
      return { statut: dir };
    case "nOt":
      return { nOt: dir };
    case "nDi":
      return { demandeIntervention: { nDi: dir } };
    case "type":
      return { type: dir };
    case "classe":
      return { classe: { designation: dir } };
    case "dateDebut":
      return { dateDebut: dir };
    case "heureDebut":
      return { heureDebut: dir };
    case "atelier":
      return { atelier: dir };
    case "equipement":
      return { equipementRef: { designation: dir } };
    case "superviseur":
      return { superviseur: { nom: dir } };
    case "createur":
      return { createur: dir };
    case "urgence":
      return { urgence: dir };
    default:
      return { dateDebut: "desc" as const };
  }
}

function parseMulti(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: {
    superviseur?: string;
    createur?: string;
    urgence?: string;
    centreCharge?: string;
    classe?: string;
    dateDebut?: string;
    dateFin?: string;
    nOt?: string;
    statut?: string | string[];
    localisation?: string;
    equipement?: string;
    detailMaintenance?: string;
    col?: string | string[];
    q?: string;
    sort?: string;
    dir?: string;
    page?: string;
  };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 200;
  const statutFilters = parseMulti(searchParams.statut);
  const activeCols = new Set(
    searchParams.col
      ? parseMulti(searchParams.col)
      : COLUMN_DEFS.filter((c) => c.defaultOn).map((c) => c.key)
  );

  const localisation = searchParams.localisation || "equipement";
  const dateDebut = searchParams.dateDebut ? new Date(searchParams.dateDebut) : undefined;
  const dateFin = searchParams.dateFin ? new Date(searchParams.dateFin) : undefined;

  const detailMaintenance = searchParams.detailMaintenance || "tous";
  const typeFilter =
    detailMaintenance === "corrective"
      ? { type: { startsWith: "Corrective" } }
      : detailMaintenance === "preventive"
        ? { type: { startsWith: "Préventive" } }
        : {};

  const q = searchParams.q?.trim();
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  const where = {
    deleted: false,
    ...(searchParams.superviseur ? { idSuperviseur: Number(searchParams.superviseur) } : {}),
    ...(searchParams.createur ? { createur: searchParams.createur } : {}),
    ...(searchParams.urgence ? { urgence: searchParams.urgence } : {}),
    ...(searchParams.centreCharge
      ? { centreCharge: { some: { idCentreCharge: Number(searchParams.centreCharge) } } }
      : {}),
    ...(searchParams.classe ? { idClasse: Number(searchParams.classe) } : {}),
    ...(dateDebut || dateFin
      ? { dateDebut: { ...(dateDebut ? { gte: dateDebut } : {}), ...(dateFin ? { lte: dateFin } : {}) } }
      : {}),
    ...(searchParams.nOt ? { nOt: { contains: searchParams.nOt } } : {}),
    ...(statutFilters.length > 0 ? { statut: { in: statutFilters } } : {}),
    ...(searchParams.equipement
      ? {
          [localisation === "atelier"
            ? "atelier"
            : localisation === "sousEquipement"
              ? "sousEquipement"
              : localisation === "organe"
                ? "organe"
                : "equipement"]: Number(searchParams.equipement),
        }
      : {}),
    ...typeFilter,
    ...(q
      ? {
          OR: [
            { nOt: { contains: q, mode: "insensitive" as const } },
            { createur: { contains: q, mode: "insensitive" as const } },
            { equipementRef: { designation: { contains: q, mode: "insensitive" as const } } },
            { superviseur: { nom: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [totalCount, ordres, superviseurs, classes, centresCharge, equipements] = await Promise.all([
    prisma.ordreTravail.count({ where }),
    prisma.ordreTravail.findMany({
      where,
      include: { equipementRef: true, superviseur: true, demandeIntervention: true, classe: true },
      orderBy: sortOrderFor(searchParams.sort, dir),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.intervenant.findMany({ where: { deleted: false }, orderBy: { nom: "asc" }, take: 200 }),
    prisma.parametreClasseIntervention.findMany({ orderBy: { designation: "asc" }, take: 200 }),
    prisma.parametreCentreCharge.findMany({ orderBy: { designation: "asc" }, take: 200 }),
    prisma.equipement.findMany({ where: { deleted: false }, orderBy: { designation: "asc" }, take: 200 }),
  ]);

  // createur null-exclusion done in JS, not as a Prisma `not: null`
  // StringFilter — that shape has caused a confirmed real query-engine
  // crash elsewhere in this app (Prisma 5.22 on Windows).
  const createurValuesRaw = await prisma.ordreTravail.findMany({
    where: { deleted: false },
    select: { createur: true },
    distinct: ["createur"],
    orderBy: { createur: "asc" },
  });
  const createurValues = createurValuesRaw.filter((c) => c.createur != null);

  const { totalPages, rangeStart, rangeEnd } = paginationMath(totalCount, page, pageSize);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value == null) continue;
      if (Array.isArray(value)) {
        for (const v of value) params.append(key, v);
      } else {
        params.set(key, value);
      }
    }
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Maintenance"
        title="Ordres de travail"
        action={{ href: "/work-orders/new", label: "+ Nouvel OT" }} hideBack
      />
      <OtTabBar active="/work-orders" />
      <div className="p-8 space-y-5">
        <form method="get" className="bg-surface border border-hairline rounded p-5 space-y-4">
          <div className="text-xs font-semibold text-urgent uppercase tracking-wide border-b border-hairline pb-2">
            Filtres Avancés
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Superviseur</label>
              <select name="superviseur" defaultValue={searchParams.superviseur ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface">
                <option value="">Tous</option>
                {superviseurs.map((i) => (
                  <option key={i.id} value={i.id}>{i.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Créateur</label>
              <select name="createur" defaultValue={searchParams.createur ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface">
                <option value="">Tous</option>
                {createurValues.map((c) => (
                  <option key={c.createur} value={c.createur!}>{c.createur}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Urgence</label>
              <select name="urgence" defaultValue={searchParams.urgence ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface">
                <option value="">Toutes</option>
                {URGENCES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Centre Charge</label>
              <select name="centreCharge" defaultValue={searchParams.centreCharge ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface">
                <option value="">Tous</option>
                {centresCharge.map((c) => (
                  <option key={c.id} value={c.id}>{c.designation}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Classe d'intervention</label>
              <select name="classe" defaultValue={searchParams.classe ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface">
                <option value="">Toutes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.designation}</option>
                ))}
              </select>
            </div>
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
            <div>
              <label className="block text-xs text-muted mb-1">N° OT</label>
              <input type="text" name="nOt" defaultValue={searchParams.nOt} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface" />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Statut</div>
            <div className="flex gap-3 flex-wrap text-sm">
              {OT_STATUTS.map((s) => (
                <label key={s} className="flex items-center gap-1.5">
                  <input type="checkbox" name="statut" value={s} defaultChecked={statutFilters.length === 0 || statutFilters.includes(s)} />
                  {s}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Localisation</div>
              <div className="flex gap-6 items-end flex-wrap">
                <div className="flex gap-4 text-sm">
                  {[
                    { key: "equipement", label: "Équipement" },
                    { key: "atelier", label: "Atelier" },
                    { key: "sousEquipement", label: "Sous-équipement" },
                    { key: "organe", label: "Organe" },
                  ].map((l) => (
                    <label key={l.key} className="flex items-center gap-1.5">
                      <input type="radio" name="localisation" value={l.key} defaultChecked={localisation === l.key} />
                      {l.label}
                    </label>
                  ))}
                </div>
              </div>
              <select name="equipement" defaultValue={searchParams.equipement ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface mt-2">
                <option value="">Tous</option>
                {equipements.map((e) => (
                  <option key={e.id} value={e.id}>{e.code ? `${e.code} — ` : ""}{e.designation}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Détail Maintenance</div>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="detailMaintenance" value="tous" defaultChecked={detailMaintenance === "tous"} /> Tous
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="detailMaintenance" value="corrective" defaultChecked={detailMaintenance === "corrective"} /> Corrective
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="detailMaintenance" value="preventive" defaultChecked={detailMaintenance === "preventive"} /> Préventive
                </label>
              </div>
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

        <ListSearchBar
          searchParams={searchParams}
          placeholder="Rechercher — N° OT, créateur, équipement, superviseur…"
        />

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucun ordre de travail pour ces critères."
          itemLabel="OT"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="statut" label="Statut" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="nOt" label="N° OT" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                {activeCols.has("nDi") && <SortableTh searchParams={searchParams} columnKey="nDi" label="N° DI" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("type") && <SortableTh searchParams={searchParams} columnKey="type" label="Type d'intervention" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("classe") && <SortableTh searchParams={searchParams} columnKey="classe" label="Classe d'intervention" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("dateDebut") && <SortableTh searchParams={searchParams} columnKey="dateDebut" label="Date début" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("heureDebut") && <SortableTh searchParams={searchParams} columnKey="heureDebut" label="Heure début" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("atelier") && <SortableTh searchParams={searchParams} columnKey="atelier" label="Atelier" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("equipement") && <SortableTh searchParams={searchParams} columnKey="equipement" label="Équipement" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("superviseur") && <SortableTh searchParams={searchParams} columnKey="superviseur" label="Superviseur" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("createur") && <SortableTh searchParams={searchParams} columnKey="createur" label="Créateur" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                <SortableTh searchParams={searchParams} columnKey="urgence" label="Urgence" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {ordres.map((ot) => {
                const u = urgenceColor(ot.urgence);
                const s = statutColor(ot.statut);
                return (
                  <tr key={ot.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <StatusPill label={ot.statut} fg={s.fg} bg={s.bg} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/work-orders/${ot.id}`}>
                        <Nameplate>{ot.nOt}</Nameplate>
                      </Link>
                    </td>
                    {activeCols.has("nDi") && (
                      <td className="px-4 py-3 text-ink text-xs">{ot.demandeIntervention?.nDi ?? "—"}</td>
                    )}
                    {activeCols.has("type") && <td className="px-4 py-3 text-ink">{ot.type}</td>}
                    {activeCols.has("classe") && (
                      <td className="px-4 py-3 text-ink">{ot.classe?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("dateDebut") && (
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        {ot.dateDebut ? ot.dateDebut.toLocaleDateString("fr-FR") : "—"}
                      </td>
                    )}
                    {activeCols.has("heureDebut") && (
                      <td className="px-4 py-3 text-muted font-mono text-xs">{ot.heureDebut ?? "—"}</td>
                    )}
                    {activeCols.has("atelier") && (
                      <td className="px-4 py-3 text-ink text-xs">{ot.atelier ?? "—"}</td>
                    )}
                    {activeCols.has("equipement") && (
                      <td className="px-4 py-3 text-ink">{ot.equipementRef?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("superviseur") && (
                      <td className="px-4 py-3 text-ink">{ot.superviseur?.nom ?? "—"}</td>
                    )}
                    {activeCols.has("createur") && (
                      <td className="px-4 py-3 text-ink text-xs">{ot.createur ?? "—"}</td>
                    )}
                    <td className="px-4 py-3">
                      <StatusPill label={ot.urgence ?? "—"} fg={u.fg} bg={u.bg} />
                    </td>
                  </tr>
                );
              })}
              {ordres.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun ordre de travail pour ces critères.
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
