import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import {
  addGammeRessourceFonction,
  removeGammeRessourceFonction,
  addGammeRessourceOutillage,
  removeGammeRessourceOutillage,
  addGammeRessourcePdr,
  removeGammeRessourcePdr,
  linkGammeCentreCharge,
  unlinkGammeCentreCharge,
} from "../../actions";
import { notFound } from "next/navigation";

export default async function GammeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const [gamme, fonctions, types, articles, centresCharge] = await Promise.all([
    prisma.gammeOperatoire.findUnique({
      where: { id },
      include: {
        ressourcesFonction: { include: { fonction: true } },
        ressourcesOutillage: { include: { type: true } },
        ressourcesPdr: { include: { article: true } },
        centresCharge: { include: { centreCharge: true } },
      },
    }),
    prisma.fonctionIntervenant.findMany({ orderBy: { designation: "asc" } }),
    prisma.tabType.findMany({ orderBy: { designation: "asc" } }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.parametreCentreCharge.findMany({ orderBy: { designation: "asc" } }),
  ]);

  if (!gamme) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Gamme opératoire"
        title={`${gamme.code ?? `GAM-${gamme.id}`} — ${gamme.designation}`}
      />
      <div className="p-8 max-w-3xl space-y-8">
        <div className="text-xs text-muted">
          {gamme.type ?? "—"} · durée {gamme.duree ?? "—"}h
        </div>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Personnel requis
          </div>
          <form
            action={addGammeRessourceFonction.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Fonction <span className="text-urgent">*</span>
              </label>
              <select
                name="idFonction"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {fonctions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Nb requis
              </label>
              <input
                type="number"
                name="nbreRequis"
                defaultValue={1}
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Délai planif. (min)
              </label>
              <input
                type="number"
                name="minPlanif"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Type coût
              </label>
              <select
                name="typeCout"
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="Interne">Interne</option>
                <option value="Externe">Externe</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Ajouter
            </button>
          </form>
          <ResourceList
            rows={gamme.ressourcesFonction.map((r) => ({
              id: r.id,
              label: `${r.fonction.designation} — ${r.nbreRequis}x (${r.typeCout})`,
            }))}
            removeAction={removeGammeRessourceFonction}
            gammeId={id}
          />
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Outillage requis
          </div>
          <form
            action={addGammeRessourceOutillage.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Type d&apos;outil <span className="text-urgent">*</span>
              </label>
              <select
                name="idType"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Quantité
              </label>
              <input
                type="number"
                name="quantite"
                defaultValue={1}
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
          <ResourceList
            rows={gamme.ressourcesOutillage.map((r) => ({
              id: r.id,
              label: `${r.type.designation} — ${r.quantite}x`,
            }))}
            removeAction={removeGammeRessourceOutillage}
            gammeId={id}
          />
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Pièces de rechange requises
          </div>
          <form
            action={addGammeRessourcePdr.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Article <span className="text-urgent">*</span>
              </label>
              <select
                name="idArticle"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codeArticle ? `${a.codeArticle} — ` : ""}
                    {a.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Quantité
              </label>
              <input
                type="number"
                step="0.01"
                name="quantite"
                defaultValue={1}
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
          <ResourceList
            rows={gamme.ressourcesPdr.map((r) => ({
              id: r.id,
              label: `${r.article.designation} — ${r.quantite.toString()}x`,
            }))}
            removeAction={removeGammeRessourcePdr}
            gammeId={id}
          />
        </section>

        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Centre de charge
          </div>
          <form
            action={linkGammeCentreCharge.bind(null, id)}
            className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Centre de charge <span className="text-urgent">*</span>
              </label>
              <select
                name="idCentreCharge"
                required
                className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="">Sélectionner…</option>
                {centresCharge.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.designation}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
            >
              Associer
            </button>
          </form>
          <ResourceList
            rows={gamme.centresCharge.map((c) => ({
              id: c.id,
              label: c.centreCharge?.designation ?? `Centre #${c.idCentreCharge}`,
            }))}
            removeAction={unlinkGammeCentreCharge}
            gammeId={id}
          />
        </section>
      </div>
    </>
  );
}

function ResourceList({
  rows,
  removeAction,
  gammeId,
}: {
  rows: { id: number; label: string }[];
  removeAction: (id: number, gammeId: number) => Promise<void>;
  gammeId: number;
}) {
  return (
    <div className="bg-surface border border-hairline rounded overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-hairline last:border-0">
              <td className="px-4 py-2.5 text-ink">{r.label}</td>
              <td className="px-4 py-2.5 text-right w-20">
                <form action={removeAction.bind(null, r.id, gammeId)}>
                  <button type="submit" className="text-xs text-urgent hover:underline">
                    Retirer
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-8 text-center text-muted text-sm">
                Aucune ressource définie.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
