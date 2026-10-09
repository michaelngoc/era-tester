import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendBugReportEmail } from "@/lib/mailer";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("moduleId");
  const flowId = searchParams.get("flowId");
  const status = searchParams.get("status");

  let sql = `
    SELECT c.*, 
           m.name AS module_name,
           u_assigned.full_name AS assigned_name, u_assigned.email AS assigned_email,
           u_creator.full_name AS creator_name
    FROM era_tester_cases c
    JOIN era_tester_modules m ON m.id = c.module_id
    LEFT JOIN era_tester_users u_assigned ON u_assigned.id = c.assigned_to
    LEFT JOIN era_tester_users u_creator ON u_creator.id = c.created_by
    WHERE 1=1
  `;
  const params: any[] = [];

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

  const data = await req.json();
  const {
    moduleId,
    flowId,
    nodeId,
    title,
    inputData,
    outputData,
    expectedResult,
    actualResult,
    responsePayload,
    evidenceUrls,
    status = "NEW",
    priority = "MEDIUM",
    assignedTo,
  } = data;

  if (!moduleId || !title) {
    return NextResponse.json({ error: "Thiếu moduleId hoặc tiêu đề test case" }, { status: 400 });
  }

  const res = await query(
    `INSERT INTO era_tester_cases 
     (module_id, flow_id, node_id, title, input_data, output_data, expected_result, actual_result, response_payload, evidence_urls, status, priority, assigned_to, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      moduleId,
      flowId || null,
      nodeId || null,
      title.trim(),
      inputData || "",
      outputData || "",
      expectedResult || "",
      actualResult || "",
      responsePayload || "",
      evidenceUrls || [],
      status,
      priority,
      assignedTo || null,
      user.id,
    ]
  );

  const newCase = res.rows[0];

  // Nếu tạo test case trực tiếp ở trạng thái Bug (NEW) và có người phụ trách (Dev)
  if (status === "NEW" && assignedTo) {
    const devRes = await query("SELECT email FROM era_tester_users WHERE id = $1", [assignedTo]);
    const modRes = await query("SELECT name FROM era_tester_modules WHERE id = $1", [moduleId]);
    if (devRes.rows.length > 0) {
      await sendBugReportEmail({
        devEmail: devRes.rows[0].email,
        bugTitle: newCase.title,
        moduleName: modRes.rows[0]?.name || "Module",
        inputData: newCase.input_data,
        actualResult: newCase.actual_result,
        caseId: newCase.id,
      });
    }
  }

  return NextResponse.json({ success: true, case: newCase });
}
