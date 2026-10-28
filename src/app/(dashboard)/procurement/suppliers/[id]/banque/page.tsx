import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SupplierTabs } from "@/components/SupplierTabs";
import { updateFournisseurBanque } from "../../../actions";
import { notFound } from "next/navigation";

export default async function SupplierBanquePage({
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
      <SupplierTabs id={id} active="banque" />
      <form
        action={updateFournisseurBanque.bind(null, id)}
        className="p-8 max-w-2xl space-y-5"
      >
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Banque
          </label>
          <input
            type="text"
            name="nomBanque"
            defaultValue={fournisseur.nomBanque ?? ""}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Domiciliation
          </label>
          <input
            type="text"
            name="domiciliation"
            defaultValue={fournisseur.domiciliation ?? ""}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              IBAN
            </label>
            <input
              type="text"
              name="iban"
              defaultValue={fournisseur.iban ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              RIB
            </label>
            <input
              type="text"
              name="rib"
              defaultValue={fournisseur.rib ?? ""}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            FODEC (%)
          </label>
          <input
            type="number"
            step="0.01"
            name="fodec"
            defaultValue={fournisseur.fodec?.toString() ?? ""}
            className="w-32 border border-hairline rounded px-3 py-2 text-sm bg-surface"
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
