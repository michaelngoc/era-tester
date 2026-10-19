import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeCase {
  id: number;
  status: string;
  projectId: number;
  isDeleted: boolean;
  moduleId: number;
  impacted: boolean;
}

const db = vi.hoisted(() => ({
  cases: [] as FakeCase[],
  calls: [] as { sql: string; params: any[] }[],
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(async (sql: string, params: any[] = []) => {
    db.calls.push({ sql, params });
    const s = sql.replace(/\s+/g, " ");

    if (s.includes("FROM era_tester_projects")) {
      const repo = String(params[0]).toLowerCase();
      return { rows: repo === "era/manage" ? [{ id: 1, name: "Manage" }] : [] };
    }
    if (s.includes("FROM era_tester_runs")) return { rows: [{ id: 99 }] };
    if (s.startsWith("UPDATE era_tester_runs")) return { rows: [] };

    // Tra cứu case theo mã [#ID]: mô phỏng đúng các điều kiện có trong SQL.
    if (s.startsWith("SELECT") && s.includes("FROM era_tester_cases")) {
      const c = db.cases.find((x) => x.id === params[0]);
      if (!c) return { rows: [] };
      if (s.includes("m.project_id = $2") && c.projectId !== params[1]) return { rows: [] };
      if (s.includes("is_deleted") && c.isDeleted) return { rows: [] };
      return { rows: [{ id: c.id, status: c.status }] };
    }
    if (s.startsWith("UPDATE era_tester_cases c SET status = 'VERIFY'")) {
      const c = db.cases.find((x) => x.id === params[1])!;
      c.status = "VERIFY";
      c.impacted = true;
      return { rows: [] };
    }
    if (s.includes("INSERT INTO era_tester_case_history")) return { rows: [] };

    if (s.includes("FROM era_tester_modules")) {
      return {
        rows: [{ id: 10, project_id: 1, name: "Auth", file_patterns: ["src/auth/**"], assigned_testers: [] }],
      };
    }
    // Đánh dấu Git Impact theo module.
    if (s.startsWith("UPDATE era_tester_cases SET is_impacted_by_git = TRUE")) {
      for (const c of db.cases) {
        if (!params[1].includes(c.moduleId)) continue;
        if (s.includes("is_deleted") && c.isDeleted) continue;
        c.impacted = true;
      }
      return { rows: [] };
    }
    return { rows: [] };
  }),
}));

vi.mock("@/lib/mailer", () => ({ sendGitPushImpactEmail: vi.fn(async () => undefined) }));

import { processGitPushImpact } from "../git-impact";

const commit = (message: string, files: string[] = ["README.md"]) => ({
  hash: "abc123",
  message,
  authorName: "Dev",
  authorEmail: "dev@example.com",
  files,
});

beforeEach(() => {
  db.calls.length = 0;
  db.cases = [
    { id: 5, status: "NEW", projectId: 1, isDeleted: false, moduleId: 10, impacted: false },
    { id: 6, status: "NEW", projectId: 2, isDeleted: false, moduleId: 20, impacted: false },
    { id: 7, status: "NEW", projectId: 1, isDeleted: true, moduleId: 10, impacted: false },
  ];
});

describe("processGitPushImpact: [#ID] -> VERIFY", () => {
  it("chỉ chuyển case thuộc project của repo, case project khác bị bỏ qua", async () => {
    const res = await processGitPushImpact({
      branch: "tester",
      repoFullName: "era/manage",
      commits: [commit("fix(auth): sửa lỗi [#5] [#6]")],
    });

    expect(db.cases.find((c) => c.id === 5)!.status).toBe("VERIFY");
    expect(db.cases.find((c) => c.id === 6)!.status).toBe("NEW");
    expect(res.movedCases).toEqual([5]);
    expect(res.skippedCases).toEqual([6]);
    expect(res.referencedCases).toEqual([5, 6]);
    const historyIds = db.calls
      .filter((c) => c.sql.includes("INSERT INTO era_tester_case_history"))
      .map((c) => c.params[0]);
    expect(historyIds).toEqual([5]);
  });

  it("case đã xóa mềm không bị chuyển", async () => {
    const res = await processGitPushImpact({
      branch: "tester",
      repoFullName: "era/manage",
      commits: [commit("fix(auth): sửa lỗi [#7]")],
    });
    expect(db.cases.find((c) => c.id === 7)!.status).toBe("NEW");
    expect(res.skippedCases).toEqual([7]);
  });

  it("không xác định được project: không đổi gì, báo skipped", async () => {
    const res = await processGitPushImpact({
      branch: "tester",
      repoFullName: "other/unknown-repo",
      commits: [commit("fix(auth): sửa lỗi [#5] [#6]")],
    });

    expect(db.cases.every((c) => c.status === "NEW")).toBe(true);
    expect(res.movedCases).toEqual([]);
    expect(res.skippedCases).toEqual([5, 6]);
    expect(db.calls.some((c) => c.sql.includes("INSERT INTO era_tester_case_history"))).toBe(false);
    expect(db.calls.some((c) => c.sql.includes("UPDATE era_tester_cases c"))).toBe(false);
  });

  it("thiếu repoFullName cũng bị bỏ qua", async () => {
    const res = await processGitPushImpact({
      branch: "tester",
      commits: [commit("fix(auth): sửa lỗi [#5]")],
    });
    expect(db.cases.find((c) => c.id === 5)!.status).toBe("NEW");
    expect(res.skippedCases).toEqual([5]);
  });
});

describe("processGitPushImpact: module impact", () => {
  it("không bật is_impacted_by_git cho case đã xóa mềm", async () => {
    const res = await processGitPushImpact({
      branch: "tester",
      repoFullName: "era/manage",
      commits: [commit("feat(auth): thêm đăng nhập", ["src/auth/login.ts"])],
    });

    expect(res.impactedCount).toBe(1);
    expect(db.cases.find((c) => c.id === 5)!.impacted).toBe(true);
    expect(db.cases.find((c) => c.id === 7)!.impacted).toBe(false);
  });
});
