const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const pool = new Pool({
  host: env.PGHOST,
  port: Number(env.PGPORT) || 5432,
  database: env.PGDATABASE || 'eraweb_master',
  user: env.ERA_TESTER_USER,
  password: env.ERA_TESTER_PASSWORD,
  ssl: env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  options: `-c search_path="${env.PG_SCHEMA || 'era_tester'}"`,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lấy thông tin Project Eraweb 4 Manage (id = 1)
    const projRes = await client.query("SELECT id FROM era_tester_projects WHERE id = 1 OR slug = 'manage4' LIMIT 1");
    if (projRes.rows.length === 0) {
      throw new Error("Không tìm thấy dự án Eraweb 4 Manage trong database!");
    }
    const projectId = projRes.rows[0].id;
    console.log(`Using Project ID: ${projectId}`);

    // Đảm bảo github_repo chính xác
    await client.query("UPDATE era_tester_projects SET github_repo = 'michaelngoc/eraweb4-manage' WHERE id = $1", [projectId]);

    // 2. Tạo hoặc Cập nhật 2 Modules với file_patterns chi tiết để Git Impact tự động kích hoạt
    const modAuthRes = await client.query(`
      INSERT INTO era_tester_modules (project_id, name, file_patterns, assigned_testers, sort_order)
      VALUES ($1, $2, $3, $4, 1)
      RETURNING id
    `, [
      projectId,
      'Xác Thực & Bảo Mật Điều Hướng (manage/login)',
      [
        'src/proxy.ts',
        'src/middleware.ts',
        'src/app/login/**',
        'src/app/register/**',
        'src/app/api/auth/**',
        'src/lib/auth/**',
        'src/components/Auth/**'
      ],
      [1]
    ]);
    const authModuleId = modAuthRes.rows[0].id;
    console.log(`Created Auth Module ID: ${authModuleId}`);

    const modWebRes = await client.query(`
      INSERT INTO era_tester_modules (project_id, name, file_patterns, assigned_testers, sort_order)
      VALUES ($1, $2, $3, $4, 2)
      RETURNING id
    `, [
      projectId,
      'Khởi Tạo Website 4 Bước & Xác Thực Zalo OTP (manage/website/create)',
      [
        'src/app/website/create/**',
        'src/components/Website/Create/**',
        'src/components/Popups/ZaloOtpModal.tsx',
        'src/app/actions/plans.ts',
        'src/app/api/website/**',
        'src/app/api/otp/**',
        'src/lib/shared/domain-slug.ts',
        'src/components/ui/EraInput.tsx'
      ],
      [1]
    ]);
    const webModuleId = modWebRes.rows[0].id;
    console.log(`Created Website Creation Module ID: ${webModuleId}`);

    // 3. FLOW 1: Đăng Nhập & Điều Hướng Hệ Thống (manage/login)
    const flow1Nodes = [
      {
        id: "node-log-1",
        type: "testStep",
        position: { x: 50, y: 120 },
        data: {
          title: "1. Truy Cập /login",
          description: "Mở trang đăng nhập trực tiếp hoặc kèm param redirect (?redirect=/website/create)",
          stepKey: "open_login_page",
        },
      },
      {
        id: "node-log-2",
        type: "testStep",
        position: { x: 380, y: 120 },
        data: {
          title: "2. Nhập Email & Mật Khẩu",
          description: "Điền credentials, kiểm tra validation rỗng, email format và payload injection",
          stepKey: "input_credentials",
        },
      },
      {
        id: "node-log-3",
        type: "testStep",
        position: { x: 710, y: 120 },
        data: {
          title: "3. Bảo Mật & Rate Limit Gate",
          description: "Kiểm tra anti-bruteforce, CAPTCHA nếu sai quá 5 lần, chống spam API liên tục",
          stepKey: "security_rate_limit",
        },
      },
      {
        id: "node-log-4",
        type: "testStep",
        position: { x: 1040, y: 120 },
        data: {
          title: "4. Xác Thực Session Cookie",
          description: "Gọi API authjs/credentials, cấp phát HttpOnly session token bảo mật",
          stepKey: "authenticate_session",
        },
      },
      {
        id: "node-log-5",
        type: "testStep",
        position: { x: 1370, y: 120 },
        data: {
          title: "5. Sanitize & Chuyển Hướng",
          description: "Hàm sanitizeRedirect loại bỏ domain ngoài (anti Open Redirect), redirect đúng đích",
          stepKey: "sanitize_redirect",
        },
      },
    ];

    const flow1Edges = [
      { id: "e-log-1-2", source: "node-log-1", target: "node-log-2", animated: true },
      { id: "e-log-2-3", source: "node-log-2", target: "node-log-3", animated: true },
      { id: "e-log-3-4", source: "node-log-3", target: "node-log-4", animated: true },
      { id: "e-log-4-5", source: "node-log-4", target: "node-log-5", animated: true },
    ];

    const flow1Res = await client.query(`
      INSERT INTO era_tester_flows (module_id, title, nodes, edges, file_patterns, assigned_testers)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      authModuleId,
      'manage/login - Hệ Thống Đăng Nhập & Bảo Mật Điều Hướng Route Guard',
      JSON.stringify(flow1Nodes),
      JSON.stringify(flow1Edges),
      ['src/app/login/**', 'src/proxy.ts', 'src/app/api/auth/**'],
      [1]
    ]);
    const flow1Id = flow1Res.rows[0].id;
    console.log(`Created Flow 1 ID: ${flow1Id}`);

    // 4. FLOW 2: Quy Trình Khởi Tạo Website 4 Bước & Xác Thực Zalo OTP (manage/website/create)
    // TÁCH RỜI HOÀN TOÀN TỪNG BƯỚC: Brand -> Domain -> Plan -> Theme -> Click Button & Check Phone -> Zalo OTP -> Provisioning
    const flow2Nodes = [
      {
        id: "step-brand",
        type: "testStep",
        position: { x: 50, y: 150 },
        data: {
          title: "Bước 1: Thiết Lập Thương Hiệu",
          description: "Nhập Tên thương hiệu & Slogan, hiển thị xem trước trên WebsitePreviewCard, tự sinh slug",
          stepKey: "step_brand",
        },
      },
      {
        id: "step-domain",
        type: "testStep",
        position: { x: 420, y: 150 },
        data: {
          title: "Bước 2: Thiết Lập & Check Tên Miền",
          description: "Nhập Subdomain (.eraweb.io) / Custom domain, Live Check API debounced chống trùng và tên cấm",
          stepKey: "step_domain",
        },
      },
      {
        id: "step-plan",
        type: "testStep",
        position: { x: 800, y: 150 },
        data: {
          title: "Bước 3: Lựa Chọn Gói Dịch Vụ",
          description: "Chọn nhóm ngành (Cá nhân, Doanh nghiệp, Bán hàng, Khóa học) và chọn PlanCard phù hợp",
          stepKey: "step_plan",
        },
      },
      {
        id: "step-theme",
        type: "testStep",
        position: { x: 1180, y: 150 },
        data: {
          title: "Bước 4: Lựa Chọn Giao Diện Mẫu",
          description: "Lọc kho ThemeCard theo chuyên ngành, mở Live Preview modal và chọn themeId ưng ý",
          stepKey: "step_theme",
        },
      },
      {
        id: "step-check-phone",
        type: "testStep",
        position: { x: 1560, y: 150 },
        data: {
          title: "Bước 5: Click 'Khởi Tạo Website' & Gate Check Phone",
          description: "Kiểm tra điều kiện bắt buộc: Brand + Domain khả dụng + Trạng thái isPhoneVerified trong DB",
          stepKey: "step_check_phone",
        },
      },
      {
        id: "step-zalo-otp",
        type: "testStep",
        position: { x: 1560, y: 350 },
        data: {
          title: "Bước 6: Xác Thực OTP Zalo (ZaloOtpModal)",
          description: "Kích hoạt khi isPhoneVerified === false: Gửi ZNS, countdown 60s, nhập 6 số OTP, verify và set true",
          stepKey: "step_zalo_otp",
        },
      },
      {
        id: "step-provisioning",
        type: "testStep",
        position: { x: 1980, y: 150 },
        data: {
          title: "Bước 7: Tiến Trình Provisioning Khởi Tạo",
          description: "LoadingOverlay tiến trình 4 khâu, gọi POST /api/website/create, lưu cookie site_id, redirect Dashboard",
          stepKey: "step_provisioning",
        },
      },
    ];

    const flow2Edges = [
      { id: "e-b-d", source: "step-brand", target: "step-domain", animated: true },
      { id: "e-d-p", source: "step-domain", target: "step-plan", animated: true },
      { id: "e-p-t", source: "step-plan", target: "step-theme", animated: true },
      { id: "e-t-c", source: "step-theme", target: "step-check-phone", animated: true },
      // Nhánh 1: Nếu chưa xác thực SĐT -> Chuyển sang modal Zalo OTP
      { id: "e-c-otp", source: "step-check-phone", target: "step-zalo-otp", label: "Chưa xác thực SĐT (!isPhoneVerified)", animated: true, style: { stroke: "#e11d48", strokeDasharray: "5,5" } },
      // Sau khi OTP thành công -> Tiếp tục tạo website
      { id: "e-otp-prv", source: "step-zalo-otp", target: "step-provisioning", label: "Xác thực OTP thành công", animated: true, style: { stroke: "#10b981" } },
      // Nhánh 2: Đã xác thực SĐT từ trước -> Đi thẳng đến tạo website
      { id: "e-c-prv", source: "step-check-phone", target: "step-provisioning", label: "Đã xác thực (isPhoneVerified = true)", animated: true, style: { stroke: "#3b82f6" } },
    ];

    const flow2Res = await client.query(`
      INSERT INTO era_tester_flows (module_id, title, nodes, edges, file_patterns, assigned_testers)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      webModuleId,
      'manage/website/create - Quy Trình Khởi Tạo Website 4 Bước & Xác Thực Zalo OTP',
      JSON.stringify(flow2Nodes),
      JSON.stringify(flow2Edges),
      [
        'src/app/website/create/**',
        'src/components/Website/Create/**',
        'src/components/Popups/ZaloOtpModal.tsx',
        'src/app/actions/plans.ts',
        'src/app/api/website/**',
        'src/app/api/otp/**'
      ],
      [1]
    ]);
    const flow2Id = flow2Res.rows[0].id;
    console.log(`Created Flow 2 ID: ${flow2Id}`);

    // 5. DANH SÁCH TEST CASES CHI TIẾT THEO TỪNG BƯỚC / TỪNG NODE
    const cases = [
      // ==========================================
      // FLOW 1: ĐĂNG NHẬP & ROUTE GUARD (FLOW ID 1)
      // ==========================================
      {
        module_id: authModuleId,
        flow_id: flow1Id,
        node_id: "node-log-1",
        title: "[Route Guard] Chặn truy cập trái phép vào /website/create khi chưa đăng nhập",
        input_data: "Truy cập trực tiếp URL: https://manage4.eraweb.io/website/create (Không mang session cookie)",
        expected_result: "Next.js Proxy tại src/proxy.ts phát hiện thiếu auth cookie, lập tức 307 Redirect sang /login?redirect=/website/create kèm lưu utm cookie.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: authModuleId,
        flow_id: flow1Id,
        node_id: "node-log-2",
        title: "[Security/SQLi] Thử tấn công SQL Injection vào ô Email & Password",
        input_data: "Email: ' OR '1'='1' -- | Password: ' OR '1'='1' --",
        expected_result: "Backend dùng Parameterized Query chuẩn, trả về lỗi 'Email hoặc mật khẩu không chính xác' (HTTP 401). Tuyệt đối không throw raw DB error hay bypass login.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: authModuleId,
        flow_id: flow1Id,
        node_id: "node-log-2",
        title: "[Boundary/XSS] Chèn Payload HTML/XSS và chuỗi cực dài vào form đăng nhập",
        input_data: "Email: <script>alert(document.cookie)</script>@domain.com | Password: 2000 ký tự lặp 'A'",
        expected_result: "Frontend validate format email hợp lệ; không trigger script; xử lý chuỗi dài không gây sập render hay tràn bộ nhớ (Client Crash).",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: authModuleId,
        flow_id: flow1Id,
        node_id: "node-log-3",
        title: "[Spam/Brute-Force] Đăng nhập sai liên tục 10 lần trong 1 phút",
        input_data: "Gửi 10 request POST /api/auth/callback/credentials với mật khẩu sai",
        expected_result: "Hệ thống kích hoạt Rate Limiter, tạm khóa đăng nhập IP trong 15 phút hoặc yêu cầu giải CAPTCHA chống tấn công vét cạn mật khẩu.",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: authModuleId,
        flow_id: flow1Id,
        node_id: "node-log-4",
        title: "[Happy Path] Đăng nhập tài khoản hợp lệ & cấp phát Session Cookie",
        input_data: "Email và Mật khẩu chính xác của tài khoản đã kích hoạt",
        expected_result: "Đăng nhập thành công, máy chủ cấp phát Cookie authjs.session-token an toàn (HttpOnly, SameSite=Lax, Secure), hiển thị toast thông báo thành công.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: authModuleId,
        flow_id: flow1Id,
        node_id: "node-log-5",
        title: "[Security/Open Redirect] Tấn công lừa đảo chuyển hướng sang domain độc hại",
        input_data: "URL: /login?redirect=https://evil-phishing-bank.com/steal-token",
        expected_result: "Hàm sanitizeRedirect tại login/page.tsx lọc sạch URL ngoài, từ chối redirect ra ngoài hệ thống; tự động chuyển hướng an toàn về trang chủ mặc định /website.",
        status: "NEW",
        priority: "CRITICAL"
      },

      // ==========================================
      // FLOW 2 - BƯỚC 1: BRAND (step-brand)
      // ==========================================
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-brand",
        title: "[Step 1 - Brand Boundary] Kiểm tra độ dài tên thương hiệu (1 ký tự, 2 ký tự, 255 ký tự, > 1000 ký tự)",
        input_data: "Brand: 1 ký tự 'A' -> Báo lỗi. Nhập 2 ký tự 'AB' -> Hợp lệ. Nhập 1500 ký tự -> Giới hạn cắt chuỗi an toàn max 100 ký tự.",
        expected_result: "Hiển thị thông báo validation rõ ràng: Tên thương hiệu phải từ 2 đến 100 ký tự. Không bị vỡ khung giao diện WebsitePreviewCard.",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-brand",
        title: "[Step 1 - Brand Hacker/XSS] Chèn mã độc XSS và thẻ HTML vào Tên thương hiệu & Slogan",
        input_data: "Brand: <img src=x onerror=alert('hack_brand')><b>Era Store</b>",
        expected_result: "Hàm stripHtml và React Component tự động escape HTML entities; giao diện hiển thị text thô 'Era Store' hoặc loại bỏ mã độc, tuyệt đối không thực thi script.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-brand",
        title: "[Step 1 - Brand Auto-Slug] Tự động tạo slug từ tên tiếng Việt có dấu",
        input_data: "Brand: 'Thời Trang Cao Cấp Hà Nội & TP.HCM @ 2026'",
        expected_result: "Hàm slugify chuyển đổi mượt mà thành: 'thoi-trang-cao-cap-ha-noi-tphcm-2026' và tự động gợi ý vào ô Domain nếu ô Domain chưa bị người dùng sửa tay.",
        status: "NEW",
        priority: "MEDIUM"
      },

      // ==========================================
      // FLOW 2 - BƯỚC 2: DOMAIN (step-domain)
      // ==========================================
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-domain",
        title: "[Step 2 - Domain Happy Path] Nhập Subdomain hợp lệ và Live Check khả dụng",
        input_data: "Domain: 'my-boutique-shop' -> Đầy đủ: 'my-boutique-shop.eraweb.io'",
        expected_result: "Hệ thống debounce 500ms gọi API /api/website/check-domain, icon CheckCircle2 màu xanh xuất hiện báo 'Tên miền có thể sử dụng'.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-domain",
        title: "[Step 2 - Domain Boundary] Kiểm tra độ dài Subdomain (2 ký tự, 63 ký tự, 64 ký tự)",
        input_data: "Domain: 'a' (1 ký tự), 'ab' (2 ký tự), chuỗi 63 ký tự a...a, chuỗi 64 ký tự.",
        expected_result: "Tuân thủ nghiêm ngặt RFC 1035: Subdomain phải từ 3 đến 63 ký tự. 1-2 ký tự báo lỗi quá ngắn; >63 ký tự báo lỗi vượt quá giới hạn DNS.",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-domain",
        title: "[Step 2 - Domain Hijacking] Đăng ký Subdomain từ khóa cấm của hệ thống (Blacklisted Subdomains)",
        input_data: "Thử đăng ký: 'admin', 'api', 'manage', 'auth', 'mail', 'dashboard', 'root', 'eraweb', 'staging'",
        expected_result: "API /api/website/check-domain từ chối ngay lập tức với isAvailable = false, thông báo 'Tên miền này được bảo lưu bởi hệ thống, vui lòng chọn tên khác'.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-domain",
        title: "[Step 2 - Domain Spam/DDoS] Gửi spam 50 request kiểm tra tên miền liên tục trong 5 giây",
        input_data: "Dùng script/bot bắn liên tục vào /api/website/check-domain?domain=test1...test50",
        expected_result: "Frontend áp dụng debounce không gửi request rác; Backend có middleware rate-limit ngăn chặn làm cạn kiệt tài nguyên database.",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-domain",
        title: "[Step 2 - Domain IDN / Injection] Thử chèn ký tự lạ, khoảng trắng, Unicode giả mạo Homograph",
        input_data: "Domain: 'my shop', 'test..domain', 'abc%00def', 'аpple' (ký tự Cyrillic 'а')",
        expected_result: "Hàm cleanDomainInput và validateDomain loại bỏ ký tự cấm, chỉ cho phép chữ cái thường [a-z], số [0-9] và dấu gạch ngang [-].",
        status: "NEW",
        priority: "HIGH"
      },

      // ==========================================
      // FLOW 2 - BƯỚC 3: PLAN (step-plan)
      // ==========================================
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-plan",
        title: "[Step 3 - Plan Tampering] Hacker can thiệp sửa plan_id giả mạo hoặc sửa giá tiền gói về 0đ",
        input_data: "Can thiệp HTTP request gửi: { planId: -999, price: 0, title: 'VIP Enterprise Free' }",
        expected_result: "Server Action / API đọc dữ liệu gói trực tiếp từ database eraweb_master; từ chối mọi can thiệp giá từ client, trả về HTTP 400 Bad Request.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-plan",
        title: "[Step 3 - Plan Switching] Chuyển đổi giữa 4 nhóm ngành và chọn gói dịch vụ",
        input_data: "Click chuyển đổi tab 1 (Cá nhân) -> tab 2 (Bán hàng) -> tab 3 (Khóa học) -> tab 4 (Doanh nghiệp)",
        expected_result: "Danh sách PlanCard thay đổi tương ứng, subtitle mô tả cập nhật chuẩn xác, gói đang active được highlight viền rõ ràng, StickyFooterBar cập nhật đúng tên gói.",
        status: "NEW",
        priority: "MEDIUM"
      },

      // ==========================================
      // FLOW 2 - BƯỚC 4: THEME (step-theme)
      // ==========================================
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-theme",
        title: "[Step 4 - Theme IDOR] Thử chọn Theme ID bí mật hoặc không thuộc quyền sở hữu",
        input_data: "Payload gửi themeId: 'theme_secret_admin_only_9999'",
        expected_result: "Backend kiểm tra tính khả dụng của theme trong kho template công khai, nếu không hợp lệ sẽ tự động fallback về theme mặc định (Default Clean Theme).",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-theme",
        title: "[Step 4 - Theme Preview] Mở Modal Xem Trước Giao Diện Mẫu (Live Preview)",
        input_data: "Nhấn nút 'Xem trước' trên ThemeCard của mẫu 'Thời trang Minimalist'",
        expected_result: "Modal Preview mở mượt mà hiển thị iframe giao diện thực tế; nút 'Sử dụng giao diện này' hoạt động chuẩn xác, đóng modal và set selectedThemeId.",
        status: "NEW",
        priority: "MEDIUM"
      },

      // ==========================================
      // FLOW 2 - BƯỚC 5: CHECK PHONE VERIFIED GATE (step-check-phone)
      // ==========================================
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-check-phone",
        title: "[Step 5 - Gate Happy Path] Người dùng ĐÃ xác thực số điện thoại (isPhoneVerified = true)",
        input_data: "Tài khoản có initialPhoneVerified = true, Brand và Domain hợp lệ. Nhấn 'Khởi tạo Website'.",
        expected_result: "Hệ thống KHÔNG mở ZaloOtpModal; lập tức gọi proceedCreateWebsite(), kích hoạt LoadingOverlay 4 bước để khởi tạo website.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-check-phone",
        title: "[Step 5 - Gate Intercept] Người dùng CHƯA xác thực số điện thoại (isPhoneVerified = false)",
        input_data: "Tài khoản có phone_verified = 0 hoặc rỗng. Nhấn nút 'Khởi tạo Website'.",
        expected_result: "Hàm handleCreateWebsite() chặn lại tại dòng 405; set isZaloOtpOpen(true); hiển thị popup ZaloOtpModal kèm số điện thoại của người dùng.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-check-phone",
        title: "[Step 5 - Backend Gate Enforcement] Hacker gọi thẳng API tạo website nhằm bypass frontend",
        input_data: "Gửi request trực tiếp POST /api/website/create với tài khoản chưa xác thực SĐT",
        expected_result: "Backend kiểm tra session & DB era_user_manager: phát hiện phone_verified !== 1, lập tức trả về HTTP 403 Forbidden { error: 'PHONE_NOT_VERIFIED' }.",
        status: "NEW",
        priority: "CRITICAL"
      },

      // ==========================================
      // FLOW 2 - BƯỚC 6: ZALO OTP MODAL (step-zalo-otp)
      // ==========================================
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-zalo-otp",
        title: "[Step 6 - Zalo OTP Happy Path] Nhận mã ZNS qua Zalo và xác thực thành công",
        input_data: "Nhấn 'Gửi mã xác thực qua Zalo' -> Nhận OTP 6 số (vd: 582914) -> Nhập vào 6 ô input -> Nhấn 'Xác nhận'",
        expected_result: "Gọi API /api/otp/verify trả về { success: true }, cập nhật isPhoneVerified = true trong state và database, tự động đóng modal và gọi proceedCreateWebsite().",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-zalo-otp",
        title: "[Step 6 - Zalo OTP Spam] Click liên tục nút 'Gửi lại mã' để spam chi phí tin nhắn ZNS",
        input_data: "Click spam liên tiếp vào nút 'Gửi lại mã OTP' trong modal",
        expected_result: "Nút bị disable kèm đồng hồ đếm ngược 60 giây. Backend giới hạn tối đa 3 lần yêu cầu OTP trong 1 ngày cho mỗi số điện thoại để chống tiêu hao hạn ngạch Zalo ZNS.",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-zalo-otp",
        title: "[Step 6 - Zalo OTP Brute-Force] Nhập sai mã OTP 5 lần liên tiếp",
        input_data: "Thử các mã OTP sai ngẫu nhiên: 000000, 111111, 123456, 999999, 888888",
        expected_result: "Hệ thống hủy phiên xác thực mã OTP hiện tại, hiển thị cảnh báo 'Bạn đã nhập sai quá số lần quy định. Vui lòng yêu cầu mã mới sau 15 phút'.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-zalo-otp",
        title: "[Step 6 - Zalo OTP Expiration] Nhập mã OTP đã hết hạn sau 3 phút",
        input_data: "Chờ quá thời hạn hiệu lực của mã (3 phút) mới bấm nút xác nhận",
        expected_result: "Backend từ chối với mã lỗi 'OTP_EXPIRED', yêu cầu người dùng gửi lại mã OTP mới.",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-zalo-otp",
        title: "[Step 6 - Zalo OTP Boundary] Nhập ký tự chữ, dấu cách, ký tự đặc biệt vào ô OTP",
        input_data: "Nhập 'abc#$%' vào ô OTP",
        expected_result: "Input chỉ nhận ký tự số [0-9], tự động nhảy focus sang ô kế tiếp khi nhập xong từng chữ số, paste chuỗi 6 số tự động điền đủ 6 ô.",
        status: "NEW",
        priority: "MEDIUM"
      },

      // ==========================================
      // FLOW 2 - BƯỚC 7: PROVISIONING (step-provisioning)
      // ==========================================
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-provisioning",
        title: "[Step 7 - Race Condition] Multi-click / Double-click vào nút Xác Nhận Tạo Website",
        input_data: "Click nhanh 5 lần liên tiếp vào nút 'Khởi tạo Website' trong 500ms",
        expected_result: "Frontend lập tức bật isCreating = true, khóa toàn bộ nút bấm; Backend áp dụng Mutex / Idempotency Key chống tạo trùng lặp 2 website cho cùng 1 tenant.",
        status: "NEW",
        priority: "CRITICAL"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-provisioning",
        title: "[Step 7 - Network Failure Recovery] Mất kết nối mạng giữa chừng khi đang tạo website",
        input_data: "Ngắt kết nối mạng hoặc server trả về HTTP 500 khi LoadingOverlay đang chạy bước 3",
        expected_result: "LoadingOverlay bắt lỗi try-catch, hiển thị thông báo lỗi thân thiện kèm nút 'Thử lại' (onRetry) và 'Hủy' (onCancel); Database tự động rollback transaction an toàn.",
        status: "NEW",
        priority: "HIGH"
      },
      {
        module_id: webModuleId,
        flow_id: flow2Id,
        node_id: "step-provisioning",
        title: "[Step 7 - Happy Path Provisioning] Khởi tạo thành công & Chuyển hướng Dashboard",
        input_data: "Mọi thông tin hợp lệ, SĐT đã xác thực. Gọi POST /api/website/create",
        expected_result: "LoadingOverlay hoàn tất 4 bước (Cấu hình tên miền -> Khởi tạo database -> Thiết lập giao diện -> Hoàn tất), server set SELECTED_SITE_ID cookie, redirect an toàn sang /website.",
        status: "NEW",
        priority: "CRITICAL"
      }
    ];

    console.log(`Bắt đầu chèn ${cases.length} kịch bản kiểm thử vào DB...`);
    for (const c of cases) {
      await client.query(`
        INSERT INTO era_tester_cases 
        (module_id, flow_id, node_id, title, input_data, expected_result, status, priority, assigned_to, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 1)
      `, [
        c.module_id,
        c.flow_id,
        c.node_id,
        c.title,
        c.input_data,
        c.expected_result,
        c.status,
        c.priority
      ]);
    }

    await client.query('COMMIT');
    console.log(`ĐÃ HOÀN TẤT SEED TOÀN BỘ 2 FLOWS VÀ ${cases.length} TEST CASES THÀNH CÔNG!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Lỗi khi seed data:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
