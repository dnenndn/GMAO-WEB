import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { SupplierTabs } from "@/components/SupplierTabs";
import {
  linkFournisseurActivite,
  unlinkFournisseurActivite,
  linkFournisseurCompte,
  unlinkFournisseurCompte,
  linkFournisseurDevise,
  unlinkFournisseurDevise,
  linkFournisseurLivraison,
  unlinkFournisseurLivraison,
  linkFournisseurReglement,
  unlinkFournisseurReglement,
  addFournisseurFichier,
  deleteFournisseurFichier,
} from "../../../actions";
import { notFound } from "next/navigation";

export default async function SupplierProfilPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [fournisseur, activites, comptes, devises, livraisons, reglements] = await Promise.all([
    prisma.fournisseur.findUnique({
      where: { id },
      include: {
        activites: { include: { activite: true } },
        comptes: { include: { compte: true } },
        devises: { include: { devise: true } },
        livraisons: { include: { livraison: true } },
        reglements: { include: { reglement: true } },
        fichiers: { orderBy: { id: "desc" } },
      },
    }),
    prisma.parametreActiviteFournisseur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreCompteFournisseur.findMany({ where: { deleted: false }, orderBy: { numero: "asc" } }),
    prisma.parametreDeviseFournisseur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreLivraisonFournisseur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreReglementFournisseur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  if (!fournisseur) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Fournisseur"
        title={`${fournisseur.codeFournisseur ?? `FRS-${fournisseur.id}`} — ${fournisseur.nom}`}
      />
      <SupplierTabs id={id} active="profil" />
      <div className="p-8 max-w-2xl space-y-8">
        <LinkSection
          title="Activités"
          items={fournisseur.activites.map((a) => ({ linkId: a.id, label: a.activite.designation }))}
          options={activites.map((a) => [a.id, a.designation] as const)}
          fieldName="idActivite"
          linkAction={linkFournisseurActivite.bind(null, id)}
          unlinkAction={unlinkFournisseurActivite}
          fournisseurId={id}
        />

        <LinkSection
          title="Comptes internes"
          items={fournisseur.comptes.map((c) => ({
            linkId: c.id,
            label: `N°${c.compte.numero} — ${c.compte.designation}`,
          }))}
          options={comptes.map((c) => [c.id, `N°${c.numero} — ${c.designation}`] as const)}
          fieldName="idCompte"
          linkAction={linkFournisseurCompte.bind(null, id)}
          unlinkAction={unlinkFournisseurCompte}
          fournisseurId={id}
        />

        <LinkSection
          title="Devises"
          items={fournisseur.devises.map((d) => ({ linkId: d.id, label: d.devise.designation }))}
          options={devises.map((d) => [d.id, d.designation] as const)}
          fieldName="idDevise"
          linkAction={linkFournisseurDevise.bind(null, id)}
          unlinkAction={unlinkFournisseurDevise}
          fournisseurId={id}
        />

        <LinkSection
          title="Conditions de livraison"
          items={fournisseur.livraisons.map((l) => ({ linkId: l.id, label: l.livraison.designation }))}
          options={livraisons.map((l) => [l.id, l.designation] as const)}
          fieldName="idLivraison"
          linkAction={linkFournisseurLivraison.bind(null, id)}
          unlinkAction={unlinkFournisseurLivraison}
          fournisseurId={id}
        />

        <LinkSection
          title="Conditions de règlement"
          items={fournisseur.reglements.map((r) => ({ linkId: r.id, label: r.reglement.designation }))}
          options={reglements.map((r) => [r.id, r.designation] as const)}
          fieldName="idReglement"
          linkAction={linkFournisseurReglement.bind(null, id)}
          unlinkAction={unlinkFournisseurReglement}
          fournisseurId={id}
        />

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Documents joints
          </div>
          <form action={addFournisseurFichier.bind(null, id)} className="flex gap-2 mb-3">
            <input
              type="text"
              name="adresse"
              required
              placeholder="Chemin ou URL du document"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
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
                {fournisseur.fichiers.map((f) => (
                  <tr key={f.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5">
                      <a href={f.adresse} className="text-steel-600 hover:underline">
                        {f.adresse}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-right w-20">
                      <form action={deleteFournisseurFichier.bind(null, f.id, id)}>
                        <button type="submit" className="text-xs text-urgent hover:underline">
                          Supprimer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {fournisseur.fichiers.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-muted text-sm">
                      Aucun document joint.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function LinkSection({
  title,
  items,
  options,
  fieldName,
  linkAction,
  unlinkAction,
  fournisseurId,
}: {
  title: string;
  items: { linkId: number; label: string }[];
  options: readonly (readonly [number, string])[];
  fieldName: string;
  linkAction: (formData: FormData) => Promise<void>;
  unlinkAction: (id: number, fournisseurId: number) => Promise<void>;
  fournisseurId: number;
}) {
  return (
    <section>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{title}</div>
      <form action={linkAction} className="flex gap-2 mb-3">
        <select
          name={fieldName}
          required
          className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
        >
          <option value="">Sélectionner…</option>
          {options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-2 hover:bg-paper transition-colors"
        >
          Associer
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={item.linkId} className="flex items-center gap-1.5">
            <Nameplate>{item.label}</Nameplate>
            <form action={unlinkAction.bind(null, item.linkId, fournisseurId)}>
              <button type="submit" className="text-xs text-urgent hover:underline">
                ×
              </button>
            </form>
          </div>
        ))}
        {items.length === 0 && <span className="text-sm text-muted">Aucune association.</span>}
      </div>
    </section>
  );
}
