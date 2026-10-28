# Budget Module — Functional Spec (Phase 7)

Reverse-engineered from the legacy GMAO WinForms app (`creer_budget.cs`,
`liste_budget.cs`, `liste_budget_variation.cs`, `liste_budget_modifier.cs`,
`liste_budget_categorie.cs`, `liste_budget_fournisseur.cs`).

## 1. Key design decision: no spend-ledger table

Same principle as the Inventory movements ledger (Phase 3) and the Fleet
expiry panel (Phase 6): **this module stores no financial transaction data
of its own**. A `Budget` is just a spending envelope — an allocated
`montant` (amount) over a recurring period (`duree`) — and actual spend is
computed **live** by aggregating the existing Procurement data
(`Commande`/`CommandeArticle`), confirmed directly from the variance
screen's SQL:

```sql
select sum(qt_commande*prix_ht - (qt_commande*prix_ht*remise/100)),
       commande.date_signature
from commande_article
inner join commande on commande_article.id_commande = commande.id
where commande.date_signature between @d1 and @d2
  and statut <> @d and statut <> @a   -- excludes cancelled/draft orders
group by commande.date_signature
```

When a budget is scoped by category (`categorieChoix`), the same query
adds a filter through `Article → SousFamille → Famille`. When scoped by
supplier (`fournisseurChoix`), it filters on `Commande.idFournisseur`.

**This schema adds zero new spend-tracking models.** The web app's
variance page queries `Commande`/`CommandeArticle` directly — exactly
mirroring the legacy design, and for the same reason: a second ledger
would be one more place for numbers to drift from the real purchase
orders.

## 2. Core entities

- **Budget**: the envelope itself — name, description, creation date,
  recurrence period, allocated amount, and two scope flags
  (`categorieChoix` / `fournisseurChoix`).
- **BudgetCategorie**: links a budget to one or more categories. Despite
  the column name `id_categorie`, the actual join in the legacy SQL goes
  through `sous_famille.id_famille` — **it references `Famille`, not a
  separate category table** (none exists in the source). Named
  `idCategorie` in the schema to match the legacy column, but the relation
  target is `Famille`.
- **BudgetFournisseur**: links a budget to one or more suppliers
  (`Fournisseur`, already modeled in Procurement).

## 3. Recurrence period

Confirmed from the legacy dropdown (`creer_budget.select_duree`):
`Chaque Jour` (daily) / `Chaque Semaine` (weekly) / `Chaque 2 Semaine`
(bi-weekly) / `Chaque Mois` (monthly, the default) / `Chaque 2 Mois`
(bi-monthly) / `Chaque Trimestre` (quarterly) / `Chaque Simestre`
(semi-annual — note: the legacy app itself misspells "Semestre") /
`Chaque Année` (annual).

## 4. `creationAuto` / `creerNv` — auto-renewal

`creation_auto` (boolean) and `creer_nv` (boolean) together suggest a
budget can **auto-renew into a new instance** once its period ends —
`creer_nv` likely flags a row as itself being such a renewed instance
(the main list screen filters `where creer_nv = @a`, i.e. excludes
renewed-instance rows from the primary list, showing only "template"
budgets). **This auto-renewal mechanism is not implemented in the web
app** — creating the actual recurring-instance logic requires a scheduled
job (e.g. a cron endpoint), which is infrastructure-dependent and
deliberately left out of this pass. The fields are modeled; the
scheduler is not built.

## 5. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `creer_budget.cs` | `/budget/new` | P0 |
| `liste_budget.cs` | `/budget` (list) | P0 |
| `liste_budget_variation.cs` | `/budget/[id]` — live budget-vs-actual comparison | P0 |
| `liste_budget_modifier.cs` | Edit form on budget detail | P1 |
| `liste_budget_categorie.cs`, `liste_budget_fournisseur.cs` | Category/supplier scope management on budget detail | P0 |
| `liste_budget_general_tous.cs` | All-budgets overview/recap | P1 |
| `budget_investissement.cs` | Investment budget variant — no distinct table found; appears to reuse the same `budget` table with different UI framing. Deferred. | P2 |

**P0 = this pass** — create a budget, scope it by category or supplier,
and see live spend-vs-allocation on the detail page.

## 6. Notable business rules

- The variance query explicitly excludes cancelled and some other-status
  orders (`statut <> @d and statut <> @a`) — the web implementation
  excludes `Commande.statut IN ("Annulée", "En attente")`, counting only
  orders that are actually committed (`En cours` / `Clôturée`). Worth
  confirming this matches the intended business rule.
- Category and supplier scoping appear to be **mutually exclusive modes**
  in the legacy UI (radio-button style: `categorieChoix` vs
  `fournisseurChoix`), not combinable filters — the web app follows the
  same assumption.

## 7. Open questions for you

1. Confirm the exact semantics of `creationAuto`/`creerNv` — is a
   "renewed" budget instance created by a scheduled job, or manually via
   a button in the legacy app? This determines whether auto-renewal is
   worth building as a scheduled task later.
2. `budget_investissement.cs` (investment budget) — does it need its own
   distinct data shape, or is it genuinely the same `budget` table under
   a different screen/label as it appeared from static analysis?
3. Confirm which `Commande.statut` values should count as "committed
   spend" for variance purposes — this pass assumes `En cours` and
   `Clôturée` count, `En attente` and `Annulée` don't.
