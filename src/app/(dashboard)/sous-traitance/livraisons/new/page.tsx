import { PageHeader } from "@/components/PageHeader";
import { createLivraison } from "../../actions";

export default function NewLivraisonPage({
  searchParams,
}: {
  searchParams: { idCommande?: string };
}) {
  const now = new Date().toISOString().slice(0, 10);
  const idCommande = searchParams.idCommande ?? "";

  return (
    <>
      <PageHeader eyebrow="Sous-traitance" title="Nouveau bon de livraison" />
      <form action={createLivraison} className="p-8 max-w-md space-y-5">
        <input type="hidden" name="idCommande" value={idCommande} />
        {idCommande && (
          <p className="text-sm text-muted -mt-2">
            Cette livraison sera liée à la commande #{idCommande}.
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Date <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateLivraison"
            defaultValue={now}
            required
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Livré par
          </label>
          <input
            type="text"
            name="livraisonPar"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            N° BL fournisseur
          </label>
          <input
            type="text"
            name="blFournisseur"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer la livraison
          </button>
        </div>
      </form>
    </>
  );
}
