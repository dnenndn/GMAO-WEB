/**
 * Legacy data migration — entry point.
 *
 * Usage:
 *   npm run migrate:legacy                # runs everything, in order
 *   npm run migrate:legacy -- --dry-run    # logs counts/samples, writes nothing
 *   npm run migrate:legacy -- --only=core  # runs a single tier (see TIERS below)
 *
 * See migration/README.md before running this for real — it MUST be run
 * against a copy/staging Postgres database first, not production, since
 * this has never been tested against real data (no live SQL Server was
 * reachable in the environment this was written in).
 */

import { config } from "dotenv";
config({ path: ".env.migration" });

import { PrismaClient } from "@prisma/client";
import { closeLegacyPool } from "./db";
import { migrateCoreReferenceData } from "./modules/01-core-reference";
import { migrateMasterData } from "./modules/02-master-data";
import { migrateMaintenanceData } from "./modules/03-maintenance";
import { migrateInventoryProcurement } from "./modules/04-inventory-procurement";
import { migrateWorkshop } from "./modules/05-workshop";
import { migrateProduction } from "./modules/06-production";
import { migrateFleet } from "./modules/07-fleet";
import { migrateBudget } from "./modules/08-budget";
import { migrateProcurementQuotesInvoicing } from "./modules/09-procurement-quotes-invoicing";
import { migrateSubcontracting } from "./modules/10-subcontracting";
import { migratePreventiveMaintenance } from "./modules/11-preventive-maintenance";
import { migrateDaActionHistory } from "./modules/12-da-action-history";
import { migrateDiagnostics } from "./modules/13-diagnostics";
import { migrateArticleCharacteristicsUnits } from "./modules/14-article-characteristics-units";
import { migrateEquipementDetailTabs } from "./modules/15-equipement-detail-tabs";
import { migrateGammeOtResources } from "./modules/16-gamme-ot-resources";
import { migrateAutoReorder } from "./modules/17-auto-reorder";
import { migrateSchemaReadyGapClosure } from "./modules/18-schema-ready-gap-closure";
import { migrateFournisseurReference } from "./modules/19-fournisseur-reference";
import { migrateArticleReference } from "./modules/20-article-reference";
import { migrateNotification } from "./modules/21-notification";
import { migrateActiviteScoping } from "./modules/22-activite-scoping";
import { migrateOtEquipementMisc } from "./modules/23-ot-equipement-misc";
import { migrateProductionRemaining } from "./modules/24-production-remaining";
import { migrateRemainingSmallTables } from "./modules/25-remaining-small-tables";
import { migrateParametreImage } from "./modules/26-parametre-image";

const prisma = new PrismaClient();

// Tiers run in this order — each depends only on tiers before it. Add new
// modules here as they're written; see migration/README.md for the full
// planned tier list and what's covered so far.
const TIERS: { name: string; run: (prisma: PrismaClient, dryRun: boolean) => Promise<void> }[] = [
  { name: "core", run: migrateCoreReferenceData },
  { name: "master", run: migrateMasterData },
  { name: "maintenance", run: migrateMaintenanceData },
  { name: "inventory-procurement", run: migrateInventoryProcurement },
  { name: "workshop", run: migrateWorkshop },
  { name: "production", run: migrateProduction },
  { name: "fleet", run: migrateFleet },
  { name: "budget", run: migrateBudget },
  { name: "procurement-quotes-invoicing", run: migrateProcurementQuotesInvoicing },
  { name: "subcontracting", run: migrateSubcontracting },
  { name: "preventive-maintenance", run: migratePreventiveMaintenance },
  { name: "da-action-history", run: migrateDaActionHistory },
  { name: "diagnostics", run: migrateDiagnostics },
  { name: "article-characteristics-units", run: migrateArticleCharacteristicsUnits },
  { name: "equipement-detail-tabs", run: migrateEquipementDetailTabs },
  { name: "gamme-ot-resources", run: migrateGammeOtResources },
  { name: "auto-reorder", run: migrateAutoReorder },
  { name: "schema-ready-gap-closure", run: migrateSchemaReadyGapClosure },
  { name: "fournisseur-reference", run: migrateFournisseurReference },
  { name: "article-reference", run: migrateArticleReference },
  { name: "notification", run: migrateNotification },
  { name: "activite-scoping", run: migrateActiviteScoping },
  { name: "ot-equipement-misc", run: migrateOtEquipementMisc },
  { name: "production-remaining", run: migrateProductionRemaining },
  { name: "remaining-small-tables", run: migrateRemainingSmallTables },
  { name: "parametre-image", run: migrateParametreImage },
];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.split("=")[1] : null;

  console.log(`\n=== Legacy data migration ${dryRun ? "(DRY RUN)" : ""} ===\n`);

  const tiers = only ? TIERS.filter((t) => t.name === only) : TIERS;
  if (only && tiers.length === 0) {
    console.error(`Unknown tier "${only}". Available: ${TIERS.map((t) => t.name).join(", ")}`);
    process.exit(1);
  }

  for (const tier of tiers) {
    console.log(`\n--- Tier: ${tier.name} ---`);
    await tier.run(prisma, dryRun);
  }

  console.log(`\n=== Done${dryRun ? " (dry run — nothing was written)" : ""} ===\n`);
}

main()
  .catch((e) => {
    console.error("\nMigration failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await closeLegacyPool();
  });
