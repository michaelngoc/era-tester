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

  const { id } = await params;
  const { name, filePatterns, assignedTesters } = await req.json();

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
     WHERE id = $4
     RETURNING *`,
    [name?.trim(), patterns, assignedTesters, id]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy nhóm test" }, { status: 404 });
  }

  return NextResponse.json({ success: true, module: res.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  await query("DELETE FROM era_tester_modules WHERE id = $1", [id]);

  return NextResponse.json({ success: true, message: "Đã xóa nhóm test thành công" });
}
