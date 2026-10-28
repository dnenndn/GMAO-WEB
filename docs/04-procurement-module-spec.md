# Procurement Module — Functional Spec (Phase 4)

Reverse-engineered from the legacy GMAO WinForms app (`ajouter_fournisseur.cs`,
`creer_da.cs`, `creer_commande.cs`, `da_confirmer.cs` / `da_refuser.cs` /
`da_reporter.cs` / `da_cloturer.cs`, `commande_encour.cs` / `commande_cloture.cs`
/ `commande_annule.cs` / `commande_attente.cs`).

## 1. Workflow

```
Demande d'Achat (DA)  →  approved lines pulled into  →  Commande (PO)
[purchase request]                                       [sent to Fournisseur]
                                                                 ↓
                                              Reception (already in Inventory module)
```

1. Anyone raises a **Demande d'Achat (DA)** — a purchase request — listing
   the articles needed (`DaArticle`), each with a quantity, a reason
   (`motif`), and optionally which equipment it's for
   (`DaArticleEquipement`).
2. A purchasing supervisor **confirms, refuses, reports (postpones), or
   returns** the DA. The legacy app tracks this via 5 separate audit-log
   tables (one insert per action type) rather than a single status field
   with many values — see §3 below for how this was simplified.
3. Confirmed DA lines get pulled into a **Commande (purchase order)** sent
   to a specific **Fournisseur (supplier)**. `CommandeArticle` links to
   `DaArticle` (not `Article` directly) — this preserves full traceability
   from a received item all the way back to the original request line that
   justified it, and is how the legacy app supports partial fulfillment
   (`DaArticle.qtRestant` tracks how much of the original request is still
   unordered across possibly multiple POs).
4. The order lifecycle moves through **En attente → En cours → Clôturée**
   (or **Annulée**).
5. **Goods receipt (Reception)** — already modeled in the Inventory module
   — closes the loop: `ReceptionArticle.idCommande` and `.idDa` are now
   real foreign keys (they were placeholder integers until this module
   existed).

## 2. Core entities

- **Fournisseur**: supplier master data — contact info, banking details
  (IBAN/RIB — used for payment), default VAT/discount terms, `fodec` (a
  Tunisian tax/fund flag, since the original app's field naming and
  currency conventions are Tunisian).
- **DemandeAchat (DA)**: the purchase request header.
- **DaArticle**: request line items, each with a `qtRestant` (quantity not
  yet ordered) that decrements as POs are raised against it.
- **Commande**: the purchase order header, linked to one `Fournisseur`.
- **CommandeArticle**: order line items, linked to `DaArticle`.

## 3. Status modeling — a deliberate simplification

**Commande status** was cleanly traceable: the legacy app has 4 separate
list screens, each filtering on a literal integer — `0` (En attente),
`1` (En cours), `5` (Annulée), `10` (Clôturée). This schema uses the same
4 states as readable strings.

**DemandeAchat status** was murkier: only 2 codes were clearly identified
in the confirm/refuse/report/close screens (`0` = open/pending, `10` =
closed). The actual confirm/refuse/report/return/resend *decision* appears
to be tracked via **5 separate single-purpose audit tables**
(`da_confirmer`, `da_refuser`, `da_reporter`, `da_retourner`, `da_reenvoyer`)
rather than distinct status values — each is essentially "insert one log
row when this button is clicked." This schema **folds all 5 into one
`DaAction` log table** with a `type` discriminator column. Same
information, one table instead of five — a reasonable modernization, not
a guess about unclear business logic.

## 4. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `ajouter_fournisseur.cs`, `modifier_fournisseur.cs` | `/procurement/suppliers` (list), `/new`, `/[id]` | P0 |
| `creer_da.cs` | `/procurement/requests` (list), `/new`, `/[id]` | P0 |
| `da_confirmer.cs` / `da_refuser.cs` / `da_reporter.cs` | Action buttons on DA detail page | P0 |
| `creer_commande.cs` | `/procurement/orders` (list), `/new`, `/[id]` | P0 |
| `commande_encour.cs`, `commande_attente.cs`, `commande_cloture.cs`, `commande_annule.cs` | Status filter tabs on the orders list | P0 |
| `da_cloturer.cs` | Close action on DA detail page | P1 |
| `fournisseur_adresse.cs`, `fournisseur_banque.cs`, `Fournisseur_contact.cs` | Tabs on supplier detail page | P2 |
| `commande_vr_prix.cs` (price verification) | Not yet built | P2 |
| `bl_facture.cs`, `bl_non_facture.cs`, `bon_dop.cs`, `facture_st.cs` | Delivery notes / invoicing — not yet built | P2 |
| All `*_st.cs` files (subcontracting variant) | Deferred to a future Sous-Traitance module, same as flagged in the Inventory spec | Not this phase |

**P0 = this pass** — supplier master data, the DA approval workflow, and
the PO lifecycle. This is enough to close the loop with the Inventory
module's `Reception` screen.

## 5. Notable business rules

- A `Commande` line references a `DaArticle`, never an `Article` directly
  — every order line must trace back to an approved request line. The web
  app's "new order" flow reflects this: you pick from *confirmed DA lines*,
  not from the article catalog directly.
- `qtRestant` on `DaArticle` is what enables **partial fulfillment** — a
  request for 50 units could be split across two POs to two different
  suppliers. The web app decrements it each time a PO line is raised
  against that DA line.
- `fodec` appears on both `Fournisseur` and `Commande` — a Tunisian
  parafiscal fund contribution, relevant for whoever handles the
  accounting/finance side.

## 6. Open questions for you

1. Confirm the exact meaning of `DaArticleEquipement.id_lis` — the column
   name gives no clue from static analysis (kept as a plain nullable int).
2. Is there a real distinct status value for "Confirmée" DAs beyond the
   binary open/closed I found, or does the `DaAction` audit-log approach
   (§3) match how the business actually thinks about DA state?
3. `Commande.fodec` and `Fournisseur.fodec` — confirm whether this should
   affect price calculations automatically (a percentage) or is purely a
   yes/no flag for external accounting.
