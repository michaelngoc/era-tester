import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getGlobalAdminRoles,
  updateGlobalAdminRoles,
  ALL_SYSTEM_ROLES,
} from "@/lib/permissions";
import { UserRole } from "@/lib/auth";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.isGlobalAdmin) {
    return NextResponse.json(
      { error: "Bạn không có quyền truy cập cài đặt quản trị toàn cục." },
      { status: 403 }
    );
  }

  const allowedRoles = await getGlobalAdminRoles();

  return NextResponse.json({
    success: true,
    allowedRoles,
    allRoles: ALL_SYSTEM_ROLES,
  });
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.isGlobalAdmin) {
    return NextResponse.json(
      { error: "Bạn không có quyền thay đổi cấu hình vai trò quản trị toàn cục." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { roles } = body;

    if (!Array.isArray(roles)) {
      return NextResponse.json(
        { error: "Danh sách vai trò không hợp lệ." },
        { status: 400 }
      );
    }

    const updatedRoles = await updateGlobalAdminRoles(
      roles as UserRole[],
      currentUser.id
    );

    return NextResponse.json({
      success: true,
      allowedRoles: updatedRoles,
      message: "Cập nhật danh sách vai trò toàn quyền thành công.",
    });
  } catch (error) {
    console.error("[Settings Roles API Error]", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi cập nhật vai trò toàn quyền." },
      { status: 500 }
    );
  }
}
