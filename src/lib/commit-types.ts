/**
 * Nguồn sự thật duy nhất cho commit type của Eraweb (manage / client / tester).
 * Tài liệu: GIT_WORKFLOW.md (root workspace). Sửa file này => cập nhật tài liệu.
 */

export const COMMIT_TYPES = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "style",
  "docs",
  "test",
  "chore",
  "ci",
  "revert",
] as const;

export type CommitType = (typeof COMMIT_TYPES)[number];

/** Type làm thay đổi hành vi sản phẩm => tự động gửi cho Tester (case -> VERIFY, Git Impact, email). */
export const TESTER_NOTIFY_TYPES: readonly CommitType[] = ["feat", "fix", "perf", "refactor"];

export interface ParsedCommitHeader {
  type: CommitType;
  scope: string | null;
  breaking: boolean;
  subject: string;
}

const HEADER_RE = /^(\w+)(?:\(([^)\r\n]+)\))?(!)?:\s*(.+)$/;

/** Parse dòng đầu của commit message; trả null nếu không theo Conventional Commits / type lạ. */
export function parseCommitHeader(message: string): ParsedCommitHeader | null {
  const header = message.split(/\r?\n/, 1)[0].trim();
  const m = HEADER_RE.exec(header);
  if (!m) return null;
  const type = m[1].toLowerCase();
  if (!(COMMIT_TYPES as readonly string[]).includes(type)) return null;
  return { type: type as CommitType, scope: m[2] ?? null, breaking: m[3] === "!", subject: m[4] };
}

export function isTesterNotifyCommit(message: string): boolean {
  const parsed = parseCommitHeader(message);
  return parsed !== null && TESTER_NOTIFY_TYPES.includes(parsed.type);
}

/**
 * Lấy mã test case từ `[#12]` hoặc `[case-12]`.
 * KHÔNG khớp `#12` trần: số PR kiểu `(#97)` / `Merge pull request #99` không phải mã case.
 */
/**
 * Lấy mã module từ `[#M12]` hoặc `[module-12]`: chuyển MỌI case NEW/FIX của module đó sang VERIFY.
 * Không trùng với `[#12]` (mã case).
 */
export function extractModuleIds(message: string): number[] {
  const ids = new Set<number>();
  for (const m of message.matchAll(/\[(?:#M|module-)(\d+)\]/gi)) {
    ids.add(parseInt(m[1], 10));
  }
  return Array.from(ids);
}

export function extractCaseIds(message: string): number[] {
  const ids = new Set<number>();
  for (const m of message.matchAll(/\[(?:#|case-)(\d+)\]/gi)) {
    ids.add(parseInt(m[1], 10));
  }
  return Array.from(ids);
}
