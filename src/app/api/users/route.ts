import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const res = await query(
    `SELECT id, email, full_name, role, status 
     FROM era_tester_users 
     WHERE status = 'ACTIVE' 
     ORDER BY role ASC, full_name ASC`
  );

  const allUsers = res.rows;
  const testers = allUsers.filter(
    (u) => u.role === "TESTER" || u.role === "SUPER_ADMIN" || u.role === "MEMBER"
  );
  const developers = allUsers.filter(
    (u) => u.role === "DEVELOPER" || u.role === "SUPER_ADMIN" || u.role === "MEMBER"
  );

  return NextResponse.json({
    users: allUsers,
    testers,
    developers,
  });
}
