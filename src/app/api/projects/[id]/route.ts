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

  // Developer không được sửa thông tin dự án
  if (user.role === "DEVELOPER") {
    return NextResponse.json(
      { error: "Lập trình viên không có quyền chỉnh sửa dự án." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { name, slug, description, githubRepo, notifyDeployRoles } = await req.json();

  if (name !== undefined && name.trim().length < 2) {
    return NextResponse.json(
      { error: "Tên dự án không được để trống hoặc dưới 2 ký tự." },
      { status: 400 }
    );
  }

  const cleanSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : undefined;

  const res = await query(
    `UPDATE era_tester_projects
     SET name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         description = COALESCE($3, description),
         github_repo = COALESCE($4, github_repo),
         notify_deploy_roles = COALESCE($5::jsonb, notify_deploy_roles)
     WHERE id = $6 AND (is_deleted IS NULL OR is_deleted = FALSE)
     RETURNING *`,
    [
      name?.trim(),
      cleanSlug,
      description,
      githubRepo?.trim(),
      notifyDeployRoles ? JSON.stringify(notifyDeployRoles) : null,
      id,
    ]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy dự án hoặc dự án đã bị xóa" }, { status: 404 });
  }

  return NextResponse.json({ success: true, project: res.rows[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  // CHỈ TÀI KHOẢN CÓ QUYỀN TOÀN CỤC MỚI ĐƯỢC XÓA DỰ ÁN
  if (!user.isGlobalAdmin) {
    return NextResponse.json(
      { error: "BỊ CHẶN: Chỉ tài khoản có toàn quyền quản trị (Super Admin) mới có quyền xóa dự án!" },
      { status: 403 }
    );
  }

  const { id } = await params;

  // Áp dụng XÓA MỀM (Soft Delete) để bảo toàn dữ liệu vĩnh viễn
  await query(
    `UPDATE era_tester_projects 
     SET is_deleted = TRUE, deleted_at = NOW() 
     WHERE id = $1`,
    [id]
  );

  return NextResponse.json({ success: true, message: "Đã chuyển dự án vào kho lưu trữ (Xóa mềm an toàn)" });
}
