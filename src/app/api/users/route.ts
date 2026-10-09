import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  let sql = `
    SELECT u.id, u.email, u.full_name, u.role, u.status 
    FROM era_tester_users u
  `;
  const params: any[] = [];

  if (projectId) {
    sql += ` JOIN era_tester_project_members pm ON pm.user_id = u.id AND pm.project_id = $1 `;
    params.push(Number(projectId));
  }

  sql += ` WHERE u.status = 'ACTIVE' ORDER BY u.role ASC, u.full_name ASC `;

  const res = await query(sql, params);

  const allUsers = res.rows;
  const testers = allUsers.filter((u) =>
    ["QA", "QC", "TESTER", "LEADER", "SUPER_ADMIN", "CTO", "PM", "MEMBER"].includes(u.role)
  );
  const developers = allUsers.filter((u) =>
    ["DEVELOPER", "LEADER", "CTO", "SUPER_ADMIN", "MEMBER"].includes(u.role)
  );
  const managers = allUsers.filter((u) =>
    ["SUPER_ADMIN", "CTO", "LEADER", "PM", "PO", "BA"].includes(u.role)
  );

  return NextResponse.json({
    users: allUsers,
    testers,
    developers,
    managers,
  });
}
