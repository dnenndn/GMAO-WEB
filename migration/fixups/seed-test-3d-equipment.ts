/**
 * Creates one clearly-labeled test equipment record with a real .stl
 * part attached, so the 3D viewer (Documents tab) can be tried out
 * immediately with real data rather than needing a production part
 * exported first.
 *
 * Prerequisite: copy the uploaded STL file to
 *   public/models/test-bague-helice.stl
 * in the project (already done if you got this alongside that file).
 *
 * Usage (from the project root):
 *   npx tsx migration/fixups/seed-test-3d-equipment.ts
 *
 * Safe to re-run — it looks for the test equipment by its exact
 * designation first and reuses it rather than creating duplicates.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_DESIGNATION = "[TEST] Visionneuse 3D — Bague hélice";
const STL_PATH = "/models/test-bague-helice.stl";

async function main() {
  console.log("=== Seeding test 3D-viewer equipment ===");

  let equipement = await prisma.equipement.findFirst({
    where: { designation: TEST_DESIGNATION },
  });

  if (equipement) {
    console.log(`Test equipment already exists (id ${equipement.id}) — reusing it.`);
  } else {
    equipement = await prisma.equipement.create({
      data: {
        designation: TEST_DESIGNATION,
        code: "TEST-3D-001",
      },
    });
    console.log(`Created test equipment (id ${equipement.id}).`);
  }

  const existingPdf = await prisma.equipementPdf.findFirst({
    where: { idEquipement: equipement.id, adresse: STL_PATH },
  });

  if (existingPdf) {
    console.log("STL document already attached — nothing more to do.");
  } else {
    await prisma.equipementPdf.create({
      data: { idEquipement: equipement.id, adresse: STL_PATH },
    });
    console.log(`Attached ${STL_PATH} to the test equipment.`);
  }

  console.log(`\nDone. Open the app, go to Équipement, find "${TEST_DESIGNATION}"`);
  console.log(`(it has no parent, so it'll show as a root node), open it, go to the`);
  console.log(`Documents tab, and the 3D viewer should render the part directly.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
