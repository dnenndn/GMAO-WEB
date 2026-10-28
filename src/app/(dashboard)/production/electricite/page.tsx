import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { upsertFourConsommationElectrique, deleteFourConsommationElectrique } from "../actions";

// Reproduces the reference "Ajouter Consommation Electrique" / "Analyse
// Consommation Electrique" screen (2 tabs). No matching C# source was
// found for this specific screen anywhere in the decompiled codebase —
// searched "electrique", "consommation", "matin"/"pointe", and the real
// table name (prod_four_consommation_electrique) with no hits. Built
// instead directly from the two reference screenshots' real numbers,
// which were enough to fully reverse-engineer the calculation:
// checking Ajouter's raw meter readings against Récap's daily figures
// confirms Récap[date].consX = Ajouter[nextDate].consX -
// Ajouter[date].consX for each of the 4 STEG time bands (the day's
// consumption is the delta to the *following* day's meter reading, not
// the previous one — verified against several rows including a
// negative-delta row where a meter glitched back toward 0, so the
// pattern holds even through bad data, not just clean rows). Cons.Total
// = sum of the 4 bands (also verified exactly). Tonnage S.Four = same
// day's prod_rapport_four_sortie tonnage sum, matching the identical
// "Tonnage S.Four" column and its real query in the sibling select_fuel
// method in prod_recap.cs. Ratio = Cons.Total / Tonnage (34768/1051.18
// ≈ 33.08, matching the reference row exactly). The reference's
// "Consommation (…)" column could not be reverse-engineered — its
// values don't line up with any combination of the other columns
// (confirmed against a row where Cons.Total went deeply negative from
// a meter glitch but Consommation stayed a normal-looking positive
// number, ruling out any formula derived from the meter deltas) —
// omitted rather than guessed.

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth() {
  const d = new Date();
  // UTC-based on purpose — fmt() below reads dates back out via
  // toISOString (also UTC), so constructing this with the local-time
  // Date constructor would silently shift it back a day in any
  // positive-UTC-offset timezone (e.g. UTC+1) once fmt() converts it.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12));
}
// Pure string arithmetic — no Date object parsing involved, so there's
// no UTC-vs-local timezone ambiguity to get wrong. "YYYY-MM-DD" + 1 day
// via Date.UTC keeps every step explicitly UTC end to end.
function nextDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
function displayDate(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ElectriciteFourPage({
  searchParams,
}: {
  searchParams: { tab?: string; d1?: string; d2?: string };
}) {
  const tab = searchParams.tab === "recap" ? "recap" : "ajouter";
  const d1 = searchParams.d1 ? new Date(searchParams.d1) : startOfMonth();
  const d2 = searchParams.d2 ? new Date(searchParams.d2) : new Date();
  const d2End = new Date(d2);
  d2End.setHours(23, 59, 59, 999);

  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Production" title="Consommation électrique — Four" hideBack />
      <div className="flex gap-1 border-b border-hairline px-8 bg-surface">
        {[
          { key: "ajouter", label: "Ajouter" },
          { key: "recap", label: "Récap" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`?tab=${t.key}&d1=${fmt(d1)}&d2=${fmt(d2)}`}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key ? "border-steel-600 text-steel-700" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="p-8 space-y-6">
        {tab === "ajouter" ? (
          <AjouterTab d1={d1} d2={d2End} now={now} />
        ) : (
          <RecapTab d1={d1} d2={d2End} />
        )}
      </div>
    </>
  );
}

async function AjouterTab({ d1, d2, now }: { d1: Date; d2: Date; now: string }) {
  const rows = await prisma.prodFourConsommationElectrique.findMany({
    where: { date: { gte: d1, lte: d2 } },
    orderBy: { date: "asc" },
    take: 200,
  });

  return (
    <>
      <form
        action={upsertFourConsommationElectrique}
        className="bg-surface border border-hairline rounded p-4 space-y-4"
      >
        <div className="text-sm font-bold text-urgent uppercase tracking-wide border-b border-hairline pb-2">
          Ajouter Consommation Electrique
        </div>
        <div className="grid grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Date</label>
            <input type="date" name="date" defaultValue={now} required className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Compteur Cons. Matin (kw)</label>
            <input type="number" step="0.01" name="consMatin" className="w-full border border-hairline rounded px-3 py-2 text-sm font-mono bg-surface" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Compteur Cons. Pointe (kw)</label>
            <input type="number" step="0.01" name="consPointe" className="w-full border border-hairline rounded px-3 py-2 text-sm font-mono bg-surface" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Compteur Cons. Nuit (kw)</label>
            <input type="number" step="0.01" name="consNuit" className="w-full border border-hairline rounded px-3 py-2 text-sm font-mono bg-surface" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Compteur Cons. Soir (kw)</label>
            <input type="number" step="0.01" name="consSoir" className="w-full border border-hairline rounded px-3 py-2 text-sm font-mono bg-surface" />
          </div>
        </div>
        <button type="submit" className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors">
          Ajouter
        </button>
      </form>

      <form method="get" className="flex items-end gap-3">
        <input type="hidden" name="tab" value="ajouter" />
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Du</label>
          <input type="date" name="d1" defaultValue={fmt(d1)} className="border border-hairline rounded px-3 py-2 text-sm bg-surface" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Au</label>
          <input type="date" name="d2" defaultValue={fmt(d2)} className="border border-hairline rounded px-3 py-2 text-sm bg-surface" />
        </div>
        <button type="submit" className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors">
          Actualiser
        </button>
      </form>

      <div className="bg-surface border border-hairline rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold text-right">Compteur Cons. Matin</th>
              <th className="px-4 py-3 font-semibold text-right">Compteur Cons. Pointe</th>
              <th className="px-4 py-3 font-semibold text-right">Compteur Cons. Nuit</th>
              <th className="px-4 py-3 font-semibold text-right">Compteur Cons. Soir</th>
              <th className="px-4 py-3 font-semibold w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                <td className="px-4 py-2.5 text-ink font-mono text-xs">{r.date?.toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{r.consMatin?.toString() ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{r.consPointe?.toString() ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{r.consNuit?.toString() ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{r.consSoir?.toString() ?? "—"}</td>
                <td className="px-2 py-2.5 text-center">
                  <form action={deleteFourConsommationElectrique}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-urgent hover:text-urgent/70 text-xs font-bold" title="Supprimer">
                      ✕
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                  Aucune saisie pour cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

async function RecapTab({ d1, d2 }: { d1: Date; d2: Date }) {
  // Rewritten to compare dates as plain "YYYY-MM-DD" strings throughout
  // rather than mixing UTC-parsed Date objects (new Date("2026-09-01")
  // parses as UTC midnight) with local-time methods (setHours() reads
  // the server's local timezone) — that mismatch could silently shift
  // or exclude rows depending on the server's timezone offset. String
  // comparison of ISO-format dates sorts and compares correctly with
  // no timezone ambiguity at all.
  const d1Key = fmt(d1);
  const d2Key = fmt(d2);

  const [meterRows, fourRows] = await Promise.all([
    prisma.prodFourConsommationElectrique.findMany({
      orderBy: { date: "asc" },
    }),
    prisma.prodRapportFourSortie.findMany({
      include: { rapport: true },
    }),
  ]);

  const byDate = new Map<string, (typeof meterRows)[number]>();
  for (const r of meterRows) {
    if (r.date) byDate.set(fmt(r.date), r);
  }

  const tonnageByDate = new Map<string, number>();
  for (const f of fourRows) {
    const key = fmt(f.rapport.dateRapport);
    tonnageByDate.set(key, (tonnageByDate.get(key) ?? 0) + Number(f.tonnage));
  }

  const sortedDates = [...byDate.keys()].filter((k) => k >= d1Key && k <= d2Key).sort();
  const allKeys = [...byDate.keys()].sort();

  const recapRows = sortedDates.map((key) => {
    const cur = byDate.get(key)!;
    const next = byDate.get(nextDayKey(key));

    const delta = (curVal: unknown, nextVal: unknown) =>
      next && curVal != null && nextVal != null ? Number(nextVal) - Number(curVal) : null;

    const matin = delta(cur.consMatin, next?.consMatin);
    const pointe = delta(cur.consPointe, next?.consPointe);
    const nuit = delta(cur.consNuit, next?.consNuit);
    const soir = delta(cur.consSoir, next?.consSoir);
    const total = [matin, pointe, nuit, soir].every((v) => v != null)
      ? (matin ?? 0) + (pointe ?? 0) + (nuit ?? 0) + (soir ?? 0)
      : null;
    const tonnage = tonnageByDate.get(key) ?? 0;
    const ratio = total != null && tonnage > 0 ? total / tonnage : null;

    return { date: key, matin, pointe, nuit, soir, total, tonnage, ratio };
  });

  const fmtNum = (v: number | null) => (v == null ? "—" : v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }));

  return (
    <>
      <div className="text-sm font-bold text-urgent uppercase tracking-wide border-b border-hairline pb-2">
        Analyse Consommation Electrique
      </div>
      <form method="get" className="flex items-end gap-3">
        <input type="hidden" name="tab" value="recap" />
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Du</label>
          <input type="date" name="d1" defaultValue={fmt(d1)} className="border border-hairline rounded px-3 py-2 text-sm bg-surface" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Au</label>
          <input type="date" name="d2" defaultValue={fmt(d2)} className="border border-hairline rounded px-3 py-2 text-sm bg-surface" />
        </div>
        <button type="submit" className="bg-steel-600 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-steel-700 transition-colors">
          Actualiser
        </button>
      </form>

      <p className="text-xs text-muted max-w-2xl">
        La colonne « Consommation » de l&apos;écran de référence n&apos;a pas pu être
        reconstituée — ses valeurs ne correspondent à aucune combinaison des
        autres colonnes (vérifié notamment sur une ligne où le total de
        consommation était fortement négatif suite à un compteur remis à
        zéro, alors que cette colonne restait positive et normale) —
        omise plutôt que devinée.
      </p>

      {recapRows.length === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded p-4 text-xs text-ink space-y-1 font-mono">
          <div className="font-bold not-italic font-sans mb-2">Diagnostic (aucune ligne trouvée) :</div>
          <div>Période demandée : {d1Key} → {d2Key}</div>
          <div>Relevés en base (toutes dates confondues) : {allKeys.length}</div>
          <div>Premières dates trouvées en base : {allKeys.slice(0, 8).join(", ") || "aucune"}</div>
          <div>Dernières dates trouvées en base : {allKeys.slice(-8).join(", ") || "aucune"}</div>
        </div>
      )}

      <div className="bg-surface border border-hairline rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold text-right">Cons. Matin</th>
              <th className="px-4 py-3 font-semibold text-right">Cons. Pointe</th>
              <th className="px-4 py-3 font-semibold text-right">Cons. Nuit</th>
              <th className="px-4 py-3 font-semibold text-right">Cons. Soir</th>
              <th className="px-4 py-3 font-semibold text-right bg-paper">Cons. Total (KW)</th>
              <th className="px-4 py-3 font-semibold text-right bg-amber-50">Tonnage S.Four</th>
              <th className="px-4 py-3 font-semibold text-right bg-green-50">Ratio (KW/T)</th>
            </tr>
          </thead>
          <tbody>
            {recapRows.map((r) => (
              <tr key={r.date} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                <td className="px-4 py-2.5 text-ink font-mono text-xs">{displayDate(r.date)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{fmtNum(r.matin)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{fmtNum(r.pointe)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{fmtNum(r.nuit)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">{fmtNum(r.soir)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-ink bg-paper/60">{fmtNum(r.total)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-ink bg-amber-50/60">{fmtNum(r.tonnage)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-ink bg-green-50/60">{fmtNum(r.ratio)}</td>
              </tr>
            ))}
            {recapRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted text-sm">
                  Aucune donnée pour cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
