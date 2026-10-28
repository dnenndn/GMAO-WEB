import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import { registerSignature } from "../../actions";

export default async function SignatureSettingsPage() {
  const session = await getSession();
  const utilisateur = session
    ? await prisma.utilisateur.findUnique({
        where: { login: session.login },
        include: { signature: true },
      })
    : null;

  return (
    <>
      <PageHeader eyebrow="Sous-traitance — Paramètres" title="Ma signature" />
      <div className="p-8 max-w-md space-y-6">
        <p className="text-sm text-muted -mt-2">
          Code personnel requis pour signer une commande de
          sous-traitance en attente (confirmé dans le code source :{" "}
          <code className="font-mono">signature_commande_attente_st.cs</code>
          ). {utilisateur?.signature ? "Un code est déjà enregistré — le soumettre à nouveau le remplace." : "Aucun code enregistré pour le moment."}
        </p>

        <form
          action={registerSignature}
          className="bg-surface border border-hairline rounded p-4 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              Code de signature (min. 4 caractères) <span className="text-urgent">*</span>
            </label>
            <input
              type="password"
              name="pin"
              minLength={4}
              required
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
          <button
            type="submit"
            className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </>
  );
}
