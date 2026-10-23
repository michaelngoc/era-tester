import "server-only";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { isLegacyDbPassword } from "./known-default-secrets";

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
  if (isLegacyDbPassword(password)) {
    throw new Error("Mật khẩu DB đang dùng giá trị mặc định cũ đã lộ trong mã nguồn; hãy xoay mật khẩu mới");
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
      // Serverless: mỗi instance ít kết nối, đóng nhanh khi rảnh; instance bị đóng băng vẫn giữ socket,
      // role era_tester_user dùng chung với site docs và Postgres chỉ có 100 slot (chung với manage production).
      max: 3,
      idleTimeoutMillis: 5000,
      maxLifetimeSeconds: 300,
      connectionTimeoutMillis: 5000,
      options: `-c search_path="${schema}"`,
    });
    // Kết nối rảnh bị server cắt (idle_session_timeout, restart) không được làm sập process.
    pool.on("error", (error) => console.error("[Database Pool Error]", error.message));
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


// Chạy fn trong một transaction trên một kết nối riêng (dùng cho pg_advisory_xact_lock).
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
