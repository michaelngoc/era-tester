import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({
  withTransaction: async (fn: (c: { query: typeof queryMock }) => unknown) => fn({ query: queryMock }),
}));
vi.mock("@/lib/auth", () => ({ hashPassword: async () => "hash" }));
vi.mock("@/lib/permissions", () => ({ getGlobalAdminRoles: async () => ["SUPER_ADMIN", "CTO"] }));

import { POST } from "../route";

const OLD = { ...process.env };

// users: số user; admin: đã có tài khoản toàn quyền chưa; emailTaken: email đã tồn tại
function setup(users: number, admin: boolean, emailTaken = false) {
  queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
    if (sql.includes("WHERE email")) return { rows: emailTaken ? [{ id: 1 }] : [] };
    if (sql.includes("COUNT(*)")) return { rows: [{ count: String(users) }] };
    if (sql.includes("ANY($1")) return { rows: admin ? [{}] : [] };
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

  it("DB rỗng, không đặt ADMIN_INITIAL_EMAIL: không ai tự thành SUPER_ADMIN", async () => {
    setup(0, false);
    const { user } = await (await call("first@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "TESTER", status: "PENDING" });
  });

  it("DB rỗng, email khác ADMIN_INITIAL_EMAIL: TESTER PENDING", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    setup(0, false);
    const { user } = await (await call("other@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "TESTER", status: "PENDING" });
  });

  it("DB rỗng, email khớp ADMIN_INITIAL_EMAIL: SUPER_ADMIN ACTIVE (bootstrap)", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "Boss@eragroup.com.vn";
    setup(0, false);
    const { user } = await (await call("boss@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "SUPER_ADMIN", status: "ACTIVE" });
  });

  it("khoá advisory được lấy trước mọi kiểm tra, trong cùng transaction", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    setup(0, false);
    await call("boss@eragroup.com.vn");
    expect(queryMock.mock.calls[0][0]).toContain("pg_advisory_xact_lock");
  });

  it("email đã tồn tại (kiểm lại trong transaction): 400 và không INSERT", async () => {
    setup(0, false, true);
    const res = await call("dup@eragroup.com.vn");
    expect(res.status).toBe(400);
    expect(queryMock.mock.calls.some((c) => String(c[0]).includes("INSERT"))).toBe(false);
  });

  it("env đặt, DB có user, chưa có admin, không bật cờ: SUPER_ADMIN nhưng PENDING", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "Boss@eragroup.com.vn";
    setup(3, false);
    const { user } = await (await call("boss@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "SUPER_ADMIN", status: "PENDING" });
  });

  it("env đặt, chưa có admin, bật AUTO_ACTIVATE: ACTIVE", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    process.env.ADMIN_INITIAL_AUTO_ACTIVATE = "true";
    setup(3, false);
    const { user } = await (await call("boss@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "SUPER_ADMIN", status: "ACTIVE" });
  });

  it("đã có tài khoản toàn quyền: email khớp env cũng chỉ là TESTER PENDING dù bật cờ", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    process.env.ADMIN_INITIAL_AUTO_ACTIVATE = "true";
    setup(3, true);
    const { user } = await (await call("boss@eragroup.com.vn")).json();
    expect(user).toMatchObject({ role: "TESTER", status: "PENDING" });
  });

  it("kiểm tra admin dùng danh sách global admin roles", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    setup(3, false);
    await call("boss@eragroup.com.vn");
    const c = queryMock.mock.calls.find((x) => String(x[0]).includes("ANY($1"));
    expect(c?.[1]).toEqual([["SUPER_ADMIN", "CTO"]]);
  });

  it("email khác env: TESTER/DEVELOPER PENDING", async () => {
    process.env.ADMIN_INITIAL_EMAIL = "boss@eragroup.com.vn";
    setup(3, false);
    const { user } = await (await call("dev@eragroup.com.vn", { role: "DEVELOPER" })).json();
    expect(user).toMatchObject({ role: "DEVELOPER", status: "PENDING" });
  });
});
