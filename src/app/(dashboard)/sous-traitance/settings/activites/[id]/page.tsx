import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import {
  linkActiviteFamille,
  unlinkActiviteFamille,
  linkActiviteSousFamille,
  unlinkActiviteSousFamille,
  addActiviteOperation,
  removeActiviteOperation,
} from "../../../actions";
import { notFound } from "next/navigation";

export default async function ActiviteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [activite, familles, sousFamilles] = await Promise.all([
    prisma.activiteSousTraitance.findUnique({
      where: { id },
      include: {
        familles: { include: { famille: true } },
        sousFamilles: { include: { sousFamille: true } },
        operations: { orderBy: { id: "asc" } },
      },
    }),
    prisma.famille.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.sousFamille.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
  ]);

  if (!activite) notFound();

  return (
    <>
      <PageHeader eyebrow="Sous-traitance — Activité" title={activite.designation} />
      <div className="p-8 max-w-2xl space-y-8">
        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Familles concernées
          </div>
          <form action={linkActiviteFamille.bind(null, id)} className="flex gap-2 mb-3">
            <select
              name="idFamille"
              required
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {familles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.designation}
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
            {activite.familles.map((af) => (
              <div key={af.id} className="flex items-center gap-1.5">
                <Nameplate>{af.famille.designation}</Nameplate>
                <form action={unlinkActiviteFamille.bind(null, af.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {activite.familles.length === 0 && (
              <span className="text-sm text-muted">Aucune association.</span>
            )}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Sous-familles concernées
          </div>
          <form action={linkActiviteSousFamille.bind(null, id)} className="flex gap-2 mb-3">
            <select
              name="idSousFamille"
              required
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            >
              <option value="">Sélectionner…</option>
              {sousFamilles.map((sf) => (
                <option key={sf.id} value={sf.id}>
                  {sf.designation}
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
            {activite.sousFamilles.map((asf) => (
              <div key={asf.id} className="flex items-center gap-1.5">
                <Nameplate>{asf.sousFamille.designation}</Nameplate>
                <form action={unlinkActiviteSousFamille.bind(null, asf.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    ×
                  </button>
                </form>
              </div>
            ))}
            {activite.sousFamilles.length === 0 && (
              <span className="text-sm text-muted">Aucune association.</span>
            )}
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Opérations
          </div>
          <form action={addActiviteOperation.bind(null, id)} className="flex gap-2 mb-3">
            <input
              type="text"
              name="operation"
              required
              placeholder="Ajouter une opération…"
              className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
            />
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>
          <div className="space-y-2">
            {activite.operations.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm border-l-2 border-hairline pl-3">
                <span className="text-ink">{o.operation}</span>
                <form action={removeActiviteOperation.bind(null, o.id, id)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    Supprimer
                  </button>
                </form>
              </div>
            ))}
            {activite.operations.length === 0 && (
              <div className="text-sm text-muted">Aucune opération définie.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
