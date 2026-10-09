import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { comparePassword, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Vui lòng nhập email và mật khẩu" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const res = await query(
      "SELECT id, email, password_hash, full_name, role, status FROM era_tester_users WHERE email = $1 LIMIT 1",
      [cleanEmail]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không chính xác" }, { status: 401 });
    }

    const user = res.rows[0];
    const isMatch = await comparePassword(password, user.password_hash);

    if (!isMatch) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không chính xác" }, { status: 401 });
    }

    if (user.status === "PENDING") {
      return NextResponse.json(
        {
          error: "Tài khoản của bạn đang chờ Super Admin phê duyệt. Vui lòng liên hệ Admin để được cấp quyền.",
          status: "PENDING",
        },
        { status: 403 }
      );
    }

    if (user.status === "BANNED") {
      return NextResponse.json(
        { error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Super Admin." },
        { status: 403 }
      );
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.full_name || "",
      role: user.role,
      status: user.status,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });

    // Set HTTP-only secure cookie
    response.cookies.set("era_tester_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Login Error]", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi đăng nhập: " + error.message }, { status: 500 });
  }
}
