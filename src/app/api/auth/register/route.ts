import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, role: requestedRole } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await query("SELECT id FROM era_tester_users WHERE email = $1 LIMIT 1", [
      cleanEmail,
    ]);

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 400 });
    }

    // Kiểm tra xem có phải tài khoản đầu tiên hoặc email admin cấu hình sẵn
    const totalUsers = await query("SELECT COUNT(*) FROM era_tester_users");
    const count = parseInt(totalUsers.rows[0].count, 10);
    const isFirstUser = count === 0;
    const isInitialAdmin = cleanEmail === (process.env.ADMIN_INITIAL_EMAIL || "admin@eraweb.io").toLowerCase();

    let role = "TESTER";
    if (isFirstUser || isInitialAdmin) {
      role = "SUPER_ADMIN";
    } else if (requestedRole === "DEVELOPER") {
      role = "DEVELOPER";
    } else {
      role = "TESTER";
    }

    const status = isFirstUser || isInitialAdmin ? "ACTIVE" : "PENDING";

    const hashedPassword = await hashPassword(password);

    const insertRes = await query(
      `INSERT INTO era_tester_users (email, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, status`,
      [cleanEmail, hashedPassword, fullName || "", role, status]
    );

    const user = insertRes.rows[0];

    return NextResponse.json({
      success: true,
      user,
      message:
        status === "ACTIVE"
          ? "Đăng ký thành công và đã tự động kích hoạt quyền Super Admin!"
          : "Đăng ký thành công! Tài khoản của bạn đang chờ Super Admin phê duyệt.",
    });
  } catch (error: any) {
    console.error("[Register Error]", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi đăng ký: " + error.message }, { status: 500 });
  }
}
