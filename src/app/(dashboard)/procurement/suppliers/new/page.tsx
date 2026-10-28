import { PageHeader } from "@/components/PageHeader";
import { createFournisseur } from "../../actions";

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader eyebrow="Achats" title="Nouveau fournisseur" />
      <form action={createFournisseur} className="p-8 max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code fournisseur
            </label>
            <input
              type="text"
              name="codeFournisseur"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Nom <span className="text-urgent">*</span>
            </label>
            <input
              type="text"
              name="nom"
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Activité
            </label>
            <input
              type="text"
              name="activite"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Téléphone
            </label>
            <input
              type="text"
              name="telephone1"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Ville
            </label>
            <input
              type="text"
              name="ville"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Adresse
          </label>
          <input
            type="text"
            name="adresse"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Pays
            </label>
            <input
              type="text"
              name="pays"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code Postal
            </label>
            <input
              type="text"
              name="codePostal"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="flex gap-6 text-sm items-center">
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">Type</span>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="type" value="Fournisseur" defaultChecked /> Fournisseur
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="type" value="Sous_Traitant" /> Sous-Traitant
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Commentaire
          </label>
          <textarea
            name="commentaire"
            rows={3}
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>

        <div className="grid grid-cols-4 gap-5">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Délai (jours)
            </label>
            <input
              type="number"
              name="delai"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              TVA par défaut (%)
            </label>
            <input
              type="number"
              step="0.01"
              name="tvaDefaut"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Fodec (%)
            </label>
            <input
              type="number"
              step="0.01"
              name="fodec"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Remise par défaut (%)
            </label>
            <input
              type="number"
              step="0.01"
              name="remiseDefaut"
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-safety/90 transition-colors"
          >
            Créer le fournisseur
          </button>
        </div>
      </form>
    </>
  );
}
