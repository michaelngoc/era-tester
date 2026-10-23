import { describe, it, expect } from "vitest";
import { getDbCredentials } from "../db";

describe("B-002 DB credentials bắt buộc từ env", () => {
  it("thiếu cả user và mật khẩu thì ném lỗi", () => {
    expect(() => getDbCredentials({} as NodeJS.ProcessEnv)).toThrow(/ERA_TESTER/);
  });

  it("thiếu mật khẩu hoặc thiếu user thì ném lỗi", () => {
    expect(() => getDbCredentials({ ERA_TESTER_USER: "u" } as unknown as NodeJS.ProcessEnv)).toThrow();
    expect(() => getDbCredentials({ ERA_TESTER_PASSWORD: "p" } as unknown as NodeJS.ProcessEnv)).toThrow();
  });

  it("dùng ERA_TESTER_*, rồi fallback ERA_ADMIN_*", () => {
    expect(getDbCredentials({ ERA_TESTER_USER: "u", ERA_TESTER_PASSWORD: "p" } as unknown as NodeJS.ProcessEnv)).toEqual({ user: "u", password: "p" });
    expect(getDbCredentials({ ERA_ADMIN_USER: "au", ERA_ADMIN_PASSWORD: "ap" } as unknown as NodeJS.ProcessEnv)).toEqual({ user: "au", password: "ap" });
  });

  it("từ chối mật khẩu DB mặc định cũ ở cả ERA_TESTER_* và ERA_ADMIN_*", () => {
    const legacy = "EraTester_Secure_2026!#p9X";
    expect(() => getDbCredentials({ ERA_TESTER_USER: "u", ERA_TESTER_PASSWORD: legacy } as unknown as NodeJS.ProcessEnv)).toThrow(/mặc định cũ/);
    expect(() => getDbCredentials({ ERA_ADMIN_USER: "u", ERA_ADMIN_PASSWORD: legacy } as unknown as NodeJS.ProcessEnv)).toThrow(/mặc định cũ/);
  });
});
