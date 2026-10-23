import "server-only";
import { NextResponse } from "next/server";
import { query } from "./db";

export interface AccessUser {
  id: number;
  isGlobalAdmin: boolean;
}

export type ProjectScopedKind = "module" | "flow" | "case" | "run";

const PROJECT_ID_SQL: Record<ProjectScopedKind, string> = {
  module: `SELECT m.project_id FROM era_tester_modules m
           WHERE m.id = $1 AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)`,
  flow: `SELECT m.project_id FROM era_tester_flows f
         JOIN era_tester_modules m ON m.id = f.module_id
         WHERE f.id = $1 AND (f.is_deleted IS NULL OR f.is_deleted = FALSE)`,
  case: `SELECT m.project_id FROM era_tester_cases c
         JOIN era_tester_modules m ON m.id = c.module_id
         WHERE c.id = $1 AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)`,
  run: `SELECT r.project_id FROM era_tester_runs r
        WHERE r.id = $1 AND (r.is_deleted IS NULL OR r.is_deleted = FALSE)`,
};

export function forbiddenProjectResponse(): NextResponse {
  return NextResponse.json({ error: "Bạn không phải thành viên dự án này" }, { status: 403 });
}

function toId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Admin toàn cục luôn được phép; còn lại phải có dòng trong era_tester_project_members. */
export async function userCanAccessProject(user: AccessUser, projectId: unknown): Promise<boolean> {
  if (user.isGlobalAdmin) return true;
  const id = toId(projectId);
  if (!id) return false;
  const res = await query(
    "SELECT 1 FROM era_tester_project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1",
    [id, user.id]
  );
  return res.rows.length > 0;
}

/** Trả về response lỗi (403) nếu người gọi không phải thành viên dự án; null nếu được phép. */
export async function guardProject(user: AccessUser, projectId: unknown): Promise<NextResponse | null> {
  return (await userCanAccessProject(user, projectId)) ? null : forbiddenProjectResponse();
}

/**
 * Kiểm tra quyền theo thực thể con (module/flow/case/run) qua project_id của nó.
 * Thực thể không tồn tại: 404 với người không phải admin (admin để route tự xử lý như cũ).
 */
export async function guardProjectOf(
  user: AccessUser,
  kind: ProjectScopedKind,
  entityId: unknown
): Promise<NextResponse | null> {
  if (user.isGlobalAdmin) return null;
  const id = toId(entityId);
  if (!id) return NextResponse.json({ error: "Không tìm thấy dữ liệu" }, { status: 404 });
  const res = await query<{ project_id: number }>(PROJECT_ID_SQL[kind], [id]);
  if (res.rows.length === 0) return NextResponse.json({ error: "Không tìm thấy dữ liệu" }, { status: 404 });
  return guardProject(user, res.rows[0].project_id);
}
