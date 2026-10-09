import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  const projectId = Number(id);

  const res = await query(
    `SELECT pm.id as membership_id,
            pm.project_id,
            pm.user_id,
            pm.project_role,
            pm.created_at as joined_at,
            u.email,
            u.full_name,
            u.role as system_role,
            u.status as user_status
     FROM era_tester_project_members pm
     JOIN era_tester_users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 AND u.status = 'ACTIVE'
     ORDER BY pm.created_at ASC`,
    [projectId]
  );

  return NextResponse.json({ members: res.rows });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  // Developer không được phân công thành viên dự án
  if (user.role === "DEVELOPER") {
    return NextResponse.json({ error: "Không có quyền phân bổ thành viên dự án" }, { status: 403 });
  }

  const { id } = await params;
  const projectId = Number(id);
  const { userId, projectRole } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
  }

  const role = projectRole || "MEMBER";

  const res = await query(
    `INSERT INTO era_tester_project_members (project_id, user_id, project_role)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) 
     DO UPDATE SET project_role = EXCLUDED.project_role
     RETURNING *`,
    [projectId, userId, role]
  );

  return NextResponse.json({ success: true, member: res.rows[0] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  if (user.role === "DEVELOPER") {
    return NextResponse.json({ error: "Không có quyền gỡ thành viên dự án" }, { status: 403 });
  }

  const { id } = await params;
  const projectId = Number(id);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
  }

  await query(
    `DELETE FROM era_tester_project_members 
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, Number(userId)]
  );

  return NextResponse.json({ success: true, message: "Đã gỡ thành viên khỏi dự án" });
}
