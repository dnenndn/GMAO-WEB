import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OtTabBar } from "@/components/OtTabBar";
import { SortableTh } from "@/components/SortableTh";
import { sortRows } from "@/lib/sortRows";
import { statutColor } from "@/lib/constants";

// Reproduces the legacy app's "Calendrier" screen (the button2_Click
// handler in ordre_travail.cs, embedding ot_agenda — itself a further
// 2-way toggle between ot_agenda_travaux and ot_agenda_employe, per
// their real source queries). Cancelled OTs (statut = "Annulé") are
// excluded from both views, matching the real source's `statut <> @a`
// filter — a cancelled OT was never actually scheduled.

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function parseMonth(month: string | undefined): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function monthParam(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default async function OtCalendrierPage({
  searchParams,
}: {
  searchParams: { view?: string; month?: string; sort?: string; dir?: string };
}) {
  const view = searchParams.view === "employe" ? "employe" : "travaux";
  const sortDir: "asc" | "desc" = searchParams.dir === "desc" ? "desc" : "asc";
  const { year, monthIndex } = parseMonth(searchParams.month);

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);
  const prevMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);

  // Grid padding: JS getDay() is 0=Sunday, the legacy calendar (and
  // this one) starts the week on Monday — convert to a 0=Monday index.
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();

  const ordres =
    view === "travaux"
      ? await prisma.ordreTravail.findMany({
          where: {
            deleted: false,
            statut: { not: "Annulé" },
            dateDebut: { gte: monthStart, lte: monthEnd },
          },
          include: { equipementRef: true },
          orderBy: { dateDebut: "asc" },
          // No take limit — already bounded by the month range itself,
          // a natural bound (unlike an ever-growing archive table).
        })
      : [];

  // "Par Employé" — real source joins ot_ordo_intervenant (the actual
  // scheduled staff + time window) back to ot_ressources_fonction to
  // reach the parent OT, then to intervenant for the name.
  const assignments =
    view === "employe"
      ? await prisma.otOrdoIntervenant.findMany({
          where: {
            debut: { gte: monthStart, lte: monthEnd },
            ressourceFonction: {
              ordreTravail: { deleted: false, statut: { not: "Annulé" } },
            },
          },
          include: {
            intervenant: true,
            ressourceFonction: { include: { ordreTravail: { include: { equipementRef: true } } } },
          },
          orderBy: { debut: "asc" },
          // Same reasoning as above — already month-bounded.
        })
      : [];

  const byEmployee = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const key = a.intervenant.nom;
    if (!byEmployee.has(key)) byEmployee.set(key, []);
    byEmployee.get(key)!.push(a);
  }

  const byDay = new Map<number, typeof ordres>();
  for (const ot of ordres) {
    if (!ot.dateDebut) continue;
    const day = ot.dateDebut.getDate();
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(ot);
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT" title="Calendrier" />
      <OtTabBar active="/work-orders/calendrier" />
      <div className="p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 border border-hairline rounded-lg p-1 bg-surface w-fit">
            <Link
              href={`?view=travaux&month=${monthParam(year, monthIndex)}`}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                view === "travaux" ? "bg-steel-600 text-white" : "text-muted hover:text-ink"
              }`}
            >
              Par Travaux
            </Link>
            <Link
              href={`?view=employe&month=${monthParam(year, monthIndex)}`}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                view === "employe" ? "bg-steel-600 text-white" : "text-muted hover:text-ink"
              }`}
            >
              Par Employé
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`?view=${view}&month=${monthParam(prevMonth.getFullYear(), prevMonth.getMonth())}`}
              className="w-8 h-8 flex items-center justify-center rounded border border-hairline text-muted hover:text-ink hover:border-steel-400"
            >
              ←
            </Link>
            <div className="text-sm font-semibold text-ink w-36 text-center">
              {MONTHS_FR[monthIndex]} {year}
            </div>
            <Link
              href={`?view=${view}&month=${monthParam(nextMonth.getFullYear(), nextMonth.getMonth())}`}
              className="w-8 h-8 flex items-center justify-center rounded border border-hairline text-muted hover:text-ink hover:border-steel-400"
            >
              →
            </Link>
          </div>
        </div>

        {view === "travaux" ? (
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <div className="grid grid-cols-7 border-b border-hairline">
              {WEEKDAYS_FR.map((d) => (
                <div key={d} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted text-center border-r border-hairline last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const dayOrdres = day ? byDay.get(day) ?? [] : [];
                const isToday = isCurrentMonth && day === today.getDate();
                return (
                  <div
                    key={i}
                    className={`min-h-[110px] border-r border-b border-hairline last:border-r-0 p-1.5 ${
                      day === null ? "bg-paper/40" : ""
                    }`}
                  >
                    {day !== null && (
                      <>
                        <div className={`text-xs mb-1 ${isToday ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-steel-600 text-white font-semibold" : "text-muted"}`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayOrdres.slice(0, 3).map((ot) => {
                            const s = statutColor(ot.statut);
                            return (
                              <Link
                                key={ot.id}
                                href={`/work-orders/${ot.id}`}
                                className="block text-[10px] px-1.5 py-0.5 rounded truncate"
                                style={{ backgroundColor: s.bg, color: s.fg }}
                                title={`${ot.nOt} — ${ot.equipementRef?.designation ?? ""}`}
                              >
                                {ot.nOt}
                              </Link>
                            );
                          })}
                          {dayOrdres.length > 3 && (
                            <div className="text-[10px] text-muted px-1.5">+{dayOrdres.length - 3} autres</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {byEmployee.size === 0 && (
              <div className="bg-surface border border-hairline rounded px-4 py-8 text-center text-muted text-sm">
                Aucune affectation planifiée pour ce mois.
              </div>
            )}
            {Array.from(byEmployee.entries()).map(([nom, items]) => {
              const sortedItems = sortRows(items, searchParams.sort, sortDir, {
                nOt: (a) => a.ressourceFonction.ordreTravail.nOt,
                equipement: (a) => a.ressourceFonction.ordreTravail.equipementRef?.designation,
                debut: (a) => a.debut,
                fin: (a) => a.fin,
              });
              return (
              <div key={nom} className="bg-surface border border-hairline rounded overflow-hidden">
                <div className="px-4 py-2.5 bg-paper border-b border-hairline text-sm font-semibold text-ink">
                  {nom}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                      <SortableTh searchParams={searchParams} columnKey="nOt" label="N° OT" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                      <SortableTh searchParams={searchParams} columnKey="equipement" label="Équipement" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                      <SortableTh searchParams={searchParams} columnKey="debut" label="Début" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                      <SortableTh searchParams={searchParams} columnKey="fin" label="Fin" currentSort={searchParams.sort} currentDir={searchParams.dir} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((a) => (
                      <tr key={a.id} className="border-b border-hairline last:border-0">
                        <td className="px-4 py-2">
                          <Link href={`/work-orders/${a.ressourceFonction.ordreTravail.id}`} className="text-steel-600 font-semibold hover:underline">
                            {a.ressourceFonction.ordreTravail.nOt}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-ink">{a.ressourceFonction.ordreTravail.equipementRef?.designation ?? "—"}</td>
                        <td className="px-4 py-2 text-muted font-mono text-xs">
                          {a.debut.toLocaleDateString("fr-FR")} {a.debut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2 text-muted font-mono text-xs">
                          {a.fin.toLocaleDateString("fr-FR")} {a.fin.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
