/**
 * Full data-completeness audit: compares row counts for EVERY table
 * between the real SQL Server source and Postgres, in one pass. Built
 * directly off the pattern that found the électricité gap (only 1 of
 * 250 real rows had ever been migrated) — this generalizes that same
 * check across every table at once, so gaps like that one can be
 * found proactively instead of one confused bug report at a time.
 *
 * Entirely read-only. Doesn't write anything, doesn't fix anything —
 * just reports. For any real gap it finds, the next step is either
 * migration/fixups/sync-table.ts (for a straightforward "just add the
 * missing rows" case) or a dedicated fixup script (if the gap turns
 * out to have the kind of real complication électricité's idUnite
 * mismatch did).
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/data-completeness-audit.ts
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

type Row = {
  table: string;
  sqlCount: number | null;
  pgCount: number | null;
};

async function main() {
  console.log("=== Full data-completeness audit (SQL Server vs Postgres) ===\n");
  console.log("This can take a few minutes on a large database — it counts every table on both sides.\n");

  const pool = await sql.connect({
    server: requireEnv("LEGACY_DB_SERVER"),
    database: requireEnv("LEGACY_DB_NAME"),
    user: requireEnv("LEGACY_DB_USER"),
    password: requireEnv("LEGACY_DB_PASSWORD"),
    port: process.env.LEGACY_DB_PORT ? Number(process.env.LEGACY_DB_PORT) : 1433,
    connectionTimeout: 60000,
    requestTimeout: 1200000,
    options: {
      encrypt: process.env.LEGACY_DB_ENCRYPT !== "false",
      trustServerCertificate: true,
    },
  });

  const prisma = new PrismaClient();

  try {
    const sqlTablesResult = await pool
      .request()
      .query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    const sqlTables: string[] = sqlTablesResult.recordset.map((r: { TABLE_NAME: string }) => r.TABLE_NAME);

    const pgTablesResult = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const pgTables = new Set(pgTablesResult.map((r) => r.table_name));

    console.log(`Real SQL Server source: ${sqlTables.length} tables.`);
    console.log(`Postgres: ${pgTables.size} tables.\n`);

    const onlyInSql = sqlTables.filter((t) => !pgTables.has(t));
    if (onlyInSql.length > 0) {
      console.log(`⚠ TABLES THAT EXIST IN SQL SERVER BUT HAVE NO MATCHING TABLE IN POSTGRES AT ALL (${onlyInSql.length}):`);
      console.log(`  This is the électricité-style case — check whether these were meant to be migrated.`);
      for (const t of onlyInSql) console.log(`    - ${t}`);
      console.log("");
    }

    const results: Row[] = [];
    let processed = 0;

    for (const table of sqlTables) {
      if (!pgTables.has(table)) continue; // already reported above
      processed++;
      if (processed % 25 === 0) console.log(`  ...checked ${processed} tables so far`);

      let sqlCount: number | null = null;
      let pgCount: number | null = null;

      try {
        const r = await pool.request().query(`SELECT COUNT(*) AS c FROM [${table}]`);
        sqlCount = r.recordset[0].c;
      } catch {
        sqlCount = null;
      }

      try {
        const r = await prisma.$queryRawUnsafe<{ c: bigint }[]>(`SELECT COUNT(*) AS c FROM "${table}"`);
        pgCount = Number(r[0].c);
      } catch {
        pgCount = null;
      }

      results.push({ table, sqlCount, pgCount });
    }

    console.log(`\nChecked ${processed} shared tables.\n`);

    const mismatches = results
      .filter((r) => r.sqlCount != null && r.pgCount != null && r.sqlCount !== r.pgCount)
      .sort((a, b) => (b.sqlCount! - b.pgCount!) - (a.sqlCount! - a.pgCount!));

    const matches = results.filter((r) => r.sqlCount != null && r.pgCount != null && r.sqlCount === r.pgCount);
    const errored = results.filter((r) => r.sqlCount == null || r.pgCount == null);

    if (mismatches.length > 0) {
      console.log(`⚠ MISMATCHED ROW COUNTS (${mismatches.length}) — sorted by largest gap first:\n`);
      console.log(`  ${"Table".padEnd(45)} ${"SQL Server".padStart(12)} ${"Postgres".padStart(12)} ${"Missing".padStart(10)}`);
      for (const r of mismatches) {
        const gap = r.sqlCount! - r.pgCount!;
        console.log(
          `  ${r.table.padEnd(45)} ${String(r.sqlCount).padStart(12)} ${String(r.pgCount).padStart(12)} ${String(gap).padStart(10)}`
        );
      }
      console.log("");
    } else {
      console.log("No row-count mismatches found among shared tables.\n");
    }

    if (errored.length > 0) {
      console.log(`Could not check ${errored.length} table(s) (query failed on one side — often a reserved-word table name):`);
      for (const r of errored) console.log(`    - ${r.table}`);
      console.log("");
    }

    console.log(`Summary: ${matches.length} tables match exactly, ${mismatches.length} mismatched, ${errored.length} couldn't be checked, ${onlyInSql.length} missing entirely from Postgres.`);
  } finally {
    await pool.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
