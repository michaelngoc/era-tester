import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getGlobalAdminRoles } from "@/lib/permissions";

// Khoá advisory cố định cho luồng đăng ký (tuần tự hoá kiểm tra email/bootstrap).
const REGISTER_LOCK_KEY = 7_303_001;

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

    const hashedPassword = await hashPassword(password);
    const initialAdminEmail = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
    const globalAdminRoles = await getGlobalAdminRoles();

    // Khoá advisory + kiểm tra lại trong transaction: hai đăng ký đồng thời không cùng thành admin khởi tạo.
    // DB rỗng: chỉ email khớp ADMIN_INITIAL_EMAIL (đã đặt) mới là SUPER_ADMIN ACTIVE; người khác chỉ PENDING.
    // DB đã có user: ADMIN_INITIAL_EMAIL chỉ có hiệu lực khi chưa có tài khoản toàn quyền nào, vẫn PENDING
    // trừ khi ADMIN_INITIAL_AUTO_ACTIVATE="true".
    const outcome = await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock($1)", [REGISTER_LOCK_KEY]);

      const existing = await client.query("SELECT id FROM era_tester_users WHERE email = $1 LIMIT 1", [cleanEmail]);
      if (existing.rows.length > 0) return null;

      const totalUsers = await client.query("SELECT COUNT(*) FROM era_tester_users");
      const isEmptyDb = parseInt(totalUsers.rows[0].count, 10) === 0;
      const matchesInitial = !!initialAdminEmail && cleanEmail === initialAdminEmail;

      let isInitialAdmin = false;
      if (matchesInitial) {
        if (isEmptyDb) {
          isInitialAdmin = true;
        } else {
          const admins = await client.query(
            "SELECT 1 FROM era_tester_users WHERE role = ANY($1::text[]) LIMIT 1",
            [globalAdminRoles]
          );
          isInitialAdmin = admins.rows.length === 0;
        }
      }

      let role = "TESTER";
      if (isInitialAdmin) {
        role = "SUPER_ADMIN";
      } else if (requestedRole === "DEVELOPER") {
        role = "DEVELOPER";
      }

      const autoActivate = isInitialAdmin && (isEmptyDb || process.env.ADMIN_INITIAL_AUTO_ACTIVATE === "true");
      const status = autoActivate ? "ACTIVE" : "PENDING";

      const insertRes = await client.query(
        `INSERT INTO era_tester_users (email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, full_name, role, status`,
        [cleanEmail, hashedPassword, fullName || "", role, status]
      );
      return insertRes.rows[0];
    });

    if (!outcome) {
      return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 400 });
    }
    const user = outcome;



    return NextResponse.json({
      success: true,
      user,
      message:
        user.status === "ACTIVE"
          ? "Đăng ký thành công và đã tự động kích hoạt quyền Super Admin!"
          : "Đăng ký thành công! Tài khoản của bạn đang chờ Super Admin phê duyệt.",
    });
  } catch (error: any) {
    console.error("[Register Error]", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi đăng ký: " + error.message }, { status: 500 });
  }
}
