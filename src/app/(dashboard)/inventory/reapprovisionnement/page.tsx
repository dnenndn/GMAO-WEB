import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth";
import {
  createReapprovisionnement,
  deactivateReapprovisionnement,
  createRecompletement,
  deactivateRecompletement,
  checkReapprovisionnementEcheances,
  checkRecompletementEcheances,
} from "../actions";

const PERIODES = ["Jour", "Semaine", "Mois", "Année"];

export default async function ReapprovisionnementPage() {
  const [reappros, recomplets, articles, session] = await Promise.all([
    prisma.acReapprovisionnement.findMany({
      where: { arr: false },
      include: { article: true, echeances: { orderBy: { dateEch: "desc" }, take: 3 } },
      orderBy: { id: "desc" },
    }),
    prisma.acRecompletement.findMany({
      where: { arr: false },
      include: { article: true, echeances: { orderBy: { dateEch: "desc" }, take: 3 } },
      orderBy: { id: "desc" },
    }),
    prisma.article.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    getSession(),
  ]);

  const isAdmin = session?.role === "Admin";
  const now = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Inventaire" title="Réapprovisionnement automatique" />
      <div className="p-8 space-y-10">
        <p className="text-sm text-muted max-w-2xl">
          Deux méthodes de réapprovisionnement récurrent : quantité fixe
          (Réapprovisionnement) ou remise à niveau (Recomplétement, sans
          quantité fixe). Chaque plan génère des échéances quand son cycle
          arrive à terme.
        </p>

        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">
              Réapprovisionnement (quantité fixe)
            </div>
            {isAdmin && (
              <form action={checkReapprovisionnementEcheances}>
                <button
                  type="submit"
                  className="bg-safety text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-safety/90 transition-colors"
                >
                  Vérifier les échéances
                </button>
              </form>
            )}
          </div>

          {isAdmin && (
            <form
              action={createReapprovisionnement}
              className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
            >
              <SelectField name="idArticle" label="Article" options={articles.map((a) => [a.id, a.designation])} />
              <NumberField name="qt" label="Quantité" />
              <NumberField name="delai" label="Délai" />
              <DateField name="dateDebut" label="Début" defaultValue={now} />
              <NumberField name="reccurence" label="Récurrence" />
              <SelectField name="periode" label="Période" options={PERIODES.map((p) => [p, p])} />
              <DateField name="dateLimite" label="Date limite (optionnel)" />
              <SubmitButton />
            </form>
          )}

          <PlanTable
            rows={reappros.map((p) => ({
              id: p.id,
              cols: [
                p.article.designation,
                p.qt.toString(),
                `${p.reccurence} / ${p.periode ?? "—"}`,
                p.echeances[0]?.dateEch.toLocaleDateString("fr-FR") ?? "—",
              ],
            }))}
            headers={["Article", "Quantité", "Récurrence", "Dernière échéance"]}
            isAdmin={isAdmin}
            deactivateAction={deactivateReapprovisionnement}
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">
              Recomplétement (remise à niveau)
            </div>
            {isAdmin && (
              <form action={checkRecompletementEcheances}>
                <button
                  type="submit"
                  className="bg-safety text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-safety/90 transition-colors"
                >
                  Vérifier les échéances
                </button>
              </form>
            )}
          </div>

          {isAdmin && (
            <form
              action={createRecompletement}
              className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
            >
              <SelectField name="idArticle" label="Article" options={articles.map((a) => [a.id, a.designation])} />
              <NumberField name="delai" label="Délai" />
              <DateField name="dateDebut" label="Début" defaultValue={now} />
              <NumberField name="reccurence" label="Récurrence" />
              <SelectField name="periode" label="Période" options={PERIODES.map((p) => [p, p])} />
              <DateField name="dateLimite" label="Date limite" required />
              <SubmitButton />
            </form>
          )}

          <PlanTable
            rows={recomplets.map((p) => ({
              id: p.id,
              cols: [
                p.article.designation,
                `${p.reccurence} / ${p.periode ?? "—"}`,
                p.dateLimite.toLocaleDateString("fr-FR"),
                p.echeances[0]?.dateEch.toLocaleDateString("fr-FR") ?? "—",
              ],
            }))}
            headers={["Article", "Récurrence", "Date limite", "Dernière échéance"]}
            isAdmin={isAdmin}
            deactivateAction={deactivateRecompletement}
          />
        </section>
      </div>
    </>
  );
}

function PlanTable({
  rows,
  headers,
  isAdmin,
  deactivateAction,
}: {
  rows: { id: number; cols: string[] }[];
  headers: string[];
  isAdmin: boolean;
  deactivateAction: (id: number) => Promise<void>;
}) {
  return (
    <div className="bg-surface border border-hairline rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
            {isAdmin && <th className="px-4 py-3 font-semibold w-20"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-hairline last:border-0">
              {r.cols.map((c, i) => (
                <td key={i} className="px-4 py-2.5 text-ink">
                  {c}
                </td>
              ))}
              {isAdmin && (
                <td className="px-4 py-2.5 text-right">
                  <form action={deactivateAction.bind(null, r.id)}>
                    <button type="submit" className="text-xs text-urgent hover:underline">
                      Désactiver
                    </button>
                  </form>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length + (isAdmin ? 1 : 0)} className="px-4 py-8 text-center text-muted text-sm">
                Aucun plan actif.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: [number | string, string][];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">{label}</label>
      <select name={name} className="border border-hairline rounded px-2 py-2 text-sm bg-surface">
        <option value="">—</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">{label} <span className="text-urgent">*</span></label>
      <input type="number" step="0.01" name={name} className="w-20 border border-hairline rounded px-2 py-2 text-sm bg-surface" />
    </div>
  );
}

function DateField({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">{label} <span className="text-urgent">*</span></label>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="border border-hairline rounded px-2 py-2 text-sm bg-surface"
      />
    </div>
  );
}

function SubmitButton() {
  return (
    <button
      type="submit"
      className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
    >
      Ajouter
    </button>
  );
}
