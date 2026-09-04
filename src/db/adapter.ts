/**
 * Minimal DB adapter contract. src/db/repository.ts is written against this
 * interface only — it never imports better-sqlite3 or pg directly. This is
 * what makes "swap SQLite for Postgres" a src/db/client.ts-only change
 * (see that file), matching the existing repository pattern rather than
 * introducing a new architecture layer.
 *
 * Query convention: every SQL string uses `?` placeholders (SQLite style)
 * regardless of backend. The Postgres adapter translates `?` -> `$1..$n`
 * internally, so repository.ts never needs backend-specific SQL.
 */
export interface DbAdapter {
  readonly kind: "sqlite" | "postgres";

  /** Returns the first row, or undefined if none. */
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;

  /** Returns all matching rows. */
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;

  /** For INSERT/UPDATE/DELETE. Returns affected row count where available. */
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;

  /** For multi-statement DDL (schema migration). No parameters, no result rows. */
  exec(sql: string): Promise<void>;
}
