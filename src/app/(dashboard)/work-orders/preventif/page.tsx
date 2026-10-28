import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { getSession } from "@/lib/auth";
import {
  generateSystematiquePlans,
  generateCompteurPlans,
  evaluateConditionnellePlan,
  createPrevSystematique,
  deactivatePrevSystematique,
  createPrevConditionnelle,
  deactivatePrevConditionnelle,
  createPrevCompteur,
  deactivatePrevCompteur,
} from "../actions";

export default async function PreventifPage() {
  const [systematiques, conditionnelles, compteurs, gammes, equipements, compteursRef, session] =
    await Promise.all([
      prisma.prevSystematique.findMany({ where: { arr: false }, orderBy: { id: "desc" } }),
      prisma.prevConditionnelle.findMany({ where: { arr: false }, orderBy: { id: "desc" } }),
      prisma.prevCompteur.findMany({
        where: { arr: false },
        include: { compteur: true },
        orderBy: { id: "desc" },
      }),
      prisma.gammeOperatoire.findMany({ orderBy: { designation: "asc" } }),
      prisma.equipement.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
      prisma.equipementCompteur.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
      getSession(),
    ]);

  const isAdmin = session?.role === "Admin";
  const equipementById = new Map(equipements.map((e): [number, typeof e] => [e.id, e]));
  const gammeById = new Map(gammes.map((g): [number, typeof g] => [g.id, g]));

  return (
    <>
      <PageHeader eyebrow="Maintenance" title="Plans préventifs" />
      <div className="p-8 space-y-10">
        <p className="text-sm text-muted max-w-2xl">
          Reconstruit à partir de <code>lancement_ot_preventive.cs</code>.
          Trois mécanismes de déclenchement indépendants : systématique
          (calendaire), par compteur (seuil équipement), et conditionnelle
          (relevé manuel). Voir la spec du module pour le détail des
          hypothèses.
        </p>

        {/* Systématique */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">
              Préventive systématique
            </div>
            {isAdmin && (
              <form action={generateSystematiquePlans}>
                <button
                  type="submit"
                  className="bg-safety text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-safety/90 transition-colors"
                >
                  Générer les OT dus
                </button>
              </form>
            )}
          </div>

          {isAdmin && (
            <form
              action={createPrevSystematique}
              className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
            >
              <SelectField name="idGamme" label="Gamme" options={gammes.map((g) => [g.id, g.designation])} />
              <SelectField
                name="equipement"
                label="Équipement"
                options={equipements.map((e) => [e.id, e.designation])}
              />
              <NumberField name="frequence" label="Fréquence" width="w-20" />
              <SelectField
                name="periode"
                label="Période"
                options={[
                  ["Jour", "Jour"],
                  ["Semaine", "Semaine"],
                  ["Mois", "Mois"],
                  ["Année", "Année"],
                ]}
              />
              <DateField name="dateDebut" label="Début" />
              <NumberField name="lancerOtAvant" label="Lancer avant (j)" width="w-28" />
              <SubmitButton />
            </form>
          )}

          <PlanTable
            rows={systematiques.map((p) => ({
              id: p.id,
              cols: [
                gammeById.get(p.idGamme ?? -1)?.designation ?? "—",
                equipementById.get(p.equipement ?? -1)?.designation ?? "—",
                `${p.frequence ?? "—"} / ${p.periode ?? "—"}`,
                p.lancerOtAvant != null ? `${p.lancerOtAvant} j avant` : "—",
              ],
            }))}
            headers={["Gamme", "Équipement", "Fréquence", "Lancement"]}
            isAdmin={isAdmin}
            deactivateAction={deactivatePrevSystematique}
          />
        </section>

        {/* Compteur */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide">
              Préventive par compteur
            </div>
            {isAdmin && (
              <form action={generateCompteurPlans}>
                <button
                  type="submit"
                  className="bg-safety text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-safety/90 transition-colors"
                >
                  Évaluer et générer
                </button>
              </form>
            )}
          </div>

          {isAdmin && (
            <form
              action={createPrevCompteur}
              className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
            >
              <SelectField name="idGamme" label="Gamme" options={gammes.map((g) => [g.id, g.designation])} />
              <SelectField
                name="equipement"
                label="Équipement"
                options={equipements.map((e) => [e.id, e.designation])}
              />
              <SelectField
                name="idCompteur"
                label="Compteur"
                options={compteursRef.map((c) => [c.id, c.designation ?? `#${c.id}`])}
              />
              <SelectField
                name="typeValeur"
                label="Condition"
                options={[
                  ["Sup", "≥ seuil"],
                  ["Inf", "≤ seuil"],
                ]}
              />
              <NumberField name="valeurLancement" label="Seuil" width="w-24" />
              <SelectField
                name="reinitialisation"
                label="Réinit."
                options={[
                  ["Non", "Non"],
                  ["Oui", "Oui"],
                ]}
              />
              <NumberField name="initial" label="Val. réinit." width="w-24" />
              <SelectField
                name="typeInitial"
                label="Timing réinit."
                options={[
                  ["Au Lancement de l'OT", "Au lancement"],
                  ["A la Clôture", "À la clôture"],
                ]}
              />
              <SubmitButton />
            </form>
          )}

          <PlanTable
            rows={compteurs.map((p) => ({
              id: p.id,
              cols: [
                gammeById.get(p.idGamme ?? -1)?.designation ?? "—",
                equipementById.get(p.equipement ?? -1)?.designation ?? "—",
                p.compteur?.designation ?? "—",
                `${p.typeValeur === "Sup" ? "≥" : "≤"} ${p.valeurLancement?.toString() ?? "—"} (actuel: ${p.compteur?.valeurActuelle?.toString() ?? "—"})`,
              ],
            }))}
            headers={["Gamme", "Équipement", "Compteur", "Condition"]}
            isAdmin={isAdmin}
            deactivateAction={deactivatePrevCompteur}
          />
        </section>

        {/* Conditionnelle */}
        <section>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Préventive conditionnelle
          </div>

          {isAdmin && (
            <form
              action={createPrevConditionnelle}
              className="bg-surface border border-hairline rounded p-4 flex gap-3 items-end flex-wrap mb-3"
            >
              <SelectField name="idGamme" label="Gamme" options={gammes.map((g) => [g.id, g.designation])} />
              <SelectField
                name="equipement"
                label="Équipement"
                options={equipements.map((e) => [e.id, e.designation])}
              />
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                  Mesure
                </label>
                <input
                  type="text"
                  name="mesure"
                  placeholder="ex : Vibration palier moteur"
                  className="w-full border border-hairline rounded px-2 py-2 text-sm bg-surface"
                />
              </div>
              <div className="w-20">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                  Unité
                </label>
                <input
                  type="text"
                  name="unite"
                  placeholder="mm/s"
                  className="w-full border border-hairline rounded px-2 py-2 text-sm bg-surface"
                />
              </div>
              <SelectField
                name="typeValeur"
                label="Condition"
                options={[
                  ["Sup", "≥ seuil"],
                  ["Inf", "≤ seuil"],
                ]}
              />
              <NumberField name="valeurLancement" label="Seuil" width="w-24" />
              <SubmitButton />
            </form>
          )}

          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Mesure</th>
                  <th className="px-4 py-3 font-semibold">Équipement</th>
                  <th className="px-4 py-3 font-semibold">Condition</th>
                  <th className="px-4 py-3 font-semibold w-40">Relevé manuel</th>
                  {isAdmin && <th className="px-4 py-3 font-semibold w-20"></th>}
                </tr>
              </thead>
              <tbody>
                {conditionnelles.map((p) => (
                  <tr key={p.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-2.5 text-ink">
                      {p.mesure ?? gammeById.get(p.idGamme ?? -1)?.designation ?? "—"}
                      {p.unite && <span className="text-muted text-xs"> ({p.unite})</span>}
                    </td>
                    <td className="px-4 py-2.5 text-ink">
                      {equipementById.get(p.equipement ?? -1)?.designation ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink">
                      {p.typeValeur === "Sup" ? "≥" : "≤"} {p.valeurLancement?.toString() ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <form
                        action={evaluateConditionnellePlan.bind(null, p.id)}
                        className="flex gap-1"
                      >
                        <input
                          type="number"
                          step="0.01"
                          name="valeur"
                          required
                          className="w-20 border border-hairline rounded px-2 py-1 text-xs font-mono bg-surface"
                        />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-2 py-1 hover:bg-paper transition-colors"
                        >
                          Évaluer
                        </button>
                      </form>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        <form action={deactivatePrevConditionnelle.bind(null, p.id)}>
                          <button type="submit" className="text-xs text-urgent hover:underline">
                            Désactiver
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
                {conditionnelles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                      Aucun plan conditionnel actif.
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
              <td
                colSpan={headers.length + (isAdmin ? 1 : 0)}
                className="px-4 py-8 text-center text-muted text-sm"
              >
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
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <select
        name={name}
        className="border border-hairline rounded px-2 py-2 text-sm bg-surface"
      >
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

function NumberField({
  name,
  label,
  width = "w-20",
}: {
  name: string;
  label: string;
  width?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type="number"
        step="0.01"
        name={name}
        className={`${width} border border-hairline rounded px-2 py-2 text-sm bg-surface`}
      />
    </div>
  );
}

function DateField({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type="date"
        name={name}
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
