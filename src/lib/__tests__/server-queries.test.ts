import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  calls: [] as { sql: string; params: any[] }[],
}));

vi.mock("@/lib/permissions", () => ({
  isGlobalAdminRole: vi.fn(async () => false),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (sql: string, params: any[] = []) => {
    state.calls.push({ sql, params });
    return { rows: [] };
  }),
}));

import { getCasesForUser, getFlowsForModule, getModulesForUser } from "../server-queries";

const member = { id: 7, isGlobalAdmin: false };
const admin = { id: 1, isGlobalAdmin: true };

beforeEach(() => {
  state.calls = [];
});

describe("getCasesForUser", () => {
  it("thành viên: lọc theo project_members, lọc xoá mềm, sắp xếp id DESC", async () => {
    await getCasesForUser(member, { moduleId: 3 });
    const { sql, params } = state.calls[0];
    expect(params).toEqual([7, 3]);
    expect(sql).toContain("m.project_id IN (SELECT project_id FROM era_tester_project_members WHERE user_id = $1)");
    expect(sql).toContain("c.module_id = $2");
    expect(sql).toContain("c.is_deleted IS NULL");
    expect(sql).toContain("m.is_deleted IS NULL");
    expect(sql).toContain("ORDER BY c.id DESC");
  });

  it("global admin: không lọc thành viên, đủ 4 filter theo thứ tự", async () => {
    await getCasesForUser(admin, { projectId: "2", moduleId: "3", flowId: "4", status: "NEW" });
    const { sql, params } = state.calls[0];
    expect(sql).not.toContain("era_tester_project_members");
    expect(params).toEqual(["2", "3", "4", "NEW"]);
    expect(sql).toContain("m.project_id = $1");
    expect(sql).toContain("c.module_id = $2");
    expect(sql).toContain("c.flow_id = $3");
    expect(sql).toContain("c.status = $4");
  });

  it("không filter: không thêm điều kiện thừa", async () => {
    await getCasesForUser(admin);
    expect(state.calls[0].params).toEqual([]);
  });
});

describe("getFlowsForModule", () => {
  it("truyền moduleId, lọc flow và case xoá mềm", async () => {
    await getFlowsForModule(5);
    const { sql, params } = state.calls[0];
    expect(params).toEqual([5]);
    expect(sql).toContain("f.module_id = $1");
    expect(sql).toContain("f.is_deleted IS NULL");
    expect(sql).toContain("c.is_deleted IS NULL");
  });
});

describe("getModulesForUser", () => {
  it("thành viên + projectId: lọc thành viên rồi project", async () => {
    await getModulesForUser(member, { projectId: 2 });
    const { sql, params } = state.calls[0];
    expect(params).toEqual([7, 2]);
    expect(sql).toContain("p.id IN (SELECT project_id FROM era_tester_project_members WHERE user_id = $1)");
    expect(sql).toContain("m.project_id = $2");
  });

  it("projectSlug chỉ dùng khi không có projectId", async () => {
    await getModulesForUser(admin, { projectSlug: "abc" });
    expect(state.calls[0].params).toEqual(["abc"]);
    expect(state.calls[0].sql).toContain("p.slug = $1");

    await getModulesForUser(admin, { projectId: 2, projectSlug: "abc" });
    expect(state.calls[1].params).toEqual([2]);
  });

  it("sắp xếp theo sort_order rồi id", async () => {
    await getModulesForUser(admin);
    expect(state.calls[0].sql).toContain("ORDER BY COALESCE(m.sort_order, 0) ASC, m.id ASC");
  });
});
