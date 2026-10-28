/**
 * Data-recovery fix for Brm.retourPar rows stuck with a placeholder
 * value ("utilisateur#<id>") instead of the real person's name.
 *
 * Confirmed via a direct SQL Server check: 63 real rows show this
 * pattern. The embedded number is the raw brm.retour_par integer value
 * from the source — confirmed via historique_brm.cs's own join
 * (`inner join intervenant on brm.retour_par = intervenant.id`) — which
 * the original migration was apparently unable to resolve to a real
 * name for these specific rows at the time it ran (the Intervenant
 * record may not have existed yet in the target, or existed but wasn't
 * matched correctly).
 *
 * This re-reads the real intervenant.nom for each affected row's
 * embedded id directly from the SQL Server source and applies it if
 * found — a targeted recovery, not a blanket relabeling.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/brm-retour-par-recovery.ts --dry-run
 *   npx tsx migration/fixups/brm-retour-par-recovery.ts
 */
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "migration", ".env.migration") });

import sql from "mssql";
import { PrismaClient } from "@prisma/client";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}. Check migration/.env.migration.`);
  return v;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== BRM retour_par recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

  const prisma = new PrismaClient();

  const affected = await prisma.brm.findMany({
    where: { retourPar: { startsWith: "utilisateur#" } },
  });
  console.log(`Found ${affected.length} affected row(s) in Postgres.`);

  if (affected.length === 0) {
    console.log("Nothing to do.");
    await prisma.$disconnect();
    return;
  }

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

  let resolved = 0;
  let stillMissing = 0;

  for (const row of affected) {
    const idMatch = row.retourPar!.match(/^utilisateur#(\d+)$/);
    if (!idMatch) {
      console.log(`  ⚠ id=${row.id}: unexpected format "${row.retourPar}" — skipped`);
      continue;
    }
    const intervenantId = Number(idMatch[1]);

    const result = await pool
      .request()
      .input("id", sql.Int, intervenantId)
      .query("SELECT nom FROM intervenant WHERE id = @id");

    const realNom = result.recordset[0]?.nom as string | undefined;

    if (!realNom) {
      console.log(`  brm id=${row.id}: no intervenant found for id=${intervenantId} — left as-is`);
      stillMissing++;
      continue;
    }

    console.log(`  brm id=${row.id}: "${row.retourPar}" -> "${realNom}"`);
    resolved++;

    if (!dryRun) {
      await prisma.brm.update({ where: { id: row.id }, data: { retourPar: realNom } });
    }
  }

  await pool.close();
  await prisma.$disconnect();

  console.log(`\nResolved: ${resolved}, still missing a real match: ${stillMissing}`);
  if (dryRun) {
    console.log("Dry run — no changes written. Re-run without --dry-run to apply.");
  } else {
    console.log("=== Done. Verify with: SELECT COUNT(*) FROM brm WHERE retour_par LIKE 'utilisateur#%'; ===");
  }
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
