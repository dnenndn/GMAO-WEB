import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createDsFacture } from "../../actions";

export default async function NewDsFacturePage() {
  const [fournisseurs, bonsLivraisonNonFactures] = await Promise.all([
    prisma.fournisseur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
    prisma.dsBonLivraison.findMany({
      where: { factures: { none: {} } },
      include: { commande: true },
      orderBy: { dateLivraison: "desc" },
    }),
  ]);
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Nouvelle facture" />
      <form action={createDsFacture} className="p-8 max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Fournisseur <span className="text-urgent">*</span>
            </label>
            <select
              name="idFournisseur"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              N° Facture
            </label>
            <input
              type="text"
              name="nFacture"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Date <span className="text-urgent">*</span>
            </label>
            <input
              type="date"
              name="dateFacture"
              defaultValue={now}
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              TVA (%) <span className="text-urgent">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="tva"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Bons de livraison à rattacher
          </label>
          <select
            name="idsLivraisons"
            multiple
            size={8}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          >
            {bonsLivraisonNonFactures.map((bl) => (
              <option key={bl.id} value={bl.id}>
                BL-{String(bl.id).padStart(4, "0")} —{" "}
                {bl.dateLivraison.toLocaleDateString("fr-FR")}
                {bl.blFournisseur ? ` (${bl.blFournisseur})` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1">
            Seuls les bons de livraison pas encore facturés sont proposés.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer la facture
          </button>
        </div>
      </form>
    </>
  );
}
