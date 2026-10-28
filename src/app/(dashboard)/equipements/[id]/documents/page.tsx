import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { EquipementTabs } from "@/components/EquipementTabs";
import { Model3DViewer } from "@/components/Model3DViewer";
import { addEquipementPdf, deleteEquipementPdf } from "../../actions";
import { notFound } from "next/navigation";

const MODEL_3D_EXTENSIONS = ["glb", "gltf", "stl"];

function is3DModel(adresse: string): boolean {
  const ext = adresse.split(".").pop()?.toLowerCase();
  return !!ext && MODEL_3D_EXTENSIONS.includes(ext);
}

export default async function EquipementDocumentsPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const equipement = await prisma.equipement.findUnique({
    where: { id },
    include: { pdfs: { orderBy: { id: "desc" } } },
  });

  if (!equipement) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Équipement"
        title={`${equipement.code ?? `EQ-${equipement.id}`} — ${equipement.designation}`}
      />
      <EquipementTabs id={id} active="documents" />
      <div className="p-8 max-w-2xl space-y-6">
        <form
          action={addEquipementPdf.bind(null, id)}
          className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end"
        >
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Chemin ou URL du document <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="adresse"
              required
              placeholder="ex : manuels/moteur-x200.pdf ou pieces/76-axe.glb"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <p className="text-xs text-muted mt-1">
              Les fichiers .glb, .gltf et .stl s&apos;affichent comme un modèle 3D
              interactif ci-dessous. Un fichier .SLDPRT ne peut pas s&apos;afficher
              directement dans le navigateur — exportez-le d&apos;abord depuis
              SolidWorks vers l&apos;un de ces formats.
            </p>
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
              {equipement.pdfs.map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0 align-top">
                  <td className="px-4 py-2.5">
                    <a href={p.adresse} className="text-steel-600 hover:underline">
                      {p.adresse}
                    </a>
                    {is3DModel(p.adresse) && (
                      <div className="mt-2">
                        <Model3DViewer url={p.adresse} className="h-80 max-w-lg" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right w-20">
                    <form action={deleteEquipementPdf.bind(null, p.id, id)}>
                      <button type="submit" className="text-xs text-urgent hover:underline">
                        Supprimer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {equipement.pdfs.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">
                    Aucun document joint.
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
