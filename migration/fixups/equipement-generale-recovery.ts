/**
 * Dedicated recovery for equipement_generale — the generic
 * sync-table.ts script failed on all 18,657 missing rows with an FK
 * violation on id_equipement, exactly the kind of table-specific
 * quirk it was never meant to handle (it has no FK validation at
 * all). This script does that validation properly: checks id_equipement
 * against real Postgres Equipement ids upfront, and only inserts rows
 * whose target equipment genuinely exists.
 *
 * Matches by idEquipement (a real @unique column on this model — one
 * row per equipment, not by id), so this is safe to re-run.
 *
 * Usage:
 *   npx tsx migration/fixups/equipement-generale-recovery.ts --dry-run
 *   npx tsx migration/fixups/equipement-generale-recovery.ts
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
  console.log(`=== equipement_generale recovery ${dryRun ? "(DRY RUN)" : ""} ===\n`);

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
    const validEquipementIds = new Set(
      (await prisma.equipement.findMany({ select: { id: true } })).map((e) => e.id)
    );
    console.log(`Postgres has ${validEquipementIds.size} real équipement row(s) to match against.`);

    const existingEquipementIds = new Set(
      (await prisma.equipementGenerale.findMany({ select: { idEquipement: true } })).map((r) => r.idEquipement)
    );
    console.log(`Postgres already has ${existingEquipementIds.size} equipement_generale row(s).\n`);

    const result = await pool.request().query(`
      SELECT id, id_equipement, reference, marque, n_serie, n_modele, n_contrat,
             n_immobilisation, fabricant, cout_achat, date_achat, date_mise_en_service,
             date_fin_garentie, date_fin_amortissement, fonction_req
      FROM equipement_generale
    `);
    const rows = result.recordset as {
      id: number;
      id_equipement: number;
      reference: string | null;
      marque: string | null;
      n_serie: string | null;
      n_modele: string | null;
      n_contrat: string | null;
      n_immobilisation: string | null;
      fabricant: string | null;
      cout_achat: string | null;
      date_achat: Date | null;
      date_mise_en_service: Date | null;
      date_fin_garentie: Date | null;
      date_fin_amortissement: Date | null;
      fonction_req: string | null;
    }[];
    console.log(`Real SQL Server source: ${rows.length} row(s).\n`);

    let inserted = 0;
    let skippedExisting = 0;
    let orphaned = 0;

    for (const row of rows) {
      if (!validEquipementIds.has(row.id_equipement)) {
        orphaned++;
        continue;
      }
      if (existingEquipementIds.has(row.id_equipement)) {
        skippedExisting++;
        continue;
      }

      if (!dryRun) {
        await prisma.equipementGenerale.create({
          data: {
            idEquipement: row.id_equipement,
            reference: row.reference,
            marque: row.marque,
            nSerie: row.n_serie,
            nModele: row.n_modele,
            nContrat: row.n_contrat,
            nImmobilisation: row.n_immobilisation,
            fabricant: row.fabricant,
            coutAchat: row.cout_achat,
            dateAchat: row.date_achat,
            dateMiseEnService: row.date_mise_en_service,
            dateFinGarantie: row.date_fin_garentie,
            dateFinAmortissement: row.date_fin_amortissement,
            fonctionReq: row.fonction_req,
          },
        });
      }
      existingEquipementIds.add(row.id_equipement); // guard against duplicate id_equipement within the source itself
      inserted++;
    }

    console.log(`${dryRun ? "Would insert" : "Inserted"}: ${inserted}`);
    console.log(`Already present: ${skippedExisting}`);
    console.log(`Orphaned (id_equipement not in Postgres): ${orphaned}`);
    if (dryRun) console.log("\nDry run — no changes written. Re-run without --dry-run to apply.");
  } finally {
    await pool.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Recovery failed:", err);
  process.exit(1);
});
