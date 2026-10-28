import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { OtTabBar } from "@/components/OtTabBar";

// Reproduces the legacy app's "Analyses" screen (button4_Click in
// ordre_travail.cs, embedding ot_analyse — a 4-way toggle: Pareto /
// AMDEC / Ishikawa / Rapport).
//
// Pareto isn't rebuilt here — it already exists as the Fiabilité and
// Coût pages under Analyse & KPI, which cover the same real
// dimensions the legacy Pareto screen breaks down by (équipement,
// organe, défaillance, famille, intervenant, etc.), so this links to
// those directly rather than duplicating the same logic under a
// second name.
//
// "Rapport" (the 4th legacy tab) isn't included as a card below: its
// three buttons only launched Crystal Reports print views of data
// already shown elsewhere (a general OT report, a corrective/
// preventive ratio report, a BSM report) — a print/export feature,
// not a distinct data view or analysis.

const CARDS = [
  {
    href: "/analytics/reliability",
    title: "Pareto — Fiabilité",
    desc: "TTR / MTTR / MTBF par équipement, organe, classe d'intervention ou défaillance.",
  },
  {
    href: "/analytics/cost",
    title: "Pareto — Coût",
    desc: "Coût pièces et main-d'œuvre par équipement, famille d'article, fonction ou intervenant.",
  },
  {
    href: "/work-orders/analyses/amdec",
    title: "AMDEC",
    desc: "Criticité (Fréquence × Gravité) par défaillance, pour prioriser les modes de panne.",
  },
  {
    href: "/work-orders/analyses/ishikawa",
    title: "Ishikawa",
    desc: "Diagramme 5M des causes confirmées pour une défaillance donnée.",
  },
] as const;

export default function OtAnalysesPage() {
  return (
    <>
      <PageHeader eyebrow="Maintenance · OT" title="Analyses" />
      <OtTabBar active="/work-orders/analyses" />
      <div className="p-8">
        <div className="grid grid-cols-2 gap-4 max-w-3xl">
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="block bg-surface border border-hairline rounded-lg p-5 hover:border-steel-400 hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <div className="text-sm font-semibold text-ink mb-1.5">{c.title}</div>
              <div className="text-xs text-muted leading-relaxed">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
