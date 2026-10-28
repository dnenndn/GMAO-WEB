import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { addOperationMaintenance, removeOperationMaintenance } from "../../../actions";
import { notFound } from "next/navigation";

export default async function InterventionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const intervention = await prisma.parametreIntervention.findUnique({
    where: { id },
    include: { operations: { where: { deleted: false }, orderBy: { id: "asc" } } },
  });

  if (!intervention) notFound();

  return (
    <>
      <PageHeader eyebrow="Type d'intervention" title={intervention.intervention} />
      <div className="p-8 max-w-2xl space-y-6">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Checklist d&apos;opérations
        </div>
        <form
          action={addOperationMaintenance.bind(null, id)}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap"
        >
          <div className="w-28">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="code"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Désignation <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="designation"
              required
              placeholder="ex : Vérifier niveau d'huile"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Type <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="type"
              required
              placeholder="ex : Contrôle"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Ajouter
          </button>
        </form>

        <div className="bg-surface border border-hairline rounded overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {intervention.operations.map((o) => (
                <tr key={o.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-muted text-xs">{o.code}</td>
                  <td className="px-4 py-2.5 text-ink">{o.designation}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{o.type}</td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={removeOperationMaintenance.bind(null, o.id, id)}>
                      <button type="submit" className="text-xs text-urgent hover:underline">
                        Supprimer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {intervention.operations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    Aucune opération définie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
