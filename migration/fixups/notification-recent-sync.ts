/**
 * Syncs only recent notification rows — the real source has ~10M rows
 * total (only 1.5M+ were ever migrated), and syncing all of it would
 * both take a very long time and likely add years of notification
 * history nobody needs day to day. Defaults to the last 12 months;
 * pass --months N to change that.
 *
 * Uses bulk inserts (createMany) rather than one-row-at-a-time
 * find+create, since even "recent" can still be a large volume on a
 * table this size — the other, much smaller recovery scripts in this
 * project use row-by-row matching because their data is small enough
 * that it doesn't matter; this one specifically can't afford that.
 * Deduplication happens by fetching existing (id) values already in
 * Postgres for the same date range once, up front, rather than a
 * per-row query.
 *
 * Usage:
 *   npx tsx migration/fixups/notification-recent-sync.ts --dry-run
 *   npx tsx migration/fixups/notification-recent-sync.ts
 *   npx tsx migration/fixups/notification-recent-sync.ts --months 6
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
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const monthsIdx = args.indexOf("--months");
  const months = monthsIdx !== -1 ? Number(args[monthsIdx + 1]) : 12;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  console.log(`=== Recent notification sync (last ${months} months, since ${cutoff.toISOString().slice(0, 10)}) ${dryRun ? "(DRY RUN)" : ""} ===\n`);

  const pool = await sql.connect({
    server: requireEnv("LEGACY_DB_SERVER"),
    database: requireEnv("LEGACY_DB_NAME"),
    user: requireEnv("LEGACY_DB_USER"),
    password: requireEnv("LEGACY_DB_PASSWORD"),
    port: process.env.LEGACY_DB_PORT ? Number(process.env.LEGACY_DB_PORT) : 1433,
    connectionTimeout: 60000,
    requestTimeout: 1800000,
    options: {
      encrypt: process.env.LEGACY_DB_ENCRYPT !== "false",
      trustServerCertificate: true,
    },
  });

  const prisma = new PrismaClient();

  try {
    const countResult = await pool
      .request()
      .input("cutoff", sql.DateTime, cutoff)
      .query("SELECT COUNT(*) AS c FROM notification WHERE date_creation >= @cutoff");
    const sourceCount = countResult.recordset[0].c;
    console.log(`Real SQL Server source: ${sourceCount} row(s) in the last ${months} month(s).`);

    const existingIds = await prisma.notification.findMany({
      where: { dateCreation: { gte: cutoff } },
      select: { id: true },
    });
    const existingIdSet = new Set(existingIds.map((r) => r.id));
    console.log(`Postgres already has ${existingIdSet.size} row(s) in that same range.\n`);

    const result = await pool
      .request()
      .input("cutoff", sql.DateTime, cutoff)
      .query(
        "SELECT id, id_n, type, id_utilisateur, description, vue, date_creation FROM notification WHERE date_creation >= @cutoff ORDER BY id"
      );
    const rows = result.recordset as {
      id: number;
      id_n: number | null;
      type: string | null;
      id_utilisateur: number | null;
      description: string | null;
      vue: boolean;
      date_creation: Date | null;
    }[];

    const newRows = rows.filter((r) => !existingIdSet.has(r.id));
    console.log(`${newRows.length} row(s) are new and would be added.\n`);

    // Real ids from the source are preserved on insert (via a raw
    // insert including id, rather than letting Postgres auto-generate
    // new ones) so this stays safely re-runnable and consistent with
    // how every other id in this app was migrated.
    const BATCH_SIZE = 5000;
    let inserted = 0;

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      console.log(`  Processing batch ${i / BATCH_SIZE + 1} (${batch.length} rows)...`);

      if (!dryRun) {
        for (const row of batch) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "notification" (id, id_n, type, id_utilisateur, description, vue, date_creation) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
            row.id,
            row.id_n,
            row.type,
            row.id_utilisateur,
            row.description,
            // mssql returns SQL Server's "bit" type as a plain number
            // (0/1), not a native JS boolean — passed as-is, Postgres
            // rejects it outright rather than implicitly converting
            // (confirmed by a real run: "column «vue» is of type
            // boolean but the expression is of type bigint"). Cast
            // explicitly rather than relying on either driver to
            // coerce it.
            Boolean(row.vue),
            row.date_creation
          );
        }
      }
      inserted += batch.length;
    }

    console.log(`\n${dryRun ? "Would insert" : "Inserted"}: ${inserted}`);
    if (dryRun) {
      console.log("Dry run — no changes written. Re-run without --dry-run to apply.");
    } else {
      console.log("Consider running `SELECT setval('notification_id_seq', (SELECT MAX(id) FROM notification));` afterward,");
      console.log("so future auto-generated ids don't collide with these real, explicitly-inserted ones.");
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
