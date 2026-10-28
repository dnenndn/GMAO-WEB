/**
 * Diagnostic: compares the real article count in SQL Server (the
 * original source) against what's actually in Postgres (the migrated
 * database), to determine whether the Articles list is missing data
 * because of a genuine migration gap — the same question already
 * confirmed once for prod_four_consommation_electrique (only 1 of 250
 * real rows had made it across) — or whether the counts actually
 * match and the perceived gap is something else (a difference in what
 * counts as "deleted", for instance).
 *
 * Read-only — this only counts and compares, it does not write
 * anything to either database.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/article-count-diagnostic.ts
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
  console.log("=== Article count diagnostic (SQL Server vs Postgres) ===\n");

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

  const prisma = new PrismaClient();

  // Total rows in SQL Server, no filter at all — the real, complete count.
  const sqlTotalResult = await pool.request().query("SELECT COUNT(*) AS c FROM article");
  const sqlTotal = sqlTotalResult.recordset[0].c;

  // Check whether SQL Server's article table even has a "deleted"-style
  // column at all, since if it doesn't, "deleted" may have been an
  // assumption made in Postgres's schema, not something the source data
  // actually distinguishes.
  const columnsResult = await pool
    .request()
    .query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'article'");
  const sqlColumns: string[] = columnsResult.recordset.map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME);
  console.log("Real SQL Server article columns:", sqlColumns.join(", "));

  const hasDeletedColumn = sqlColumns.some((c) => c.toLowerCase() === "deleted");
  let sqlActiveCount = sqlTotal;
  if (hasDeletedColumn) {
    const activeResult = await pool.request().query("SELECT COUNT(*) AS c FROM article WHERE deleted = 0 OR deleted IS NULL");
    sqlActiveCount = activeResult.recordset[0].c;
  }

  // Postgres counts, both including and excluding soft-deleted rows.
  const pgTotal = await prisma.article.count();
  const pgActive = await prisma.article.count({ where: { deleted: false } });

  await pool.close();
  await prisma.$disconnect();

  console.log("\n--- Counts ---");
  console.log(`SQL Server — total rows in article table:        ${sqlTotal}`);
  if (hasDeletedColumn) {
    console.log(`SQL Server — rows where deleted = 0/NULL:         ${sqlActiveCount}`);
  } else {
    console.log(`SQL Server — no 'deleted' column found in source (Postgres's deleted flag isn't sourced from this column)`);
  }
  console.log(`Postgres   — total rows (any deleted status):      ${pgTotal}`);
  console.log(`Postgres   — rows where deleted = false (what the list page shows): ${pgActive}`);

  console.log("\n--- Verdict ---");
  if (pgTotal < sqlTotal) {
    console.log(
      `MIGRATION GAP CONFIRMED: ${sqlTotal - pgTotal} article row(s) exist in the real SQL Server source but are missing entirely from Postgres.`
    );
  } else if (pgTotal === sqlTotal && pgActive < sqlActiveCount) {
    console.log(
      `All rows migrated, but ${sqlActiveCount - pgActive} more are marked deleted=false in the real source than in Postgres — worth checking how the migration script decided each row's deleted flag.`
    );
  } else if (pgTotal === sqlTotal) {
    console.log("Counts match — every article row from SQL Server is present in Postgres. The Articles list page itself is showing everything that exists.");
  } else {
    console.log("Postgres has more rows than SQL Server currently does — unexpected; worth a closer look manually.");
  }
}

main().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
