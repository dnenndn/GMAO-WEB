import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { EquipementTree } from "@/components/EquipementTree";

// Reproduces the legacy "Arbre Equipement" screen (Arbre_Equipement.cs)
// — a parent/child equipment hierarchy tree with search, a display-mode
// toggle (Désignation / Code Equipement / ID), and "Afficher Joints" (a
// toggle to a flat list of equipment with a PDF document attached).
//
// The real screen, and this page now too, lazy-loads each node's
// children on expand rather than loading the whole tree upfront — an
// earlier version fetched everything at once assuming the dataset was
// small, which made the page slow to load in practice. This page now
// only fetches root-level equipment; children are fetched on demand by
// the tree component via a server action.

export default async function EquipementsPage() {
  const [roots, pdfLinks] = await Promise.all([
    prisma.equipement.findMany({
      where: { deleted: false, idParent: null },
      select: { id: true, idParent: true, code: true, designation: true, ordre: true },
      orderBy: { ordre: "asc" },
    }),
    prisma.equipementPdf.findMany({ select: { idEquipement: true }, distinct: ["idEquipement"] }),
  ]);

  const pdfEquipIds = new Set(pdfLinks.map((p) => p.idEquipement));
  const rootNodes = roots.map((e) => ({
    id: e.id,
    idParent: e.idParent,
    code: e.code,
    designation: e.designation,
    hasPdf: pdfEquipIds.has(e.id),
  }));

  return (
    <>
      <PageHeader eyebrow="Maintenance" title="Arbre Equipement" hideBack />
      <div className="p-8">
        <EquipementTree roots={rootNodes} />
      </div>
    </>
  );
}
