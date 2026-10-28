/**
 * One-off correction for DemandeIntervention.statut, found by re-checking
 * the decompiled C# source directly against real, already-migrated data.
 *
 * Unlike the DA statut bug (migration/fixups/da-statut-recovery.ts),
 * NOTHING was actually lost here — the real source column is a simple
 * `int` (confirmed via INFORMATION_SCHEMA and by sampling real rows
 * directly), and the already-migrated Postgres data correctly preserved
 * the raw values as literal digit-strings ("0" / "1"). They just need
 * relabeling to meaningful text, not a re-read from SQL Server — so this
 * script only touches Postgres, no LEGACY_DB_* connection needed at all.
 *
 * Confirmed real mapping, each traced to the exact C# line that sets it:
 *   "0" -> "En Attente"  (Demande_Intervention.cs's own INSERT default)
 *   "1" -> "Validée"     (set specifically when an OT gets created for
 *                          this DI — ordre_travail.cs's own UPDATE)
 *   "5" -> "Annulée"     (the cancel action in Demande_Intervention.cs)
 *
 * Any other value (including the one stray "Confirmée" row already in
 * real data — likely a leftover from this project's own earlier, wrong
 * UI work, not real legacy data) is left untouched and reported, not
 * guessed at.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/di-statut-recovery.ts --dry-run
 *   npx tsx migration/fixups/di-statut-recovery.ts
 */
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";

const STATUT_MAP: Record<string, string> = {
  "0": "En Attente",
  "1": "Validée",
  "5": "Annulée",
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== DI statut recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

  const prisma = new PrismaClient();

  const grouped = await prisma.demandeIntervention.groupBy({
    by: ["statut"],
    _count: { _all: true },
  });

  console.log("\nCurrent distribution in Postgres:");
  for (const g of grouped) {
    console.log(`  "${g.statut}": ${g._count._all} row(s)`);
  }

  const recognized = grouped.filter((g) => g.statut != null && g.statut in STATUT_MAP);
  const unrecognized = grouped.filter((g) => g.statut == null || !(g.statut in STATUT_MAP));

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
    const label = STATUT_MAP[g.statut as string];
    const res = await prisma.demandeIntervention.updateMany({
      where: { statut: g.statut },
      data: { statut: label },
    });
    console.log(`  "${g.statut}" -> "${label}": ${res.count} row(s) updated`);
  }
  await prisma.$disconnect();

  console.log("\n=== Done. Verify with: SELECT statut, COUNT(*) FROM demande_intervention GROUP BY statut; ===");
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
