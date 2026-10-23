import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  calls: [] as { sql: string; params: any[] }[],
  prev: {
    id: 5,
    title: "Đăng nhập",
    input_data: "",
    output_data: "",
    expected_result: "OK",
    actual_result: "",
    status: "NEW",
    priority: "MEDIUM",
    assigned_to: null,
    created_by: null,
    last_run_id: null,
    module_name: "Auth",
    project_id: 1,
  } as Record<string, any>,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: 1,
    status: "ACTIVE",
    role: "TESTER",
    email: "t@example.com",
    fullName: "Tester",
    isGlobalAdmin: false,
  })),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (sql: string, params: any[] = []) => {
    state.calls.push({ sql, params });
    const s = sql.replace(/\s+/g, " ");
    if (s.startsWith("SELECT m.project_id FROM era_tester_modules m")) return { rows: [{ project_id: 1 }] };
    if (s.includes("FROM era_tester_project_members WHERE project_id")) return { rows: [{ "?column?": 1 }] };
    if (s.includes("JOIN era_tester_projects p")) return { rows: [state.prev] };
    if (s.startsWith("UPDATE era_tester_cases SET title")) return { rows: [{ ...state.prev }] };
    if (s.startsWith("INSERT INTO era_tester_cases")) return { rows: [{ id: 50, title: params[3] }] };
    return { rows: [] };
  }),
}));

vi.mock("@/lib/mailer", () => ({
  sendBugReportEmail: vi.fn(),
  sendBroadcastBugToDevsEmail: vi.fn(),
  sendBugClaimedEmail: vi.fn(),
  sendDeployRequestEmail: vi.fn(),
  sendDeployCompletedEmail: vi.fn(),
  sendEmail: vi.fn(),
}));

import { NextRequest } from "next/server";
import { PATCH } from "../[id]/route";
import { POST } from "../route";

const patch = (body: unknown) =>
  PATCH(
    new NextRequest("http://localhost/api/cases/5", { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: "5" }) }
  );
const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/cases", { method: "POST", body: JSON.stringify(body) }));

const updateCall = () =>
  state.calls.find((c) => c.sql.replace(/\s+/g, " ").startsWith("UPDATE era_tester_cases SET title"));
const historyCall = () => state.calls.find((c) => c.sql.includes("INSERT INTO era_tester_case_history"));

beforeEach(() => {
  state.calls.length = 0;
});

describe("PATCH /api/cases/[id]", () => {
  it("ghi evidence_urls vào era_tester_cases và giữ dòng case_history", async () => {
    const urls = ["https://s3/a.png", "https://s3/b.png"];
    const res = await patch({ evidenceUrls: urls, note: "Đã test" });

    expect(res.status).toBe(200);
    const upd = updateCall()!;
    expect(upd.sql).toMatch(/evidence_urls\s*=\s*COALESCE\(\$11,\s*evidence_urls\)/);
    expect(upd.params[10]).toEqual(urls);
    expect(upd.params[11]).toBe("5");
    expect(historyCall()!.params[8]).toEqual(urls);
  });

  it("nhận cả evidence_urls (snake_case) như StepChecklistDrawer gửi", async () => {
    await patch({ evidence_urls: ["u1"] });
    expect(updateCall()!.params[10]).toEqual(["u1"]);
  });

  it("không gửi evidence_urls thì truyền null (giữ nguyên)", async () => {
    await patch({ note: "x" });
    expect(updateCall()!.params[10]).toBeNull();
  });

  it("từ chối evidence_urls không phải mảng chuỗi", async () => {
    const res = await patch({ evidence_urls: "not-array" });
    expect(res.status).toBe(400);
    expect(updateCall()).toBeUndefined();
  });

  it("chuẩn hóa status/priority về chữ hoa", async () => {
    const res = await patch({ status: "verify", priority: "high" });
    expect(res.status).toBe(200);
    expect(updateCall()!.params[6]).toBe("VERIFY");
    expect(updateCall()!.params[7]).toBe("HIGH");
  });

  it("400 với status lạ, không chạm DB", async () => {
    const res = await patch({ status: "PASSED" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("NEW, FIX, VERIFY, DEPLOY, CLOSED");
    expect(updateCall()).toBeUndefined();
  });

  it("400 với priority lạ", async () => {
    const res = await patch({ priority: "URGENT" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("LOW, MEDIUM, HIGH, CRITICAL");
    expect(updateCall()).toBeUndefined();
  });
});

describe("POST /api/cases", () => {
  const base = { moduleId: 10, title: "Case mới" };
  const insertCall = () => state.calls.find((c) => c.sql.includes("INSERT INTO era_tester_cases"));

  it("mặc định NEW/MEDIUM và chuẩn hóa chữ hoa", async () => {
    await post(base);
    expect(insertCall()!.params.slice(10, 12)).toEqual(["NEW", "MEDIUM"]);
    state.calls.length = 0;
    await post({ ...base, status: "fix", priority: "critical" });
    expect(insertCall()!.params.slice(10, 12)).toEqual(["FIX", "CRITICAL"]);
  });

  it("400 với status hoặc priority lạ, không INSERT", async () => {
    const r1 = await post({ ...base, status: "PASSED" });
    const r2 = await post({ ...base, priority: "P0" });
    expect(r1.status).toBe(400);
    expect(r2.status).toBe(400);
    expect(insertCall()).toBeUndefined();
  });
});
