import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { Nameplate } from "@/components/Nameplate";
import { budgetPeriodEnd, BUDGET_DUREES } from "@/lib/constants";
import {
  addBudgetCategorie,
  removeBudgetCategorie,
  addBudgetFournisseur,
  removeBudgetFournisseur,
  updateBudget,
} from "../actions";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

// FIXED — see src/lib/budgetSpend.ts for the full account: this was
// filtering statut IN ("En cours", "Clôturée") and using date_signature,
// but the real source (liste_budget_general_tous.cs) filters
// commande.statut = 0 ("En attente") and uses commande.date_commande.
// This page keeps its own query (rather than the shared
// computeBudgetSpend helper) since it needs the actual line-item rows
// with commande/daArticle included for display, not just the total.

export default async function BudgetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: {
      categories: { include: { famille: true } },
      fournisseurs: { include: { fournisseur: true } },
    },
  });

  if (!budget) notFound();

  const periodStart = budget.dateCreation;
  const periodEnd = budgetPeriodEnd(periodStart, budget.duree);

  // Live variance computation — same aggregation the legacy app runs
  // against commande_article/commande, no separate spend ledger.
  const lignes = await prisma.commandeArticle.findMany({
    where: {
      commande: {
        dateCommande: { gte: periodStart, lte: periodEnd },
        statut: "En attente",
        ...(budget.fournisseurChoix && budget.fournisseurs.length > 0
          ? { idFournisseur: { in: budget.fournisseurs.map((f) => f.idFournisseur) } }
          : {}),
      },
      ...(budget.categorieChoix && budget.categories.length > 0
        ? {
            daArticle: {
              article: {
                sousFamilles: {
                  some: {
                    sousFamille: {
                      idFamille: { in: budget.categories.map((c) => c.idCategorie) },
                    },
                  },
                },
              },
            },
          }
        : {}),
    },
    include: { commande: { include: { fournisseur: true } }, daArticle: { include: { article: true } } },
  });

  const totalDepense = lignes.reduce((acc, l) => {
    const brut = Number(l.qtCommande) * Number(l.prixHt ?? 0);
    const remise = brut * (Number(l.remise ?? 0) / 100);
    return acc + (brut - remise);
  }, 0);

  const montant = Number(budget.montant);
  const restant = montant - totalDepense;
  const pctConsomme = montant > 0 ? (totalDepense / montant) * 100 : 0;

  const [familles, fournisseurs] = await Promise.all([
    prisma.famille.findMany({ where: { deleted: false }, orderBy: { designation: "asc" } }),
    prisma.fournisseur.findMany({ where: { deleted: false }, orderBy: { nom: "asc" } }),
  ]);

  const session = await getSession();
  const isAdmin = session?.role === "Admin";

  return (
    <>
      <PageHeader eyebrow="Budget" title={budget.nom} />
      <div className="p-8 max-w-3xl space-y-8">
        <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
          <Row
            label="Période en cours"
            value={`${periodStart.toLocaleDateString("fr-FR")} → ${periodEnd.toLocaleDateString("fr-FR")}`}
          />
          <Row
            label="Portée"
            value={
              budget.categorieChoix ? "Par catégorie" : budget.fournisseurChoix ? "Par fournisseur" : "Global"
            }
          />
        </div>

        {isAdmin ? (
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Modifier
            </div>
            <p className="text-xs text-muted mb-3">
              La date de début et la portée (catégorie/fournisseur/global)
              ne sont pas modifiables après création — elles ancrent le
              calcul de la période et de la variance en cours.
            </p>
            <form
              action={updateBudget.bind(null, id)}
              className="bg-surface border border-hairline rounded p-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                  Nom <span className="text-urgent">*</span>
                </label>
                <input
                  type="text"
                  name="nom"
                  defaultValue={budget.nom}
                  required
                  className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={budget.description ?? ""}
                  rows={2}
                  className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                    Récurrence
                  </label>
                  <select
                    name="duree"
                    defaultValue={budget.duree}
                    className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
                  >
                    {BUDGET_DUREES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                    Montant alloué (DT) <span className="text-urgent">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="montant"
                    defaultValue={budget.montant.toFixed(3)}
                    required
                    className="w-full border border-hairline rounded px-3 py-2 text-sm bg-surface"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="creationAuto"
                  defaultChecked={budget.creationAuto}
                  className="rounded"
                />
                Renouvellement automatique à chaque période
              </label>
              <button
                type="submit"
                className="bg-safety text-white text-sm font-semibold px-4 py-2 rounded hover:bg-safety/90 transition-colors"
              >
                Enregistrer
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-surface border border-hairline rounded divide-y divide-hairline">
            <Row label="Description" value={budget.description ?? "—"} />
            <Row label="Récurrence" value={budget.duree} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Metric label="Alloué" value={montant} />
          <Metric label="Dépensé" value={totalDepense} accent={pctConsomme > 100 ? "urgent" : undefined} />
          <Metric label="Restant" value={restant} accent={restant < 0 ? "urgent" : "faible"} />
        </div>

        <div className="bg-surface border border-hairline rounded p-5">
          <div className="flex justify-between text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            <span>Consommation</span>
            <span>{pctConsomme.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-paper rounded-full overflow-hidden">
            <div
              className={`h-full ${pctConsomme > 100 ? "bg-urgent" : pctConsomme > 80 ? "bg-moyenne" : "bg-faible"}`}
              style={{ width: `${Math.min(pctConsomme, 100)}%` }}
            />
          </div>
        </div>

        {budget.categorieChoix && (
          <ScopeSection
            title="Catégories"
            items={budget.categories.map((c) => ({ id: c.id, label: c.famille.designation }))}
            options={familles.map((f) => ({ id: f.id, label: f.designation }))}
            addAction={addBudgetCategorie.bind(null, id)}
            removeAction={removeBudgetCategorie}
            budgetId={id}
            fieldName="idCategorie"
          />
        )}

        {budget.fournisseurChoix && (
          <ScopeSection
            title="Fournisseurs"
            items={budget.fournisseurs.map((f) => ({ id: f.id, label: f.fournisseur.nom }))}
            options={fournisseurs.map((f) => ({ id: f.id, label: f.nom }))}
            addAction={addBudgetFournisseur.bind(null, id)}
            removeAction={removeBudgetFournisseur}
            budgetId={id}
            fieldName="idFournisseur"
          />
        )}

        <div>
          <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Commandes comptabilisées ({lignes.length})
          </div>
          <div className="bg-surface border border-hairline rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Commande</th>
                  <th className="px-4 py-3 font-semibold">Fournisseur</th>
                  <th className="px-4 py-3 font-semibold">Article</th>
                  <th className="px-4 py-3 font-semibold w-28 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => {
                  const brut = Number(l.qtCommande) * Number(l.prixHt ?? 0);
                  const net = brut - brut * (Number(l.remise ?? 0) / 100);
                  return (
                    <tr key={l.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5">
                        <Nameplate>{l.commande.nCommande ?? `CMD-${l.idCommande}`}</Nameplate>
                      </td>
                      <td className="px-4 py-2.5 text-ink">{l.commande.fournisseur?.nom ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink">{l.daArticle.article.designation}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-ink">
                        {net.toLocaleString("fr-FR")} DT
                      </td>
                    </tr>
                  );
                })}
                {lignes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                      Aucune commande comptabilisée sur cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function ScopeSection({
  title,
  items,
  options,
  addAction,
  removeAction,
  budgetId,
  fieldName,
}: {
  title: string;
  items: { id: number; label: string }[];
  options: { id: number; label: string }[];
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (id: number, budgetId: number) => Promise<void>;
  budgetId: number;
  fieldName: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{title}</div>
      <form action={addAction} className="flex gap-2 mb-3">
        <select
          name={fieldName}
          required
          className="flex-1 border border-hairline rounded px-3 py-2 text-sm bg-surface"
        >
          <option value="">Sélectionner…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="text-xs font-semibold text-steel-600 hover:text-steel-700 border border-hairline rounded px-3 py-2 hover:bg-paper transition-colors whitespace-nowrap"
        >
          Ajouter
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-1.5">
            <Nameplate>{it.label}</Nameplate>
            <form action={removeAction.bind(null, it.id, budgetId)}>
              <button type="submit" className="text-xs text-urgent hover:underline">
                ×
              </button>
            </form>
          </div>
        ))}
        {items.length === 0 && <span className="text-sm text-muted">Aucun élément.</span>}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "urgent" | "faible";
}) {
  const color = accent === "urgent" ? "text-urgent" : accent === "faible" ? "text-faible" : "text-ink";
  return (
    <div className="bg-surface border border-hairline rounded p-4">
      <div className={`text-2xl font-semibold font-mono ${color}`}>
        {value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
      </div>
      <div className="text-xs text-muted mt-1">{label} (DT)</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 px-4 py-3">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</div>
      <div className="col-span-2 text-sm text-ink">{value}</div>
    </div>
  );
}
