import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { encodeSession, decodeSession, isAdminRole, isSuperviseurRole, COOKIE_NAME, type SessionPayload } from "./session-token";
import { ForbiddenError } from "./auth-errors";

export type { SessionPayload };
export { isAdminRole, isSuperviseurRole, ForbiddenError };

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function createSession(user: { id: number; login: string; role: string }) {
  const payload: SessionPayload = {
    userId: user.id,
    login: user.login,
    role: user.role,
    exp: Date.now() + SESSION_DURATION_MS,
  };
  const token = encodeSession(payload);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    // `secure` cookies are only ever stored/sent by the browser over an
    // HTTPS connection — with one special exception: browsers also treat
    // `localhost` as a "potentially trustworthy" origin even over plain
    // HTTP. That's exactly why this worked when testing on the server
    // itself (via localhost) but silently broke — the cookie never got
    // stored at all, so every navigation looked logged-out — once other
    // PCs reached it over plain HTTP via a LAN IP instead. `next start`
    // sets NODE_ENV=production automatically, so tying this to NODE_ENV
    // alone assumed HTTPS would already be in place for any real
    // deployment, which isn't true for this internal LAN-only app.
    // COOKIE_SECURE lets this be explicitly overridden: set it to
    // "false" in .env for an HTTP-only LAN deployment, or leave it unset
    // to keep the original secure-in-production default (e.g. once/if
    // this is ever put behind HTTPS).
    secure: process.env.COOKIE_SECURE === "false" ? false : process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function destroySession() {
  cookies().delete(COOKIE_NAME);
}

/** Reads and verifies the session cookie. Returns null if absent/invalid/expired. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

/** Convenience: session user's login, or "admin" as a last-resort fallback
 * (should not normally be hit once middleware is protecting routes, but
 * keeps server actions from throwing if called in an unusual context). */
export async function currentUserLogin(): Promise<string> {
  const session = await getSession();
  return session?.login ?? "admin";
}

export async function verifyCredentials(login: string, password: string) {
  const user = await prisma.utilisateur.findUnique({ where: { login } });
  if (!user || user.deleted) return null;
  const valid = await bcrypt.compare(password, user.motPasse);
  if (!valid) return null;
  return user;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// ----------------------------------------------------------------------------
// Authorization
//
// IMPORTANT: this is a deliberate modernization, not something reverse-
// engineered from the legacy app. The original WinForms app has NO real
// permission/authorization system — `utilisateur.fonction` is a free-text
// job-title field used only for notification routing (e.g. "send an alert
// to whoever has fonction = 'Responsable Achat'"), never as an access
// gate. Any logged-in user there can do anything. Adding a role check for
// the more sensitive/destructive actions (approvals, closures, reference-
// data deletion) is a genuine improvement over the source, not a bug fix.
// ----------------------------------------------------------------------------

/** Pure role check, factored out so it's testable without needing a real
 * request context (next/headers) or a live Prisma client. Re-exported from
 * session-token.ts, see there for the implementation. */

/** Throws ForbiddenError if the current session isn't an Admin. Call this
 * at the top of any server action that should be admin-only. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    throw new ForbiddenError();
  }
  return session;
}
