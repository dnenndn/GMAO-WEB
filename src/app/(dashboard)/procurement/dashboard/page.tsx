import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { CommandeBlBarChart } from "@/components/dashboard/CommandeBlBarChart";

// "Tableau de bord" (Achat) — real Achat sidebar item (button31, opens the
// `tb_achat` form). The legacy form is a 4-tab shell:
//   1. button1 → tb_flux_achat        ("Flux d'achat")
//   2. button2 → tb_variation_prix    ("Variation prix") — the tab it opens on by default
//   3. button3 → tb_variation_prix_article ("Variation prix article")
//   4. button4 → tb_achat_article     ("Achat par article")
// Reproduced here as a tab switcher over ?view=, same pattern used on the
// budget detail page's Général/Variation toggle.

const VIEWS = ["flux", "variation", "variation-article", "par-article"] as const;
type View = (typeof VIEWS)[number];

const TAB_LABELS: Record<View, string> = {
  flux: "Flux d'achat",
  variation: "Variation prix",
  "variation-article": "Variation prix article",
  "par-article": "Achat par article",
};

const MONTHS_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

// Real query excludes statut = 0 (En attente) and statut = 5 (Annulée) —
// confirmed in tb_variation_prix.cs / tb_flux_achat.cs bound params
// (`@d`=0, `@f`=5). Mirrors COMMANDE_STATUTS int convention.
const VARIATION_STATUTS = ["En cours", "Clôturée"];

export default async function AchatDashboardPage({
  searchParams,
}: {
  searchParams: { view?: string; year?: string };
}) {
  const view: View = VIEWS.includes(searchParams.view as View)
    ? (searchParams.view as View)
    : "variation"; // real form's tb_achat_Load defaults to button2_Click (Variation prix)

  const year = Number(searchParams.year) || new Date().getFullYear();

  return (
    <>
      <PageHeader eyebrow="Achats" title="Tableau de bord" />
      <div className="p-8 space-y-6">
        <div className="flex gap-2 flex-wrap">
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={`/procurement/dashboard?view=${v}`}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                view === v
                  ? "bg-steel-600 text-white border-steel-600"
                  : "bg-surface text-muted border-hairline hover:border-steel-400"
              }`}
            >
              {TAB_LABELS[v]}
            </Link>
          ))}
        </div>

        {view === "flux" && <FluxAchatTab />}
        {view === "variation" && <VariationPrixTab year={year} />}
        {view === "variation-article" && <VariationPrixArticleTab />}
        {view === "par-article" && <AchatParArticleTab />}
      </div>
    </>
  );
}

// ----------------------------------------------------------------------------
// Tab 1 — Flux d'achat: current status breakdown, commandes vs BL
// ----------------------------------------------------------------------------
async function FluxAchatTab() {
  const [commandes, livraisons] = await Promise.all([
    prisma.commande.findMany({
      select: { statut: true, lignes: { select: { qtCommande: true, prixHt: true, remise: true } } },
    }),
    prisma.bonLivraison.findMany({
      select: { statut: true, lignes: { select: { qt: true, prixHt: true, remise: true } } },
    }),
  ]);

  const lineTotal = (l: { qt?: any; qtCommande?: any; prixHt: any; remise?: any }) => {
    const qty = Number(l.qtCommande ?? l.qt ?? 0);
    const base = qty * Number(l.prixHt ?? 0);
    const remise = Number(l.remise ?? 0);
    return base - (remise / 100) * base;
  };

  const groups = [
    { label: "Cmd En Attente", rows: commandes.filter((c) => c.statut === "En attente") },
    { label: "Cmd En Cours", rows: commandes.filter((c) => c.statut === "En cours") },
    { label: "Cmd Clôturée", rows: commandes.filter((c) => c.statut === "Clôturée") },
    { label: "BL En Cours", rows: livraisons.filter((b) => b.statut === "En cours") },
    { label: "BL Terminé", rows: livraisons.filter((b) => b.statut !== "En cours") },
  ];

  const barData = groups.map((g) => ({
    label: g.label,
    nombre: g.rows.length,
    montant: g.rows.reduce((acc, r) => acc + r.lignes.reduce((a, l) => a + lineTotal(l), 0), 0),
  }));

  return (
    <div className="surface-panel p-6">
      <div className="text-lg font-semibold text-ink mb-2">Flux d'achat — répartition par statut</div>
      <div className="h-80">
        <CommandeBlBarChart data={barData} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tab 2 — Variation prix: commandes count + spend, month by month, for a year
// ----------------------------------------------------------------------------
async function VariationPrixTab({ year }: { year: number }) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const commandes = await prisma.commande.findMany({
    where: {
      statut: { in: VARIATION_STATUTS },
      dateCommande: { gte: start, lt: end },
    },
    select: {
      dateCommande: true,
      lignes: { select: { qtCommande: true, prixHt: true, remise: true } },
    },
  });

  const monthly = Array.from({ length: 12 }, (_, i) => ({ label: MONTHS_FR[i], nombre: 0, montant: 0 }));
  for (const c of commandes) {
    const m = c.dateCommande.getUTCMonth();
    monthly[m].nombre += 1;
    monthly[m].montant += c.lignes.reduce((acc, l) => {
      const base = Number(l.qtCommande) * Number(l.prixHt ?? 0);
      return acc + (base - (Number(l.remise ?? 0) / 100) * base);
    }, 0);
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="surface-panel p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold text-ink">
          Variation prix — commandes confirmées ou clôturées, {year}
        </div>
        <div className="flex gap-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/procurement/dashboard?view=variation&year=${y}`}
              className={`text-xs font-mono px-2 py-1 rounded border ${
                y === year
                  ? "bg-steel-600 text-white border-steel-600"
                  : "bg-surface text-muted border-hairline hover:border-steel-400"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>
      <div className="h-80">
        <CommandeBlBarChart data={monthly} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tab 3 — Variation prix article: per-article price trend (simplified —
// real form lets you pick a famille/sous-famille drill-down; here we
// surface the articles whose average unit price moved the most recently
// vs. their historical average, which is the signal that screen is for).
// ----------------------------------------------------------------------------
async function VariationPrixArticleTab() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const lignes = await prisma.livraisonArticle.findMany({
    where: { livraison: { dateReel: { gte: twelveMonthsAgo } } },
    select: {
      prixHt: true,
      article: { select: { id: true, codeArticle: true, designation: true } },
      livraison: { select: { dateReel: true } },
    },
    take: 5000,
  });

  const byArticle = new Map<
    number,
    { codeArticle: string | null; designation: string; older: number[]; recent: number[] }
  >();
  for (const l of lignes) {
    if (!l.livraison.dateReel) continue;
    const entry = byArticle.get(l.article.id) ?? {
      codeArticle: l.article.codeArticle,
      designation: l.article.designation,
      older: [],
      recent: [],
    };
    const price = Number(l.prixHt);
    if (l.livraison.dateReel >= sixMonthsAgo) entry.recent.push(price);
    else entry.older.push(price);
    byArticle.set(l.article.id, entry);
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  const rows = Array.from(byArticle.entries())
    .map(([id, e]) => {
      const oldAvg = avg(e.older);
      const newAvg = avg(e.recent);
      const variation = oldAvg && newAvg ? ((newAvg - oldAvg) / oldAvg) * 100 : null;
      return { id, ...e, oldAvg, newAvg, variation };
    })
    .filter((r) => r.variation !== null)
    .sort((a, b) => Math.abs(b.variation!) - Math.abs(a.variation!))
    .slice(0, 30);

  return (
    <div className="surface-panel p-6">
      <div className="text-lg font-semibold text-ink mb-1">
        Variation prix article — plus fortes variations (6 derniers mois vs. 6 mois précédents)
      </div>
      <div className="overflow-hidden border border-hairline rounded mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Désignation</th>
              <th className="px-4 py-3 font-semibold text-right">Prix moyen (ancien)</th>
              <th className="px-4 py-3 font-semibold text-right">Prix moyen (récent)</th>
              <th className="px-4 py-3 font-semibold text-right">Variation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                <td className="px-4 py-3 font-mono text-xs text-muted">{r.codeArticle ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{r.designation}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{r.oldAvg!.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{r.newAvg!.toFixed(2)}</td>
                <td
                  className={`px-4 py-3 text-right font-mono text-xs font-semibold ${
                    r.variation! > 0 ? "text-[#B3261E]" : "text-[#3D7A4E]"
                  }`}
                >
                  {r.variation! > 0 ? "+" : ""}
                  {r.variation!.toFixed(1)}%
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted text-sm">
                  Pas assez d'historique de livraisons pour calculer une variation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tab 4 — Achat par article: top articles by delivered value, last 12 months
// Mirrors tb_achat_article.cs's query almost 1:1 — livraison_article joined
// to bon_livraison/article/sous_famille/famille, grouped by article, ordered
// by total value descending.
// ----------------------------------------------------------------------------
async function AchatParArticleTab() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const lignes = await prisma.livraisonArticle.findMany({
    where: { livraison: { dateReel: { gte: twelveMonthsAgo } } },
    select: {
      qt: true,
      prixHt: true,
      remise: true,
      idLivraison: true,
      article: {
        select: {
          id: true,
          codeArticle: true,
          designation: true,
          sousFamilles: { select: { sousFamille: { select: { designation: true, famille: { select: { designation: true } } } } } },
        },
      },
    },
    take: 5000,
  });

  const byArticle = new Map<
    number,
    { codeArticle: string | null; designation: string; famille: string; sousFamille: string; qt: number; blIds: Set<number>; montant: number }
  >();

  for (const l of lignes) {
    const sf = l.article.sousFamilles[0]?.sousFamille;
    const entry = byArticle.get(l.article.id) ?? {
      codeArticle: l.article.codeArticle,
      designation: l.article.designation,
      famille: sf?.famille.designation ?? "—",
      sousFamille: sf?.designation ?? "—",
      qt: 0,
      blIds: new Set<number>(),
      montant: 0,
    };
    const base = Number(l.qt) * Number(l.prixHt);
    entry.qt += Number(l.qt);
    entry.blIds.add(l.idLivraison);
    entry.montant += base - (Number(l.remise) / 100) * base;
    byArticle.set(l.article.id, entry);
  }

  const rows = Array.from(byArticle.values())
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 50);

  return (
    <div className="surface-panel p-6">
      <div className="text-lg font-semibold text-ink mb-1">
        Achat par article — 12 derniers mois, trié par montant décroissant
      </div>
      <div className="overflow-hidden border border-hairline rounded mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Famille</th>
              <th className="px-4 py-3 font-semibold">Sous-famille</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Désignation</th>
              <th className="px-4 py-3 font-semibold text-right">Qté livrée</th>
              <th className="px-4 py-3 font-semibold text-right">Nb BL</th>
              <th className="px-4 py-3 font-semibold text-right">Montant (DT)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-hairline last:border-0 hover:bg-paper/60">
                <td className="px-4 py-3 text-muted text-xs">{r.famille}</td>
                <td className="px-4 py-3 text-muted text-xs">{r.sousFamille}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{r.codeArticle ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{r.designation}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{r.qt}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{r.blIds.size}</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                  {r.montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted text-sm">
                  Aucune livraison sur les 12 derniers mois.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
