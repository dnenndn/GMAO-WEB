import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OtTabBar } from "@/components/OtTabBar";
import { ListSearchBar } from "@/components/ListSearchBar";
import { SortableTh } from "@/components/SortableTh";
import { sortRows } from "@/lib/sortRows";

// Reproduces the legacy app's "Tableaux" screen (button3_Click in
// ordre_travail.cs, embedding ot_tableau — itself a further 6-way
// toggle: Interventions/BSM/Réservation PDR/Réparation Externe/
// Projet/Outillage, per the real source's ot_tabl_*.cs queries).
//
// Several of these joins are string-based in the real schema, not FKs
// (Bsm.liOt ↔ OrdreTravail.nOt; DsHistoriqueMvt.idMvt ↔ Bsm.id with no
// Prisma relation defined) — handled here as explicit multi-step
// lookups rather than a single Prisma include, matching how the real
// SQL joins them. Because of that, none of these six tables can sort
// via Prisma `orderBy` either — each one sorts its already-joined,
// already-fetched row array in memory instead (see sortRows).
//
// OtProjet is a genuine schema gap: the real ot_tabl_projet.cs query
// selects description, sous_traitant, debut, fin, cout — but the
// migrated OtProjet model only carries id/idOt/cout. Those four other
// columns were never migrated into any table (found during an earlier
// migration-script audit, same story as a few other "columns with no
// home" cases already documented elsewhere in this schema) — flagged
// in the UI below rather than silently only showing "coût".

const TABS = [
  { key: "interventions", label: "Interventions" },
  { key: "bsm", label: "BSM" },
  { key: "reservation", label: "Réservation PDR" },
  { key: "externe", label: "Réparation Externe" },
  { key: "projet", label: "Projet" },
  { key: "outillage", label: "Outillage" },
] as const;

type TableauxSearchParams = { view?: string; q?: string; sort?: string; dir?: string };

export default async function OtTableauxPage({
  searchParams,
}: {
  searchParams: TableauxSearchParams;
}) {
  const view = TABS.some((t) => t.key === searchParams.view) ? searchParams.view! : "interventions";
  const q = searchParams.q?.trim();
  const dir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT" title="Tableaux" />
      <OtTabBar active="/work-orders/tableaux" />
      <div className="p-8 space-y-5">
        <div className="flex gap-1 border border-hairline rounded-lg p-1 bg-surface w-fit flex-wrap">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`?view=${t.key}`}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                view === t.key ? "bg-steel-600 text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <ListSearchBar searchParams={searchParams} placeholder="Rechercher — N° OT…" />

        {view === "interventions" && <InterventionsTable q={q} searchParams={searchParams} sort={searchParams.sort} dir={dir} />}
        {view === "bsm" && <BsmTable q={q} searchParams={searchParams} sort={searchParams.sort} dir={dir} />}
        {view === "reservation" && <ReservationTable q={q} searchParams={searchParams} sort={searchParams.sort} dir={dir} />}
        {view === "externe" && <ExterneTable q={q} searchParams={searchParams} sort={searchParams.sort} dir={dir} />}
        {view === "projet" && <ProjetTable q={q} searchParams={searchParams} sort={searchParams.sort} dir={dir} />}
        {view === "outillage" && <OutillageTable q={q} searchParams={searchParams} sort={searchParams.sort} dir={dir} />}
      </div>
    </>
  );
}

type ColDef = { key: string; label: string };

function Table({
  columns,
  children,
  empty,
  searchParams,
  sort,
  dir,
}: {
  columns: ColDef[];
  children: React.ReactNode;
  empty: boolean;
  searchParams: TableauxSearchParams;
  sort?: string;
  dir?: string;
}) {
  return (
    <div className="bg-surface border border-hairline rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
            {columns.map((c) => (
              <SortableTh key={c.key} searchParams={searchParams} columnKey={c.key} label={c.label} currentSort={sort} currentDir={dir} />
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
          {empty && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted text-sm">
                Aucune donnée pour ce filtre.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type SubTableProps = { q?: string; searchParams: TableauxSearchParams; sort?: string; dir: "asc" | "desc" };

async function InterventionsTable({ q, searchParams, sort, dir }: SubTableProps) {
  const raw = await prisma.otOrdoIntervenant.findMany({
    where: {
      ressourceFonction: {
        ordreTravail: { deleted: false, ...(q ? { nOt: { contains: q, mode: "insensitive" } } : {}) },
      },
    },
    include: { intervenant: true, ressourceFonction: { include: { fonction: true, ordreTravail: true } } },
    orderBy: { debut: "desc" },
    take: 300,
  });
  const rows = sortRows(raw, sort, dir, {
    nOt: (r) => r.ressourceFonction.ordreTravail.nOt,
    intervenant: (r) => r.intervenant.nom,
    fonction: (r) => r.ressourceFonction.fonction?.designation,
    debut: (r) => r.debut,
    fin: (r) => r.fin,
  });
  return (
    <Table
      columns={[
        { key: "nOt", label: "N° OT" },
        { key: "intervenant", label: "Intervenant" },
        { key: "fonction", label: "Fonction" },
        { key: "debut", label: "Début" },
        { key: "fin", label: "Fin" },
      ]}
      empty={rows.length === 0}
      searchParams={searchParams}
      sort={sort}
      dir={dir}
    >
      {rows.map((r) => (
        <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
          <td className="px-4 py-3">
            <Link href={`/work-orders/${r.ressourceFonction.ordreTravail.id}`} className="text-steel-600 font-semibold hover:underline">
              {r.ressourceFonction.ordreTravail.nOt}
            </Link>
          </td>
          <td className="px-4 py-3 text-ink">{r.intervenant.nom}</td>
          <td className="px-4 py-3 text-ink">{r.ressourceFonction.fonction?.designation ?? "—"}</td>
          <td className="px-4 py-3 text-muted font-mono text-xs">{r.debut.toLocaleString("fr-FR")}</td>
          <td className="px-4 py-3 text-muted font-mono text-xs">{r.fin.toLocaleString("fr-FR")}</td>
        </tr>
      ))}
    </Table>
  );
}

async function BsmTable({ q, searchParams, sort, dir }: SubTableProps) {
  // Bsm.liOt is a free-text field carrying OrdreTravail.nOt, not a real
  // FK (confirmed real schema: li_ot is varchar(100)) — resolved here
  // as an explicit two-step lookup rather than a Prisma include.
  // nOt filtering (both null-exclusion and search) done in application
  // code rather than as a combined Prisma `not: null` + `contains`
  // StringFilter — that combination triggers a real Prisma 5.22 query
  // engine panic ("entered unreachable code" in filters/mod.rs),
  // confirmed by an actual crash log on this exact query shape.
  const bsms = await prisma.bsm.findMany({ orderBy: { dateBsm: "desc" }, take: 400 });
  const filteredBsms = bsms.filter(
    (b) => b.liOt != null && (!q || b.liOt.toLowerCase().includes(q.toLowerCase()))
  );
  const bsmIds = filteredBsms.map((b) => b.id);
  const lines = await prisma.bsmArticle.findMany({
    where: { idBsm: { in: bsmIds }, quantite: { not: 0 } },
    include: { article: true },
  });
  const linesByBsm = new Map<number, typeof lines>();
  for (const l of lines) {
    if (!linesByBsm.has(l.idBsm)) linesByBsm.set(l.idBsm, []);
    linesByBsm.get(l.idBsm)!.push(l);
  }

  const raw = filteredBsms.flatMap((b) => (linesByBsm.get(b.id) ?? []).map((l) => ({ bsm: b, line: l })));
  const rows = sortRows(raw, sort, dir, {
    nOt: (r) => r.bsm.liOt,
    date: (r) => r.bsm.dateBsm,
    code: (r) => r.line.article.codeArticle,
    reference: (r) => r.line.article.reference,
    designation: (r) => r.line.article.designation,
    quantite: (r) => Number(r.line.quantite),
    prixHt: (r) => (r.line.prixHt != null ? Number(r.line.prixHt) : null),
    total: (r) => (r.line.prixHt != null ? Number(r.line.quantite) * Number(r.line.prixHt) : null),
  });

  return (
    <Table
      columns={[
        { key: "nOt", label: "N° OT" },
        { key: "date", label: "Date BSM" },
        { key: "code", label: "Code Article" },
        { key: "reference", label: "Référence" },
        { key: "designation", label: "Désignation" },
        { key: "quantite", label: "Quantité" },
        { key: "prixHt", label: "PU HT" },
        { key: "total", label: "Total" },
      ]}
      empty={rows.length === 0}
      searchParams={searchParams}
      sort={sort}
      dir={dir}
    >
      {rows.map(({ bsm, line }) => (
        <tr key={line.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
          <td className="px-4 py-3 text-ink font-semibold">{bsm.liOt}</td>
          <td className="px-4 py-3 text-muted font-mono text-xs">{bsm.dateBsm.toLocaleDateString("fr-FR")} {bsm.heureBsm ?? ""}</td>
          <td className="px-4 py-3 text-ink text-xs">{line.article.codeArticle ?? "—"}</td>
          <td className="px-4 py-3 text-ink text-xs">{line.article.reference ?? "—"}</td>
          <td className="px-4 py-3 text-ink">{line.article.designation}</td>
          <td className="px-4 py-3 text-ink text-right">{line.quantite.toString()}</td>
          <td className="px-4 py-3 text-ink text-right">{line.prixHt?.toFixed(3) ?? "—"} DT</td>
          <td className="px-4 py-3 text-ink text-right font-semibold">
            {line.prixHt ? (Number(line.quantite) * Number(line.prixHt)).toFixed(3) : "—"} DT
          </td>
        </tr>
      ))}
    </Table>
  );
}

async function ReservationTable({ q, searchParams, sort, dir }: SubTableProps) {
  const raw = await prisma.otRessourcesPdr.findMany({
    where: { ordreTravail: { deleted: false, ...(q ? { nOt: { contains: q, mode: "insensitive" } } : {}) } },
    include: { article: true, ordreTravail: true },
    orderBy: { dateSh: "desc" },
    take: 300,
  });
  const rows = sortRows(raw, sort, dir, {
    nOt: (r) => r.ordreTravail.nOt,
    code: (r) => r.article.codeArticle,
    reference: (r) => r.article.reference,
    designation: (r) => r.article.designation,
    quantite: (r) => Number(r.quantite),
    date: (r) => r.dateSh,
  });
  return (
    <Table
      columns={[
        { key: "nOt", label: "N° OT" },
        { key: "code", label: "Code Article" },
        { key: "reference", label: "Référence" },
        { key: "designation", label: "Désignation" },
        { key: "quantite", label: "Quantité" },
        { key: "date", label: "Date" },
      ]}
      empty={rows.length === 0}
      searchParams={searchParams}
      sort={sort}
      dir={dir}
    >
      {rows.map((r) => (
        <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
          <td className="px-4 py-3">
            <Link href={`/work-orders/${r.ordreTravail.id}`} className="text-steel-600 font-semibold hover:underline">
              {r.ordreTravail.nOt}
            </Link>
          </td>
          <td className="px-4 py-3 text-ink text-xs">{r.article.codeArticle ?? "—"}</td>
          <td className="px-4 py-3 text-ink text-xs">{r.article.reference ?? "—"}</td>
          <td className="px-4 py-3 text-ink">{r.article.designation}</td>
          <td className="px-4 py-3 text-ink text-right">{r.quantite.toString()}</td>
          <td className="px-4 py-3 text-muted font-mono text-xs">{r.dateSh.toLocaleDateString("fr-FR")}</td>
        </tr>
      ))}
    </Table>
  );
}

async function ExterneTable({ q, searchParams, sort, dir }: SubTableProps) {
  // Most involved real join chain of the six: DsHistoriqueMvt.idMvt →
  // Bsm.id (no Prisma relation — plain int match) → Bsm.liOt →
  // OrdreTravail.nOt (string match) → DsHistoriqueMvt.idT →
  // MagasinSousTraitance.id → Article. Stitched together here as
  // sequential lookups, mirroring the real SQL's 4-table join.
  const mvts = await prisma.dsHistoriqueMvt.findMany({
    where: { mvt: "Réparation", idMvt: { not: null }, idT: { not: null } },
    orderBy: { dateMvt: "desc" },
    take: 300,
  });
  const bsmIds = [...new Set(mvts.map((m) => m.idMvt!))];
  const bsms = await prisma.bsm.findMany({ where: { id: { in: bsmIds } } });
  const bsmById = new Map(bsms.map((b) => [b.id, b]));

  const magasinIds = [...new Set(mvts.map((m) => m.idT!))];
  const magasins = await prisma.magasinSousTraitance.findMany({
    where: { id: { in: magasinIds } },
    include: { article: true },
  });
  const magasinById = new Map(magasins.map((m) => [m.id, m]));

  let raw = mvts
    .map((m) => ({ mvt: m, bsm: bsmById.get(m.idMvt!), magasin: magasinById.get(m.idT!) }))
    .filter((r) => r.bsm?.liOt && r.magasin);

  if (q) {
    const qLower = q.toLowerCase();
    raw = raw.filter((r) => r.bsm!.liOt!.toLowerCase().includes(qLower));
  }

  const rows = sortRows(raw, sort, dir, {
    nOt: (r) => r.bsm!.liOt,
    code: (r) => r.magasin!.article.codeArticle,
    refInterne: (r) => r.magasin!.refInterne,
    designation: (r) => r.magasin!.article.designation,
    date: (r) => r.mvt.dateMvt,
  });

  return (
    <Table
      columns={[
        { key: "nOt", label: "N° OT" },
        { key: "code", label: "Code Article" },
        { key: "refInterne", label: "Réf. interne" },
        { key: "designation", label: "Désignation" },
        { key: "date", label: "Date" },
      ]}
      empty={rows.length === 0}
      searchParams={searchParams}
      sort={sort}
      dir={dir}
    >
      {rows.map((r) => (
        <tr key={r.mvt.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
          <td className="px-4 py-3 text-ink font-semibold">{r.bsm!.liOt}</td>
          <td className="px-4 py-3 text-ink text-xs">{r.magasin!.article.codeArticle ?? "—"}</td>
          <td className="px-4 py-3 text-ink text-xs">{r.magasin!.refInterne}</td>
          <td className="px-4 py-3 text-ink">{r.magasin!.article.designation}</td>
          <td className="px-4 py-3 text-muted font-mono text-xs">{r.mvt.dateMvt.toLocaleDateString("fr-FR")}</td>
        </tr>
      ))}
    </Table>
  );
}

async function ProjetTable({ q, searchParams, sort, dir }: SubTableProps) {
  const raw = await prisma.otProjet.findMany({
    where: { ordreTravail: { deleted: false, ...(q ? { nOt: { contains: q, mode: "insensitive" } } : {}) } },
    include: { ordreTravail: true },
    take: 300,
  });
  const rows = sortRows(raw, sort, dir, {
    nOt: (r) => r.ordreTravail.nOt,
    cout: (r) => Number(r.cout),
  });
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted bg-paper border border-hairline rounded px-3 py-2">
        La description, le sous-traitant et les dates de ce tableau n&apos;ont jamais été migrées vers la base réelle — seul le coût est disponible.
      </div>
      <Table
        columns={[
          { key: "nOt", label: "N° OT" },
          { key: "cout", label: "Coût" },
        ]}
        empty={rows.length === 0}
        searchParams={searchParams}
        sort={sort}
        dir={dir}
      >
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
            <td className="px-4 py-3">
              <Link href={`/work-orders/${r.ordreTravail.id}`} className="text-steel-600 font-semibold hover:underline">
                {r.ordreTravail.nOt}
              </Link>
            </td>
            <td className="px-4 py-3 text-ink text-right font-semibold">{r.cout.toFixed(3)} DT</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

async function OutillageTable({ q, searchParams, sort, dir }: SubTableProps) {
  // tab_lancement_affectation.n_ot is a loose text reference (per the
  // real schema comment), not a real FK to OrdreTravail — shown as
  // plain text below rather than a clickable link, since there's no
  // reliable way to resolve it to an OT id when duplicates exist.
  // Same fix as BsmTable above — nOt null-exclusion and search done in
  // application code, not as a combined Prisma StringFilter, to avoid
  // the same confirmed query-engine panic.
  const allRows = await prisma.tabLancementAffectation.findMany({
    include: { intervenant: true, outilRef: true },
    orderBy: { dateDebut: "desc" },
    take: 500,
  });
  const raw = allRows
    .filter((r) => r.nOt != null && (!q || r.nOt.toLowerCase().includes(q.toLowerCase())))
    .slice(0, 300);
  const rows = sortRows(raw, sort, dir, {
    nOt: (r) => r.nOt,
    outil: (r) => r.outilRef?.designation,
    intervenant: (r) => r.intervenant?.nom,
    debut: (r) => r.dateDebut,
    fin: (r) => r.dateFin,
  });
  return (
    <Table
      columns={[
        { key: "nOt", label: "N° OT" },
        { key: "outil", label: "Outil" },
        { key: "intervenant", label: "Intervenant" },
        { key: "debut", label: "Début" },
        { key: "fin", label: "Fin" },
      ]}
      empty={rows.length === 0}
      searchParams={searchParams}
      sort={sort}
      dir={dir}
    >
      {rows.map((r) => (
        <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
          <td className="px-4 py-3 text-ink font-semibold">{r.nOt}</td>
          <td className="px-4 py-3 text-ink">{r.outilRef?.designation ?? "—"}</td>
          <td className="px-4 py-3 text-ink">{r.intervenant?.nom ?? "—"}</td>
          <td className="px-4 py-3 text-muted font-mono text-xs">
            {r.dateDebut ? r.dateDebut.toLocaleDateString("fr-FR") : "—"} {r.heureDebut ?? ""}
          </td>
          <td className="px-4 py-3 text-muted font-mono text-xs">
            {r.dateFin ? r.dateFin.toLocaleDateString("fr-FR") : "—"} {r.heureFin ?? ""}
          </td>
        </tr>
      ))}
    </Table>
  );
}
