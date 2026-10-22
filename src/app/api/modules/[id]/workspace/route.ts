import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getModuleWorkspace } from "@/lib/server-queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "moduleId không hợp lệ" }, { status: 400 });
  }

  const result = await getModuleWorkspace(user, Number(id));
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Không tìm thấy nhóm kiểm thử" }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "Bạn không phải thành viên dự án này" }, { status: 403 });
  }

  return NextResponse.json({ flows: result.flows, cases: result.cases });
}
