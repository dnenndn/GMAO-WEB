/**
 * Real password migration — corrects an earlier, wrong assumption that
 * real user passwords were never available in the source and were
 * deliberately excluded. Confirmed directly against a real `SELECT *
 * FROM utilisateur` from the SQL Server source: mot_passe genuinely
 * stores plaintext passwords ("ideal123", "789789", "rafik123", etc.),
 * not hashes — there was never a real reason not to migrate them.
 *
 * This reads each user's real plaintext password directly from the
 * SQL Server source, hashes it with bcrypt (matching hashPassword() in
 * src/lib/auth.ts exactly — bcrypt.hash(password, 10), the same
 * function and cost factor the real login check expects), and updates
 * the already-migrated Postgres row. Matched by `login`, the natural
 * unique key, rather than `id`, in case any row didn't migrate 1:1.
 *
 * After this runs, every real user's own original password will work
 * to log in — no more resets needed for existing accounts.
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/password-recovery.ts --dry-run
 *   npx tsx migration/fixups/password-recovery.ts
 */
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), "migration", ".env.migration") });

import sql from "mssql";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}. Check migration/.env.migration.`);
  return v;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`=== Password recovery ${dryRun ? "(DRY RUN)" : ""} ===`);

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

  const result = await pool.request().query("SELECT login, mot_passe FROM utilisateur");
  const rows = result.recordset as { login: string; mot_passe: string | null }[];
  console.log(`Read ${rows.length} rows from the real source.`);

  const prisma = new PrismaClient();

  let updated = 0;
  let skippedNoPassword = 0;
  let skippedNoMatch = 0;

  for (const row of rows) {
    if (!row.mot_passe) {
      console.log(`  ⚠ ${row.login}: no password in source — left as-is`);
      skippedNoPassword++;
      continue;
    }

    const existing = await prisma.utilisateur.findUnique({ where: { login: row.login } });
    if (!existing) {
      console.log(`  ⚠ ${row.login}: no matching user in Postgres — left as-is`);
      skippedNoMatch++;
      continue;
    }

    console.log(`  ${row.login}: real password found, hashing`);
    updated++;

    if (!dryRun) {
      const hashed = await bcrypt.hash(row.mot_passe, 10);
      await prisma.utilisateur.update({ where: { login: row.login }, data: { motPasse: hashed } });
    }
  }

  await pool.close();
  await prisma.$disconnect();

  console.log(`\nWould update: ${updated}, no password in source: ${skippedNoPassword}, no Postgres match: ${skippedNoMatch}`);
  if (dryRun) {
    console.log("Dry run — no changes written. Re-run without --dry-run to apply.");
  } else {
    console.log("=== Done. Every listed user can now log in with their real, original password. ===");
  }
}

main().catch((err) => {
  console.error("Recovery script failed:", err);
  process.exit(1);
});
