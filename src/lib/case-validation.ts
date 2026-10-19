/**
 * Allowlist + chuẩn hóa dữ liệu test case ở phía server (status, priority, evidence_urls).
 * Không import server-only để route và test dùng chung.
 */

export const CASE_STATUSES = ["NEW", "FIX", "VERIFY", "DEPLOY", "CLOSED"] as const;
export const CASE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];
export type CasePriority = (typeof CASE_PRIORITIES)[number];

export type FieldResult<T> = { ok: true; value: T | undefined } | { ok: false; error: string };

function parseEnum<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  label: string
): FieldResult<T> {
  // Không gửi / null / chuỗi rỗng = không thay đổi (giữ hành vi cũ `body.x || default`).
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: undefined };
  const upper = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if ((allowed as readonly string[]).includes(upper)) return { ok: true, value: upper as T };
  return {
    ok: false,
    error: `${label} không hợp lệ: ${JSON.stringify(raw)}. Chỉ chấp nhận: ${allowed.join(", ")}.`,
  };
}

export function parseCaseStatus(raw: unknown): FieldResult<CaseStatus> {
  return parseEnum(raw, CASE_STATUSES, "Trạng thái (status)");
}

export function parseCasePriority(raw: unknown): FieldResult<CasePriority> {
  return parseEnum(raw, CASE_PRIORITIES, "Mức ưu tiên (priority)");
}

/** evidence_urls phải là mảng chuỗi (danh sách đầy đủ, thay thế bản cũ); undefined/null = không đổi. */
export function parseEvidenceUrls(raw: unknown): FieldResult<string[]> {
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (!Array.isArray(raw) || raw.some((u) => typeof u !== "string")) {
    return { ok: false, error: "evidence_urls phải là mảng các chuỗi URL." };
  }
  return { ok: true, value: raw as string[] };
}
