/**
 * Follow-up investigation for the data-completeness audit's unclear
 * findings — read-only, no writes. Two things:
 *
 * 1. For each of the 15 tables missing from Postgres, shows its real
 *    column structure and row count, so an actual judgment call can be
 *    made about each one (test/system table vs. genuinely missed
 *    data) instead of guessing from the name alone.
 *
 * 2. Specifically checks whether prod_mesure_rapport (which the schema
 *    already documents as a deliberate consolidation of 4 legacy
 *    tables — prod_rapport_four_qualite, prod_rapport_fabrication_
 *    qualite, prod_rapport_prep_qualite, prod_rapport_prep_general)
 *    actually captured every row from all 4 sources, or if it's its
 *    own électricité-style partial migration that the name-matching
 *    audit couldn't see.
 *
 * Usage:
 *   npx tsx migration/fixups/investigate-audit-findings.ts
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

const MISSING_TABLES = [
  "test_equip",
  "prod_rapport_fabrication_qualite",
  "prod_rapport_four_qualite",
  "da_administrateur",
  "prod_rapport_prep_general",
  "da_cloturer",
  "prod_rapport_prep_qualite",
  "da_confirmer",
  "sysdiagrams",
  "da_modifier",
  "da_reenvoyer",
  "da_refuser",
  "da_reporter",
  "da_retourner",
  "da_vue",
];

async function main() {
  console.log("=== Investigating unclear audit findings (read-only) ===\n");

  const pool = await sql.connect({
    server: requireEnv("LEGACY_DB_SERVER"),
    database: requireEnv("LEGACY_DB_NAME"),
    user: requireEnv("LEGACY_DB_USER"),
    password: requireEnv("LEGACY_DB_PASSWORD"),
    port: process.env.LEGACY_DB_PORT ? Number(process.env.LEGACY_DB_PORT) : 1433,
    connectionTimeout: 60000,
    requestTimeout: 300000,
    options: {
      encrypt: process.env.LEGACY_DB_ENCRYPT !== "false",
      trustServerCertificate: true,
    },
  });

  const prisma = new PrismaClient();

  try {
    console.log("--- Part 1: what are the 15 missing tables? ---\n");

    for (const table of MISSING_TABLES) {
      try {
        const countResult = await pool.request().query(`SELECT COUNT(*) AS c FROM [${table}]`);
        const count = countResult.recordset[0].c;

        const colsResult = await pool
          .request()
          .query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION`);
        const cols = colsResult.recordset.map((r: { COLUMN_NAME: string; DATA_TYPE: string }) => `${r.COLUMN_NAME} (${r.DATA_TYPE})`);

        console.log(`${table}: ${count} row(s)`);
        console.log(`  columns: ${cols.join(", ")}`);

        if (count > 0) {
          const sampleResult = await pool.request().query(`SELECT TOP 1 * FROM [${table}]`);
          console.log(`  sample row: ${JSON.stringify(sampleResult.recordset[0])}`);
        }
        console.log("");
      } catch (err) {
        console.log(`${table}: ERROR — ${err instanceof Error ? err.message : err}\n`);
      }
    }

    console.log("\n--- Part 2: does prod_mesure_rapport actually have everything? ---\n");

    const sourceTables = [
      "prod_rapport_four_qualite",
      "prod_rapport_fabrication_qualite",
      "prod_rapport_prep_qualite",
      "prod_rapport_prep_general",
    ];
    let sourceTotal = 0;
    for (const t of sourceTables) {
      const r = await pool.request().query(`SELECT COUNT(*) AS c FROM [${t}]`);
      const c = r.recordset[0].c;
      console.log(`  ${t}: ${c} row(s) in SQL Server`);
      sourceTotal += c;
    }
    console.log(`  Combined real source total: ${sourceTotal}`);

    const pgCount = await prisma.prodMesureRapport.count();
    console.log(`  prod_mesure_rapport in Postgres: ${pgCount} row(s)\n`);

    if (pgCount < sourceTotal) {
      console.log(`⚠ GAP CONFIRMED: ${sourceTotal - pgCount} row(s) from these 4 real source tables never made it into prod_mesure_rapport.`);
    } else if (pgCount === sourceTotal) {
      console.log("✓ Counts match exactly — the consolidation captured everything.");
    } else {
      console.log("Postgres has more rows than the 4 sources combined — unexpected, worth a closer look.");
    }
  } finally {
    await pool.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Investigation failed:", err);
  process.exit(1);
});
