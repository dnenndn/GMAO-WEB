import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { ReportTabs } from "@/components/ReportTabs";
import { posteColor } from "@/lib/constants";
import { notFound } from "next/navigation";

export default async function ProductionReportPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const rapport = await prisma.prodRapportGeneral.findUnique({
    where: { id },
    include: {
      fabProduits: true,
      fourEntre: true,
      fourSortie: true,
      embProduits: true,
      fuel: true,
    },
  });

  if (!rapport) notFound();

  const totalFab = sum(rapport.fabProduits.map((r) => Number(r.quantite)));
  const totalFourIn = sum(rapport.fourEntre.map((r) => Number(r.quantite)));
  const totalFourOut = sum(rapport.fourSortie.map((r) => Number(r.quantite)));
  const totalEmb = sum(rapport.embProduits.map((r) => Number(r.quantite)));
  const totalFuel = sum(rapport.fuel.map((r) => Number(r.quantite)));
  const rendement = totalFourIn > 0 ? (totalFourOut / totalFourIn) * 100 : null;

  const p = posteColor(rapport.poste);

  return (
    <>
      <PageHeader
        eyebrow="Rapport de production"
        title={`RP-${String(rapport.id).padStart(4, "0")}`}
        backHref="/production"
      />
      <ReportTabs id={id} active="" />
      <div className="p-8 space-y-6">
        <div className="flex gap-2 items-center">
          <StatusPill label={rapport.poste} fg={p.fg} bg={p.bg} />
          <span className="text-sm text-muted font-mono">
            {rapport.dateRapport.toLocaleDateString("fr-FR")}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <Metric label="Fabrication (unités)" value={totalFab} />
          <Metric label="Four — entrée" value={totalFourIn} />
          <Metric label="Four — sortie" value={totalFourOut} />
          <Metric label="Emballage (unités)" value={totalEmb} />
          <Metric label="Fuel (total)" value={totalFuel} />
        </div>

        {rendement !== null && (
          <div className="bg-surface border border-hairline rounded p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">
              Rendement du four (sortie / entrée)
            </div>
            <div className="text-2xl font-semibold font-mono text-ink mt-1">
              {rendement.toFixed(1)}%
            </div>
            <div className="text-xs text-muted mt-1">
              Indicateur de perte à la cuisson — calculé à partir des
              quantités entrée/sortie du four pour ce rapport.
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-hairline rounded p-4">
      <div className="text-2xl font-semibold font-mono text-ink">
        {value.toLocaleString("fr-FR")}
      </div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}
