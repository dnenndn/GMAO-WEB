import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SupplierTabs } from "@/components/SupplierTabs";
import { updateFournisseurAdresse } from "../../../actions";
import { notFound } from "next/navigation";

export default async function SupplierAdressePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const fournisseur = await prisma.fournisseur.findUnique({ where: { id } });
  if (!fournisseur) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Fournisseur"
        title={`${fournisseur.codeFournisseur ?? `FRS-${fournisseur.id}`} — ${fournisseur.nom}`}
      />
      <SupplierTabs id={id} active="adresse" />
      <form
        action={updateFournisseurAdresse.bind(null, id)}
        className="p-8 max-w-2xl space-y-5"
      >
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Adresse
          </label>
          <input
            type="text"
            name="adresse"
            defaultValue={fournisseur.adresse ?? ""}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Ville
            </label>
            <input
              type="text"
              name="ville"
              defaultValue={fournisseur.ville ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code postal
            </label>
            <input
              type="text"
              name="codePostal"
              defaultValue={fournisseur.codePostal ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Pays
            </label>
            <input
              type="text"
              name="pays"
              defaultValue={fournisseur.pays ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Téléphone (1)
            </label>
            <input
              type="text"
              name="telephone1"
              defaultValue={fournisseur.telephone1 ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Téléphone (2)
            </label>
            <input
              type="text"
              name="telephone2"
              defaultValue={fournisseur.telephone2 ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Fax (1)
            </label>
            <input
              type="text"
              name="fax1"
              defaultValue={fournisseur.fax1 ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Fax (2)
            </label>
            <input
              type="text"
              name="fax2"
              defaultValue={fournisseur.fax2 ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Site web
          </label>
          <input
            type="text"
            name="siteWeb"
            defaultValue={fournisseur.siteWeb ?? ""}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </>
  );
}
