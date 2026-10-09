import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  const { name, slug, description, githubRepo } = await req.json();

  const cleanSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : undefined;

  const res = await query(
    `UPDATE era_tester_projects
     SET name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         description = COALESCE($3, description),
         github_repo = COALESCE($4, github_repo)
     WHERE id = $5
     RETURNING *`,
    [name?.trim(), cleanSlug, description, githubRepo?.trim(), id]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 });
  }

  return NextResponse.json({ success: true, project: res.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  await query("DELETE FROM era_tester_projects WHERE id = $1", [id]);

  return NextResponse.json({ success: true, message: "Đã xóa dự án thành công" });
}
