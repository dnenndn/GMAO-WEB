/**
 * General-purpose incremental sync: pulls only the rows that exist in
 * the real SQL Server source but not yet in Postgres for a given
 * table — never touches or overwrites existing rows, only adds new
 * ones. Run this anytime (a cron job, or just by hand whenever) to
 * catch up on new activity in the legacy system without redoing a
 * full migration.
 *
 * How it decides what's "new": for each table, it reads the real
 * column list from both SQL Server's and Postgres's own information_
 * schema, uses only the columns that exist in both (so a Postgres
 * table missing some legacy column, or vice versa, doesn't break the
 * sync — it just skips columns that don't line up), and inserts any
 * SQL Server row whose id isn't already present in Postgres.
 *
 * IMPORTANT — genuine limits of a generic approach like this, found
 * directly through this project's own real fixups:
 *   - It cannot know about column value quirks. It won't reproduce
 *     the kind of real fix this project needed for
 *     prod_four_consommation_electrique, where the source's id_unite
 *     column pointed at a different real table than Postgres's schema
 *     expects, and blindly copying it caused a live foreign-key
 *     violation. For any table with a known quirk like that, keep
 *     using (or write) a dedicated fixups/ script instead of this one.
 *   - It matches purely by id. If a table's real primary key isn't a
 *     simple integer id column, pass --key to name the right one.
 *   - It only adds rows. It deliberately never updates or deletes
 *     anything already in Postgres — this is a catch-up tool, not a
 *     resync/overwrite tool, on purpose, so it can never clobber real
 *     work already done in the new app.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/sync-table.ts article --dry-run
 *   npx tsx migration/fixups/sync-table.ts article
 *   npx tsx migration/fixups/sync-table.ts prod_four_consommation_electrique --key date --dry-run
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

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const keyIdx = args.indexOf("--key");
  const keyColumn = keyIdx !== -1 ? args[keyIdx + 1] : "id";
  const table = args.find((a) => !a.startsWith("--") && a !== keyColumn);
  return { table, keyColumn, dryRun };
}

async function main() {
  const { table, keyColumn, dryRun } = parseArgs();
  if (!table) {
    console.error("Usage: npx tsx migration/fixups/sync-table.ts <table_name> [--key column] [--dry-run]");
    process.exit(1);
  }

  console.log(`=== Sync: ${table} (key: ${keyColumn}) ${dryRun ? "(DRY RUN)" : ""} ===\n`);

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

  try {
    // Real column lists from both sides — only columns present in both
    // are used, so a mismatch on either side degrades gracefully
    // (fewer columns synced) instead of failing outright.
    const sqlColsResult = await pool
      .request()
      .query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'`);
    const sqlColumns: string[] = sqlColsResult.recordset.map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME);

    if (sqlColumns.length === 0) {
      console.error(`No columns found for '${table}' in the real SQL Server source — check the table name.`);
      await pool.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    const pgColsResult = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      table
    );
    const pgColumns = new Set(pgColsResult.map((r) => r.column_name.toLowerCase()));

    if (pgColumns.size === 0) {
      console.error(`No columns found for '${table}' in Postgres — check the table name (real snake_case name, not the Prisma model name).`);
      await pool.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    const sharedColumns = sqlColumns.filter((c) => pgColumns.has(c.toLowerCase()));
    console.log(`Shared columns (${sharedColumns.length}/${sqlColumns.length} from source): ${sharedColumns.join(", ")}`);

    if (!sharedColumns.some((c) => c.toLowerCase() === keyColumn.toLowerCase())) {
      console.error(`Key column '${keyColumn}' isn't in the shared column list — can't match rows. Check --key.`);
      await pool.close();
      await prisma.$disconnect();
      process.exit(1);
    }

    // Existing keys already in Postgres — anything already here is
    // left completely untouched, on purpose.
    const existingRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT "${keyColumn}" FROM "${table}"`
    );
    const existingKeys = new Set(existingRows.map((r) => String(r[keyColumn])));
    console.log(`Postgres already has ${existingKeys.size} row(s) for this key.`);

    const sourceRowsResult = await pool.request().query(`SELECT ${sharedColumns.map((c) => `[${c}]`).join(", ")} FROM ${table}`);
    const sourceRows = sourceRowsResult.recordset as Record<string, unknown>[];
    console.log(`Real SQL Server source has ${sourceRows.length} row(s) total.\n`);

    const newRows = sourceRows.filter((r) => !existingKeys.has(String(r[keyColumn])));
    console.log(`${newRows.length} row(s) are new and would be added.\n`);

    let inserted = 0;
    let failed = 0;

    for (const row of newRows) {
      const values = sharedColumns.map((c) => row[c] ?? null);
      const placeholders = sharedColumns.map((_, i) => `$${i + 1}`).join(", ");
      const columnList = sharedColumns.map((c) => `"${c}"`).join(", ");
      const insertSql = `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`;

      if (dryRun) {
        console.log(`  Would insert ${keyColumn}=${row[keyColumn]}`);
        inserted++;
        continue;
      }

      try {
        await prisma.$executeRawUnsafe(insertSql, ...values);
        inserted++;
      } catch (err) {
        failed++;
        console.error(`  Failed on ${keyColumn}=${row[keyColumn]}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`\n${dryRun ? "Would insert" : "Inserted"}: ${inserted}, failed: ${failed}`);
    if (dryRun) {
      console.log("Dry run — no changes written. Re-run without --dry-run to apply.");
    }
  } finally {
    await pool.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
