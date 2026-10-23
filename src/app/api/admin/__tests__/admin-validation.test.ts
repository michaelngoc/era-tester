import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db", () => ({ query: (...a: unknown[]) => queryMock(...a) }));
vi.mock("@/lib/mailer", () => ({ sendAccountApprovedEmail: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => ({ id: 1, isGlobalAdmin: true }) }));
const updateMock = vi.fn(async (roles: string[]) => roles);
vi.mock("@/lib/permissions", async (orig) => ({
  ...(await orig<typeof import("@/lib/permissions")>()),
  updateGlobalAdminRoles: (...a: [string[]]) => updateMock(...a),
}));

import { PATCH } from "../users/route";
import { POST } from "../settings/roles/route";

const patch = (body: unknown) =>
  PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }) as never);
const post = (body: unknown) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

describe("B-023 validate role/status", () => {
  beforeEach(() => {
    queryMock.mockReset();
    updateMock.mockClear();
    queryMock.mockResolvedValue({ rows: [{ email: "a@b", full_name: "A", id: 2, role: "QA", status: "ACTIVE" }] });
  });

  it("PATCH users: status lạ -> 400, không chạm DB", async () => {
    expect((await patch({ userId: 2, status: "HACKED" })).status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });
  it("PATCH users: role lạ -> 400", async () => {
    expect((await patch({ userId: 2, role: "ROOT" })).status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });
  it("PATCH users: giá trị hợp lệ hoặc bỏ trống -> 200", async () => {
    expect((await patch({ userId: 2, status: "BANNED", role: "QA" })).status).toBe(200);
    expect((await patch({ userId: 2, status: "ACTIVE" })).status).toBe(200);
  });
  it("POST roles: role lạ -> 400, không cập nhật", async () => {
    expect((await post({ roles: ["CTO", "ROOT"] })).status).toBe(400);
    expect((await post({ roles: [5] })).status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
  it("POST roles: hợp lệ -> 200", async () => {
    expect((await post({ roles: ["CTO"] })).status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });
});
