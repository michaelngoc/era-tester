import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực hoặc chưa được duyệt" }, { status: 401 });
  }

  const isGlobalAdmin = user.role === "SUPER_ADMIN" || user.role === "CTO";

  let sql = `
    SELECT p.*, 
           COUNT(DISTINCT m.id) AS total_modules,
           COUNT(DISTINCT c.id) AS total_cases,
           COUNT(DISTINCT CASE WHEN c.status = 'NEW' THEN c.id END) AS new_bugs,
           COUNT(DISTINCT CASE WHEN c.is_impacted_by_git = TRUE THEN c.id END) AS git_impacted_cases
    FROM era_tester_projects p
  `;
  const params: any[] = [];

  if (!isGlobalAdmin) {
    sql += ` JOIN era_tester_project_members pm ON pm.project_id = p.id AND pm.user_id = $1 `;
    params.push(user.id);
  }

  sql += `
    LEFT JOIN era_tester_modules m ON m.project_id = p.id AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
    LEFT JOIN era_tester_cases c ON c.module_id = m.id AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
    WHERE (p.is_deleted IS NULL OR p.is_deleted = FALSE)
    GROUP BY p.id
    ORDER BY p.id ASC
  `;

  const res = await query(sql, params);
  return NextResponse.json({ projects: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực hoặc chưa được duyệt" }, { status: 401 });
  }

  if (user.role === "DEVELOPER") {
    return NextResponse.json({ error: "Lập trình viên không có quyền tạo dự án mới" }, { status: 403 });
  }

  const { name, slug, description, githubRepo, notifyDeployRoles } = await req.json();

  if (!name || name.trim().length < 2 || !slug) {
    return NextResponse.json({ error: "Tên (ít nhất 2 ký tự) và Slug dự án là bắt buộc" }, { status: 400 });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const defaultNotify = notifyDeployRoles || ["LEADER"];

  const res = await query(
    `INSERT INTO era_tester_projects (name, slug, description, github_repo, notify_deploy_roles)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [name.trim(), cleanSlug, description || "", githubRepo || "", JSON.stringify(defaultNotify)]
  );

  const createdProject = res.rows[0];

  // Tự động thêm người tạo vào bảng thành viên dự án
  await query(
    `INSERT INTO era_tester_project_members (project_id, user_id, project_role)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) DO NOTHING`,
    [createdProject.id, user.id, user.role]
  );

  return NextResponse.json({ success: true, project: createdProject });
}
