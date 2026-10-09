import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("moduleId");

  if (!moduleId) {
    return NextResponse.json({ error: "Thiếu moduleId" }, { status: 400 });
  }

  const res = await query(
    `SELECT f.*, 
            COUNT(c.id) AS total_cases,
            COUNT(CASE WHEN c.status = 'NEW' THEN 1 END) AS count_new,
            COUNT(CASE WHEN c.status = 'CLOSED' THEN 1 END) AS count_closed
     FROM era_tester_flows f
     LEFT JOIN era_tester_cases c ON c.flow_id = f.id
     WHERE f.module_id = $1
     GROUP BY f.id
     ORDER BY f.id ASC`,
    [moduleId]
  );

  return NextResponse.json({ flows: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { moduleId, title, templateType = "custom" } = await req.json();

  if (!moduleId || !title) {
    return NextResponse.json({ error: "Thiếu moduleId hoặc tiêu đề User Flow" }, { status: 400 });
  }

  let initialNodes: any[] = [];
  let initialEdges: any[] = [];

  // Mẫu flow đăng nhập có sẵn theo yêu cầu của user
  if (templateType === "login") {
    initialNodes = [
      {
        id: "step-1",
        type: "testStep",
        position: { x: 50, y: 100 },
        data: {
          title: "1. Mở trang Đăng Nhập (/login)",
          description: "Truy cập URL /login và render form",
          stepKey: "open_page",
        },
      },
      {
        id: "step-2",
        type: "testStep",
        position: { x: 340, y: 100 },
        data: {
          title: "2. Nhập Email & Mật Khẩu",
          description: "Validate ô nhập username/password, kiểm tra bỏ trống",
          stepKey: "fill_form",
        },
      },
      {
        id: "step-3",
        type: "testStep",
        position: { x: 630, y: 100 },
        data: {
          title: "3. Nhấn Nút Đăng Nhập",
          description: "Gửi request POST /api/auth/login, kiểm tra trạng thái loading/disable",
          stepKey: "submit_btn",
        },
      },
      {
        id: "step-4",
        type: "testStep",
        position: { x: 920, y: 100 },
        data: {
          title: "4. Xử Lý Kết Quả & Điều Hướng",
          description: "Báo lỗi nếu sai pass, chuyển hướng Dashboard nếu đúng",
          stepKey: "handle_result",
        },
      },
    ];

    initialEdges = [
      { id: "e1-2", source: "step-1", target: "step-2", style: { stroke: "#38bdf8", strokeWidth: 2 } },
      { id: "e2-3", source: "step-2", target: "step-3", style: { stroke: "#38bdf8", strokeWidth: 2 } },
      { id: "e3-4", source: "step-3", target: "step-4", style: { stroke: "#38bdf8", strokeWidth: 2 } },
    ];
  } else {
    // Custom flow mặc định 2 bước ban đầu
    initialNodes = [
      {
        id: "step-1",
        type: "testStep",
        position: { x: 80, y: 100 },
        data: {
          title: "Bước 1: Bắt đầu luồng",
          description: "Mô tả bước kiểm thử ban đầu",
          stepKey: "start_step",
        },
      },
      {
        id: "step-2",
        type: "testStep",
        position: { x: 400, y: 100 },
        data: {
          title: "Bước 2: Thao tác người dùng",
          description: "Nhập dữ liệu hoặc tương tác thành phần",
          stepKey: "action_step",
        },
      },
    ];
    initialEdges = [
      { id: "e1-2", source: "step-1", target: "step-2", style: { stroke: "#38bdf8", strokeWidth: 2 } },
    ];
  }

  const res = await query(
    `INSERT INTO era_tester_flows (module_id, title, nodes, edges)
     VALUES ($1, $2, $3::jsonb, $4::jsonb)
     RETURNING *`,
    [moduleId, title.trim(), JSON.stringify(initialNodes), JSON.stringify(initialEdges)]
  );

  const newFlow = res.rows[0];

  // Nếu là mẫu login, tự động tạo sẵn các checklist test case chi tiết cho từng bước
  if (templateType === "login") {
    await query(
      `INSERT INTO era_tester_cases 
        (module_id, flow_id, node_id, title, input_data, expected_result, actual_result, status, priority)
       VALUES 
        ($1, $2, 'step-1', 'Kiểm tra tải trang /login', 'GET /login', 'Render đầy đủ form, logo, 2 ô input và nút đăng nhập', 'Tải bình thường', 'CLOSED', 'HIGH'),
        ($1, $2, 'step-2', 'Để trống ô Email', 'email: ""', 'Hiển thị thông báo đỏ: Vui lòng nhập email', 'Đã hoạt động tốt', 'CLOSED', 'HIGH'),
        ($1, $2, 'step-2', 'Nhập email không đúng định dạng', 'email: "test@@abc"', 'Hiển thị: Email không hợp lệ', 'Dev đã fix validate regex', 'FIX', 'MEDIUM'),
        ($1, $2, 'step-2', 'Mật khẩu dưới 6 ký tự', 'password: "123"', 'Báo lỗi độ dài mật khẩu', 'Kiểm tra đạt', 'CLOSED', 'LOW'),
        ($1, $2, 'step-3', 'Click nút Login khi form hợp lệ', 'Click submit', 'Nút hiển thị loading spinner và disable chống double click', 'Nút quay spinner tốt', 'CLOSED', 'HIGH'),
        ($1, $2, 'step-4', 'Đăng nhập sai mật khẩu', 'password: "sai"', 'Báo lỗi 401: Email hoặc mật khẩu không chính xác', 'Báo lỗi đúng chuẩn', 'CLOSED', 'HIGH'),
        ($1, $2, 'step-4', 'Đăng nhập tài khoản chưa duyệt (PENDING)', 'status: PENDING', 'Báo lỗi 403: Tài khoản đang chờ Super Admin phê duyệt', 'Báo lỗi đúng chuẩn', 'CLOSED', 'HIGH'),
        ($1, $2, 'step-4', 'Đăng nhập thành công với Super Admin', 'admin@eragroup.com.vn', 'Trả về HTTP 200, lưu cookie session và điều hướng sang Dashboard', 'Chuyển hướng mượt mà', 'CLOSED', 'CRITICAL');`,
      [moduleId, newFlow.id]
    );
  }

  return NextResponse.json({ success: true, flow: newFlow });
}
