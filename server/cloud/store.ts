import { Pool } from "pg";
import { readFileSync } from "node:fs";
export type QueryResult = { rows: any[]; rowCount?: number | null };
export interface SqlClient {
  query(sql: string, values?: any[]): Promise<QueryResult>;
}
export interface Database extends SqlClient {
  transaction<T>(work: (c: SqlClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export function postgres(url: string): Database {
  if (!/^postgres(ql)?:\/\//.test(url))
    throw Error("DATABASE_URL must be a PostgreSQL connection URL.");
  const pool = new Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    application_name: "ghost-shift-cloud",
  });
  pool.on("error", () => {
    /* Request errors return a generic error; credentials are never logged. */
  });
  return {
    query: (sql, values) => pool.query(sql, values),
    async transaction(work) {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        await c.query("SET LOCAL lock_timeout='5s'");
        await c.query("SET LOCAL statement_timeout='15s'");
        const result = await work(c);
        await c.query("COMMIT");
        return result;
      } catch (e) {
        await c.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    },
    close: () => pool.end(),
  };
}
export async function migrate(db: Database) {
  await db.transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(71637001)");
    await c.query(
      readFileSync(new URL("./schema.sql", import.meta.url), "utf8"),
    );
  });
}
export async function dbTime(c: SqlClient) {
  return Number(
    (
      await c.query(
        "SELECT (extract(epoch from clock_timestamp())*1000)::bigint AS now",
      )
    ).rows[0].now,
  );
}
