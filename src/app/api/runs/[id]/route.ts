import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const runRes = await query(
      `SELECT r.*, p.name as project_name, p.github_repo, u.full_name as creator_name
       FROM era_tester_runs r
       JOIN era_tester_projects p ON p.id = r.project_id
       LEFT JOIN era_tester_users u ON u.id = r.created_by
       WHERE r.id = $1 AND (r.is_deleted IS NULL OR r.is_deleted = FALSE)`,
      [id]
    );

    if (runRes.rows.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy đợt test hoặc đã bị xóa" }, { status: 404 });
    }

    const casesRes = await query(
      `SELECT c.*, m.name as module_name
       FROM era_tester_cases c
       JOIN era_tester_modules m ON m.id = c.module_id
       WHERE c.last_run_id = $1 AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
       ORDER BY c.status ASC, c.id ASC`,
      [id]
    );

    return NextResponse.json({
      run: runRes.rows[0],
      cases: casesRes.rows,
    });
  } catch (error: any) {
    console.error("[Get Run Detail Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const nextStatus = body.status || "COMPLETED";

    // Đếm tổng số cases, passed, failed
    const statsRes = await query(
      `SELECT COUNT(*)::int as total,
              COUNT(CASE WHEN status = 'CLOSED' THEN 1 END)::int as passed,
              COUNT(CASE WHEN status = 'NEW' THEN 1 END)::int as failed
       FROM era_tester_cases 
       WHERE last_run_id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)`,
      [id]
    );

    const stats = statsRes.rows[0];

    const updateRes = await query(
      `UPDATE era_tester_runs
       SET status = $1,
           total_cases = $2,
           passed_cases = $3,
           failed_cases = $4,
           completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE completed_at END
       WHERE id = $5 AND (is_deleted IS NULL OR is_deleted = FALSE)
       RETURNING *`,
      [nextStatus, stats.total, stats.passed, stats.failed, id]
    );

    return NextResponse.json({ success: true, run: updateRes.rows[0] });
  } catch (error: any) {
    console.error("[Update Run Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Chỉ Super Admin mới có quyền xóa đợt chạy test!" },
      { status: 403 }
    );
  }

  const { id } = await params;
  await query(
    "UPDATE era_tester_runs SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
    [id]
  );
  return NextResponse.json({ success: true, message: "Đã xóa mềm đợt test thành công" });
}
