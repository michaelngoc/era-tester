import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  const res = await query(
    "SELECT * FROM era_tester_flows WHERE id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)",
    [id]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy sơ đồ" }, { status: 404 });
  }

  return NextResponse.json({ flow: res.rows[0] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  if (user.role === "DEVELOPER") {
    return NextResponse.json(
      { error: "Lập trình viên không có quyền chỉnh sửa cấu trúc User Flow kiểm thử!" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { nodes, edges, title, nodeRemap } = await req.json();

  if (title !== undefined && (typeof title !== "string" || title.trim().length < 2)) {
    return NextResponse.json(
      { error: "Tiêu đề User Flow phải có ít nhất 2 ký tự!" },
      { status: 400 }
    );
  }

  // If nodeRemap is provided (e.g. { "step-3": "step-1", "step-2": "step-2" }), update related test cases
  if (nodeRemap && typeof nodeRemap === "object") {
    for (const [oldNodeId, newNodeId] of Object.entries(nodeRemap)) {
      if (oldNodeId && newNodeId && oldNodeId !== newNodeId) {
        await query(
          "UPDATE era_tester_cases SET node_id = $1 WHERE flow_id = $2 AND node_id = $3",
          [newNodeId, id, oldNodeId]
        );
      }
    }
  }

  const res = await query(
    `UPDATE era_tester_flows 
     SET nodes = COALESCE($1::jsonb, nodes),
         edges = COALESCE($2::jsonb, edges),
         title = COALESCE($3, title),
         updated_at = NOW()
     WHERE id = $4 AND (is_deleted IS NULL OR is_deleted = FALSE)
     RETURNING *`,
    [nodes ? JSON.stringify(nodes) : null, edges ? JSON.stringify(edges) : null, title ? title.trim() : null, id]
  );

  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy sơ đồ hoặc đã bị xóa" }, { status: 404 });
  }

  return NextResponse.json({ success: true, flow: res.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  if (!user.isGlobalAdmin) {
    return NextResponse.json(
      { error: "Chỉ tài khoản có toàn quyền quản trị (Super Admin) mới có quyền xóa User Flow!" },
      { status: 403 }
    );
  }

  const { id } = await params;
  await query(
    "UPDATE era_tester_flows SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
    [id]
  );

  return NextResponse.json({ success: true, message: "Đã xóa mềm User Flow thành công" });
}

