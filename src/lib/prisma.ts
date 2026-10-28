import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { decodeSession, isSuperviseurRole, COOKIE_NAME } from "./session-token";
import { ForbiddenError } from "./auth-errors";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

/** Superviseur is a read-only role across every module — added per an
 * explicit request rather than found in the legacy source (which has no
 * role-based permission system at all; Admin/Utilisateur was already a
 * deliberate modernization, and Superviseur extends that same choice).
 *
 * Enforced HERE, centrally, rather than by adding a check to every
 * individual mutation action across ~150 pages and 250+ Server Actions —
 * that approach would need every future action to also remember the
 * check, with no way to verify none were missed. A Prisma Client
 * extension intercepting every write operation, for every model, in one
 * place, is correct by construction: it cannot be bypassed by a page
 * that forgot to check the role, because the check happens below the
 * application code entirely, at the point where any write actually
 * reaches the database.
 *
 * Reads the session cookie directly via session-token.ts rather than
 * importing getSession() from auth.ts — auth.ts imports `prisma` from
 * this file, so a reverse import here would be circular.
 *
 * `cookies()` throws when called outside a real Next.js request context
 * (the migration scripts and prisma/seed.ts both use this same `prisma`
 * export, run as plain Node processes with no request at all) — treated
 * as "no session, not a web request, allow the write," since those are
 * trusted, non-interactive processes, not a logged-in user's own action.
 */
async function currentUserIsReadOnly(): Promise<boolean> {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) return false;
    const session = decodeSession(token);
    return session != null && isSuperviseurRole(session.role);
  } catch {
    return false; // no request context (CLI script) — not a restricted user
  }
}

function buildPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({
          operation,
          args,
          query,
        }: {
          operation: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) {
          if (WRITE_OPERATIONS.has(operation) && (await currentUserIsReadOnly())) {
            throw new ForbiddenError(
              "Votre rôle (Superviseur) est en lecture seule — cette action n'est pas autorisée."
            );
          }
          return query(args);
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? (buildPrismaClient() as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
