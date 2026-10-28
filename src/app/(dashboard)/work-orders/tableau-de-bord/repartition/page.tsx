import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { OtTypePieChart } from "@/components/dashboard/OtTypePieChart";

// Reproduces the legacy app's ot_tb_type_maintenance.cs — count of
// closed OTs grouped by type (Corrective / Corrective Curative /
// Préventive Systématique / etc.).

export default async function TbRepartitionPage() {
  const grouped = await prisma.ordreTravail.groupBy({
    by: ["type"],
    where: { deleted: false, statut: "Clôturé" },
    _count: { id: true },
  });

  const data = grouped
    .map((g) => ({ name: g.type, value: g._count.id }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader eyebrow="Maintenance · OT · Tableau de bord" title="Répartition par type de maintenance" />
      <div className="p-8">
        <div className="bg-surface border border-hairline rounded-lg p-6 h-[420px] max-w-3xl">
          <OtTypePieChart data={data} />
        </div>
      </div>
    </>
  );
}
