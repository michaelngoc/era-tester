import { describe, expect, it } from "vitest";
import { parseCasePriority, parseCaseStatus, parseEvidenceUrls } from "../case-validation";

describe("parseCaseStatus", () => {
  it.each(["NEW", "FIX", "VERIFY", "DEPLOY", "CLOSED"])("chấp nhận %s", (s) => {
    expect(parseCaseStatus(s)).toEqual({ ok: true, value: s });
  });

  it("chuẩn hóa chữ hoa và cắt khoảng trắng", () => {
    expect(parseCaseStatus(" verify ")).toEqual({ ok: true, value: "VERIFY" });
  });

  it("undefined/null/rỗng = không đổi", () => {
    for (const v of [undefined, null, ""]) expect(parseCaseStatus(v)).toEqual({ ok: true, value: undefined });
  });

  it.each(["PASSED", "done", 5, {}, ["NEW"]])("từ chối %j", (v) => {
    const r = parseCaseStatus(v);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("NEW, FIX, VERIFY, DEPLOY, CLOSED");
  });
});

describe("parseCasePriority", () => {
  it("chấp nhận và chuẩn hóa", () => {
    expect(parseCasePriority("critical")).toEqual({ ok: true, value: "CRITICAL" });
    expect(parseCasePriority("Low")).toEqual({ ok: true, value: "LOW" });
  });

  it("từ chối giá trị lạ", () => {
    const r = parseCasePriority("URGENT");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("LOW, MEDIUM, HIGH, CRITICAL");
  });
});

describe("parseEvidenceUrls", () => {
  it("giữ mảng rỗng (xóa hết bằng chứng) và mảng URL", () => {
    expect(parseEvidenceUrls([])).toEqual({ ok: true, value: [] });
    expect(parseEvidenceUrls(["a", "b"])).toEqual({ ok: true, value: ["a", "b"] });
  });

  it("undefined/null = không đổi", () => {
    expect(parseEvidenceUrls(undefined)).toEqual({ ok: true, value: undefined });
    expect(parseEvidenceUrls(null)).toEqual({ ok: true, value: undefined });
  });

  it("từ chối không phải mảng chuỗi", () => {
    expect(parseEvidenceUrls("a").ok).toBe(false);
    expect(parseEvidenceUrls([1]).ok).toBe(false);
  });
});
