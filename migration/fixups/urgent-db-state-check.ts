/**
 * Urgent, minimal diagnostic — checks real current row counts for
 * several core tables at once, and prints which database is actually
 * being connected to (password masked). Run this immediately if
 * there's any doubt about whether a table just went empty
 * unexpectedly — it'll show in one shot whether this is isolated to
 * one table or the whole database.
 *
 * Usage:
 *   npx tsx migration/fixups/urgent-db-state-check.ts
 */
import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rawUrl = process.env.DATABASE_URL ?? "(not set)";
  const masked = rawUrl.replace(/:([^:@/]+)@/, ":****@");
  console.log("=== Urgent database state check ===\n");
  console.log(`Connecting via DATABASE_URL: ${masked}\n`);

  const tables: { label: string; count: () => Promise<number> }[] = [
    { label: "demande_achat", count: () => prisma.demandeAchat.count() },
    { label: "equipement", count: () => prisma.equipement.count() },
    { label: "article", count: () => prisma.article.count() },
    { label: "utilisateur", count: () => prisma.utilisateur.count() },
    { label: "ordre_travail", count: () => prisma.ordreTravail.count() },
    { label: "notification", count: () => prisma.notification.count() },
  ];

  for (const t of tables) {
    try {
      const c = await t.count();
      console.log(`${t.label}: ${c} row(s)`);
    } catch (err) {
      console.log(`${t.label}: ERROR — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("\nIf every table above shows 0 (or far fewer rows than you expect from recent");
  console.log("real usage of the app), the database itself was very likely reset. If only");
  console.log("demande_achat and its directly-related tables show 0 while the others look");
  console.log("normal, this is scoped much more narrowly and is a different, smaller problem.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
