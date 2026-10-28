/**
 * Fixes the confirmed gap in prod_mesure_rapport: 3,788 of 304,931 real
 * rows across its 4 source tables (prod_rapport_four_qualite,
 * prod_rapport_fabrication_qualite, prod_rapport_prep_qualite,
 * prod_rapport_prep_general) never made it into the consolidated
 * Postgres table. Not a simple 1:1 table sync (sync-table.ts doesn't
 * apply here) — this table doesn't exist as one thing in SQL Server,
 * it's a deliberate many-to-one consolidation with a `categorie`
 * discriminator column added during migration, and one of the sources
 * (prep_general) doesn't even have an id_unite column at all.
 *
 * Matches existing Postgres rows by (id_rapport, id_unite, id_saisie,
 * categorie) — the closest thing to a natural key this consolidated
 * shape has, since the original per-table id fields weren't preserved
 * as a shared column. Only inserts rows with no match; never touches
 * anything already there.
 *
 * Usage:
 *   npx tsx migration/fixups/prod-mesure-rapport-recovery.ts --dry-run
 *   npx tsx migration/fixups/prod-mesure-rapport-recovery.ts
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

const SOURCES = [
  { table: "prod_rapport_four_qualite", categorie: "four_qualite", hasUnite: true },
  { table: "prod_rapport_fabrication_qualite", categorie: "fabrication_qualite", hasUnite: true },
  { table: "prod_rapport_prep_qualite", categorie: "prep_qualite", hasUnite: true },
  { table: "prod_rapport_prep_general", categorie: "prep_general", hasUnite: false },
] as const;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== prod_mesure_rapport recovery ${dryRun ? "(DRY RUN)" : ""} ===\n`);

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
    // Existing rows, keyed by the same (id_rapport, id_unite, id_saisie,
    // categorie) tuple used to detect what's already present.
    const existing = await prisma.prodMesureRapport.findMany({
      select: { idRapport: true, idUnite: true, idSaisie: true, categorie: true },
    });
    const existingKeys = new Set(
      existing.map((r) => `${r.idRapport}|${r.idUnite ?? "null"}|${r.idSaisie}|${r.categorie}`)
    );
    console.log(`Postgres already has ${existingKeys.size} row(s).`);

    // Real FK targets, checked upfront — a real run hit an FK violation
    // on the very first insert. idRapport/idSaisie are required
    // (NOT NULL relations), so a row referencing a missing one has to be
    // skipped entirely; idUnite is optional, so a row with an invalid
    // one just has that single field dropped to null rather than
    // losing the whole row's real data.
    const [validRapportIds, validUniteIds, validSaisieIds] = await Promise.all([
      prisma.prodRapportGeneral.findMany({ select: { id: true } }).then((r) => new Set(r.map((x) => x.id))),
      prisma.equipement.findMany({ select: { id: true } }).then((r) => new Set(r.map((x) => x.id))),
      prisma.prodSaisie.findMany({ select: { id: true } }).then((r) => new Set(r.map((x) => x.id))),
    ]);
    console.log(`Valid targets: ${validRapportIds.size} rapport, ${validUniteIds.size} unite (équipement), ${validSaisieIds.size} saisie.\n`);

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalOrphaned = 0;

    for (const source of SOURCES) {
      const columns = source.hasUnite
        ? "id_rapport, id_unite, id_qualite, valeur"
        : "id_rapport, id_qualite, valeur";
      const result = await pool.request().query(`SELECT ${columns} FROM ${source.table}`);
      const rows = result.recordset as Record<string, number>[];
      console.log(`${source.table}: ${rows.length} real row(s) in SQL Server.`);

      let inserted = 0;
      let skipped = 0;
      let orphaned = 0;

      for (const row of rows) {
        const idRapport = row.id_rapport;
        const idSaisie = row.id_qualite;

        if (!validRapportIds.has(idRapport) || !validSaisieIds.has(idSaisie)) {
          orphaned++;
          continue;
        }

        const rawIdUnite = source.hasUnite ? row.id_unite : null;
        const idUnite = rawIdUnite != null && validUniteIds.has(rawIdUnite) ? rawIdUnite : null;

        const key = `${idRapport}|${idUnite ?? "null"}|${idSaisie}|${source.categorie}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        if (!dryRun) {
          await prisma.prodMesureRapport.create({
            data: {
              idRapport,
              idUnite,
              idSaisie,
              categorie: source.categorie,
              valeur: row.valeur,
            },
          });
        }
        existingKeys.add(key); // avoid double-inserting duplicates within the same source
        inserted++;
      }

      console.log(`  ${dryRun ? "would insert" : "inserted"}: ${inserted}, already present: ${skipped}, orphaned (id_rapport/id_saisie not in Postgres): ${orphaned}\n`);
      totalInserted += inserted;
      totalSkipped += skipped;
      totalOrphaned += orphaned;
    }

    console.log(`Total: ${dryRun ? "would insert" : "inserted"} ${totalInserted}, already present ${totalSkipped}, orphaned ${totalOrphaned}.`);
    if (dryRun) console.log("Dry run — no changes written. Re-run without --dry-run to apply.");
  } finally {
    await pool.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Recovery failed:", err);
  process.exit(1);
});
