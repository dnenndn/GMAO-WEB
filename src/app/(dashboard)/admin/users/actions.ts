"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  await requireAdmin();

  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "");
  if (!login || password.length < 6) return;

  // Real crash found on an actual attempt: a duplicate login threw
  // Prisma's raw unique-constraint error straight to the user (an ugly
  // 500 page), instead of being handled like every other invalid-input
  // case in this same function (silently returning without creating).
  // Checked explicitly beforehand for the same consistent treatment.
  const existing = await prisma.utilisateur.findUnique({ where: { login } });
  if (existing) return;

  const motPasse = await hashPassword(password);

  const roleInput = String(formData.get("role") || "");
  const role = roleInput === "Admin" || roleInput === "Superviseur" ? roleInput : "Utilisateur";

  await prisma.utilisateur.create({
    data: {
      login,
      motPasse,
      fonction: String(formData.get("fonction") || "") || null,
      mail: String(formData.get("mail") || "") || null,
      telephone: String(formData.get("telephone") || "") || null,
      role,
    },
  });

  revalidatePath("/admin/users");
}

export async function deactivateUser(id: number) {
  await requireAdmin();
  await prisma.utilisateur.update({ where: { id }, data: { deleted: true } });
  revalidatePath("/admin/users");
}

export async function updateUserRole(id: number, formData: FormData) {
  await requireAdmin();
  const roleInput = String(formData.get("role") || "");
  const role = roleInput === "Admin" || roleInput === "Superviseur" ? roleInput : "Utilisateur";
  await prisma.utilisateur.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
}

export async function reactivateUser(id: number) {
  await requireAdmin();
  await prisma.utilisateur.update({ where: { id }, data: { deleted: false } });
  revalidatePath("/admin/users");
}

export async function resetPassword(id: number, formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("password") || "");
  if (password.length < 6) return;
  const motPasse = await hashPassword(password);
  await prisma.utilisateur.update({ where: { id }, data: { motPasse } });
  revalidatePath("/admin/users");
}
