/**
 * Migrates the DA status-transition audit trail — 8 real tables found
 * via a data-completeness audit that were never migrated at all (not
 * a partial-migration bug like électricité; this data simply never
 * made it across). da_reenvoyer is skipped — confirmed 0 rows in the
 * real source.
 *
 * Safe to re-run: matches existing Postgres rows by (idDa, date,
 * heure) — the same natural key each of these tables' real shape
 * gives us — and only inserts what's missing.
 *
 * Usage:
 *   npx tsx migration/fixups/da-historique-recovery.ts --dry-run
 *   npx tsx migration/fixups/da-historique-recovery.ts
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
  sqlTable: string;
  dateCol: string;
  heureCol: string;
  extraCols: string[];
  find: (prisma: PrismaClient, idDa: number, date: Date, heure: string | null) => Promise<{ id: number } | null>;
  create: (prisma: PrismaClient, row: Record<string, unknown>) => Promise<unknown>;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== DA audit-history recovery ${dryRun ? "(DRY RUN)" : ""} ===\n`);

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

  const specs: TableSpec[] = [
    {
      sqlTable: "da_administrateur",
      dateCol: "date_envoyer",
      heureCol: "heure_envoyer",
      extraCols: ["envoyer_par"],
      find: (p, idDa, date, heure) => p.daAdministrateur.findFirst({ where: { idDa, dateEnvoyer: date, heureEnvoyer: heure } }),
      create: (p, r) =>
        p.daAdministrateur.create({
          data: { idDa: r.id_da as number, envoyerPar: r.envoyer_par as number | null, dateEnvoyer: r.date_envoyer as Date, heureEnvoyer: r.heure_envoyer as string | null },
        }),
    },
    {
      sqlTable: "da_cloturer",
      dateCol: "date_cloture",
      heureCol: "heure_cloture",
      extraCols: ["cloturer_par"],
      find: (p, idDa, date, heure) => p.daCloturer.findFirst({ where: { idDa, dateCloture: date, heureCloture: heure } }),
      create: (p, r) =>
        p.daCloturer.create({
          data: { idDa: r.id_da as number, cloturerPar: r.cloturer_par as number | null, dateCloture: r.date_cloture as Date, heureCloture: r.heure_cloture as string | null },
        }),
    },
    {
      sqlTable: "da_confirmer",
      dateCol: "date_confirmer",
      heureCol: "heure_confirmer",
      extraCols: ["confirmer_par"],
      find: (p, idDa, date, heure) => p.daConfirmer.findFirst({ where: { idDa, dateConfirmer: date, heureConfirmer: heure } }),
      create: (p, r) =>
        p.daConfirmer.create({
          data: { idDa: r.id_da as number, confirmerPar: r.confirmer_par as number | null, dateConfirmer: r.date_confirmer as Date, heureConfirmer: r.heure_confirmer as string | null },
        }),
    },
    {
      sqlTable: "da_modifier",
      dateCol: "date_modifier",
      heureCol: "heure_modifier",
      extraCols: ["modifier_par"],
      find: (p, idDa, date, heure) => p.daModifier.findFirst({ where: { idDa, dateModifier: date, heureModifier: heure } }),
      create: (p, r) =>
        p.daModifier.create({
          data: { idDa: r.id_da as number, modifierPar: r.modifier_par as number | null, dateModifier: r.date_modifier as Date, heureModifier: r.heure_modifier as string | null },
        }),
    },
    {
      sqlTable: "da_refuser",
      dateCol: "date_refus",
      heureCol: "heure_refus",
      extraCols: ["refuser_par", "cause"],
      find: (p, idDa, date, heure) => p.daRefuser.findFirst({ where: { idDa, dateRefus: date, heureRefus: heure } }),
      create: (p, r) =>
        p.daRefuser.create({
          data: { idDa: r.id_da as number, refuserPar: r.refuser_par as number | null, dateRefus: r.date_refus as Date, heureRefus: r.heure_refus as string | null, cause: r.cause as string | null },
        }),
    },
    {
      sqlTable: "da_reporter",
      dateCol: "date_report",
      heureCol: "heure_report",
      extraCols: ["reporter_par", "nouvel_date"],
      find: (p, idDa, date, heure) => p.daReporter.findFirst({ where: { idDa, dateReport: date, heureReport: heure } }),
      create: (p, r) =>
        p.daReporter.create({
          data: { idDa: r.id_da as number, reporterPar: r.reporter_par as number | null, dateReport: r.date_report as Date, heureReport: r.heure_report as string | null, nouvelDate: r.nouvel_date as Date | null },
        }),
    },
    {
      sqlTable: "da_retourner",
      dateCol: "date_retourner",
      heureCol: "heure_retourner",
      extraCols: ["retourner_par"],
      find: (p, idDa, date, heure) => p.daRetourner.findFirst({ where: { idDa, dateRetourner: date, heureRetourner: heure } }),
      create: (p, r) =>
        p.daRetourner.create({
          data: { idDa: r.id_da as number, retournerPar: r.retourner_par as number | null, dateRetourner: r.date_retourner as Date, heureRetourner: r.heure_retourner as string | null },
        }),
    },
    {
      sqlTable: "da_vue",
      dateCol: "date_vue",
      heureCol: "heure_vue",
      extraCols: ["vue_par"],
      find: (p, idDa, date, heure) => p.daVue.findFirst({ where: { idDa, dateVue: date, heureVue: heure } }),
      create: (p, r) =>
        p.daVue.create({
          data: { idDa: r.id_da as number, vuePar: r.vue_par as number | null, dateVue: r.date_vue as Date, heureVue: r.heure_vue as string | null },
        }),
    },
  ];

  try {
    const validDaIds = new Set((await prisma.demandeAchat.findMany({ select: { id: true } })).map((d) => d.id));
    console.log(`Postgres has ${validDaIds.size} real demande_achat row(s) to match against.\n`);

    let grandInserted = 0;
    let grandSkipped = 0;
    let grandOrphaned = 0;

    for (const spec of specs) {
      const columns = ["id_da", spec.dateCol, spec.heureCol, ...spec.extraCols.filter((c) => c !== spec.dateCol && c !== spec.heureCol)];
      const uniqueColumns = [...new Set(columns)];
      const result = await pool.request().query(`SELECT ${uniqueColumns.join(", ")} FROM ${spec.sqlTable}`);
      const rows = result.recordset as Record<string, unknown>[];
      console.log(`${spec.sqlTable}: ${rows.length} real row(s) in SQL Server.`);

      let inserted = 0;
      let skipped = 0;
      let orphaned = 0;

      for (const row of rows) {
        const idDa = row.id_da as number;

        // A real, confirmed case (not theoretical) — some of these
        // audit rows reference a demande_achat id that doesn't exist
        // in Postgres. Rather than let one bad row crash the whole
        // script (as a raw FK violation did on a real run), each
        // orphaned row is skipped and counted, so the rest of the
        // real, valid history still gets migrated.
        if (!validDaIds.has(idDa)) {
          orphaned++;
          continue;
        }

        const date = row[spec.dateCol] as Date;
        const heure = (row[spec.heureCol] as string | null) ?? null;

        const existing = await spec.find(prisma, idDa, date, heure);
        if (existing) {
          skipped++;
          continue;
        }

        if (!dryRun) {
          await spec.create(prisma, row);
        }
        inserted++;
      }

      console.log(`  ${dryRun ? "would insert" : "inserted"}: ${inserted}, already present: ${skipped}, orphaned (id_da not in Postgres): ${orphaned}\n`);
      grandInserted += inserted;
      grandSkipped += skipped;
      grandOrphaned += orphaned;
    }

    console.log(`Total: ${dryRun ? "would insert" : "inserted"} ${grandInserted}, already present ${grandSkipped}, orphaned ${grandOrphaned}.`);
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
