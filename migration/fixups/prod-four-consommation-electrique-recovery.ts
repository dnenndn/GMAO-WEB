/**
 * Recovery script for prod_four_consommation_electrique — confirmed via
 * a diagnostic panel in the app itself that only 1 row exists in the
 * already-migrated Postgres database (dated 2026-08-31, clearly a
 * manual test entry), while the reference screenshots showed a full
 * month of real daily meter readings in the legacy app. This table was
 * apparently missed entirely during the original SQL Server -> Postgres
 * migration, unlike most other tables in this project which were
 * migrated but sometimes mislabeled (see the other fixups/ scripts).
 *
 * idUnite is a required FK in the Postgres schema, but the reference
 * screen has no unit selector at all (confirmed against the real UI
 * screenshot) — if the source table doesn't have a comparable column,
 * every recovered row is assigned the first active ParametreUniteArticle,
 * same fallback the app's own insert action already uses.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/prod-four-consommation-electrique-recovery.ts --dry-run
 *   npx tsx migration/fixups/prod-four-consommation-electrique-recovery.ts
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
  console.log(`=== prod_four_consommation_electrique recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

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

  const result = await pool.request().query("SELECT * FROM prod_four_consommation_electrique ORDER BY date");
  const rows = result.recordset as Record<string, unknown>[];
  console.log(`Read ${rows.length} rows from the real SQL Server source.`);

  if (rows.length === 0) {
    console.log("No rows found in the source table — nothing to recover. Double-check the table name if this is unexpected.");
    await pool.close();
    return;
  }

  console.log("Columns found in source row:", Object.keys(rows[0]));

  const prisma = new PrismaClient();

  const fallbackUnite = await prisma.parametreUniteArticle.findFirst({
    where: { deleted: false },
    orderBy: { id: "asc" },
  });
  if (!fallbackUnite) {
    throw new Error("No active ParametreUniteArticle found in Postgres — needed as a fallback idUnite. Aborting.");
  }

  let created = 0;
  let skippedExisting = 0;
  let skippedNoDate = 0;

  for (const row of rows) {
    const rawDate = row["date"];
    if (!rawDate) {
      skippedNoDate++;
      continue;
    }
    const date = new Date(rawDate as string | number | Date);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.prodFourConsommationElectrique.findFirst({
      where: { date: { gte: dayStart, lte: dayEnd } },
    });
    if (existing) {
      skippedExisting++;
      continue;
    }

    // The source's id_unite doesn't reliably match ParametreUniteArticle
    // (a real run hit an FK violation on the very first row) — it likely
    // targets a different table entirely in the legacy schema (probably
    // Equipement, matching how "unité" is used elsewhere in this app,
    // rather than a measurement-unit table). Since this field isn't
    // shown or used anywhere in the actual UI (confirmed against the
    // real reference screenshot — no unit selector at all), every row
    // is assigned the fallback rather than trusting an unverified FK
    // from a different source table structure.
    const idUnite = fallbackUnite.id;

    console.log(`  ${date.toISOString().slice(0, 10)}: creating`);
    created++;

    if (!dryRun) {
      await prisma.prodFourConsommationElectrique.create({
        data: {
          date,
          idUnite,
          consMatin: row["cons_matin"] != null ? Number(row["cons_matin"]) : null,
          consPointe: row["cons_pointe"] != null ? Number(row["cons_pointe"]) : null,
          consNuit: row["cons_nuit"] != null ? Number(row["cons_nuit"]) : null,
          consSoir: row["cons_soir"] != null ? Number(row["cons_soir"]) : null,
        },
      });
    }
  }

  await pool.close();
  await prisma.$disconnect();

  console.log(`\nWould create: ${created}, already exist (skipped): ${skippedExisting}, no date (skipped): ${skippedNoDate}`);
  if (dryRun) {
    console.log("Dry run — no changes written. Re-run without --dry-run to apply.");
  } else {
    console.log("=== Done. Récap should now show the recovered daily readings. ===");
  }
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
