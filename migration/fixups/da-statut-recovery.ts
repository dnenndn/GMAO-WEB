/**
 * One-off data-recovery fix for a real migration bug found by re-checking
 * the decompiled C# source directly against real, already-migrated data.
 *
 * demande_achat.statut in the real legacy source is an INTEGER with (at
 * least) 5 distinct codes, confirmed directly from the C# source's own
 * hardcoded SQL parameter values:
 *   0  = En cours     (liste_da.cs)
 *   1  = Confirmée    (da_confirmer.cs)
 *   2  = Refusée      (da_refuser.cs)
 *   4  = Reportée     (da_reporter.cs — 3 is skipped/unused in the source
 *                       itself, not a gap introduced here)
 *   10 = Clôturée     (da_cloturer.cs's own UPDATE statement)
 *
 * This was originally migrated as a simplified 2-value string ("En
 * cours"/"Clôturée" only) — wrong. Querying the real, already-migrated
 * Postgres data directly confirms the damage: only 2 distinct statut
 * values exist across 7,618 real rows, meaning every Confirmée/Refusée/
 * Reportée distinction was already collapsed away by the original
 * migration and is NOT recoverable from Postgres alone.
 *
 * This script re-reads the REAL integer values directly from the
 * original SQL Server source and corrects the already-migrated Postgres
 * rows to match — a fix-up pass, not a fresh migration (rows already
 * exist; only their statut is wrong).
 *
 * Usage (from the project root, same env files the real migration uses):
 *   npx tsx migration/fixups/da-statut-recovery.ts --dry-run
 *   npx tsx migration/fixups/da-statut-recovery.ts
 */
import { config } from "dotenv";
import path from "path";
// Using process.cwd() rather than __dirname-relative math — this script
// lives one level deeper (migration/fixups/) than migration/run.ts and
// migration/db.ts do (migration/), and getting relative ".." counts
// exactly right has been a repeated, real source of bugs throughout
// this project. Every script in this project is always invoked via
// `npx tsx <path>` from the project root, so resolving against the
// current working directory is simpler and more robust than counting
// directory levels.
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "migration", ".env.migration") });

import sql from "mssql";
import { PrismaClient } from "@prisma/client";

const STATUT_MAP: Record<number, string> = {
  0: "En cours",
  1: "Confirmée",
  2: "Refusée",
  3: "Admin", // CORRECTED — missed in the original pass; confirmed via
  // backend_achat.cs's own CASE statement (WHEN statut = '3' THEN 'DA
  // Admin'). The 5 rows originally left untouched as "unrecognized" are
  // this value — this fix specifically resolves them.
  4: "Reportée",
  10: "Clôturée",
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}. Copy migration/.env.migration.example to .env.migration and fill it in.`);
  return v;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== DA statut recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

  const pool = await sql.connect({
    server: requireEnv("LEGACY_DB_SERVER"),
    database: requireEnv("LEGACY_DB_NAME"),
    user: requireEnv("LEGACY_DB_USER"),
    password: requireEnv("LEGACY_DB_PASSWORD"),
    port: process.env.LEGACY_DB_PORT ? Number(process.env.LEGACY_DB_PORT) : 1433,
    connectionTimeout: 60000,
    requestTimeout: 600000,
    options: {
      encrypt: process.env.LEGACY_DB_ENCRYPT !== "false",
      trustServerCertificate: true,
    },
  });

  const result = await pool.request().query("SELECT id, statut FROM demande_achat");
  const rows = result.recordset as { id: number; statut: number | null }[];
  console.log(`Read ${rows.length} rows from the real source.`);

  const byValue: Record<string, number[]> = {};
  const unexpected: { id: number; statut: number | null }[] = [];

  for (const r of rows) {
    if (r.statut == null || !(r.statut in STATUT_MAP)) {
      unexpected.push(r);
      continue;
    }
    const label = STATUT_MAP[r.statut];
    (byValue[label] ??= []).push(r.id);
  }

  console.log("\nReal distribution found in the source:");
  for (const [label, ids] of Object.entries(byValue)) {
    console.log(`  ${label}: ${ids.length} rows`);
  }
  if (unexpected.length > 0) {
    console.log(`\n⚠ ${unexpected.length} row(s) had an unrecognized statut value — NOT touched, left as-is:`);
    for (const u of unexpected.slice(0, 20)) {
      console.log(`    id=${u.id} statut=${u.statut}`);
    }
    if (unexpected.length > 20) console.log(`    ...and ${unexpected.length - 20} more`);
  }

  await pool.close();

  if (dryRun) {
    console.log("\nDry run — no changes written. Re-run without --dry-run to apply.");
    return;
  }

  const prisma = new PrismaClient();
  console.log("\nApplying corrections to Postgres...");
  for (const [label, ids] of Object.entries(byValue)) {
    const res = await prisma.demandeAchat.updateMany({
      where: { id: { in: ids } },
      data: { statut: label },
    });
    console.log(`  ${label}: ${res.count} row(s) updated`);
  }
  await prisma.$disconnect();

  console.log("\n=== Done. Verify with: SELECT statut, COUNT(*) FROM demande_achat GROUP BY statut; ===");
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
