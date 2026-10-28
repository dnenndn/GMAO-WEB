import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sum(values: unknown[]) {
  return values.reduce((a: number, b) => a + Number(b), 0);
}

function fmtDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function RecapPage({
  searchParams,
}: {
  searchParams: { d1?: string; d2?: string; mode?: string; poste?: string };
}) {
  const d1 = searchParams.d1 ? new Date(searchParams.d1) : startOfMonth();
  const d2 = searchParams.d2 ? new Date(searchParams.d2) : new Date();
  // Make the range inclusive of the whole end day.
  const d2End = new Date(d2);
  d2End.setHours(23, 59, 59, 999);

  const mode = searchParams.mode || "fabrication";
  const poste = searchParams.poste || "";

  const dateFilter = {
    rapport: {
      dateRapport: { gte: d1, lte: d2End },
      ...(poste ? { poste } : {}),
    },
  };

  const [fabRows, embRows, fourEntreRows, fourSortieRows, anomalieRows, fuelRows, cfRows] =
    await Promise.all([
      prisma.prodRapportFabProduit.findMany({
        where: dateFilter,
        include: { unite: true, rapport: true },
      }),
      prisma.prodRapportEmbProduit.findMany({
        where: dateFilter,
        include: { unite: true, rapport: true },
      }),
      prisma.prodRapportFourEntre.findMany({
        where: dateFilter,
        include: { unite: true, rapport: true },
      }),
      prisma.prodRapportFourSortie.findMany({
        where: dateFilter,
        include: { unite: true, rapport: true },
      }),
      prisma.prodRapportAnomalie.findMany({
        where: dateFilter,
        include: { unite: true, anomalie: true, rapport: true },
      }),
      prisma.prodFuel.findMany({
        where: dateFilter,
      }),
      prisma.prodRapportCfFabrication.findMany({
        where: dateFilter,
        include: { unite: true, cf: true },
      }),
    ]);

  // --- Totals ---
  const totalFab = sum(fabRows.map((r) => r.quantite));
  const totalEmb = sum(embRows.map((r) => r.quantite));
  const totalFourIn = sum(fourEntreRows.map((r) => r.quantite));
  const totalFourOut = sum(fourSortieRows.map((r) => r.quantite));
  const totalFuel = sum(fuelRows.map((r) => r.quantite));
  const kilnYield = totalFourIn > 0 ? (totalFourOut / totalFourIn) * 100 : null;
  const totalAnomalieDuree = sum(anomalieRows.map((r) => r.duree));

  // --- By equipment ---
  const byEquipment = <
    T extends {
      unite: { designation: string };
      quantite: unknown;
      tonnage: unknown;
    }
  >(
    rows: T[]
  ) => {
    const map = new Map<string, { qty: number; tonnage: number }>();
    for (const r of rows) {
      const key = r.unite.designation;
      const cur = map.get(key) ?? { qty: 0, tonnage: 0 };
      cur.qty += Number(r.quantite);
      cur.tonnage += Number(r.tonnage);
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([designation, v]) => ({ designation, ...v }))
      .sort((a, b) => b.qty - a.qty);
  };

  const fabByEquipment = byEquipment(fabRows);
  const fourSortieByEquipment = byEquipment(fourSortieRows);

  // --- Anomalies summary ---
  const anomalieMap = new Map<
    string,
    { equipement: string; anomalie: string; count: number; duree: number }
  >();
  for (const a of anomalieRows) {
    const key = `${a.unite.designation}::${a.anomalie.anomalie}`;
    const cur =
      anomalieMap.get(key) ??
      { equipement: a.unite.designation, anomalie: a.anomalie.anomalie, count: 0, duree: 0 };
    cur.count += 1;
    cur.duree += Number(a.duree);
    anomalieMap.set(key, cur);
  }
  const anomalieSummary = [...anomalieMap.values()].sort((a, b) => b.duree - a.duree);

  // --- Fuel by point ---
  const fuelMap = new Map<string, number>();
  for (const f of fuelRows) {
    fuelMap.set(f.typeSaisie, (fuelMap.get(f.typeSaisie) ?? 0) + Number(f.quantite));
  }
  const fuelSummary = [...fuelMap.entries()].sort((a, b) => b[1] - a[1]);

  // --- Production by shift lead (chef de fabrication) ---
  const cfMap = new Map<string, number>();
  for (const c of cfRows) {
    if (!c.cf) continue;
    const matching = fabRows.filter(
      (f) => f.idRapport === c.idRapport && f.idUnite === c.idUnite
    );
    const qty = sum(matching.map((f) => f.quantite));
    cfMap.set(c.cf.nom, (cfMap.get(c.cf.nom) ?? 0) + qty);
  }
  const cfSummary = [...cfMap.entries()].sort((a, b) => b[1] - a[1]);

  // --- Per-date breakdown, matching the reference "Récap" screen's
  // Filtre panel: a mode selector (radio buttons) switching what a
  // single Date/Totals table shows. Real screen has 8 modes (per
  // prod_recap.cs / prod_recap.Designer.cs): Quantité Fabriqué
  // (Fabrication), Quantité Four, Anomalies, Production par poste,
  // Mesure de qualité fabrication, Ratio Fuel, Production par CE,
  // Production Emballage. Only "Quantité Fabriqué (Fabrication)" is
  // reproduced as the real pivot grid this pass — équipement (ligne de
  // fabrication) as column groups, type de brique as sub-columns
  // within each, date as rows, matching the real source's three-query
  // structure (dates in range / distinct équipements / distinct
  // produits, then one cell query per date×équipement×produit) and
  // the reference screenshot exactly. The other 7 modes are each a
  // comparably-sized pivot of their own (Quantité Four mirrors this
  // one; Production par poste, Ratio Fuel, etc. are structurally
  // different) — left for a following pass rather than guessed.
  const fabEquipIds = [...new Set(fabRows.map((r) => r.idUnite))];
  const fabProduitIds = [...new Set(fabRows.map((r) => r.idProduit))];
  const [fabEquipements, fabProduits] = await Promise.all([
    prisma.equipement.findMany({ where: { id: { in: fabEquipIds } }, orderBy: { designation: "asc" } }),
    prisma.prodTypeBrique.findMany({ where: { id: { in: fabProduitIds } }, orderBy: { designation: "asc" } }),
  ]);

  // dateKey -> equipId -> produitId -> quantite (summed)
  const fabPivot = new Map<string, Map<number, Map<number, number>>>();
  const fabDateKeys = new Set<string>();
  for (const r of fabRows) {
    const dateKey = fmtDateKey(r.rapport.dateRapport);
    fabDateKeys.add(dateKey);
    if (!fabPivot.has(dateKey)) fabPivot.set(dateKey, new Map());
    const byEquip = fabPivot.get(dateKey)!;
    if (!byEquip.has(r.idUnite)) byEquip.set(r.idUnite, new Map());
    const byProduit = byEquip.get(r.idUnite)!;
    byProduit.set(r.idProduit, (byProduit.get(r.idProduit) ?? 0) + Number(r.quantite));
  }
  const fabSortedDates = [...fabDateKeys].sort();

  function fabCell(dateKey: string, equipId: number, produitId: number): number {
    return fabPivot.get(dateKey)?.get(equipId)?.get(produitId) ?? 0;
  }
  function fabEquipTotal(dateKey: string, equipId: number): number {
    const byProduit = fabPivot.get(dateKey)?.get(equipId);
    if (!byProduit) return 0;
    return [...byProduit.values()].reduce((a, b) => a + b, 0);
  }
  function fabColumnTotal(equipId: number, produitId?: number): number {
    let total = 0;
    for (const dateKey of fabSortedDates) {
      total += produitId != null ? fabCell(dateKey, equipId, produitId) : fabEquipTotal(dateKey, equipId);
    }
    return total;
  }

  const byDateFab = new Map<string, number>();
  for (const r of fabRows) {
    const key = fmtDateKey(r.rapport.dateRapport);
    byDateFab.set(key, (byDateFab.get(key) ?? 0) + Number(r.quantite));
  }
  const byDateAnomalies = new Map<string, number>();
  for (const r of anomalieRows) {
    const key = fmtDateKey(r.rapport.dateRapport);
    byDateAnomalies.set(key, (byDateAnomalies.get(key) ?? 0) + Number(r.duree));
  }
  const dateRows =
    mode === "anomalies"
      ? [...byDateAnomalies.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
      : [...byDateFab.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Production" title="Récapitulatif & KPI" hideBack />
      <div className="p-8 space-y-8">
        <form className="flex gap-3 items-end flex-wrap" method="get">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Du
            </label>
            <input
              type="date"
              name="d1"
              defaultValue={fmt(d1)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Au
            </label>
            <input
              type="date"
              name="d2"
              defaultValue={fmt(d2)}
              className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors"
          >
            Filtrer
          </button>
          <Link
            href="/production"
            className="text-xs font-semibold text-muted hover:text-ink ml-2"
          >
            ← Retour aux rapports
          </Link>
        </form>

        <div className="bg-surface border border-hairline rounded p-4 space-y-3">
          <form method="get" className="space-y-3">
            <input type="hidden" name="d1" value={fmt(d1)} />
            <input type="hidden" name="d2" value={fmt(d2)} />
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-3 text-xs flex-wrap max-w-3xl">
                {[
                  { key: "fabrication", label: "Quantité Fabriqué (Fabrication)" },
                  { key: "four", label: "Quantité Four" },
                  { key: "anomalies", label: "Anomalies" },
                  { key: "posteProd", label: "Production par poste" },
                  { key: "qualite", label: "Mesure de qualité fabrication" },
                  { key: "ratioFuel", label: "Ratio Fuel" },
                  { key: "ce", label: "Production par CE" },
                  { key: "emballage", label: "Production Emballage" },
                ].map((m) =>
                  m.key === "fabrication" || m.key === "anomalies" ? (
                    <label key={m.key} className="flex items-center gap-1.5">
                      <input type="radio" name="mode" value={m.key} defaultChecked={mode === m.key} />
                      {m.label}
                    </label>
                  ) : (
                    <span
                      key={m.key}
                      title="Pas encore reproduit dans cette passe — un pivot comparable à Quantité Fabriqué, prévu pour une prochaine passe"
                      className="flex items-center gap-1.5 text-muted/50 cursor-not-allowed"
                    >
                      <input type="radio" disabled className="opacity-40" />
                      {m.label}
                    </span>
                  )
                )}
              </div>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="poste" value="" defaultChecked={poste === ""} /> Tous
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="poste" value="Jour" defaultChecked={poste === "Jour"} /> Jour
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="poste" value="Soir" defaultChecked={poste === "Soir"} /> Soir
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="poste" value="Nuit" defaultChecked={poste === "Nuit"} /> Nuit
                </label>
              </div>
              <button type="submit" className="bg-steel-600 text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-steel-700 transition-colors">
                Actualiser
              </button>
            </div>
          </form>
          {mode === "fabrication" ? (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky left-0 bg-surface px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted border-b border-r border-hairline align-bottom">
                      Date Rapport
                    </th>
                    {fabEquipements.map((e) => (
                      <th
                        key={e.id}
                        colSpan={fabProduits.length + 1}
                        className="px-2 py-1.5 text-center text-[11px] font-semibold text-ink border-b border-r border-hairline bg-paper"
                      >
                        {e.designation}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {fabEquipements.map((e) => (
                      <Fragment key={e.id}>
                        {fabProduits.map((p) => (
                          <th key={`${e.id}-${p.id}`} className="px-2 py-1.5 text-right text-[10px] font-semibold text-muted border-b border-hairline w-16">
                            {p.designation}
                          </th>
                        ))}
                        <th className="px-2 py-1.5 text-right text-[10px] font-bold text-ink border-b border-r border-hairline w-16 bg-paper">
                          Total
                        </th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fabSortedDates.map((dateKey) => (
                    <tr key={dateKey} className="hover:bg-paper/60">
                      <td className="sticky left-0 bg-surface px-3 py-1.5 text-ink font-mono text-xs border-r border-b border-hairline whitespace-nowrap">
                        {dateKey}
                      </td>
                      {fabEquipements.map((e) => (
                        <Fragment key={e.id}>
                          {fabProduits.map((p) => (
                            <td key={`${e.id}-${p.id}`} className="px-2 py-1.5 text-right font-mono text-xs text-ink border-b border-hairline">
                              {fabCell(dateKey, e.id, p.id).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold text-ink border-b border-r border-hairline bg-paper/60">
                            {fabEquipTotal(dateKey, e.id).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  ))}
                  {fabSortedDates.length === 0 && (
                    <tr>
                      <td colSpan={1 + fabEquipements.length * (fabProduits.length + 1)} className="px-4 py-8 text-center text-muted text-sm">
                        Aucune donnée pour ces critères.
                      </td>
                    </tr>
                  )}
                  {fabSortedDates.length > 0 && (
                    <tr className="bg-steel-600/10 font-bold">
                      <td className="sticky left-0 bg-steel-600/10 px-3 py-2 text-ink text-xs border-r border-hairline">Total</td>
                      {fabEquipements.map((e) => (
                        <Fragment key={e.id}>
                          {fabProduits.map((p) => (
                            <td key={`${e.id}-${p.id}-total`} className="px-2 py-2 text-right font-mono text-xs text-ink">
                              {fabColumnTotal(e.id, p.id).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-right font-mono text-xs text-ink border-r border-hairline">
                            {fabColumnTotal(e.id).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">Date Rapport</th>
                  <th className="pb-2 font-semibold text-right bg-green-100/50">Totals</th>
                </tr>
              </thead>
              <tbody>
                {dateRows.map(([date, total]) => (
                  <tr key={date} className="border-b border-hairline last:border-0">
                    <td className="py-1.5 text-ink font-mono text-xs">{date}</td>
                    <td className="py-1.5 text-right font-mono text-xs text-ink">
                      {total.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                ))}
                {dateRows.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune donnée pour ces critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid grid-cols-5 gap-4">
          <Metric label="Fabrication" value={totalFab} />
          <Metric label="Four — sortie" value={totalFourOut} />
          <Metric label="Emballage" value={totalEmb} />
          <Metric label="Fuel (total)" value={totalFuel} />
          <Metric
            label="Rendement four"
            value={kilnYield !== null ? Math.round(kilnYield * 10) / 10 : 0}
            suffix={kilnYield !== null ? "%" : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Table
            title="Fabrication par équipement"
            rows={fabByEquipment}
            columns={[
              { key: "designation", label: "Équipement" },
              { key: "qty", label: "Quantité", numeric: true },
              { key: "tonnage", label: "Tonnage", numeric: true },
            ]}
          />
          <Table
            title="Sortie four par équipement"
            rows={fourSortieByEquipment}
            columns={[
              { key: "designation", label: "Équipement" },
              { key: "qty", label: "Quantité", numeric: true },
              { key: "tonnage", label: "Tonnage", numeric: true },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Anomalies — durée totale {totalAnomalieDuree.toLocaleString("fr-FR")} min
            </div>
            <div className="bg-surface border border-hairline rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">Équipement</th>
                    <th className="px-4 py-3 font-semibold">Anomalie</th>
                    <th className="px-4 py-3 font-semibold text-right">Occ.</th>
                    <th className="px-4 py-3 font-semibold text-right">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalieSummary.map((a, i) => (
                    <tr key={i} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-ink">{a.equipement}</td>
                      <td className="px-4 py-2.5 text-ink">{a.anomalie}</td>
                      <td className="px-4 py-2.5 text-ink text-right font-mono text-xs">
                        {a.count}
                      </td>
                      <td className="px-4 py-2.5 text-ink text-right font-mono text-xs">
                        {a.duree.toLocaleString("fr-FR")} min
                      </td>
                    </tr>
                  ))}
                  {anomalieSummary.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                        Aucune anomalie sur cette période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Fuel par point de consommation
            </div>
            <div className="bg-surface border border-hairline rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">Point</th>
                    <th className="px-4 py-3 font-semibold text-right">Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelSummary.map(([point, qty]) => (
                    <tr key={point} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-ink">{point}</td>
                      <td className="px-4 py-2.5 text-ink text-right font-mono text-xs">
                        {qty.toLocaleString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {cfSummary.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Production par chef de fabrication
            </div>
            <div className="bg-surface border border-hairline rounded overflow-hidden max-w-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">Chef de fabrication</th>
                    <th className="px-4 py-3 font-semibold text-right">Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  {cfSummary.map(([nom, qty]) => (
                    <tr key={nom} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 text-ink">{nom}</td>
                      <td className="px-4 py-2.5 text-ink text-right font-mono text-xs">
                        {qty.toLocaleString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="bg-surface border border-hairline rounded p-4">
      <div className="text-2xl font-semibold font-mono text-ink">
        {value.toLocaleString("fr-FR")}
        {suffix ?? ""}
      </div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

function Table({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; numeric?: boolean }[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="bg-surface border border-hairline rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 font-semibold ${c.numeric ? "text-right" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-hairline last:border-0">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-2.5 text-ink ${
                      c.numeric ? "text-right font-mono text-xs" : ""
                    }`}
                  >
                    {c.numeric
                      ? Number(row[c.key]).toLocaleString("fr-FR")
                      : String(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted text-sm">
                  Aucune donnée sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
