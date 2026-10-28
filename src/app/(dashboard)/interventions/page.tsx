import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { StatusPill } from "@/components/StatusPill";
import { SortableTh } from "@/components/SortableTh";
import { ListSearchBar } from "@/components/ListSearchBar";
import { PaginationControls, RangeSummary, paginationMath } from "@/components/PaginationControls";
import { urgenceColor, statutColor, URGENCES, DI_STATUTS } from "@/lib/constants";

// Reproduces the legacy app's "Filtres Avancés" panel for the DI list,
// full fidelity per an explicit request — every field/checkbox shown in
// the reference screenshot, backed by real schema fields (see the
// DemandeIntervention model comment for the confirmed real statut set,
// which differs slightly from the screenshot's own labels — the schema
// values were derived from actual decompiled source, trusted over the
// screenshot here). idDemandeur has no confirmed target relation in the
// real schema (a genuinely unconfirmed field, not something invented
// here) — filtered as a bare int against Intervenant.id as the most
// plausible real-world match, flagged rather than silently assumed.
//
// Added per explicit request: a free-text search box, and per-column
// sorting (click a header to sort by it, click again to reverse) —
// both implemented as plain GET query params, consistent with every
// other filter on this page, rather than client-side state.

const COLUMN_DEFS = [
  { key: "demandeur", label: "Demandeur", defaultOn: true },
  { key: "date", label: "Date d'émission", defaultOn: true },
  { key: "heure", label: "Heure d'émission", defaultOn: true },
  { key: "createur", label: "Créateur", defaultOn: false },
  { key: "equipement", label: "Équipement", defaultOn: true },
  { key: "atelier", label: "Atelier", defaultOn: false },
  { key: "sousEquipement", label: "Sous-équipement", defaultOn: false },
  { key: "organe", label: "Organe", defaultOn: false },
  { key: "defaillance", label: "Défaillance", defaultOn: true },
  { key: "descDefaillance", label: "Description défaillance", defaultOn: false },
  { key: "arretMachine", label: "Arrêt machine", defaultOn: false },
  { key: "dateArret", label: "Date d'arrêt", defaultOn: false },
  { key: "heureArret", label: "Heure d'arrêt", defaultOn: false },
] as const;

// Maps a sortable column key to the real Prisma orderBy shape it needs
// — a plain field for direct columns, a nested object for relations.
// Every column is sortable per explicit request. "demandeur" sorts by
// the raw idDemandeur value, not the resolved name — that field has no
// confirmed FK relation in the real schema (flagged elsewhere in this
// file), so Prisma can't sort by the looked-up Intervenant.nom
// directly; this is the best achievable given that real constraint.
function sortOrderFor(sort: string | undefined, dir: "asc" | "desc") {
  switch (sort) {
    case "statut":
      return { statut: dir };
    case "nDi":
      return { nDi: dir };
    case "demandeur":
      return { idDemandeur: dir };
    case "date":
      return { dateEmission: dir };
    case "heure":
      return { heureEmission: dir };
    case "createur":
      return { createur: dir };
    case "equipement":
      return { equipementRef: { designation: dir } };
    case "atelier":
      return { atelier: dir };
    case "sousEquipement":
      return { sousEquipement: dir };
    case "organe":
      return { organe: dir };
    case "defaillance":
      return { defaillance: { anomalie: dir } };
    case "descDefaillance":
      return { descriptionDefaillance: dir };
    case "arretMachine":
      return { arretMachine: dir };
    case "dateArret":
      return { dateArret: dir };
    case "heureArret":
      return { heureArret: dir };
    case "urgence":
      return { urgence: dir };
    default:
      return { dateEmission: "desc" as const };
  }
}

function parseMulti(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: {
    demandeur?: string;
    createur?: string;
    urgence?: string;
    arretMachine?: string;
    statut?: string | string[];
    dateDebut?: string;
    dateFin?: string;
    defaillance?: string;
    localisation?: string;
    equipement?: string;
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

  const q = searchParams.q?.trim();
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  const where = {
    deleted: false,
    ...(searchParams.demandeur ? { idDemandeur: Number(searchParams.demandeur) } : {}),
    ...(searchParams.createur ? { createur: searchParams.createur } : {}),
    ...(searchParams.urgence ? { urgence: searchParams.urgence } : {}),
    ...(searchParams.arretMachine ? { arretMachine: searchParams.arretMachine === "oui" } : {}),
    ...(statutFilters.length > 0 ? { statut: { in: statutFilters } } : {}),
    ...(dateDebut || dateFin
      ? { dateEmission: { ...(dateDebut ? { gte: dateDebut } : {}), ...(dateFin ? { lte: dateFin } : {}) } }
      : {}),
    ...(searchParams.defaillance ? { idDefaillance: Number(searchParams.defaillance) } : {}),
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
    ...(q
      ? {
          OR: [
            { nDi: { contains: q, mode: "insensitive" as const } },
            { createur: { contains: q, mode: "insensitive" as const } },
            { descriptionDefaillance: { contains: q, mode: "insensitive" as const } },
            { equipementRef: { designation: { contains: q, mode: "insensitive" as const } } },
            { defaillance: { anomalie: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [totalCount, demandes, intervenants, defaillancesRef, equipements] = await Promise.all([
    prisma.demandeIntervention.count({ where }),
    prisma.demandeIntervention.findMany({
      where,
      include: { equipementRef: true, defaillance: true },
      orderBy: sortOrderFor(searchParams.sort, dir),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.intervenant.findMany({ where: { deleted: false }, orderBy: { nom: "asc" }, take: 200 }),
    prisma.parametreAnomalie.findMany({ where: { deleted: false }, orderBy: { anomalie: "asc" }, take: 200 }),
    prisma.equipement.findMany({ where: { deleted: false }, orderBy: { designation: "asc" }, take: 200 }),
  ]);

  // Créateur dropdown values come from real logins actually present on
  // DI rows (createur has no FK — a free-text login string, same as
  // elsewhere in this schema), not the full Utilisateur list — avoids
  // offering logins that never actually created a DI.
  // createur null-exclusion done in JS, not as a Prisma `not: null`
  // StringFilter — that shape has caused a confirmed real query-engine
  // crash elsewhere in this app (Prisma 5.22 on Windows).
  const createurValuesRaw = await prisma.demandeIntervention.findMany({
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
        title="Demandes d'intervention"
        action={{ href: "/interventions/new", label: "+ Nouvelle demande" }} hideBack
      />
      <div className="p-8 space-y-5">
        <form method="get" className="bg-surface border border-hairline rounded p-5 space-y-4">
          <div className="text-xs font-semibold text-urgent uppercase tracking-wide border-b border-hairline pb-2">
            Filtres Avancés
          </div>

          <div>
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Générale</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Demandeur</label>
                <select name="demandeur" defaultValue={searchParams.demandeur ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface">
                  <option value="">Tous</option>
                  {intervenants.map((i) => (
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Arrêt Machine (Panne)</div>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="arretMachine" value="" defaultChecked={!searchParams.arretMachine} /> Tous
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="arretMachine" value="non" defaultChecked={searchParams.arretMachine === "non"} /> Non
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="arretMachine" value="oui" defaultChecked={searchParams.arretMachine === "oui"} /> Oui
                </label>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Statut</div>
              <div className="flex gap-3 flex-wrap text-sm">
                {DI_STATUTS.map((s) => (
                  <label key={s} className="flex items-center gap-1.5">
                    <input type="checkbox" name="statut" value={s} defaultChecked={statutFilters.length === 0 || statutFilters.includes(s)} />
                    {s}
                  </label>
                ))}
              </div>
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
              <label className="block text-xs text-muted mb-1">Défaillances</label>
              <select name="defaillance" defaultValue={searchParams.defaillance ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface">
                <option value="">Toutes</option>
                {defaillancesRef.map((d) => (
                  <option key={d.id} value={d.id}>{d.anomalie}</option>
                ))}
              </select>
            </div>
          </div>

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
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs text-muted mb-1">Équipement / emplacement</label>
                <select name="equipement" defaultValue={searchParams.equipement ?? ""} className="w-full border border-hairline rounded px-2 py-1.5 text-sm bg-surface">
                  <option value="">Tous</option>
                  {equipements.map((e) => (
                    <option key={e.id} value={e.id}>{e.code ? `${e.code} — ` : ""}{e.designation}</option>
                  ))}
                </select>
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
          placeholder="Rechercher — N° DI, créateur, description, équipement, défaillance…"
        />

        <RangeSummary
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          emptyLabel="Aucune demande d'intervention pour ces critères."
          itemLabel="demande"
        />

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                <SortableTh searchParams={searchParams} columnKey="statut" label="Statut" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                <SortableTh searchParams={searchParams} columnKey="nDi" label="N° DI" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                {activeCols.has("demandeur") && <SortableTh searchParams={searchParams} columnKey="demandeur" label="Demandeur" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("date") && <SortableTh searchParams={searchParams} columnKey="date" label="Date d'émission" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("heure") && <SortableTh searchParams={searchParams} columnKey="heure" label="Heure d'émission" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("createur") && <SortableTh searchParams={searchParams} columnKey="createur" label="Créateur" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("equipement") && <SortableTh searchParams={searchParams} columnKey="equipement" label="Équipement" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("atelier") && <SortableTh searchParams={searchParams} columnKey="atelier" label="Atelier" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("sousEquipement") && <SortableTh searchParams={searchParams} columnKey="sousEquipement" label="Sous-équipement" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("organe") && <SortableTh searchParams={searchParams} columnKey="organe" label="Organe" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("defaillance") && <SortableTh searchParams={searchParams} columnKey="defaillance" label="Défaillance" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("descDefaillance") && <SortableTh searchParams={searchParams} columnKey="descDefaillance" label="Description défaillance" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("arretMachine") && <SortableTh searchParams={searchParams} columnKey="arretMachine" label="Arrêt machine" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("dateArret") && <SortableTh searchParams={searchParams} columnKey="dateArret" label="Date d'arrêt" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                {activeCols.has("heureArret") && <SortableTh searchParams={searchParams} columnKey="heureArret" label="Heure d'arrêt" currentSort={searchParams.sort} currentDir={searchParams.dir} />}
                <SortableTh searchParams={searchParams} columnKey="urgence" label="Urgence" currentSort={searchParams.sort} currentDir={searchParams.dir} />
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => {
                const u = urgenceColor(d.urgence);
                const s = statutColor(d.statut);
                return (
                  <tr key={d.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <StatusPill label={d.statut ?? "—"} fg={s.fg} bg={s.bg} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/interventions/${d.id}`}>
                        <Nameplate>{d.nDi ?? `DI-${d.id}`}</Nameplate>
                      </Link>
                    </td>
                    {activeCols.has("demandeur") && (
                      <td className="px-4 py-3 text-ink">
                        {intervenants.find((i) => i.id === d.idDemandeur)?.nom ?? "—"}
                      </td>
                    )}
                    {activeCols.has("date") && (
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        {d.dateEmission.toLocaleDateString("fr-FR")}
                      </td>
                    )}
                    {activeCols.has("heure") && (
                      <td className="px-4 py-3 text-muted font-mono text-xs">{d.heureEmission ?? "—"}</td>
                    )}
                    {activeCols.has("createur") && (
                      <td className="px-4 py-3 text-ink">{d.createur ?? "—"}</td>
                    )}
                    {activeCols.has("equipement") && (
                      <td className="px-4 py-3 text-ink">{d.equipementRef?.designation ?? "—"}</td>
                    )}
                    {activeCols.has("atelier") && (
                      <td className="px-4 py-3 text-ink text-xs">{d.atelier ?? "—"}</td>
                    )}
                    {activeCols.has("sousEquipement") && (
                      <td className="px-4 py-3 text-ink text-xs">{d.sousEquipement ?? "—"}</td>
                    )}
                    {activeCols.has("organe") && (
                      <td className="px-4 py-3 text-ink text-xs">{d.organe ?? "—"}</td>
                    )}
                    {activeCols.has("defaillance") && (
                      <td className="px-4 py-3 text-ink">
                        {d.defaillance?.anomalie ?? d.descriptionDefaillance ?? "—"}
                      </td>
                    )}
                    {activeCols.has("descDefaillance") && (
                      <td className="px-4 py-3 text-ink text-xs">{d.descriptionDefaillance ?? "—"}</td>
                    )}
                    {activeCols.has("arretMachine") && (
                      <td className="px-4 py-3 text-ink text-xs">
                        {d.arretMachine == null ? "—" : d.arretMachine ? "Oui" : "Non"}
                      </td>
                    )}
                    {activeCols.has("dateArret") && (
                      <td className="px-4 py-3 text-muted font-mono text-xs">
                        {d.dateArret ? d.dateArret.toLocaleDateString("fr-FR") : "—"}
                      </td>
                    )}
                    {activeCols.has("heureArret") && (
                      <td className="px-4 py-3 text-muted font-mono text-xs">{d.heureArret ?? "—"}</td>
                    )}
                    <td className="px-4 py-3">
                      <StatusPill label={d.urgence ?? "—"} fg={u.fg} bg={u.bg} />
                    </td>
                  </tr>
                );
              })}
              {demandes.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune demande d'intervention pour ces critères.
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
