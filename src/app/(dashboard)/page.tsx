import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { budgetPeriodEnd } from "@/lib/constants";
import { BudgetGauge } from "@/components/dashboard/BudgetGauge";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { DaStatusPieChart } from "@/components/dashboard/DaStatusPieChart";
import { CommandeBlBarChart } from "@/components/dashboard/CommandeBlBarChart";

// Complete redesign, explicitly requested: removed the 8 stat-card
// tiles and the "Modules" link list (redundant with the sidebar nav —
// every one of those destinations is already one click away there).
// Replaced with a "needs attention" zone (real, actionable urgent OTs
// and expiring fleet documents, not just counts) and a recent-activity
// feed, since a maintenance dashboard's job is triage — surfacing what
// needs a person right now — not repeating navigation.

const COMMITTED_STATUTS = ["En cours", "Clôturée"];
const OPEN_OT_STATUTS = ["En Préparation", "Planifié", "En Cours", "En Attente Arrêt Machine", "Sous-Traitant à contacter"];

async function getBudgetWidgetData(index: number) {
  const budgets = await prisma.budget.findMany({
    where: { creerNv: false },
    include: { categories: true, fournisseurs: true },
    orderBy: { id: "asc" },
  });
  if (budgets.length === 0) return null;

  const clampedIndex = Math.min(Math.max(index, 0), budgets.length - 1);
  const budget = budgets[clampedIndex];

  const periodStart = budget.dateCreation;
  const periodEnd = budgetPeriodEnd(periodStart, budget.duree);

  const lignes = await prisma.commandeArticle.findMany({
    where: {
      commande: {
        dateSignature: { gte: periodStart, lte: periodEnd },
        statut: { in: COMMITTED_STATUTS },
        ...(budget.fournisseurChoix && budget.fournisseurs.length > 0
          ? { idFournisseur: { in: budget.fournisseurs.map((f) => f.idFournisseur) } }
          : {}),
      },
      ...(budget.categorieChoix && budget.categories.length > 0
        ? {
            daArticle: {
              article: {
                sousFamilles: {
                  some: { sousFamille: { idFamille: { in: budget.categories.map((c) => c.idCategorie) } } },
                },
              },
            },
          }
        : {}),
    },
  });

  const totalDepense = lignes.reduce((acc, l) => {
    const brut = Number(l.qtCommande) * Number(l.prixHt ?? 0);
    const remise = brut * (Number(l.remise ?? 0) / 100);
    return acc + (brut - remise);
  }, 0);

  const montant = Number(budget.montant);
  const pct = montant > 0 ? (totalDepense / montant) * 100 : 0;

  return { budget, totalDepense, montant, pct, index: clampedIndex, total: budgets.length };
}

const DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export default async function Dashboard({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly budgetIndex?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 30);
  const budgetIndex = Number(params.budgetIndex ?? 0) || 0;

  const [
    budgetWidget,
    ruptureStock,
    daParStatut,
    commandeStats,
    blStats,
    urgentOts,
    expiringAssurances,
    expiringVignettes,
    expiringVisites,
    recentOts,
    recentDis,
    recentBsm,
  ] = await Promise.all([
    getBudgetWidgetData(budgetIndex),
    prisma.article.findMany({
      where: { deleted: false, stockNeuf: 0 },
      select: { designation: true },
      orderBy: { designation: "asc" },
      take: 10,
    }),
    prisma.demandeAchat.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.commande.findMany({
      where: { statut: { in: ["En attente", "En cours"] } },
      select: { statut: true, lignes: { select: { qtCommande: true, prixHt: true } } },
    }),
    prisma.bonLivraison.findMany({
      select: { factures: { select: { id: true } }, lignes: { select: { qt: true, prixHt: true } } },
    }),
    // Needs attention: real, open, high-urgency work orders — not a
    // count, the actual list, so a supervisor can act immediately.
    prisma.ordreTravail.findMany({
      where: { deleted: false, urgence: "Elevée", statut: { in: OPEN_OT_STATUTS } },
      include: { equipementRef: true, superviseur: true },
      orderBy: { dateDebut: "asc" },
      take: 5,
    }),
    prisma.enginAssurance.findMany({
      where: { deleted: false, dateExp: { lte: horizon } },
      include: { engin: true },
      orderBy: { dateExp: "asc" },
    }),
    prisma.enginVignette.findMany({
      where: { deleted: false, dateExp: { lte: horizon } },
      include: { engin: true },
      orderBy: { dateExp: "asc" },
    }),
    prisma.enginVisiteTechnique.findMany({
      where: { deleted: false, dateExp: { lte: horizon } },
      include: { engin: true },
      orderBy: { dateExp: "asc" },
    }),
    prisma.ordreTravail.findMany({
      where: { deleted: false },
      select: { id: true, nOt: true, dateDebut: true, statut: true, equipementRef: { select: { designation: true } } },
      orderBy: { id: "desc" },
      take: 4,
    }),
    prisma.demandeIntervention.findMany({
      where: { deleted: false },
      select: { id: true, nDi: true, dateEmission: true, equipementRef: { select: { designation: true } } },
      orderBy: { id: "desc" },
      take: 4,
    }),
    prisma.bsm.findMany({
      select: { id: true, dateBsm: true, createur: true, nOt: true },
      orderBy: { id: "desc" },
      take: 4,
    }),
  ]);

  const expiringDocs = [
    ...expiringAssurances.map((e) => ({ id: `assurance-${e.id}`, label: "Assurance", engin: e.engin.designation, date: e.dateExp })),
    ...expiringVignettes.map((e) => ({ id: `vignette-${e.id}`, label: "Vignette", engin: e.engin.designation, date: e.dateExp })),
    ...expiringVisites.map((e) => ({ id: `visite-${e.id}`, label: "Visite technique", engin: e.engin.designation, date: e.dateExp })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const activity = [
    ...recentOts.map((o) => ({
      key: `ot-${o.id}`,
      date: o.dateDebut ?? new Date(0),
      text: `OT ${o.nOt} — ${o.equipementRef?.designation ?? "équipement non précisé"}`,
      tag: o.statut,
      href: `/work-orders/${o.id}`,
    })),
    ...recentDis.map((d) => ({
      key: `di-${d.id}`,
      date: d.dateEmission,
      text: `DI ${d.nDi ?? `#${d.id}`} — ${d.equipementRef?.designation ?? "équipement non précisé"}`,
      tag: "Intervention",
      href: `/interventions/${d.id}`,
    })),
    ...recentBsm.map((b) => ({
      key: `bsm-${b.id}`,
      date: b.dateBsm,
      text: `BSM-${String(b.id).padStart(4, "0")}${b.nOt ? ` — ${b.nOt}` : ""}`,
      tag: b.createur ?? "Stock",
      href: `/inventory/bsm/${b.id}`,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  const daPieData = daParStatut.map((d) => ({ name: d.statut, value: d._count._all }));

  const lineAmount = (l: { qt?: any; qtCommande?: any; prixHt: any }) =>
    Number(l.qtCommande ?? l.qt ?? 0) * Number(l.prixHt ?? 0);

  const cmdEnAttente = commandeStats.filter((c) => c.statut === "En attente");
  const cmdConfirmee = commandeStats.filter((c) => c.statut === "En cours");
  const blNonFacture = blStats.filter((b) => b.factures.length === 0);
  const blFacture = blStats.filter((b) => b.factures.length > 0);

  const barData = [
    { label: "Cmd En Attente", nombre: cmdEnAttente.length, montant: cmdEnAttente.reduce((acc, c) => acc + c.lignes.reduce((a, l) => a + lineAmount(l), 0), 0) },
    { label: "Cmd Confirmée", nombre: cmdConfirmee.length, montant: cmdConfirmee.reduce((acc, c) => acc + c.lignes.reduce((a, l) => a + lineAmount(l), 0), 0) },
    { label: "BL non Facturé", nombre: blNonFacture.length, montant: blNonFacture.reduce((acc, b) => acc + b.lignes.reduce((a, l) => a + lineAmount(l), 0), 0) },
    { label: "BL Facturé", nombre: blFacture.length, montant: blFacture.reduce((acc, b) => acc + b.lignes.reduce((a, l) => a + lineAmount(l), 0), 0) },
  ];

  const dayLabel = `${DAY_NAMES[now.getDay()]} ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
  const attentionCount = urgentOts.length + expiringDocs.length;

  return (
    <>
      <PageHeader eyebrow="Ideal Brique · GMAO" title="Tableau de bord" hideBack />

      <div className="px-5 pt-6 sm:px-10 sm:pt-8 page-enter">
        <div className="relative overflow-hidden rounded-2xl bg-graphite-900 px-6 py-7 text-white shadow-[0_16px_32px_rgba(16,24,40,0.14)] sm:px-8">
          <div className="relative z-10 max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200/70">{dayLabel}</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {attentionCount > 0
                ? `${attentionCount} chose${attentionCount > 1 ? "s" : ""} réclame${attentionCount > 1 ? "nt" : ""} votre attention.`
                : "Rien d'urgent aujourd'hui."}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              Interventions urgentes, échéances flotte, stocks et achats — tout ce qui compte, réuni ici.
            </p>
          </div>
          <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -right-2 -bottom-36 h-72 w-72 rounded-full border border-orange-300/20" />
        </div>
      </div>

      {/* Needs attention — visually distinct from the data widgets below,
          since this is the page's actual job: triage, not reporting. */}
      {attentionCount > 0 && (
        <div className="px-5 pt-5 sm:px-10">
          <div className="rounded-2xl border border-urgent/25 bg-urgent/[0.04] p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-urgent" />
              <span className="text-sm font-semibold text-ink">À traiter en priorité</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              {urgentOts.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
                    OT urgents ouverts
                  </div>
                  <ul className="space-y-2">
                    {urgentOts.map((ot) => (
                      <li key={ot.id}>
                        <Link
                          href={`/work-orders/${ot.id}`}
                          className="flex items-center justify-between gap-3 text-sm hover:bg-white/60 -mx-2 px-2 py-1.5 rounded transition-colors"
                        >
                          <span className="text-ink">
                            <span className="font-mono text-xs text-muted mr-2">{ot.nOt}</span>
                            {ot.equipementRef?.designation ?? "Équipement non précisé"}
                          </span>
                          <span className="text-xs text-muted shrink-0">{ot.superviseur?.nom ?? ot.statut}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expiringDocs.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
                    Documents flotte — échéance sous 30 jours
                  </div>
                  <ul className="space-y-2">
                    {expiringDocs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 text-sm py-1.5">
                        <span className="text-ink">
                          <span className="text-muted">{d.label} · </span>
                          {d.engin}
                        </span>
                        <span className="text-xs font-mono text-urgent shrink-0">
                          {d.date.toLocaleDateString("fr-FR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-5 page-enter">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Budget widget */}
          <div className="surface-panel p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-lg font-semibold text-ink">Budget</div>
                <div className="text-xs text-muted uppercase tracking-wide">Total du mois</div>
              </div>
              {budgetWidget && budgetWidget.total > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <Link href={`/?budgetIndex=${Math.max(budgetWidget.index - 1, 0)}`} className="text-steel-600 hover:text-steel-700 font-semibold">←</Link>
                  <span className="text-muted text-xs">{budgetWidget.index + 1}/{budgetWidget.total}</span>
                  <Link href={`/?budgetIndex=${Math.min(budgetWidget.index + 1, budgetWidget.total - 1)}`} className="text-steel-600 hover:text-steel-700 font-semibold">→</Link>
                </div>
              )}
            </div>
            {budgetWidget ? (
              <div className="flex items-center gap-6">
                <BudgetGauge pct={budgetWidget.pct} />
                <div className="flex-1 space-y-2">
                  <div className="text-xs text-muted">{budgetWidget.budget.nom}</div>
                  <div>
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Montant consommé</div>
                    <div className="text-xl font-bold font-mono text-ink">
                      {budgetWidget.totalDepense.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DT
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Montant budget</div>
                    <div className="text-xl font-bold font-mono text-ink">
                      {budgetWidget.montant.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DT
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted py-8 text-center">Aucun budget actif.</div>
            )}
          </div>

          {/* DA status pie + calendar */}
          <div className="surface-panel p-6 flex gap-4 sm:col-span-2">
            <div className="flex-1">
              <div className="text-lg font-semibold text-ink mb-2">Demande Achat</div>
              <div className="h-56">
                <DaStatusPieChart data={daPieData} />
              </div>
            </div>
            <div className="w-48 border-l border-hairline pl-4">
              <MiniCalendar />
            </div>
          </div>

          {/* Stock outage table */}
          <div className="surface-panel p-6">
            <div className="text-lg font-semibold text-ink mb-3">Rupture de stock : TOP 10</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">Article</th>
                  <th className="pb-2 font-semibold text-right w-24">Quantité</th>
                </tr>
              </thead>
              <tbody>
                {ruptureStock.map((a) => (
                  <tr key={a.designation} className="border-b border-hairline last:border-0">
                    <td className="py-2 text-ink">{a.designation}</td>
                    <td className="py-2 text-right font-mono text-xs text-urgent font-semibold">0</td>
                  </tr>
                ))}
                {ruptureStock.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">Aucune rupture de stock.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Commande / BL bar chart */}
          <div className="surface-panel p-6">
            <div className="text-lg font-semibold text-ink mb-2">Commandes & Bons de livraison</div>
            <div className="h-64">
              <CommandeBlBarChart data={barData} />
            </div>
          </div>
        </div>

        {/* Recent activity — a narrow timeline, deliberately different
            shape from the surface-panel cards, for real visual variety
            rather than another identical box. */}
        <div className="surface-panel p-6">
          <div className="text-lg font-semibold text-ink mb-4">Activité récente</div>
          {activity.length === 0 ? (
            <div className="text-sm text-muted py-8 text-center">Aucune activité récente.</div>
          ) : (
            <ol className="relative border-l border-hairline ml-1.5 space-y-5">
              {activity.map((item) => (
                <li key={item.key} className="pl-5 relative">
                  <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-steel-600 ring-4 ring-surface" />
                  <Link href={item.href} className="block hover:text-steel-600 transition-colors">
                    <div className="text-sm text-ink leading-snug">{item.text}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted font-mono">
                        {item.date.toLocaleDateString("fr-FR")}
                      </span>
                      <span className="text-[11px] text-muted">· {item.tag}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}
