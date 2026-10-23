import "server-only";
import { Pool, QueryResult, QueryResultRow } from "pg";

const schema = process.env.PG_SCHEMA || "era_tester";

let pool: Pool | null = null;

// Fail closed: user/mật khẩu DB bắt buộc từ env, không có giá trị mặc định trong mã.
// Tạo pool lười để `next build` không ném khi thiếu env.
export function getDbCredentials(env: NodeJS.ProcessEnv = process.env): { user: string; password: string } {
  const user = env.ERA_TESTER_USER || env.ERA_ADMIN_USER;
  const password = env.ERA_TESTER_PASSWORD || env.ERA_ADMIN_PASSWORD;
  if (!user || !password) {
    throw new Error("Thiếu ERA_TESTER_USER / ERA_TESTER_PASSWORD (hoặc ERA_ADMIN_USER / ERA_ADMIN_PASSWORD)");
  }
  return { user, password };
}

function getPool(): Pool {
  if (!pool) {
    const { user, password } = getDbCredentials();
    pool = new Pool({
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
  }
  return pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    const res = await getPool().query<T>(text, params);
    return res;
  } catch (error) {
    console.error("[Database Error]", { text, error });
    throw error;
  }
}

