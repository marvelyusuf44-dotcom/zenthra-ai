import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { Pool } from "pg";
import type { DbAdapter } from "@/src/db/adapter";

/**
 * Zenthra V1 persistence layer.
 *
 * BACKEND SELECTION: if `DATABASE_URL` is set, Postgres is used (production-
 * compatible — e.g. a free-tier Neon/Supabase instance). Otherwise this
 * falls back to a local SQLite file at `DATABASE_PATH` (good for
 * local/Replit development, and for demoing the full flow with zero paid
 * dependency). Both paths implement the same `DbAdapter` interface
 * (src/db/adapter.ts), so `src/db/repository.ts` — and every route that
 * calls it — is completely unaware of which backend is active.
 *
 * DEPLOYMENT NOTE (Vercel): the SQLite path writes to the local filesystem,
 * which is read-only/ephemeral outside `/tmp` on Vercel's serverless
 * runtime — a SQLite file will NOT persist between invocations there. This
 * is exactly the case `DATABASE_URL` (Postgres) exists to solve. On Vercel,
 * set `DATABASE_URL` to a real Postgres connection string; SQLite remains
 * the zero-config default everywhere else.
 *
 * VERIFICATION CAVEAT: the `pg` dependency (added to package.json) could
 * not be installed or exercised against a real Postgres instance in this
 * sandbox (no network access — see FINAL_REPORT.md). The Postgres adapter
 * below is written against `pg`'s standard, well-documented `Pool`/`query`
 * API and mirrors the same schema already proven to work via SQLite, but
 * it has not been run end-to-end. Verify with a real `DATABASE_URL` before
 * relying on it in production.
 */

// ---- SQLite adapter (default, zero-config) ----

class SqliteAdapter implements DbAdapter {
  readonly kind = "sqlite" as const;
  constructor(private db: Database.Database) {}

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const info = this.db.prepare(sql).run(...params);
    return { changes: info.changes };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
}

// ---- Postgres adapter (production, DATABASE_URL) ----

/** Translates `?` placeholders (SQLite style, used throughout repository.ts)
 *  into Postgres's positional `$1, $2, ...` style. */
function toPositionalParams(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

class PostgresAdapter implements DbAdapter {
  readonly kind = "postgres" as const;
  constructor(private pool: Pool) {}

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const res = await this.pool.query(toPositionalParams(sql), params);
    return res.rows[0] as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(toPositionalParams(sql), params);
    return res.rows as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const res = await this.pool.query(toPositionalParams(sql), params);
    return { changes: res.rowCount ?? 0 };
  }

  async exec(sql: string): Promise<void> {
    // No params → node-postgres sends this as a simple query, which (unlike
    // the extended/parameterized protocol) supports multiple `;`-separated
    // statements in one call. Used only for the DDL migration below.
    await this.pool.query(sql);
  }
}

// ---- Adapter selection (lazy singleton) ----

let _adapter: DbAdapter | null = null;
let _migrationPromise: Promise<void> | null = null;

export function getDb(): DbAdapter {
  if (_adapter) return _adapter;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const pool = new Pool({
      connectionString: databaseUrl,
      // Most managed Postgres providers (Neon/Supabase/RDS) require SSL and
      // present a certificate that Node won't validate against a public CA
      // bundle by default. DATABASE_SSL=disable opts out for local/self-
      // hosted Postgres without TLS.
      ssl: process.env.DATABASE_SSL === "disable" ? undefined : { rejectUnauthorized: false },
    });
    _adapter = new PostgresAdapter(pool);
  } else {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "zenthra.db");
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const raw = new Database(dbPath);
    raw.pragma("journal_mode = WAL");
    _adapter = new SqliteAdapter(raw);
  }

  return _adapter;
}

/**
 * Runs the schema migration + plan seed exactly once per process, then
 * returns the ready-to-use adapter. Every repository.ts function calls this
 * first instead of calling getDb() directly, so no query ever races the
 * migration on cold start.
 */
export async function ensureMigrated(): Promise<DbAdapter> {
  const db = getDb();
  if (!_migrationPromise) {
    _migrationPromise = migrate(db);
  }
  await _migrationPromise;
  return db;
}

// Schema is intentionally backend-agnostic: TEXT primary keys (UUIDs, no
// autoincrement), INTEGER for booleans/amounts, standard CREATE TABLE IF
// NOT EXISTS / CREATE INDEX IF NOT EXISTS / FOREIGN KEY — all supported
// identically by SQLite and Postgres. No PRAGMA or backend-specific syntax
// appears here (WAL mode is set directly on the SQLite connection above).
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_idr INTEGER NOT NULL,
    period_days INTEGER NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    amount_idr INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_PROOF',
    proof_file_path TEXT,
    admin_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    reviewed_by TEXT,
    reviewed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
  );

  CREATE TABLE IF NOT EXISTS payment_proofs (
    order_id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    data_base64 TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS admin_actions_log (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_payment_proofs_created ON payment_proofs(created_at);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
`;

async function migrate(db: DbAdapter): Promise<void> {
  await db.exec(SCHEMA_SQL);

  const planCount = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM plans");
  if (!planCount || Number(planCount.c) === 0) {
    await seedDefaultPlans(db);
  }
}

/**
 * Seed plans mirror BLUEPRINT.md §12 tier hypotheses (Free / Pro / Pro+).
 * Prices are placeholders that MUST be set for real use — see
 * PLAN_PRO_PRICE_IDR / PLAN_PRO_PLUS_PRICE_IDR in .env.example. Nothing here
 * is presented to end users as a finalized commercial price without the
 * operator configuring it.
 */
async function seedDefaultPlans(db: DbAdapter): Promise<void> {
  const proPrice = Number(process.env.PLAN_PRO_PRICE_IDR || 0);
  const proPlusPrice = Number(process.env.PLAN_PRO_PLUS_PRICE_IDR || 0);

  const insert = (
    id: string,
    name: string,
    price: number,
    periodDays: number,
    description: string,
    active: number
  ) =>
    db.run(
      `INSERT INTO plans (id, name, price_idr, period_days, description, active) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, price, periodDays, description, active]
    );

  await insert("free", "Free", 0, 0, "Limited core intelligence access.", 1);
  await insert(
    "pro",
    "Pro",
    proPrice,
    30,
    "Deeper research, futures intelligence, smart money, monitoring.",
    proPrice > 0 ? 1 : 0
  );
  await insert(
    "pro_plus",
    "Pro+",
    proPlusPrice,
    30,
    "Advanced research and higher limits.",
    proPlusPrice > 0 ? 1 : 0
  );
}
