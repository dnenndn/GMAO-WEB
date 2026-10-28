import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { OtTabBar } from "@/components/OtTabBar";

// Reproduces the legacy app's "Tableaux de bord" screen (button5_Click
// in ordre_travail.cs, embedding ot_tb — a 5-way toggle: Général /
// KPI / Répartition par type de maintenance / Réalisation des
// travaux / Coût de maintenance).
//
// KPI and Coût de maintenance aren't rebuilt here: ot_kpi_tous and
// ot_tb_cout_mo's real queries are the same MTBF/MTTR and labor-cost
// metrics already covered by the Analyse & KPI pages (Fiabilité /
// Coût), so this links to those directly instead of duplicating the
// logic under a third name.

const CARDS = [
  { href: "/work-orders/tableau-de-bord/general", title: "Général", desc: "Nombre d'OT clôturés et durée moyenne de réparation, corrective vs préventive." },
  { href: "/analytics/reliability", title: "KPI", desc: "MTTR / MTBF par équipement, sous-équipement, organe, atelier, classe ou défaillance." },
  { href: "/work-orders/tableau-de-bord/repartition", title: "Répartition par type de maintenance", desc: "Répartition des OT clôturés par type d'intervention." },
  { href: "/work-orders/tableau-de-bord/realisation", title: "Réalisation des travaux", desc: "OT commencés en retard et causes de réalisation." },
  { href: "/analytics/cost", title: "Coût de maintenance", desc: "Coût pièces et main-d'œuvre par équipement, famille, fonction ou intervenant." },
] as const;

export default function TableauDeBordPage() {
  return (
    <>
      <PageHeader eyebrow="Maintenance · OT" title="Tableaux de bord" />
      <OtTabBar active="/work-orders/tableau-de-bord" />
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
