/**
 * Investigates why 18,657 of 43,576 equipement_generale rows (43%)
 * have an id_equipement that doesn't match any real Postgres
 * Equipement id — too large a fraction to be ordinary orphaned/
 * deleted-record noise, so this checks the real cause directly rather
 * than assuming.
 *
 * Read-only.
 *
 * Usage:
 *   npx tsx migration/fixups/investigate-equipement-generale-gap.ts
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
  console.log("=== Investigating equipement_generale's id_equipement gap ===\n");

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
    const sqlEquipRange = await pool.request().query("SELECT MIN(id) AS minId, MAX(id) AS maxId, COUNT(*) AS c FROM equipement");
    console.log("SQL Server equipement:", sqlEquipRange.recordset[0]);

    const pgEquipRange = await prisma.equipement.aggregate({ _min: { id: true }, _max: { id: true }, _count: true });
    console.log("Postgres equipement:", { minId: pgEquipRange._min.id, maxId: pgEquipRange._max.id, count: pgEquipRange._count });

    const sqlGenRange = await pool.request().query("SELECT MIN(id_equipement) AS minId, MAX(id_equipement) AS maxId, COUNT(*) AS c FROM equipement_generale");
    console.log("SQL Server equipement_generale.id_equipement range:", sqlGenRange.recordset[0]);

    const validEquipementIds = new Set(
      (await prisma.equipement.findMany({ select: { id: true } })).map((e) => e.id)
    );
    const genResult = await pool.request().query("SELECT id, id_equipement FROM equipement_generale");
    const genRows = genResult.recordset as { id: number; id_equipement: number }[];
    const orphanedIds = genRows.filter((r) => !validEquipementIds.has(r.id_equipement)).map((r) => r.id_equipement);

    console.log(`\n${orphanedIds.length} orphaned id_equipement value(s) found (against Postgres).`);
    const sample = orphanedIds.slice(0, 15);
    console.log("Sample of orphaned ids:", sample);

    if (sample.length > 0) {
      const sqlCheck = await pool
        .request()
        .query(`SELECT id FROM equipement WHERE id IN (${sample.join(",")})`);
      const foundInSql = new Set(sqlCheck.recordset.map((r: { id: number }) => r.id));
      console.log(`\nOf those ${sample.length} sampled orphaned ids, ${foundInSql.size} DO exist in SQL Server's own real equipement table.`);
      console.log("Which ones exist in SQL Server:", sample.filter((id) => foundInSql.has(id)));
      console.log("Which ones don't exist anywhere (source or Postgres):", sample.filter((id) => !foundInSql.has(id)));
    }

    console.log("\n--- Verdict ---");
    console.log("If most/all sampled ids DO exist in SQL Server's own equipement table:");
    console.log("  -> Those équipement rows themselves never made it into Postgres — a real,");
    console.log("     separate gap in the équipement table itself, not an equipement_generale bug.");
    console.log("If most/all sampled ids do NOT exist anywhere, not even in SQL Server:");
    console.log("  -> equipement_generale has genuinely dangling references in the source data");
    console.log("     itself (pre-existing legacy data quality issue, not a migration bug).");
  } finally {
    await pool.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Investigation failed:", err);
  process.exit(1);
});
