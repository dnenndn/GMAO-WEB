/**
 * One-off correction for DsCommande.statut, found by revisiting the
 * Sous-Traitance module against the decompiled C# source.
 *
 * Same relabeling-only pattern as DI (migration/fixups/
 * di-statut-recovery.ts) — nothing was lost, the real column follows
 * the same 0/1/5/10 integer convention already confirmed for the
 * regular Commande.statut, and the already-migrated Postgres data
 * confirms the raw digit-strings were stored directly without being
 * relabeled ("1": 2 rows, "5": 13 rows, "10": 139 rows — no "0"
 * currently present).
 *
 *   "0"  -> "En attente"
 *   "1"  -> "En cours"
 *   "5"  -> "Annulée"
 *   "10" -> "Clôturée"
 *
 * Postgres-only, no SQL Server connection needed.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/ds-commande-statut-recovery.ts --dry-run
 *   npx tsx migration/fixups/ds-commande-statut-recovery.ts
 */
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";

const STATUT_MAP: Record<string, string> = {
  "0": "En attente",
  "1": "En cours",
  "5": "Annulée",
  "10": "Clôturée",
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== DsCommande statut recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

  const prisma = new PrismaClient();

  const grouped = await prisma.dsCommande.groupBy({
    by: ["statut"],
    _count: { _all: true },
  });

  console.log("\nCurrent distribution in Postgres:");
  for (const g of grouped) {
    console.log(`  "${g.statut}": ${g._count._all} row(s)`);
  }

  const recognized = grouped.filter((g) => g.statut in STATUT_MAP);
  const unrecognized = grouped.filter((g) => !(g.statut in STATUT_MAP));

  if (unrecognized.length > 0) {
    console.log("\n⚠ Value(s) not in the confirmed mapping — NOT touched, left as-is:");
    for (const u of unrecognized) {
      console.log(`    "${u.statut}": ${u._count._all} row(s)`);
    }
  }

  if (dryRun) {
    console.log("\nDry run — no changes written. Re-run without --dry-run to apply.");
    await prisma.$disconnect();
    return;
  }

  console.log("\nApplying corrections...");
  for (const g of recognized) {
    const label = STATUT_MAP[g.statut];
    const res = await prisma.dsCommande.updateMany({
      where: { statut: g.statut },
      data: { statut: label },
    });
    console.log(`  "${g.statut}" -> "${label}": ${res.count} row(s) updated`);
  }
  await prisma.$disconnect();

  console.log("\n=== Done. Verify with: SELECT statut, COUNT(*) FROM ds_commande GROUP BY statut; ===");
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
