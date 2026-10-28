import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function AnalyticsHubPage() {
  return (
    <>
      <PageHeader eyebrow="Maintenance" title="Analyse & KPI" hideBack />
      <div className="p-8 grid grid-cols-2 gap-4 max-w-3xl">
        <Link
          href="/analytics/reliability"
          className="bg-surface border border-hairline rounded p-5 hover:border-steel-400 transition-colors"
        >
          <div className="text-sm font-semibold text-ink">Fiabilité (MTTR / MTBF)</div>
          <div className="text-xs text-muted mt-1.5">
            Temps moyen de réparation et temps moyen entre pannes, par
            équipement, sous-équipement, organe ou atelier.
          </div>
        </Link>
        <Link
          href="/analytics/cost"
          className="bg-surface border border-hairline rounded p-5 hover:border-steel-400 transition-colors"
        >
          <div className="text-sm font-semibold text-ink">Coûts (Pareto)</div>
          <div className="text-xs text-muted mt-1.5">
            Classement des coûts de maintenance par équipement, famille,
            classe d&apos;intervention, défaillance, fonction ou
            intervenant, avec pourcentage cumulé.
          </div>
        </Link>
      </div>
    </>
  );
}
