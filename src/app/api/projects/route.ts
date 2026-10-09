import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực hoặc chưa được duyệt" }, { status: 401 });
  }

  const res = await query(`
    SELECT p.*, 
           COUNT(DISTINCT m.id) AS total_modules,
           COUNT(DISTINCT c.id) AS total_cases,
           COUNT(DISTINCT CASE WHEN c.status = 'NEW' THEN c.id END) AS new_bugs,
           COUNT(DISTINCT CASE WHEN c.is_impacted_by_git = TRUE THEN c.id END) AS git_impacted_cases
    FROM era_tester_projects p
    LEFT JOIN era_tester_modules m ON m.project_id = p.id AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
    LEFT JOIN era_tester_cases c ON c.module_id = m.id AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
    WHERE (p.is_deleted IS NULL OR p.is_deleted = FALSE)
    GROUP BY p.id
    ORDER BY p.id ASC
  `);

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

  const { name, slug, description, githubRepo } = await req.json();

  if (!name || name.trim().length < 2 || !slug) {
    return NextResponse.json({ error: "Tên (ít nhất 2 ký tự) và Slug dự án là bắt buộc" }, { status: 400 });
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const res = await query(
    `INSERT INTO era_tester_projects (name, slug, description, github_repo)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name.trim(), cleanSlug, description || "", githubRepo || ""]
  );

  return NextResponse.json({ success: true, project: res.rows[0] });
}
