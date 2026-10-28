/**
 * Data-recovery fix for the 3 remaining DemandeAchat.demandeur rows
 * stuck with a placeholder value ("utilisateur#<id>") instead of the
 * real person's name — the last stragglers found during a broad sweep
 * of all 16 person-identifying string fields in this schema (see
 * brm-retour-par-recovery.ts for the sibling fix; every other field
 * came back completely clean).
 *
 * Unlike brm.retour_par (which joins against Intervenant), this field
 * joins directly against Utilisateur — confirmed via backend_da.cs's
 * own query (`LEFT JOIN utilisateur ON demande_achat.demandeur =
 * utilisateur.id`) — so this looks up utilisateur.login for the
 * embedded id, not intervenant.nom.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/da-demandeur-recovery.ts --dry-run
 *   npx tsx migration/fixups/da-demandeur-recovery.ts
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
  console.log(`=== DemandeAchat.demandeur recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

  const prisma = new PrismaClient();

  const affected = await prisma.demandeAchat.findMany({
    where: { demandeur: { startsWith: "utilisateur#" } },
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
    const idMatch = row.demandeur!.match(/^utilisateur#(-?\d+)$/);
    if (!idMatch) {
      console.log(`  ⚠ id=${row.id}: unexpected format "${row.demandeur}" — skipped`);
      continue;
    }
    const utilisateurId = Number(idMatch[1]);

    // A negative id (e.g. "-1") isn't a valid utilisateur.id at all —
    // this means the SOURCE data itself never had a real demandeur for
    // this row, not that the migration failed to resolve one. Clearing
    // to null is more honest than either a fake lookup or leaving the
    // meaningless placeholder string in place.
    if (utilisateurId < 0) {
      console.log(`  demande_achat id=${row.id}: "${row.demandeur}" is not a real id — clearing to null`);
      resolved++;
      if (!dryRun) {
        await prisma.demandeAchat.update({ where: { id: row.id }, data: { demandeur: null } });
      }
      continue;
    }

    const result = await pool
      .request()
      .input("id", sql.Int, utilisateurId)
      .query("SELECT login FROM utilisateur WHERE id = @id");

    const realLogin = result.recordset[0]?.login as string | undefined;

    if (!realLogin) {
      console.log(`  demande_achat id=${row.id}: no utilisateur found for id=${utilisateurId} — left as-is`);
      stillMissing++;
      continue;
    }

    console.log(`  demande_achat id=${row.id}: "${row.demandeur}" -> "${realLogin}"`);
    resolved++;

    if (!dryRun) {
      await prisma.demandeAchat.update({ where: { id: row.id }, data: { demandeur: realLogin } });
    }
  }

  await pool.close();
  await prisma.$disconnect();

  console.log(`\nResolved: ${resolved}, still missing a real match: ${stillMissing}`);
  if (dryRun) {
    console.log("Dry run — no changes written. Re-run without --dry-run to apply.");
  } else {
    console.log("=== Done. Verify with: SELECT COUNT(*) FROM demande_achat WHERE demandeur LIKE 'utilisateur#%'; ===");
  }
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
