import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({ query: (...a: unknown[]) => queryMock(...a) }));
vi.mock("@/lib/auth", () => ({ hashPassword: async () => "hash" }));

import { POST } from "../route";

const OLD = { ...process.env };

// users: số user; superAdmin: đã có SUPER_ADMIN chưa
function setup(users: number, superAdmin: boolean) {
  queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes("WHERE email")) return { rows: [] };
    if (sql.includes("COUNT(*)")) return { rows: [{ count: String(users) }] };
    if (sql.includes("role = 'SUPER_ADMIN'")) return { rows: superAdmin ? [{}] : [] };
    if (sql.includes("INSERT")) {
      const p = params as string[];
      return { rows: [{ id: 9, email: p[0], role: p[3], status: p[4] }] };
    }
    return { rows: [] };
  });
}

const call = (email: string, extra: Record<string, unknown> = {}) =>
  POST(new Request("http://x/api/auth/register", { method: "POST", body: JSON.stringify({ email, password: "pw123456", ...extra }) }) as never);

describe("B-004 đăng ký admin khởi tạo", () => {
  beforeEach(() => {
    queryMock.mockReset();
    delete process.env.ADMIN_INITIAL_EMAIL;
    delete process.env.ADMIN_INITIAL_AUTO_ACTIVATE;
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it("không đặt ADMIN_INITIAL_EMAIL: admin@eragroup.com.vn chỉ là TESTER PENDING", async () => {
    setup(5, true);
    const { user } = await (await call("admin@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "TESTER", status: "PENDING" });
  });

  it("DB rỗng: người đầu tiên là SUPER_ADMIN ACTIVE (bootstrap)", async () => {
    setup(0, false);
    const { user } = await (await call("first@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "SUPER_ADMIN", status: "ACTIVE" });
  });

  it("env đặt, chưa có SUPER_ADMIN, không bật cờ: SUPER_ADMIN nhưng PENDING", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "Boss@eragroup.com.vn";
    setup(3, false);
    const { user } = await (await call("boss@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "SUPER_ADMIN", status: "PENDING" });
  });

  it("env đặt, chưa có SUPER_ADMIN, bật cờ AUTO_ACTIVATE: ACTIVE", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    process.env.ADMIN_INITIAL_AUTO_ACTIVATE = "true";
    setup(3, false);
    const { user } = await (await call("boss@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "SUPER_ADMIN", status: "ACTIVE" });
  });

  it("đã có SUPER_ADMIN: email khớp env cũng chỉ là TESTER PENDING dù bật cờ", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    process.env.ADMIN_INITIAL_AUTO_ACTIVATE = "true";
    setup(3, true);
    const { user } = await (await call("boss@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "TESTER", status: "PENDING" });
  });

  it("email khác env: TESTER/DEVELOPER PENDING", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    setup(3, false);
    const { user } = await (await call("dev@eragroup.com.vn", { role: "DEVELOPER" })).json();
    expect(user).toMatchObject({ role: "DEVELOPER", status: "PENDING" });
  });
});
