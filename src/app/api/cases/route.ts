import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendBugReportEmail, sendBroadcastBugToDevsEmail } from "@/lib/mailer";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const moduleId = searchParams.get("moduleId");
  const flowId = searchParams.get("flowId");
  const status = searchParams.get("status");

  const isGlobalAdmin = user.isGlobalAdmin;

  let sql = `
    SELECT c.*, 
           m.name AS module_name,
           m.project_id,
           COALESCE(NULLIF(u_assigned.full_name, ''), u_assigned.email) AS assigned_name, 
           u_assigned.email AS assigned_email,
           COALESCE(NULLIF(u_creator.full_name, ''), u_creator.email) AS creator_name
    FROM era_tester_cases c
    JOIN era_tester_modules m ON m.id = c.module_id
    LEFT JOIN era_tester_users u_assigned ON u_assigned.id = c.assigned_to
    LEFT JOIN era_tester_users u_creator ON u_creator.id = c.created_by
    WHERE (c.is_deleted IS NULL OR c.is_deleted = FALSE)
      AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
  `;
  const params: any[] = [];

  if (!isGlobalAdmin) {
    params.push(user.id);
    sql += ` AND m.project_id IN (SELECT project_id FROM era_tester_project_members WHERE user_id = $${params.length}) `;
  }

  if (projectId) {
    params.push(projectId);
    sql += ` AND m.project_id = $${params.length}`;
  }
  if (moduleId) {
    params.push(moduleId);
    sql += ` AND c.module_id = $${params.length}`;
  }
  if (flowId) {
    params.push(flowId);
    sql += ` AND c.flow_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND c.status = $${params.length}`;
  }

  sql += ` ORDER BY c.id DESC`;

  const res = await query(sql, params);
  return NextResponse.json({ cases: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  if (user.role === "DEVELOPER") {
    return NextResponse.json(
      { error: "Lập trình viên không có quyền tạo kịch bản kiểm thử mới!" },
      { status: 403 }
    );
  }

  const data = await req.json();
  const modId = data.moduleId ?? data.module_id;
  const fId = data.flowId ?? data.flow_id ?? null;
  const nId = data.nodeId ?? data.node_id ?? null;
  const title = (data.title || "").trim();
  const inputData = data.inputData ?? data.input_data ?? "";
  const outputData = data.outputData ?? data.output_data ?? "";
  const expectedResult = (data.expectedResult ?? data.expected_result ?? "").trim();
  const actualResult = data.actualResult ?? data.actual_result ?? "";
  const responsePayload = data.responsePayload ?? data.response_payload ?? "";
  const evidenceUrls = data.evidenceUrls ?? data.evidence_urls ?? [];
  const status = data.status || "NEW";
  const priority = data.priority || "MEDIUM";
  const assignedTo = data.assignedTo ?? data.assigned_to ?? null;

  if (!modId || !title || title.length < 3) {
    return NextResponse.json(
      { error: "Tiêu đề test case không được để trống và phải có ít nhất 3 ký tự!" },
      { status: 400 }
    );
  }

  if (!expectedResult || expectedResult.length === 0) {
    return NextResponse.json(
      { error: "Kết quả kỳ vọng (Expected Result) không được để trống!" },
      { status: 400 }
    );
  }

  const res = await query(
    `INSERT INTO era_tester_cases 
     (module_id, flow_id, node_id, title, input_data, output_data, expected_result, actual_result, response_payload, evidence_urls, status, priority, assigned_to, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      modId,
      fId,
      nId,
      title,
      inputData,
      outputData,
      expectedResult,
      actualResult,
      responsePayload,
      evidenceUrls,
      status,
      priority,
      assignedTo,
      user.id,
    ]
  );

  const newCase = res.rows[0];

  // Nếu tạo test case ở trạng thái Bug (NEW)
  if (status === "NEW") {
    const modRes = await query("SELECT name, project_id FROM era_tester_modules WHERE id = $1", [modId]);
    const moduleName = modRes.rows[0]?.name || "Module";
    const projectId = modRes.rows[0]?.project_id;

    if (assignedTo) {
      const devRes = await query("SELECT email FROM era_tester_users WHERE id = $1 AND status = 'ACTIVE'", [assignedTo]);
      if (devRes.rows.length > 0) {
        await sendBugReportEmail({
          devEmail: devRes.rows[0].email,
          bugTitle: newCase.title,
          moduleName,
          inputData: newCase.input_data,
          actualResult: newCase.actual_result,
          caseId: newCase.id,
        });
      }
    } else {
      // Tự động broadcast email cho Developer trong dự án này để vào nhận task
      let devEmails: string[] = [];
      if (projectId) {
        const devsRes = await query<{ email: string }>(
          `SELECT DISTINCT u.email 
           FROM era_tester_users u
           JOIN era_tester_project_members pm ON pm.user_id = u.id
           WHERE pm.project_id = $1 AND u.status = 'ACTIVE' AND u.role IN ('DEVELOPER', 'SUPER_ADMIN', 'CTO')`,
          [projectId]
        );
        devEmails = devsRes.rows.map((d) => d.email).filter(Boolean);
      }

      if (devEmails.length === 0) {
        const fallbackDevs = await query<{ email: string }>(
          "SELECT email FROM era_tester_users WHERE status = 'ACTIVE' AND role IN ('DEVELOPER', 'SUPER_ADMIN')"
        );
        devEmails = fallbackDevs.rows.map((d) => d.email).filter(Boolean);
      }

      if (devEmails.length > 0) {
        await sendBroadcastBugToDevsEmail({
          devEmails,
          bugTitle: newCase.title,
          moduleName,
          inputData: newCase.input_data,
          actualResult: newCase.actual_result,
          caseId: newCase.id,
          testerName: user.fullName || user.email,
        });
      }
    }
  }

  // Truy vấn lại bản ghi đầy đủ kèm tên người phụ trách và người tạo
  const fullCaseRes = await query(
    `SELECT c.*, 
            m.name AS module_name,
            COALESCE(NULLIF(u_assigned.full_name, ''), u_assigned.email) AS assigned_name, 
            u_assigned.email AS assigned_email,
            COALESCE(NULLIF(u_creator.full_name, ''), u_creator.email) AS creator_name
     FROM era_tester_cases c
     JOIN era_tester_modules m ON m.id = c.module_id
     LEFT JOIN era_tester_users u_assigned ON u_assigned.id = c.assigned_to
     LEFT JOIN era_tester_users u_creator ON u_creator.id = c.created_by
     WHERE c.id = $1`,
    [newCase.id]
  );

  return NextResponse.json({ success: true, case: fullCaseRes.rows[0] || newCase });
}
