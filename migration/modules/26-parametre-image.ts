/**
 * Tier: parametre-image — no dependencies.
 *
 * The last real table not yet migrated (`test_equip` is deliberately
 * excluded entirely — see migration/README.md's "Not yet built" note
 * for why). Included now specifically because the goal at this point is
 * getting all real legacy data across so the app can be tested against
 * it, not because a confirmed UI destination for these 3 photos has
 * been found — it hasn't (see the schema comment on ParametreImage).
 * Migrating the data now costs nothing and means it isn't lost; the UI
 * question can be answered later without needing to re-run this tier.
 */

import { PrismaClient } from "@prisma/client";
import { queryAll, toBufferOrNull, resetSequence } from "../db";

export async function migrateParametreImage(prisma: PrismaClient, dryRun: boolean) {
  const rows = await queryAll(`SELECT id, photo_parc, photo_atelier, photo_usine FROM parametre_image`);
  console.log(`parametre_image: ${rows.length} row(s)`);
  if (dryRun) return;

  for (const r of rows as any[]) {
    await prisma.parametreImage.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        photoParc: toBufferOrNull(r.photo_parc),
        photoAtelier: toBufferOrNull(r.photo_atelier),
        photoUsine: toBufferOrNull(r.photo_usine),
      },
    });
  }
  await resetSequence(prisma, "parametre_image");
}
