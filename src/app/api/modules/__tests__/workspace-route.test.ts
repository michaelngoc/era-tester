import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as any,
  calls: [] as { sql: string; params: any[] }[],
  moduleRows: [{ is_member: true }] as any[],
  flows: [{ id: 1, title: "Flow A" }] as any[],
  cases: [{ id: 10, title: "Case A" }] as any[],
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: state.getCurrentUser,
}));

vi.mock("@/lib/permissions", () => ({
  isGlobalAdminRole: vi.fn(async () => false),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (sql: string, params: any[] = []) => {
    state.calls.push({ sql, params });
    const s = sql.replace(/\s+/g, " ");
    if (s.includes("FROM era_tester_flows f")) return { rows: state.flows };
    if (s.includes("FROM era_tester_cases c")) return { rows: state.cases };
    if (s.includes("AS is_member")) return { rows: state.moduleRows };
    return { rows: [] };
  }),
}));

import { NextRequest } from "next/server";
import { GET } from "../[id]/workspace/route";

const call = (id: string) =>
  GET(new NextRequest(`http://localhost/api/modules/${id}/workspace`), {
    params: Promise.resolve({ id }),
  });

const member = { id: 7, status: "ACTIVE", role: "TESTER", isGlobalAdmin: false };

beforeEach(() => {
  state.calls = [];
  state.moduleRows = [{ is_member: true }];
  state.flows = [{ id: 1, title: "Flow A" }];
  state.cases = [{ id: 10, title: "Case A" }];
  state.getCurrentUser.mockReset();
  state.getCurrentUser.mockResolvedValue(member);
});

describe("GET /api/modules/[id]/workspace", () => {
  it("401 khi chưa đăng nhập và không chạm DB", async () => {
    state.getCurrentUser.mockResolvedValue(null);
    const res = await call("3");
    expect(res.status).toBe(401);
    expect(state.calls).toHaveLength(0);
  });

  it("401 khi tài khoản chưa ACTIVE", async () => {
    state.getCurrentUser.mockResolvedValue({ ...member, status: "PENDING" });
    expect((await call("3")).status).toBe(401);
  });

  it("400 khi id không phải số nguyên", async () => {
    for (const bad of ["abc", "1;DROP", "-1", "1.5", ""]) {
      expect((await call(bad)).status).toBe(400);
    }
    expect(state.calls).toHaveLength(0);
  });

  it("404 khi module không tồn tại hoặc đã xoá mềm", async () => {
    state.moduleRows = [];
    const res = await call("999");
    expect(res.status).toBe(404);
  });

  it("403 khi không phải thành viên project và không trả dữ liệu flows/cases", async () => {
    state.moduleRows = [{ is_member: false }];
    const res = await call("3");
    expect(res.status).toBe(403);
    expect(await res.json()).not.toHaveProperty("cases");
  });

  it("global admin xem được dù không là thành viên và query cases không lọc thành viên", async () => {
    state.getCurrentUser.mockResolvedValue({ ...member, role: "SUPER_ADMIN", isGlobalAdmin: true });
    state.moduleRows = [{ is_member: false }];
    const res = await call("3");
    expect(res.status).toBe(200);
    const casesCall = state.calls.find((c) => c.sql.includes("FROM era_tester_cases c"))!;
    expect(casesCall.sql).not.toContain("era_tester_project_members");
  });

  it("thành viên nhận đúng flows + cases, chỉ 1 lần getCurrentUser, truyền moduleId số", async () => {
    const res = await call("3");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      flows: [{ id: 1, title: "Flow A" }],
      cases: [{ id: 10, title: "Case A" }],
    });
    expect(state.getCurrentUser).toHaveBeenCalledTimes(1);
    const flowsCall = state.calls.find((c) => c.sql.includes("FROM era_tester_flows f"))!;
    expect(flowsCall.params).toEqual([3]);
    const casesCall = state.calls.find((c) => c.sql.includes("FROM era_tester_cases c"))!;
    expect(casesCall.params).toEqual([7, 3]);
    expect(casesCall.sql).toContain("era_tester_project_members");
  });

  it("module rỗng trả mảng rỗng chứ không lỗi", async () => {
    state.flows = [];
    state.cases = [];
    const res = await call("3");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ flows: [], cases: [] });
  });
});
