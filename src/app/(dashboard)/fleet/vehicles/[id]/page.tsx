import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { addAssurance, addVignette, addVisiteTechnique, addEnginFichier, deleteEnginFichier } from "../../actions";
import { notFound } from "next/navigation";

export default async function VehicleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const engin = await prisma.engin.findUnique({
    where: { id },
    include: {
      typeVehicule: true,
      chauffeur: true,
      categorie: true,
      assurances: { orderBy: { dateExp: "desc" } },
      vignettes: { orderBy: { dateExp: "desc" } },
      visitesTechnique: { orderBy: { dateExp: "desc" } },
      fichiers: { orderBy: { id: "desc" } },
      sortiesCarburant: {
        include: { carburant: true },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  if (!engin) notFound();

  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow="Véhicule"
        title={`${engin.matricule ?? `ENG-${engin.id}`} — ${engin.designation}`}
      />
      <div className="p-8 max-w-3xl space-y-8">
        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row label="Marque" value={engin.marque ?? "—"} />
          <Row label="Type" value={engin.typeVehicule?.designation ?? "—"} />
          <Row label="Chauffeur" value={engin.chauffeur?.nom ?? "—"} />
          <Row label="Catégorie de charge" value={engin.categorie?.designation ?? "—"} />
          <Row label="N° carte carburant" value={engin.numCarte ?? "—"} />
          <Row label="Liaison" value={engin.liaison ?? "—"} />
        </div>

        <DocSection
          title="Assurance"
          docs={engin.assurances.map((a) => ({
            id: a.id,
            label: a.raisonSocial ?? "—",
            dateExp: a.dateExp,
            prix: a.prix,
          }))}
          action={addAssurance.bind(null, id)}
          now={now}
          extraField={{ name: "raisonSocial", label: "Compagnie", type: "text" }}
        />

        <DocSection
          title="Vignette"
          docs={engin.vignettes.map((v) => ({
            id: v.id,
            label: "Vignette",
            dateExp: v.dateExp,
            prix: v.prix,
          }))}
          action={addVignette.bind(null, id)}
          now={now}
        />

        <DocSection
          title="Visite technique"
          docs={engin.visitesTechnique.map((v) => ({
            id: v.id,
            label: v.typeVisite ?? "Visite technique",
            dateExp: v.dateExp,
            prix: v.prix,
          }))}
          action={addVisiteTechnique.bind(null, id)}
          now={now}
          extraField={{ name: "typeVisite", label: "Type de visite", type: "text" }}
        />

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Derniers pleins
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Carburant</th>
                  <th className="px-4 py-3 font-semibold w-24 text-right">Quantité</th>
                  <th className="px-4 py-3 font-semibold w-24 text-right">Compteur</th>
                </tr>
              </thead>
              <tbody>
                {engin.sortiesCarburant.map((s) => (
                  <tr key={s.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-muted font-mono text-xs">
                      {s.date.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5 text-ink">{s.carburant?.designation ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {s.quantite.toString()} L
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                      {s.compteur?.toString() ?? "—"}
                    </td>
                  </tr>
                ))}
                {engin.sortiesCarburant.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                      Aucun plein enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Fichiers joints
          </div>
          <form
            action={addEnginFichier.bind(null, id)}
            className="flex gap-2 mb-3"
          >
            <input
              type="text"
              name="adresse"
              placeholder="Chemin ou URL du document…"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>
          <div className="space-y-1.5">
            {engin.fichiers.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <a href={f.adresse ?? "#"} className="text-steel-600 hover:underline truncate max-w-[280px]">
                  {f.adresse}
                </a>
                <form action={deleteEnginFichier.bind(null, f.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    Supprimer
                  </button>
                </form>
              </div>
            ))}
            {engin.fichiers.length === 0 && (
              <div className="text-sm text-muted">Aucun fichier joint.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DocSection({
  title,
  docs,
  action,
  now,
  extraField,
}: {
  title: string;
  docs: { id: number; label: string; dateExp: Date; prix: unknown }[];
  action: (formData: FormData) => Promise<void>;
  now: string;
  extraField?: { name: string; label: string; type: string };
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {title}
      </div>
      <form
        action={action}
        className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
      >
        {extraField && (
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              {extraField.label}
            </label>
            <input
              type="text"
              name={extraField.name}
              className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Début <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateDeb"
            defaultValue={now}
            required
            className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Expiration <span className="text-urgent">*</span>
          </label>
          <input
            type="date"
            name="dateExp"
            required
            className="border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Prix
          </label>
          <input
            type="number"
            step="0.01"
            name="prix"
            className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
            Alerte (j)
          </label>
          <input
            type="number"
            name="notAvant"
            placeholder="30"
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

      <div className="flex flex-wrap gap-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <Nameplate>{d.label}</Nameplate>
            <span className="text-xs text-muted">
              exp. {d.dateExp.toLocaleDateString("fr-FR")}
            </span>
          </div>
        ))}
        {docs.length === 0 && <span className="text-sm text-muted">Aucun document.</span>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 px-4 py-3">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="col-span-2 text-sm text-ink">{value}</div>
    </div>
  );
}
