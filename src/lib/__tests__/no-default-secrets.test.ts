import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: vi.fn() }) }));
vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("../db", () => ({ query: vi.fn() }));

import { getJwtSecret, createSessionToken, verifySessionToken } from "../auth";

const session = {
  id: 1,
  email: "a@eragroup.com.vn",
  fullName: "A",
  role: "TESTER" as const,
  status: "ACTIVE" as const,
  isGlobalAdmin: false,
};

describe("B-001 JWT_SECRET fail closed", () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  it("thiếu JWT_SECRET thì ném lỗi, không dùng giá trị mặc định", () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it("JWT_SECRET rỗng hoặc ngắn hơn 32 byte thì ném lỗi", () => {
    process.env.JWT_SECRET = "";
    expect(() => getJwtSecret()).toThrow();
    process.env.JWT_SECRET = "x".repeat(31);
    expect(() => getJwtSecret()).toThrow();
  });

  it("đủ 32 byte thì ký và xác thực được", async () => {
    process.env.JWT_SECRET = "x".repeat(32);
    const token = await createSessionToken(session);
    expect((await verifySessionToken(token))?.email).toBe(session.email);
  });

  it("token ký bằng secret mặc định cũ bị từ chối", async () => {
    process.env.JWT_SECRET = "y".repeat(40);
    const { SignJWT } = await import("jose");
    const forged = await new SignJWT({ ...session, role: "SUPER_ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("eraweb_tester_hub_jwt_super_secure_secret_2026"));
    expect(await verifySessionToken(forged)).toBeNull();
  });

  it("verifySessionToken ném lỗi cấu hình khi thiếu secret (không nuốt thành chưa đăng nhập)", async () => {
    delete process.env.JWT_SECRET;
    await expect(verifySessionToken("abc")).rejects.toThrow(/JWT_SECRET/);
  });
});
