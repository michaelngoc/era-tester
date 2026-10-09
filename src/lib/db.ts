import "server-only";
import { Pool, QueryResult, QueryResultRow } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "eraweb_master",
  user: process.env.ERA_ADMIN_USER,
  password: process.env.ERA_ADMIN_PASSWORD,
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    return res;
  } catch (error) {
    console.error("[Database Error]", { text, error });
    throw error;
  }
}

export default pool;
