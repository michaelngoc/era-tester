import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  sendBugReportEmail,
  sendBroadcastBugToDevsEmail,
  sendBugClaimedEmail,
  sendEmail,
} from "@/lib/mailer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const currentCaseRes = await query(
    `SELECT c.*, m.name as module_name, u.email as creator_email, u.full_name as creator_name
     FROM era_tester_cases c
     JOIN era_tester_modules m ON m.id = c.module_id
     LEFT JOIN era_tester_users u ON u.id = c.created_by
     WHERE c.id = $1`,
    [id]
  );

  if (currentCaseRes.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy test case" }, { status: 404 });
  }

  const prev = currentCaseRes.rows[0];

  // Xử lý các action nhận task đặc biệt
  let assignedTo = body.assignedTo ?? body.assigned_to;
  let newStatus = body.status || prev.status;
  let actionName = "STATUS_CHANGE";

  if (body.action === "claim_bug") {
    assignedTo = user.id;
    newStatus = "FIX";
    actionName = "CLAIM_BUG";
  } else if (body.action === "claim_test") {
    assignedTo = user.id;
    actionName = "CLAIM_TEST";
  }

  const isResetGitFlag = newStatus === "VERIFY" || newStatus === "CLOSED";

  const updateRes = await query(
    `UPDATE era_tester_cases
     SET title = COALESCE($1, title),
         input_data = COALESCE($2, input_data),
         output_data = COALESCE($3, output_data),
         expected_result = COALESCE($4, expected_result),
         actual_result = COALESCE($5, actual_result),
         response_payload = COALESCE($6, response_payload),
         status = COALESCE($7, status),
         priority = COALESCE($8, priority),
         assigned_to = COALESCE($9, assigned_to),
         is_impacted_by_git = CASE WHEN $10::boolean THEN FALSE ELSE is_impacted_by_git END,
         updated_at = NOW()
     WHERE id = $11
     RETURNING *`,
    [
      body.title,
      body.inputData ?? body.input_data,
      body.outputData ?? body.output_data,
      body.expectedResult ?? body.expected_result,
      body.actualResult ?? body.actual_result,
      body.responsePayload ?? body.response_payload,
      newStatus,
      body.priority,
      assignedTo,
      isResetGitFlag,
      id,
    ]
  );

  const updatedCase = updateRes.rows[0];

  // Ghi nhận Audit Log vào bảng era_tester_case_history nếu có đổi status hoặc action đặc biệt
  if (prev.status !== newStatus || body.action || body.note) {
    try {
      await query(
        `INSERT INTO era_tester_case_history 
         (case_id, run_id, actor_id, actor_name, action, from_status, to_status, note, evidence_urls, response_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          updatedCase.last_run_id || null,
          user.id,
          user.fullName || user.email,
          actionName,
          prev.status,
          newStatus,
          body.note || (body.action === "claim_bug" ? "Dev đã nhận xử lý bug" : null),
          body.evidenceUrls || body.evidence_urls || null,
          body.responsePayload ? JSON.stringify(body.responsePayload) : null,
        ]
      );
    } catch (e) {
      console.error("[Audit History Log Error]", e);
    }
  }

  // Gửi email thông báo
  if (body.action === "claim_bug" && prev.creator_email) {
    try {
      await sendBugClaimedEmail({
        testerEmail: prev.creator_email,
        devName: user.fullName || user.email,
        bugTitle: updatedCase.title,
        moduleName: prev.module_name,
        caseId: updatedCase.id,
      });
    } catch (err) {
      console.warn("[Claim Email Error]", err);
    }
  }

  if (prev.status !== newStatus) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";

    if (newStatus === "NEW") {
      if (updatedCase.assigned_to) {
        const devRes = await query("SELECT email FROM era_tester_users WHERE id = $1", [
          updatedCase.assigned_to,
        ]);
        if (devRes.rows.length > 0) {
          await sendBugReportEmail({
            devEmail: devRes.rows[0].email,
            bugTitle: updatedCase.title,
            moduleName: prev.module_name,
            inputData: updatedCase.input_data,
            actualResult: updatedCase.actual_result,
            caseId: updatedCase.id,
          });
        }
      } else {
        const devsRes = await query<{ email: string }>(
          "SELECT email FROM era_tester_users WHERE status = 'ACTIVE' AND role IN ('DEVELOPER', 'SUPER_ADMIN')"
        );
        const devEmails = devsRes.rows.map((d) => d.email).filter(Boolean);
        if (devEmails.length > 0) {
          await sendBroadcastBugToDevsEmail({
            devEmails,
            bugTitle: updatedCase.title,
            moduleName: prev.module_name,
            inputData: updatedCase.input_data,
            actualResult: updatedCase.actual_result,
            caseId: updatedCase.id,
            testerName: user.fullName || user.email,
          });
        }
      }
    }

    if (newStatus === "FIX" && prev.creator_email) {
      await sendEmail({
        to: prev.creator_email,
        subject: `[Tester Hub] 🛠️ Case đã Fix xong: ${updatedCase.title}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #0284c7;">Dev đã đánh dấu FIX cho case #${updatedCase.id}</h3>
            <p><strong>Tiêu đề:</strong> ${updatedCase.title}</p>
            <p><strong>Module:</strong> ${prev.module_name}</p>
            <p>Mời bạn vào hệ thống xác minh (Verify) lại kết quả kiểm thử.</p>
            <a href="${appUrl}" style="display: inline-block; background: #0284c7; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Mở Verify Ngay
            </a>
          </div>
        `,
      });
    }
  }

  return NextResponse.json({ success: true, case: updatedCase });
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
  await query("DELETE FROM era_tester_cases WHERE id = $1", [id]);
  return NextResponse.json({ success: true, message: "Đã xóa test case" });
}
