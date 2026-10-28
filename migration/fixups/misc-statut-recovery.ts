/**
 * One-off correction covering 6 tables, all found to share the same bug
 * during a broad cross-check against the real C# source and a direct
 * SQL Server query. Relabeling only, like DI's fix — nothing was lost,
 * every real column here is genuinely integer-coded in the legacy app,
 * and the already-migrated Postgres data confirms the raw digit-strings
 * were stored directly without ever being relabeled. Postgres-only, no
 * SQL Server connection needed.
 *
 * Confirmed real mappings, each traced to the exact C# source and
 * cross-checked against real row counts:
 *
 *   bon_livraison.statut     (bl_non_facture.cs / creer_bl.cs)
 *     0 -> "Non Facturé" (32 rows)   1 -> "Facturé" (9737 rows)
 *
 *   ds_bon_livraison.statut  (bl_non_facture_st.cs)
 *     0 -> "Non Facturé" (7 rows)    1 -> "Facturé" (126 rows)
 *
 *   reception.statut         (bl_non_facture.cs / creer_bl.cs)
 *     0 -> "En Attente BL" (15 rows) 1 -> "BL Créé" (9749 rows)
 *
 *   dop.statut                (tableau_comparatif.cs / liste_dop.cs)
 *     0 -> "En attente" (1 row)      1 -> "Confirmée" (132 rows)
 *     5 -> "Annulée" (23 rows)
 *
 *   ds_devis.statut and devis.statut — only "0" currently exists in
 *   real data for either (4 and 244 rows respectively); labeled
 *   "En attente" as the consistent default state used everywhere else
 *   in this app, though the full value set beyond 0 isn't independently
 *   confirmed for these two specifically.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/misc-statut-recovery.ts --dry-run
 *   npx tsx migration/fixups/misc-statut-recovery.ts
 */
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TableSpec = {
  name: string;
  model: "bonLivraison" | "dsBonLivraison" | "reception" | "dop" | "dsDevis" | "devis";
  map: Record<string, string>;
};

const TABLES: TableSpec[] = [
  { name: "bon_livraison", model: "bonLivraison", map: { "0": "Non Facturé", "1": "Facturé" } },
  { name: "ds_bon_livraison", model: "dsBonLivraison", map: { "0": "Non Facturé", "1": "Facturé" } },
  { name: "reception", model: "reception", map: { "0": "En Attente BL", "1": "BL Créé" } },
  { name: "dop", model: "dop", map: { "0": "En attente", "1": "Confirmée", "5": "Annulée" } },
  { name: "ds_devis", model: "dsDevis", map: { "0": "En attente" } },
  { name: "devis", model: "devis", map: { "0": "En attente" } },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== Multi-table statut recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

  for (const table of TABLES) {
    console.log(`\n--- ${table.name} ---`);
    // @ts-expect-error — dynamic model access, each has a `statut` field
    const grouped = await prisma[table.model].groupBy({
      by: ["statut"],
      _count: { _all: true },
    });

    for (const g of grouped) {
      console.log(`  "${g.statut}": ${g._count._all} row(s)`);
    }

    const recognized = grouped.filter((g: any) => g.statut in table.map);
    const unrecognized = grouped.filter((g: any) => !(g.statut in table.map));
    if (unrecognized.length > 0) {
      console.log("  ⚠ value(s) not in the confirmed mapping — NOT touched:");
      for (const u of unrecognized) console.log(`    "${u.statut}": ${u._count._all} row(s)`);
    }

    if (dryRun) continue;

    for (const g of recognized) {
      const label = table.map[g.statut as string];
      // @ts-expect-error — dynamic model access
      const res = await prisma[table.model].updateMany({
        where: { statut: g.statut },
        data: { statut: label },
      });
      console.log(`  "${g.statut}" -> "${label}": ${res.count} row(s) updated`);
    }
  }

  await prisma.$disconnect();

  if (dryRun) {
    console.log("\nDry run — no changes written. Re-run without --dry-run to apply.");
  } else {
    console.log("\n=== Done. Verify each table with: SELECT statut, COUNT(*) FROM <table> GROUP BY statut; ===");
  }
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
