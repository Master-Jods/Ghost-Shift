import { PGlite } from "@electric-sql/pglite";
import type { Database, SqlClient, QueryResult } from "./store";
// Uses PostgreSQL's SQL/JSON engine, with transactions serialized by PGlite.
// Real multi-connection row locking is covered by the optional PostgreSQL test.
export function memoryPostgres() {
  const pg = new PGlite();
  const client = (p: any): SqlClient => ({
    async query(sql, values) {
      if (!values?.length && sql.includes(";")) {
        const results = await p.exec(sql);
        return results.at(-1) || { rows: [] };
      }
      return p.query(sql, values) as Promise<QueryResult>;
    },
  });
  const db: Database = {
    ...client(pg),
    transaction: (fn) => pg.transaction((tx) => fn(client(tx))),
    close: () => pg.close(),
  };
  return db;
}
