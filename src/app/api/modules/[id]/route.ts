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

  // Developer không được sửa thông tin module
  if (user.role === "DEVELOPER") {
    return NextResponse.json(
      { error: "Lập trình viên không có quyền chỉnh sửa nhóm kiểm thử." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { name, filePatterns, assignedTesters } = await req.json();

  if (name !== undefined && name.trim().length < 2) {
    return NextResponse.json(
      { error: "Tên nhóm kiểm thử không được để trống hoặc dưới 2 ký tự." },
      { status: 400 }
    );
  }

  const patterns = filePatterns !== undefined
    ? Array.isArray(filePatterns)
      ? filePatterns
      : String(filePatterns)
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
    : undefined;

  const res = await query(
    `UPDATE era_tester_modules
     SET name = COALESCE($1, name),
         file_patterns = COALESCE($2, file_patterns),
         assigned_testers = COALESCE($3, assigned_testers)
     WHERE id = $4 AND (is_deleted IS NULL OR is_deleted = FALSE)
     RETURNING *`,
    [name?.trim(), patterns, assignedTesters, id]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy nhóm kiểm thử hoặc nhóm đã bị xóa" }, { status: 404 });
  }

  return NextResponse.json({ success: true, module: res.rows[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  // CHỈ TÀI KHOẢN CÓ QUYỀN TOÀN CỤC MỚI ĐƯỢC XÓA NHÓM KIỂM THỬ
  if (!user.isGlobalAdmin) {
    return NextResponse.json(
      { error: "BỊ CHẶN: Chỉ tài khoản có toàn quyền quản trị (Super Admin) mới có quyền xóa nhóm kiểm thử!" },
      { status: 403 }
    );
  }

  const { id } = await params;

  // Áp dụng XÓA MỀM (Soft Delete)
  await query(
    `UPDATE era_tester_modules 
     SET is_deleted = TRUE, deleted_at = NOW() 
     WHERE id = $1`,
    [id]
  );

  return NextResponse.json({ success: true, message: "Đã chuyển nhóm kiểm thử vào kho lưu trữ (Xóa mềm an toàn)" });
}
