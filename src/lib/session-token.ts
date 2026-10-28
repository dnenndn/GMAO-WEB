import crypto from "crypto";

// Falls back to a fixed dev secret so local/demo setups work out of the
// box; ALWAYS set a real SESSION_SECRET in production.
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";

// Shared here (not in auth.ts) specifically so src/lib/prisma.ts can read
// the session cookie directly, without importing from auth.ts — auth.ts
// itself imports prisma.ts, so a prisma.ts -> auth.ts import would be
// circular. session-token.ts has no dependency on either, so both can
// import from here safely.
export const COOKIE_NAME = "gmao_session";

export type SessionPayload = {
  userId: number;
  login: string;
  role: string;
  exp: number;
};

export function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function decodeSession(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (sign(body) !== signature) return null; // tampered or wrong secret

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

/** Pure role check, kept here (rather than in auth.ts) specifically so it
 * stays testable without pulling in next/headers or a live Prisma client. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "Admin";
}

/** Superviseur — added per an explicit request: read-only access across
 * every module (can view everything Admin can), but cannot create,
 * update, or delete anything. Enforced centrally in src/lib/prisma.ts via
 * a Prisma Client extension that blocks every write operation for this
 * role, rather than needing every individual page/action across the app
 * to remember to check it — see that file's comment for why. */
export function isSuperviseurRole(role: string | null | undefined): boolean {
  return role === "Superviseur";
}
