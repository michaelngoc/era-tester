import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendBugReportEmail, sendEmail } from "@/lib/mailer";

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
    `SELECT c.*, m.name as module_name, u.email as creator_email 
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
  const newStatus = body.status || prev.status;
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
      body.inputData,
      body.outputData,
      body.expectedResult,
      body.actualResult,
      body.responsePayload,
      body.status,
      body.priority,
      body.assignedTo,
      isResetGitFlag,
      id,
    ]
  );

  const updatedCase = updateRes.rows[0];

  // Gửi email thông báo tự động theo thay đổi trạng thái
  if (prev.status !== newStatus) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

    // 1. Chuyển sang NEW (Bug) -> Báo cho Dev
    if (newStatus === "NEW" && updatedCase.assigned_to) {
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
    }

    // 2. Chuyển sang FIX (Dev đã sửa xong) -> Báo cho Tester người tạo để Verify
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
