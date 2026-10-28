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

// A dedicated tab for 3D part models, pulled out of the general
// Documents list (which still shows these too) so the feature is
// actually discoverable rather than buried among PDFs and other
// attachments. Reuses the same equipement_pdf storage and the same
// addEquipementPdf/deleteEquipementPdf actions — a 3D model is just a
// document whose path happens to end in .glb/.gltf/.stl; no separate
// table or upload mechanism was needed.
export default async function Equipement3DPage({
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

  const models = equipement.pdfs.filter((p) => is3DModel(p.adresse));

  return (
    <>
      <PageHeader eyebrow="Équipement" title={equipement.designation} />
      <EquipementTabs id={id} active="3d" />
      <div className="p-8 max-w-3xl space-y-6">
        <form action={addEquipementPdf.bind(null, id)} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Chemin ou URL du modèle 3D <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="adresse"
              required
              placeholder="ex : models/piece-76.stl ou models/piece-76.glb"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <p className="text-xs text-muted mt-1">
              Seuls les fichiers .glb, .gltf et .stl s&apos;affichent ici. Un
              fichier .SLDPRT ne peut pas s&apos;afficher directement dans le
              navigateur — exportez-le d&apos;abord depuis SolidWorks vers
              l&apos;un de ces formats, puis placez-le quelque part accessible
              par le serveur (ex : le dossier public/models de
              l&apos;application) avant de coller son chemin ici.
            </p>
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors shrink-0"
          >
            Ajouter
          </button>
        </form>

        {models.length === 0 ? (
          <div className="bg-surface border border-hairline rounded px-4 py-12 text-center text-muted text-sm">
            Aucun modèle 3D pour cet équipement.
          </div>
        ) : (
          <div className="space-y-6">
            {models.map((m) => (
              <div key={m.id} className="bg-surface border border-hairline rounded overflow-hidden">
                <div className="px-4 py-2.5 border-b border-hairline flex items-center justify-between">
                  <span className="text-sm text-ink font-mono">{m.adresse}</span>
                  <form action={deleteEquipementPdf.bind(null, m.id, id)}>
                    <button type="submit" className="text-xs text-urgent hover:underline">
                      Supprimer
                    </button>
                  </form>
                </div>
                <Model3DViewer url={m.adresse} className="h-[500px]" />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
