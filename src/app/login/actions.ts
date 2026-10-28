"use server";

import { verifyCredentials, createSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!login || !password) {
    redirect(`/login?error=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  const user = await verifyCredentials(login, password);
  if (!user) {
    redirect(`/login?error=1${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  await createSession(user);
  redirect(next && next.startsWith("/") ? next : "/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
