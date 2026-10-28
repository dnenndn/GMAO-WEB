# Inventory / Stock Module — Functional Spec (Phase 3)

Reverse-engineered from the legacy GMAO WinForms app (`article_generale.cs`,
`ajouter_article.cs`, `creer_bsm.cs`, `bsm_article.cs`, `creer_brm.cs`,
`creer_reception.cs`, `mvt_stock.cs`).

## 1. Key design decision: there is no stock ledger table

The single most important discovery in this module: **the legacy app has no
`mvt_stock` table**. `mvt_stock.cs` — the "stock movements" screen — computes
the entire movement history on the fly by UNIONing four transactional
sources, each tagged with a movement type label at query time:

| Source | Movement type | Meaning |
|---|---|---|
| `reception_article` / `reception` | Entrée | Goods received (from a purchase order) |
| `bsm_article` / `bsm` | Sortie | Stock issued out (to maintenance or elsewhere) |
| `brm_article` / `brm` | Retour | Unused stock returned to the warehouse |
| `ds_mp` / `demande_sous_traitance` | *(subcontracting)* | Raw material consumed by a subcontracting job |

This is a deliberate, sensible design — it avoids the double-bookkeeping
risk of maintaining both transactional documents *and* a separate ledger
that could drift out of sync. **The web version preserves this**: there is
no `MvtStock` model in the schema. The `/inventory/mouvements` page computes
the same union at query time.

The 4th source (`ds_mp`, subcontracting raw-material consumption) is **not
yet modeled** — it belongs conceptually to the Sous-Traitance module, which
hasn't been built. The movements page currently covers the first 3 sources.

## 2. Core entities

- **Article**: the item master. Tracks three separate stock quantities —
  `stockNeuf` (new), `stockUse` (used/refurbished), `stockRebute` (scrap) —
  plus reorder thresholds (`stockMini`, `stockMaxi`, `stockSecurite`,
  `pointCommande`). Belongs to one `Magasin` (warehouse) and can be tagged
  with one or more `SousFamille` (sub-family) via a junction table.
- **Famille / SousFamille**: two-level category hierarchy for articles.
- **Magasin**: warehouse/storage location.
- **Bsm** (Bon de Sortie Magasin — stock issue slip): the primary way
  stock leaves the warehouse. Can be flagged `bsmMaintenance` and carry a
  work-order reference (`nOt`) — **this is the parts-consumption link to
  the Maintenance module** flagged as a Phase-1 open item. It's a loose
  text reference (not a hard foreign key) matching the legacy design, and
  can also reference specific equipment via `BsmEquipement` (a BSM can
  cover multiple pieces of equipment, independent of the OT link).
- **Brm** (Bon de Retour Magasin — stock return slip): unused parts going
  back to the warehouse, loosely linked to the originating `Bsm`.
- **Reception**: goods receipt. Lines (`ReceptionArticle`) reference
  `idCommande` / `idDa` — **these are Procurement-module foreign keys that
  don't exist yet** (Purchase Order / Purchase Request). Kept as plain
  nullable integers for now; will become real relations once Procurement
  is built.

## 3. Screens to rebuild

| Legacy form | Web page | Priority |
|---|---|---|
| `ajouter_article.cs`, `article_generale.cs` | `/inventory/articles` (list), `/inventory/articles/new`, `/inventory/articles/[id]` | P0 |
| `Famille.cs`, `Sous_Famille.cs`, `parametre_article_magasin.cs` | `/inventory/settings/*` (Familles, Sous-familles, Magasins) | P0 |
| `creer_bsm.cs`, `bsm_article.cs` | `/inventory/bsm` (list), `/inventory/bsm/new` | P0 |
| `creer_brm.cs` | `/inventory/brm` (list), `/inventory/brm/new` | P1 |
| `creer_reception.cs` | `/inventory/receptions` (list), `/inventory/receptions/new` | P1 |
| `mvt_stock.cs` | `/inventory/mouvements` — computed ledger view (date-range filter) | P1 |
| `article_caracteristique.cs`, `article_image.cs`, `article_fichier.cs`, `article_commentaire.cs` | Tabs on article detail page | P2 |
| `stock_sous_traitance.cs` and related `*_st.cs` files | Subcontracting stock variant — deferred to the Sous-Traitance module | Not this phase |

**P0 = this pass** — article master data, category/warehouse reference
data, and stock issue (BSM), since that's the direct link to Maintenance.

## 4. Notable business rules

- Three-way stock split (neuf/use/rebute) has no equivalent in most modern
  inventory systems — worth confirming with the plant whether this
  distinction still matters operationally, or whether it can be
  simplified to a single on-hand quantity + condition flag.
- `methodeGestion` (management method) is stored as free text in the
  legacy app — likely intended to be a fixed set of values (e.g. FIFO/LIFO
  or min-max vs. reorder-point), but no dropdown was found constraining it
  in the code. Left as free text pending clarification.
- BSM validation (`validation` boolean) suggests an approval step before
  stock is actually deducted — the web version models the field but the
  approval workflow itself isn't built yet (P1/P2).

## 5. Open questions for you

1. Is the three-way stock split (neuf/use/rebute) still meaningful to the
   business, or could it be simplified in the rebuild?
2. What are the actual allowed values for `methodeGestion` — is there a
   fixed list you use in practice?
3. Should BSM validation (`validation` flag) block stock deduction until
   approved, or is it purely informational in current usage?
