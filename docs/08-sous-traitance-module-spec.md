# Subcontracting Module — Functional Spec (Phase 8) — "Sous-Traitance"

Reverse-engineered from the legacy GMAO WinForms app (`creer_devis_st.cs`,
`ajouter_devis_st.cs`, `creer_commande_st.cs`, `creer_bl_st.cs`,
`liste_activite.cs`, and the `stock_*_st.cs` / `commande_*_st.cs` /
`bl_*_st.cs` list screens).

## 1. What this module is

A parallel workflow to Procurement + Inventory, specifically for work sent
to **subcontractors** — outside repair shops, external machining, or other
outsourced services:

```
Ds (subcontracting request)
  → Devis (quote — invites multiple suppliers to bid)
    → Commande (order — sourced from the winning quote's lines)
      → Bon de Livraison (delivery note — tracks the item coming back)
```

Alongside this, a **3-location movement log** tracks where physical
material/tools are at any time: **Usine** (our site), **Magasin** (the
subcontractor's warehouse), **Réparation** (actually being worked on).
Unlike the Inventory module's `mvt_stock` (a computed view — see that
module's spec), `ds_historique_mvt` **is a real stored table** here.

## 2. Known gap: the `Ds` header's origin

`ds_devis.id_ds` and `ds_commande.id_ds` clearly reference a parent `ds`
entity, and the module's screens (`intervention_sous_traitance.cs`)
strongly imply this ties back to a Maintenance work order. **However, no
`insert into ds` statement was found anywhere in the codebase** during
static analysis — it may be created via a stored procedure not visible in
the decompiled C#, or through a code path this pass didn't trace.

This schema models `Ds` as a lightweight header with an **optional**
`idOt` link to `OrdreTravail` — a reasonable reconstruction based on the
naming and the `intervention_sous_traitance` screen's evident purpose, but
**not a confirmed structure**. Treat `Ds` as the weakest-evidence model in
this entire rebuild.

## 3. Core entities

- **ActiviteSousTraitance**: type of subcontracted service (the underlying
  table is just called `activite`, shared more broadly — `typeSt` flags
  rows relevant to this module).
- **Ds**: the request header (see gap note above).
- **DsDevis / DsDevisFournisseur / DsDevisArticle**: a quote can be sent
  to multiple suppliers for competitive bidding (`DsDevisFournisseur`),
  with line items (`DsDevisArticle`) referencing an ambiguous `id_t`
  column (see §5) and an `ActiviteSousTraitance`.
- **DsCommande / DsCommandeArticle**: the resulting order — mirrors
  Procurement's `Commande`/`CommandeArticle` shape closely, but against a
  `Ds`/quote rather than a `DemandeAchat`. `DsCommandeArticle.reception`
  tracks quantity already delivered back (for partial deliveries).
- **DsBonLivraison / DsLivraisonArticle**: delivery note when
  subcontracted work/parts come back, including the subcontractor's own
  delivery-note reference (`blFournisseur`).
- **DsHistoriqueMvt**: the location-tracking log (Usine/Magasin/
  Réparation), confirmed as a real stored table via `creer_bl_st.cs`'s
  insert statement.

## 4. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `creer_devis_st.cs`, `ajouter_devis_st.cs` | `/sous-traitance/devis` (list), `/new`, `/[id]` | P0 |
| `creer_commande_st.cs` | `/sous-traitance/commandes` (list), `/new`, `/[id]` | P0 |
| `creer_bl_st.cs` | `/sous-traitance/livraisons` (list), `/new`, `/[id]` | P0 |
| `liste_activite.cs` | `/sous-traitance/settings/activites` | P0 |
| `commande_encour_st.cs`, `commande_attente_st.cs`, `commande_cloturer_st.cs`, `commande_annule_st.cs` | Status filter tabs on the commandes list | P0 |
| `stock_usine_st.cs`, `stock_magasin_st.cs`, `stock_reparation_st.cs` | `/sous-traitance/mouvements` — one page, filterable by location, querying the real `DsHistoriqueMvt` table | P1 |
| `intervention_sous_traitance.cs` | Cross-link to the originating Maintenance OT on the Ds/commande detail — depends on the §2 assumption | P1 |
| `bl_facture_st.cs`, `bl_non_facture_st.cs`, `facture_st.cs`, `bon_dop_st.cs` | Invoicing/facturation status — deferred | P2 |
| `historique_devis_st.cs`, `modifier_devis_st.cs` | Quote edit + history — deferred | P2 |
| `signature_commande_attente_st.cs` | Order signature/approval step — deferred | P2 |

**P0 = this pass** — quote creation with multi-supplier invites, orders
sourced from quote lines, and delivery notes for returned work.

## 5. Open questions for you

1. **How is a `Ds` actually created?** This is the single biggest unknown
   in this module — confirm whether it's tied to a Maintenance OT
   (as `intervention_sous_traitance.cs` suggests) and how.
2. What does `id_t` reference on `DsDevisArticle`/`DsCommandeArticle`? Not
   confirmed — possibly a tool, a piece of equipment, or an article-like
   entity specific to this module.
3. What does `DsDevis.livr` (boolean) mean? Best guess: whether delivery
   is included in the quoted price, but not confirmed.
4. Is `activite.type_article` a fixed set of values, and does it interact
   with `type_st` to determine which module(s) an activity applies to?
