import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendAccountApprovedEmail } from "@/lib/mailer";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.isGlobalAdmin) {
    return NextResponse.json({ error: "Không có quyền quản trị toàn cục" }, { status: 403 });
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
  if (!currentUser || !currentUser.isGlobalAdmin) {
    return NextResponse.json({ error: "Không có quyền quản trị toàn cục" }, { status: 403 });
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
  if (!currentUser || !currentUser.isGlobalAdmin) {
    return NextResponse.json({ error: "Không có quyền quản trị toàn cục" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json({ error: "Thiếu ID người dùng" }, { status: 400 });
  }

  if (Number(userId) === currentUser.id) {
    return NextResponse.json({ error: "Không thể tự xóa tài khoản của chính mình" }, { status: 400 });
  }

  // Kiểm tra xem người dùng này đã có dữ liệu ràng buộc (kịch bản, lịch sử audit, đợt chạy test) hay chưa
  const historyCheck = await query(
    `SELECT 
      (SELECT COUNT(*) FROM era_tester_cases WHERE created_by = $1 OR assigned_to = $1) as cases_count,
      (SELECT COUNT(*) FROM era_tester_case_history WHERE actor_id = $1) as history_count,
      (SELECT COUNT(*) FROM era_tester_runs WHERE created_by = $1) as runs_count`,
    [userId]
  );

  const { cases_count, history_count, runs_count } = historyCheck.rows[0] || {};
  const hasDependencies = Number(cases_count) > 0 || Number(history_count) > 0 || Number(runs_count) > 0;

  if (hasDependencies) {
    // Nếu đã có dữ liệu: VÔ HIỆU HÓA TÀI KHOẢN (Deactivate/Soft Delete)
    // 1. Khóa tài khoản vĩnh viễn (ngăn đăng nhập)
    await query("UPDATE era_tester_users SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1", [userId]);
    
    // 2. Tự động gỡ phân công các kịch bản đang mở dở dang (NEW, FIX, VERIFY) để thành viên khác nhận tiếp
    await query(
      "UPDATE era_tester_cases SET assigned_to = NULL, updated_at = NOW() WHERE assigned_to = $1 AND status != 'CLOSED'",
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: "Tài khoản đã có lịch sử kịch bản kiểm thử nên được chuyển sang trạng thái Vô Hiệu Hóa (INACTIVE). Dữ liệu kịch bản được bảo toàn 100%!",
    });
  }

  // Nếu là tài khoản mới tinh chưa có kịch bản/lịch sử -> Xóa cứng an toàn
  await query("DELETE FROM era_tester_users WHERE id = $1", [userId]);

  return NextResponse.json({ success: true, message: "Đã xóa tài khoản vĩnh viễn thành công" });
}
