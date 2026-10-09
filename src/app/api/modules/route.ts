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
  const projectSlug = searchParams.get("projectSlug");

  const isGlobalAdmin = user.role === "SUPER_ADMIN" || user.role === "CTO";

  let sql = `
    SELECT m.*, 
           p.name AS project_name, p.slug AS project_slug,
           COUNT(c.id) AS total_cases,
           COUNT(CASE WHEN c.status = 'NEW' THEN 1 END) AS count_new,
           COUNT(CASE WHEN c.status = 'FIX' THEN 1 END) AS count_fix,
           COUNT(CASE WHEN c.status = 'VERIFY' THEN 1 END) AS count_verify,
           COUNT(CASE WHEN c.status = 'DEPLOY' THEN 1 END) AS count_deploy,
           COUNT(CASE WHEN c.status = 'CLOSED' THEN 1 END) AS count_closed,
           COUNT(CASE WHEN c.is_impacted_by_git = TRUE THEN 1 END) AS count_git_impacted,
           COALESCE(
             (
               SELECT json_agg(json_build_object('id', u.id, 'name', u.full_name, 'email', u.email))
               FROM era_tester_users u
               WHERE u.id = ANY(m.assigned_testers)
             ),
             '[]'::json
           ) AS assigned_tester_users
    FROM era_tester_modules m
    JOIN era_tester_projects p ON p.id = m.project_id
    LEFT JOIN era_tester_cases c ON c.module_id = m.id AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
    WHERE (m.is_deleted IS NULL OR m.is_deleted = FALSE) 
      AND (p.is_deleted IS NULL OR p.is_deleted = FALSE)
  `;
  const params: any[] = [];

  if (!isGlobalAdmin) {
    params.push(user.id);
    sql += ` AND p.id IN (SELECT project_id FROM era_tester_project_members WHERE user_id = $${params.length}) `;
  }

  if (projectId) {
    params.push(projectId);
    sql += ` AND m.project_id = $${params.length}`;
  } else if (projectSlug) {
    params.push(projectSlug);
    sql += ` AND p.slug = $${params.length}`;
  }

  sql += ` GROUP BY m.id, p.name, p.slug ORDER BY m.sort_order ASC, m.id ASC`;

  const res = await query(sql, params);
  return NextResponse.json({ modules: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  if (user.role === "DEVELOPER") {
    return NextResponse.json(
      { error: "Lập trình viên không có quyền tạo nhóm kiểm thử mới." },
      { status: 403 }
    );
  }

  const { projectId, name, filePatterns, assignedTesters = [] } = await req.json();

  if (!projectId || !name || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Thiếu projectId hoặc tên nhóm kiểm thử (ít nhất 2 ký tự)" },
      { status: 400 }
    );
  }

  const patterns = Array.isArray(filePatterns)
    ? filePatterns
    : (filePatterns || "")
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean);

  const res = await query(
    `INSERT INTO era_tester_modules (project_id, name, file_patterns, assigned_testers)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [projectId, name.trim(), patterns, assignedTesters]
  );

  return NextResponse.json({ success: true, module: res.rows[0] });
}
