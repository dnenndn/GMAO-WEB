/**
 * Data-recovery fix for 3 tables found to have the same class of bug as
 * DemandeAchat.statut (migration/fixups/da-statut-recovery.ts): the
 * original migration collapsed each table's real integer-coded statut
 * into a generic "Clôturée"/"En cours" binary split, losing the real
 * distinction entirely. Confirmed directly — after applying the
 * relabeling-only fix in misc-statut-recovery.ts, these 3 tables still
 * showed "Clôturée"/"En cours" in real Postgres data instead of the
 * expected raw digit-strings, meaning nothing was left to relabel; the
 * real values were already gone from Postgres. This script re-reads the
 * REAL integer values directly from the original SQL Server source and
 * corrects the already-migrated Postgres rows to match — a recovery
 * pass, not a relabeling one (rows already exist; only their statut is
 * wrong and unrecoverable from Postgres alone).
 *
 * Confirmed real mappings (see misc-statut-recovery.ts's header for the
 * full C# source trail):
 *   bon_livraison: 0="Non Facturé", 1="Facturé"
 *   dop:           0="En attente", 1="Confirmée", 5="Annulée"
 *   devis:         0="En attente" (only value confirmed so far)
 *
 * Usage (from the project root, same env files the main migration uses):
 *   npx tsx migration/fixups/bl-dop-devis-recovery.ts --dry-run
 *   npx tsx migration/fixups/bl-dop-devis-recovery.ts
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

type TableSpec = {
  sourceTable: string;
  model: "bonLivraison" | "dop" | "devis";
  map: Record<number, string>;
};

const TABLES: TableSpec[] = [
  { sourceTable: "bon_livraison", model: "bonLivraison", map: { 0: "Non Facturé", 1: "Facturé" } },
  { sourceTable: "dop", model: "dop", map: { 0: "En attente", 1: "Confirmée", 5: "Annulée" } },
  { sourceTable: "devis", model: "devis", map: { 0: "En attente" } },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== BL / DOP / Devis statut recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

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

  for (const table of TABLES) {
    console.log(`\n--- ${table.sourceTable} ---`);
    const result = await pool.request().query(`SELECT id, statut FROM ${table.sourceTable}`);
    const rows = result.recordset as { id: number; statut: number | null }[];
    console.log(`Read ${rows.length} rows from the real source.`);

    const byValue: Record<string, number[]> = {};
    const unexpected: { id: number; statut: number | null }[] = [];

    for (const r of rows) {
      if (r.statut == null || !(r.statut in table.map)) {
        unexpected.push(r);
        continue;
      }
      const label = table.map[r.statut];
      (byValue[label] ??= []).push(r.id);
    }

    for (const [label, ids] of Object.entries(byValue)) {
      console.log(`  ${label}: ${ids.length} row(s)`);
    }
    if (unexpected.length > 0) {
      console.log(`  ⚠ ${unexpected.length} row(s) had an unrecognized statut — NOT touched:`);
      for (const u of unexpected.slice(0, 10)) console.log(`    id=${u.id} statut=${u.statut}`);
      if (unexpected.length > 10) console.log(`    ...and ${unexpected.length - 10} more`);
    }

    if (dryRun) continue;

    for (const [label, ids] of Object.entries(byValue)) {
      // @ts-expect-error — dynamic model access
      const res = await prisma[table.model].updateMany({
        where: { id: { in: ids } },
        data: { statut: label },
      });
      console.log(`  applied "${label}": ${res.count} row(s) updated`);
    }
  }

  await pool.close();
  await prisma.$disconnect();

  if (dryRun) {
    console.log("\nDry run — no changes written. Re-run without --dry-run to apply.");
  } else {
    console.log("\n=== Done. Verify each table with: SELECT statut, COUNT(*) FROM <table> GROUP BY statut; ===");
  }
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
