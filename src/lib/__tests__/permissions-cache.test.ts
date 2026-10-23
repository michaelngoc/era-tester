import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

process.env.JWT_SECRET = "test_jwt_secret_at_least_32_bytes_long";

const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({ query: (...args: unknown[]) => queryMock(...args) }));
vi.mock("../db", () => ({ query: (...args: unknown[]) => queryMock(...args) }));

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));

import {
  getGlobalAdminRoles,
  isGlobalAdminRole,
  updateGlobalAdminRoles,
  __resetGlobalAdminRolesCache,
} from "../permissions";
import { getCurrentUser, createSessionToken } from "../auth";

const rolesRow = (value: unknown) => ({ rows: [{ value }] });

describe("global admin roles cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    queryMock.mockReset();
    __resetGlobalAdminRolesCache();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("cache hit trong TTL chỉ query 1 lần", async () => {
    queryMock.mockResolvedValue(rolesRow(["SUPER_ADMIN", "CTO"]));
    await getGlobalAdminRoles();
    vi.advanceTimersByTime(59_000);
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN", "CTO"]);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("hết TTL thì query lại", async () => {
    queryMock.mockResolvedValueOnce(rolesRow(["SUPER_ADMIN", "CTO"]));
    queryMock.mockResolvedValueOnce(rolesRow(["SUPER_ADMIN", "PM"]));
    await getGlobalAdminRoles();
    vi.advanceTimersByTime(60_001);
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN", "PM"]);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("request đồng thời chỉ 1 query", async () => {
    queryMock.mockResolvedValue(rolesRow(["SUPER_ADMIN", "QA"]));
    const results = await Promise.all([getGlobalAdminRoles(), getGlobalAdminRoles(), getGlobalAdminRoles()]);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.includes("QA"))).toBe(true);
  });

  it("lỗi DB trả DEFAULT và lần sau query lại", async () => {
    queryMock.mockRejectedValueOnce(new Error("db down"));
    queryMock.mockResolvedValueOnce(rolesRow(["SUPER_ADMIN", "LEADER"]));
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN"]);
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN", "LEADER"]);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("không có dòng settings thì trả DEFAULT", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN"]);
  });

  it("update ghi cache mới ngay, không query lại", async () => {
    queryMock.mockResolvedValueOnce(rolesRow(["SUPER_ADMIN", "CTO"]));
    await getGlobalAdminRoles();
    queryMock.mockResolvedValueOnce({ rows: [] }); // câu INSERT
    await updateGlobalAdminRoles(["PM"], 1);
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN", "PM"]);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("update khi đang có query bay: kết quả cũ không ghi đè cache mới", async () => {
    let resolveOld!: (v: unknown) => void;
    queryMock.mockReturnValueOnce(new Promise((r) => (resolveOld = r)));
    const pending = getGlobalAdminRoles();
    queryMock.mockResolvedValueOnce({ rows: [] });
    await updateGlobalAdminRoles(["PM"]);
    resolveOld(rolesRow(["SUPER_ADMIN", "CTO"]));
    await pending;
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN", "PM"]);
  });

  it("SUPER_ADMIN luôn true và không query; role rỗng false", async () => {
    expect(await isGlobalAdminRole("SUPER_ADMIN")).toBe(true);
    expect(await isGlobalAdminRole(null)).toBe(false);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("SUPER_ADMIN luôn có trong danh sách dù DB thiếu", async () => {
    queryMock.mockResolvedValue(rolesRow(["CTO"]));
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN", "CTO"]);
    expect(await isGlobalAdminRole("CTO")).toBe(true);
    expect(await isGlobalAdminRole("MEMBER")).toBe(false);
  });

  it("caller sửa mảng trả về không ảnh hưởng cache", async () => {
    queryMock.mockResolvedValue(rolesRow(["SUPER_ADMIN", "CTO"]));
    const a = await getGlobalAdminRoles();
    a.push("MEMBER");
    a.shift();
    const b = await getGlobalAdminRoles(); // cache hit
    expect(b).toEqual(["SUPER_ADMIN", "CTO"]);
    b.length = 0;
    expect(await getGlobalAdminRoles()).toEqual(["SUPER_ADMIN", "CTO"]);
  });
});

describe("getCurrentUser", () => {
  beforeEach(async () => {
    queryMock.mockReset();
    cookieGet.mockReset();
    __resetGlobalAdminRolesCache();
  });

  async function loginAs(id: number) {
    const token = await createSessionToken({
      id, email: "a@b.c", fullName: "A", role: "MEMBER", status: "ACTIVE", isGlobalAdmin: false,
    });
    cookieGet.mockReturnValue({ value: token });
  }

  it("không có cookie thì null, không query", async () => {
    cookieGet.mockReturnValue(undefined);
    expect(await getCurrentUser()).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("user không tồn tại thì null", async () => {
    await loginAs(5);
    queryMock.mockImplementation(async (sql: string) =>
      sql.includes("era_tester_users") ? { rows: [] } : rolesRow(["SUPER_ADMIN"])
    );
    expect(await getCurrentUser()).toBeNull();
  });

  it("isGlobalAdmin đúng theo roles trong DB (role trong DB, không phải trong token)", async () => {
    await loginAs(5);
    queryMock.mockImplementation(async (sql: string) =>
      sql.includes("era_tester_users")
        ? { rows: [{ id: 5, email: "a@b.c", full_name: null, role: "CTO", status: "ACTIVE" }] }
        : rolesRow(["SUPER_ADMIN", "CTO"])
    );
    const u = await getCurrentUser();
    expect(u).toMatchObject({ id: 5, role: "CTO", fullName: "", isGlobalAdmin: true });
  });

  it("role thường không phải global admin", async () => {
    await loginAs(6);
    queryMock.mockImplementation(async (sql: string) =>
      sql.includes("era_tester_users")
        ? { rows: [{ id: 6, email: "a@b.c", full_name: "B", role: "MEMBER", status: "ACTIVE" }] }
        : rolesRow(["SUPER_ADMIN", "CTO"])
    );
    expect((await getCurrentUser())?.isGlobalAdmin).toBe(false);
  });
});
