import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendAccountApprovedEmail } from "@/lib/mailer";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Không có quyền Super Admin" }, { status: 403 });
  }

  const res = await query(
    `SELECT id, email, full_name, role, status, created_at 
     FROM era_tester_users 
     ORDER BY created_at DESC`
  );

  return NextResponse.json({ users: res.rows });
}

export async function PATCH(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Không có quyền Super Admin" }, { status: 403 });
  }

  const { userId, status, role } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
  }

  const userRes = await query("SELECT email, full_name FROM era_tester_users WHERE id = $1", [
    userId,
  ]);
  if (userRes.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
  }

  const targetUser = userRes.rows[0];

  const updateRes = await query(
    `UPDATE era_tester_users 
     SET status = COALESCE($1, status), 
         role = COALESCE($2, role), 
         updated_at = NOW() 
     WHERE id = $3 
     RETURNING id, email, full_name, role, status`,
    [status, role, userId]
  );

  // Nếu duyệt sang ACTIVE, gửi email chúc mừng và kích hoạt
  if (status === "ACTIVE") {
    try {
      await sendAccountApprovedEmail(targetUser.email, targetUser.full_name || "Thành viên");
    } catch (mailErr) {
      console.warn("[Admin Mail Error] Could not send approval email:", mailErr);
    }
  }

  return NextResponse.json({ success: true, user: updateRes.rows[0] });
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Không có quyền Super Admin" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json({ error: "Thiếu ID người dùng" }, { status: 400 });
  }

  if (Number(userId) === currentUser.id) {
    return NextResponse.json({ error: "Không thể tự xóa tài khoản của chính mình" }, { status: 400 });
  }

  await query("DELETE FROM era_tester_users WHERE id = $1", [userId]);

  return NextResponse.json({ success: true, message: "Đã xóa tài khoản" });
}
