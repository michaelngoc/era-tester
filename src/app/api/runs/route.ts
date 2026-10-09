import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  try {
    let sql = `
      SELECT r.*,
             p.name as project_name,
             p.github_repo,
             u.full_name as creator_name,
             u.email as creator_email,
             COUNT(DISTINCT c.id) as total_cases_count,
             COUNT(DISTINCT CASE WHEN c.status = 'CLOSED' THEN c.id END) as passed_cases_count,
             COUNT(DISTINCT CASE WHEN c.status = 'NEW' THEN c.id END) as failed_cases_count,
             COUNT(DISTINCT CASE WHEN c.status IN ('FIX', 'VERIFY') THEN c.id END) as fixing_cases_count
      FROM era_tester_runs r
      JOIN era_tester_projects p ON p.id = r.project_id AND (p.is_deleted IS NULL OR p.is_deleted = FALSE)
      LEFT JOIN era_tester_users u ON u.id = r.created_by
      LEFT JOIN era_tester_cases c ON c.last_run_id = r.id AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
      WHERE (r.is_deleted IS NULL OR r.is_deleted = FALSE)
    `;
    const params: any[] = [];

    if (projectId) {
      sql += ` AND r.project_id = $1`;
      params.push(projectId);
    }

    sql += ` GROUP BY r.id, p.name, p.github_repo, u.full_name, u.email
             ORDER BY r.created_at DESC`;

    const res = await query(sql, params);
    return NextResponse.json({ runs: res.rows });
  } catch (error: any) {
    console.error("[Get Runs Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { projectId, title, runType = "MANUAL", moduleIds } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: "Dự án và Tiêu đề đợt test là bắt buộc" }, { status: 400 });
    }

    // 1. Tạo bản ghi Run mới
    const runRes = await query(
      `INSERT INTO era_tester_runs
       (project_id, title, run_type, status, created_by)
       VALUES ($1, $2, $3, 'IN_PROGRESS', $4)
       RETURNING *`,
      [projectId, title.trim(), runType, user.id]
    );

    const newRun = runRes.rows[0];

    // 2. Gán các case thuộc project hoặc moduleIds vào run này
    let caseUpdateSql = `UPDATE era_tester_cases SET last_run_id = $1 WHERE module_id IN (
      SELECT id FROM era_tester_modules WHERE project_id = $2
    )`;
    const caseUpdateParams: any[] = [newRun.id, projectId];

    if (Array.isArray(moduleIds) && moduleIds.length > 0) {
      caseUpdateSql = `UPDATE era_tester_cases SET last_run_id = $1 WHERE module_id = ANY($2::int[])`;
      caseUpdateParams[1] = moduleIds;
    }

    await query(caseUpdateSql, caseUpdateParams);

    // 3. Nếu là FULL_REGRESSION, ghi nhận audit log cho đợt test
    await query(
      `INSERT INTO era_tester_case_history
       (case_id, run_id, actor_id, actor_name, action, note)
       SELECT id, $1, $2, $3, 'RUN_INIT', $4
       FROM era_tester_cases
       WHERE last_run_id = $1`,
      [
        newRun.id,
        user.id,
        user.fullName || user.email,
        `Bắt đầu đợt kiểm thử mới: ${title.trim()}`,
      ]
    );

    return NextResponse.json({ success: true, run: newRun });
  } catch (error: any) {
    console.error("[Create Run Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
