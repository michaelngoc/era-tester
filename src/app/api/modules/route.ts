import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { guardProject } from "@/lib/project-access";
import { getModulesForUser } from "@/lib/server-queries";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const projectSlug = searchParams.get("projectSlug");

  const modules = await getModulesForUser(user, { projectId, projectSlug });
  return NextResponse.json({ modules });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  if (user.role === "DEVELOPER") {
    return NextResponse.json(
      { error: "Lập trình viên không có quyền tạo nhóm kiểm thử mới." },
      { status: 403 }
    );
  }

  const { projectId, name, filePatterns, assignedTesters = [] } = await req.json();

  if (!projectId || !name || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Thiếu projectId hoặc tên nhóm kiểm thử (ít nhất 2 ký tự)" },
      { status: 400 }
    );
  }

  const denied = await guardProject(user, projectId);
  if (denied) return denied;

  const patterns = Array.isArray(filePatterns)
    ? filePatterns
    : (filePatterns || "")
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean);

  const res = await query(
    `INSERT INTO era_tester_modules (project_id, name, file_patterns, assigned_testers)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [projectId, name.trim(), patterns, assignedTesters]
  );

  return NextResponse.json({ success: true, module: res.rows[0] });
}
