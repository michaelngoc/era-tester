import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  // Lập trình viên không được tự ý rollback đề bài
  if (user.role === "DEVELOPER") {
    return NextResponse.json(
      { error: "Lập trình viên không có quyền hoàn tác (Rollback) nội dung kịch bản kiểm thử!" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { historyId } = await req.json();

  if (!historyId) {
    return NextResponse.json({ error: "Thiếu ID bản ghi lịch sử (historyId)" }, { status: 400 });
  }

  // Kiểm tra case hiện tại
  const currentCaseRes = await query(
    "SELECT * FROM era_tester_cases WHERE id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)",
    [id]
  );

  if (currentCaseRes.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy test case hoặc đã bị xóa" }, { status: 404 });
  }

  const currentCase = currentCaseRes.rows[0];

  // Lấy bản ghi lịch sử
  const histRes = await query(
    "SELECT * FROM era_tester_case_history WHERE id = $1 AND case_id = $2",
    [historyId, id]
  );

  if (histRes.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy bản ghi lịch sử tương ứng" }, { status: 404 });
  }

  const historyRecord = histRes.rows[0];
  const snapshot = historyRecord.old_snapshot;

  if (!snapshot || typeof snapshot !== "object") {
    return NextResponse.json(
      { error: "Bản ghi lịch sử này không có bản chụp dữ liệu (Snapshot) để khôi phục!" },
      { status: 400 }
    );
  }

  // Chụp lại trạng thái trước khi rollback để có thể rollback ngược lại nếu muốn
  const preRollbackSnapshot = {
    title: currentCase.title,
    input_data: currentCase.input_data,
    output_data: currentCase.output_data,
    expected_result: currentCase.expected_result,
    actual_result: currentCase.actual_result,
    status: currentCase.status,
    priority: currentCase.priority,
    assigned_to: currentCase.assigned_to,
    saved_at: new Date().toISOString(),
  };

  // Khôi phục dữ liệu từ snapshot
  const updateRes = await query(
    `UPDATE era_tester_cases
     SET title = COALESCE($1, title),
         input_data = COALESCE($2, input_data),
         output_data = COALESCE($3, output_data),
         expected_result = COALESCE($4, expected_result),
         actual_result = COALESCE($5, actual_result),
         status = COALESCE($6, status),
         priority = COALESCE($7, priority),
         updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      snapshot.title,
      snapshot.input_data,
      snapshot.output_data,
      snapshot.expected_result,
      snapshot.actual_result,
      snapshot.status,
      snapshot.priority,
      id,
    ]
  );

  const restoredCase = updateRes.rows[0];

  // Ghi log Audit việc Rollback
  await query(
    `INSERT INTO era_tester_case_history 
     (case_id, run_id, actor_id, actor_name, action, from_status, to_status, note, old_snapshot)
     VALUES ($1, $2, $3, $4, 'ROLLBACK_RESTORE', $5, $6, $7, $8::jsonb)`,
    [
      id,
      restoredCase.last_run_id || null,
      user.id,
      user.fullName || user.email,
      currentCase.status,
      restoredCase.status,
      `Đã khôi phục (Rollback) về phiên bản từ lịch sử #${historyId}`,
      JSON.stringify(preRollbackSnapshot),
    ]
  );

  return NextResponse.json({
    success: true,
    message: `Đã khôi phục thành công kịch bản về bản chụp #${historyId}`,
    case: restoredCase,
  });
}
