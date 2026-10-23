import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, role: requestedRole } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 });
    }

    let cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      cleanEmail = `${cleanEmail}@eragroup.com.vn`;
    }

    if (!cleanEmail.endsWith("@eragroup.com.vn")) {
      return NextResponse.json(
        { error: "Hệ thống chỉ chấp nhận email nội bộ có đuôi @eragroup.com.vn" },
        { status: 400 }
      );
    }

    const existing = await query("SELECT id FROM era_tester_users WHERE email = $1 LIMIT 1", [
      cleanEmail,
    ]);

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 400 });
    }

    // Tài khoản đầu tiên của DB rỗng là bootstrap. ADMIN_INITIAL_EMAIL chỉ có hiệu lực khi được đặt
    // VÀ chưa tồn tại SUPER_ADMIN nào; tài khoản đó vẫn PENDING trừ khi ADMIN_INITIAL_AUTO_ACTIVATE="true"
    // (người đăng ký đầu tiên không tự chiếm quyền cao nhất chỉ bằng đoán email).
    const totalUsers = await query("SELECT COUNT(*) FROM era_tester_users");
    const isFirstUser = parseInt(totalUsers.rows[0].count, 10) === 0;

    const initialAdminEmail = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
    let isInitialAdmin = false;
    if (!isFirstUser && initialAdminEmail && cleanEmail === initialAdminEmail) {
      const superAdmins = await query("SELECT 1 FROM era_tester_users WHERE role = 'SUPER_ADMIN' LIMIT 1");
      isInitialAdmin = superAdmins.rows.length === 0;
    }

    let role = "TESTER";
    if (isFirstUser || isInitialAdmin) {
      role = "SUPER_ADMIN";
    } else if (requestedRole === "DEVELOPER") {
      role = "DEVELOPER";
    }

    const autoActivate = isFirstUser || (isInitialAdmin && process.env.ADMIN_INITIAL_AUTO_ACTIVATE === "true");
    const status = autoActivate ? "ACTIVE" : "PENDING";

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
