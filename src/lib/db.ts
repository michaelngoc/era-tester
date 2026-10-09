import "server-only";
import { Pool, QueryResult, QueryResultRow } from "pg";

const schema = process.env.PG_SCHEMA || "era_tester";
const user = process.env.ERA_TESTER_USER || process.env.ERA_ADMIN_USER || "era_tester_user";
const password = process.env.ERA_TESTER_PASSWORD || process.env.ERA_ADMIN_PASSWORD || "EraTester_Secure_2026!#p9X";

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "eraweb_master",
  user,
  password,
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  options: `-c search_path="${schema}"`,
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    const res = await pool.query<T>(text, params);
    return res;
  } catch (error) {
    console.error("[Database Error]", { text, error });
    throw error;
  }
}

export default pool;
