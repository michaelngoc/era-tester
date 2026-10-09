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
  const res = await query("SELECT * FROM era_tester_flows WHERE id = $1", [id]);

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

  const { id } = await params;
  const { nodes, edges, title } = await req.json();

  const res = await query(
    `UPDATE era_tester_flows 
     SET nodes = COALESCE($1::jsonb, nodes),
         edges = COALESCE($2::jsonb, edges),
         title = COALESCE($3, title),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [nodes ? JSON.stringify(nodes) : null, edges ? JSON.stringify(edges) : null, title, id]
  );

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

  const { id } = await params;
  await query("DELETE FROM era_tester_flows WHERE id = $1", [id]);

  return NextResponse.json({ success: true, message: "Đã xóa User Flow thành công" });
}
