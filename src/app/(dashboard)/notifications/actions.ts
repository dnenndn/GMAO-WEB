"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(id: number) {
  await prisma.notification.update({ where: { id }, data: { vue: true } });
  revalidatePath("/notifications");
}

export async function markAlerteRead(id: number) {
  await prisma.notificationAlerte.update({ where: { id }, data: { vue: true } });
  revalidatePath("/notifications");
}

export async function markAllRead(utilisateurId: number) {
  await prisma.$transaction([
    prisma.notification.updateMany({ where: { idUtilisateur: utilisateurId, vue: false }, data: { vue: true } }),
    prisma.notificationAlerte.updateMany({
      where: { idUtilisateur: utilisateurId, vue: false },
      data: { vue: true },
    }),
  ]);
  revalidatePath("/notifications");
}
