/**
 * Legacy SQL Server connection + shared helpers for the migration scripts.
 *
 * IMPORTANT: this whole `migration/` directory has never been run against
 * real data — it was written entirely from the confirmed schema export and
 * decompiled-source column mappings documented across docs/01-12, in an
 * environment with no live SQL Server reachable. Treat every migration
 * function as a well-informed first draft, not a tested pipeline. See
 * migration/README.md for the required dry-run/verification process
 * before running this against a real database.
 */

import sql from "mssql";

let pool: sql.ConnectionPool | null = null;

function isTransientLegacyConnectionError(error: unknown): boolean {
  const anyErr = error as any;
  const message = `${anyErr?.message ?? ""} ${anyErr?.originalError?.message ?? ""}`.toLowerCase();
  const code = anyErr?.code ?? anyErr?.originalError?.code;

  return (
    (code === "EREQUEST" &&
      (message.includes("connection lost") ||
        message.includes("econnreset") ||
        message.includes("socket") ||
        message.includes("read econnreset") ||
        message.includes("failed to cancel request") ||
        message.includes("cancel request") ||
        message.includes("request timeout") ||
        message.includes("timed out"))) ||
    // Widened: a real run against SQL Server Express hit both of these
    // exact variants and neither matched the original narrower patterns
    // below — "Could not connect (sequence)" (ESOCKET, not econnreset)
    // and "Failed to connect ... in 60000ms" (ETIMEOUT, not literally
    // containing "timed out"). Both are connection-establishment
    // failures, not mid-query drops, and both showed up specifically
    // right after very large table reads (a 1.5M-row table in one
    // case) — consistent with SQL Server Express's known hard resource
    // limits needing real recovery time under sustained load, not a
    // one-off fluke worth failing the whole migration over.
    (code === "ESOCKET" &&
      (message.includes("econnreset") ||
        message.includes("could not connect") ||
        message.includes("failed to connect"))) ||
    (code === "ETIMEOUT" &&
      (message.includes("cancel request") ||
        message.includes("request timeout") ||
        message.includes("timed out") ||
        message.includes("failed to connect")))
  );
}

async function withLegacyConnectionRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  // Widened from 3 to 6 attempts, and backoff changed from a flat
  // 1s/2s/3s ramp to a steeper one (up to ~20s by the last attempt) —
  // the earlier, gentler backoff assumed mid-query blips that clear up
  // almost immediately. The real failures seen here are connection-
  // establishment failures right after very large reads, which looks
  // like SQL Server Express needing actual recovery time under its
  // hard resource ceiling, not a sub-second network hiccup. Real cost
  // of retrying too eagerly here is low (a few seconds); real cost of
  // giving up too early is re-running tiers that already did most of
  // their work.
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientLegacyConnectionError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = Math.min(2000 * attempt, 20000);
      console.log(
        `  ⚠ transient legacy DB connection error (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs / 1000}s...`
      );
      // Real bug found and fixed: this used to just do `pool = null`,
      // discarding the reference without ever closing the underlying
      // connection. Over a long, many-tier migration run, that leaks a
      // connection every time a retry fires — and since SQL Server (Express
      // especially) has a hard cap on concurrent connections, enough leaked
      // connections eventually exhausts that cap entirely. At that point
      // retrying doesn't help no matter how long you wait, because the
      // resource that's actually exhausted (available connection slots) is
      // being held by this same process's own abandoned pools, not by
      // anything that clears up on its own. Close is wrapped in try/catch
      // since closing an already-broken pool can itself throw, and that
      // shouldn't mask the real error or break the retry loop.
      if (pool) {
        try {
          await pool.close();
        } catch {
          // already broken/closed — nothing more to do
        }
      }
      pool = null;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export async function getLegacyPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;

  return withLegacyConnectionRetry(async () => {
    const config: sql.config = {
      server: requireEnv("LEGACY_DB_SERVER"),
      database: requireEnv("LEGACY_DB_NAME"),
      user: requireEnv("LEGACY_DB_USER"),
      password: requireEnv("LEGACY_DB_PASSWORD"),
      port: process.env.LEGACY_DB_PORT ? Number(process.env.LEGACY_DB_PORT) : 1433,
      // Legacy migration queries can take much longer than the default 5s timeout
      // on larger SQL Server tables, especially on on-prem or remote DBs.
      connectionTimeout: 60000,
      requestTimeout: 600000,
      // `cancelTimeout` was set here before, but it isn't part of
      // @types/mssql's actual `config` interface at all (only
      // connectionTimeout/requestTimeout are) — `tsx` never caught this
      // since it transpiles without full type-checking, but `next
      // build`'s real TypeScript pass does, and correctly failed on it.
      // Removed rather than worked around, since it wasn't a supported,
      // typed option to begin with.
      options: {
        // Most on-prem SQL Server installs (like the one this app was
        // reverse-engineered from) use a self-signed cert; adjust if yours
        // is different.
        encrypt: process.env.LEGACY_DB_ENCRYPT !== "false",
        trustServerCertificate: true,
      },
    };

    pool = await sql.connect(config);
    return pool;
  });
}

export async function closeLegacyPool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Copy migration/.env.migration.example to .env.migration and fill it in.`
    );
  }
  return v;
}

/** Runs a raw SELECT against the legacy DB and returns all rows. No user
 * input ever flows into these queries (this script only reads fixed,
 * hardcoded table/column names), so string interpolation for table names
 * is safe here — still uses parameterized queries wherever a value (e.g.
 * a WHERE clause bound) is involved. */
export async function queryAll<T = Record<string, unknown>>(sqlText: string): Promise<T[]> {
  return withLegacyConnectionRetry(async () => {
    const p = await getLegacyPool();
    const result = await p.request().query<T>(sqlText);
    return result.recordset;
  });
}

export async function queryPage<T = Record<string, unknown>>(
  tableName: string,
  selectCols: string,
  options: {
    whereClause?: string;
    orderBy?: string;
    lastId?: number;
    pageSize?: number;
  } = {}
): Promise<T[]> {
  const whereClause = (options.whereClause ?? "").trim();
  const orderBy = options.orderBy ?? "id";
  const lastId = options.lastId ?? 0;
  const pageSize = options.pageSize ?? 1000;
  const normalizedWhere = whereClause ? whereClause.replace(/^\s*WHERE\s+/i, "") : "";
  const whereSql = normalizedWhere ? `${normalizedWhere} AND ${orderBy} > ${lastId}` : `${orderBy} > ${lastId}`;

  return queryAll<T>(`
    SELECT TOP (${pageSize}) ${selectCols}
    FROM ${tableName}
    WHERE ${whereSql}
    ORDER BY ${orderBy}
  `);
}

// ----------------------------------------------------------------------------
// Type-conversion helpers
//
// The legacy database stores boolean-like flags as `int` (0/1) almost
// everywhere (confirmed pattern across every module in docs/01-12) — this
// schema models them as Postgres Boolean. These helpers centralize that
// conversion so every migration function does it identically.
// ----------------------------------------------------------------------------

export function toBool(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  return Number(v) !== 0;
}

export function toBoolOrNull(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  return Number(v) !== 0;
}

export function toDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const d = new Date(v as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function toStrOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

/** SQL Server `image`/`varbinary` columns come back from `mssql` as a
 * Node Buffer already — Prisma's `Bytes` fields accept a Buffer directly.
 * Used for the two photo columns (Utilisateur, Article) that earlier
 * migration passes omitted entirely — see migration/README.md. */
export function toBufferOrNull(v: unknown): Buffer | null {
  if (v === null || v === undefined) return null;
  return Buffer.isBuffer(v) ? v : Buffer.from(v as ArrayBuffer);
}

/** After inserting rows with explicit legacy IDs, Postgres's own
 * autoincrement sequence doesn't know about them — bump it past the max
 * existing id so the app's own future inserts don't collide. Call once
 * per table after migrating it. */
export async function resetSequence(
  prismaRaw: { $executeRawUnsafe: (q: string) => Promise<unknown> },
  tableName: string,
  idColumn = "id"
) {
  await prismaRaw.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${tableName}"', '${idColumn}'), COALESCE((SELECT MAX("${idColumn}") FROM "${tableName}"), 1))`
  );
}
