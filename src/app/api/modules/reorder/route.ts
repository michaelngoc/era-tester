import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const body = await req.json();
  const { orderedIds } = body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json(
      { error: "Danh sách orderedIds không hợp lệ" },
      { status: 400 }
    );
  }

  try {
    for (let index = 0; index < orderedIds.length; index++) {
      const moduleId = Number(orderedIds[index]);
      if (moduleId) {
        await query(
          "UPDATE era_tester_modules SET sort_order = $1 WHERE id = $2",
          [index, moduleId]
        );
      }
    }

    return NextResponse.json({ success: true, message: "Đã cập nhật thứ tự nhóm kiểm thử" });
  } catch (err: any) {
    console.error("[Reorder Modules Error]:", err);
    return NextResponse.json(
      { error: "Lỗi cơ sở dữ liệu khi cập nhật thứ tự: " + err.message },
      { status: 500 }
    );
  }
}
